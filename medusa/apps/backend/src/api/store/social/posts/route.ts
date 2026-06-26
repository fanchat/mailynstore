import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/posts — feed of friends' public posts + own posts
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50)
  const type = (req.query.type as string) || "friend"
  const scope = (req.query.scope as string) || ""

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      // scope=mine → return all posts for the current user (regardless of type)
      if (scope === "mine") {
        const result = await pool.query(
          `SELECT p.*, c.email as customer_email, c.nickname as customer_nickname,
                  c.avatar as customer_avatar, c.signature as customer_signature
           FROM posts p
           JOIN customer c ON c.id = p.customer_id
           WHERE p.customer_id = $1
           ORDER BY p.is_pinned DESC, p.sort_order ASC, p.created_at DESC
           LIMIT $2`,
          [customerId, limit]
        )
        return res.json({ data: result.rows.map(r => ({
          ...r,
          media_urls: r.media_urls ? JSON.parse(r.media_urls) : [],
          like_count: 0,
          liked: false,
          comment_count: 0,
          customer: {
            id: r.customer_id,
            email: r.customer_email,
            nickname: r.customer_nickname,
            avatar: r.customer_avatar,
            signature: r.customer_signature,
          },
        })) })
      }

      let query: string
      const params: any[] = [customerId]

      if (type === "work") {
        query = `SELECT p.*, c.email as customer_email, c.nickname as customer_nickname,
                        c.avatar as customer_avatar, c.signature as customer_signature
                 FROM posts p
                 JOIN customer c ON c.id = p.customer_id
                 JOIN work_profiles wp ON wp.customer_id = p.customer_id
                 WHERE EXISTS (
                   SELECT 1 FROM work_profiles wp2
                   WHERE wp2.customer_id = $1 AND wp2.company_name = wp.company_name
                 )
                 AND p.visibility = 'public'
                 AND p.type != 'personal'`
      } else {
        query = `SELECT p.*, c.email as customer_email, c.nickname as customer_nickname,
                        c.avatar as customer_avatar, c.signature as customer_signature
                 FROM posts p
                 JOIN customer c ON c.id = p.customer_id
                 WHERE (
                   p.customer_id IN (
                     SELECT friend_customer_id FROM friends WHERE customer_id = $1
                     UNION
                     SELECT customer_id FROM friends WHERE friend_customer_id = $1
                   )
                   OR p.customer_id = $1
                 )
                 AND p.visibility = 'public'
                 AND p.type != 'personal'`
      }

      if (cursor) {
        params.push(cursor)
        query += ` AND p.id < $${params.length}`
      }

      params.push(limit + 1)
      query += ` ORDER BY p.id DESC LIMIT $${params.length}`

      const result = await pool.query(query, params)
      const hasMore = result.rows.length > limit
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows

      const enriched = await Promise.all(rows.map(async (row) => {
        const likeCount = await pool.query(
          `SELECT COUNT(*) as cnt FROM likes WHERE post_id = $1`, [row.id]
        )
        const liked = await pool.query(
          `SELECT 1 FROM likes WHERE post_id = $1 AND customer_id = $2`,
          [row.id, customerId]
        )
        const commentCount = await pool.query(
          `SELECT COUNT(*) as cnt FROM comments WHERE post_id = $1`, [row.id]
        )
        return {
          ...row,
          like_count: parseInt(likeCount.rows[0].cnt, 10),
          liked: liked.rows.length > 0,
          comment_count: parseInt(commentCount.rows[0].cnt, 10),
          media_urls: row.media_urls ? JSON.parse(row.media_urls) : [],
          customer: {
            id: row.customer_id,
            email: row.customer_email,
            nickname: row.customer_nickname,
            avatar: row.customer_avatar,
            signature: row.customer_signature,
          },
        }
      }))

      return res.json({
        data: enriched,
        next_cursor: hasMore ? rows[rows.length - 1].id : null,
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// POST /store/social/posts — create a post
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const { type, content, media_urls, location, visibility } = req.body as {
    type?: string
    content?: string
    media_urls?: string[]
    location?: string
    visibility?: string
  }

  if (!type || !["friend", "work", "personal"].includes(type)) {
    return res.status(400).json({ error: "type must be 'friend', 'work', or 'personal'" })
  }
  if (!content && (!media_urls || media_urls.length === 0)) {
    return res.status(400).json({ error: "content or media_urls required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `INSERT INTO posts (customer_id, type, content, media_urls, location, visibility, is_pinned, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, now()) RETURNING *`,
        [customerId, type, content || "", media_urls ? JSON.stringify(media_urls) : null, location || null, visibility || "public"]
      )

      return res.status(201).json({ data: result.rows[0] })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}