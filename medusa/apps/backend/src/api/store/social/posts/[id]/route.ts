import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../utils"

// GET /store/social/posts/:id — single post detail
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const postId = parseInt(req.params.id, 10)
  if (isNaN(postId)) {
    return res.status(400).json({ error: "invalid post id" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `SELECT p.*, c.email as customer_email, c.nickname as customer_nickname,
                c.avatar as customer_avatar, c.signature as customer_signature
         FROM posts p
         JOIN customer c ON c.id = p.customer_id
         WHERE p.id = $1`,
        [postId]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }

      const row = result.rows[0]
      const likeCount = await pool.query(`SELECT COUNT(*) as cnt FROM likes WHERE post_id = $1`, [row.id])
      const liked = await pool.query(`SELECT 1 FROM likes WHERE post_id = $1 AND customer_id = $2`, [row.id, customerId])
      const commentCount = await pool.query(`SELECT COUNT(*) as cnt FROM comments WHERE post_id = $1`, [row.id])

      return res.json({
        data: {
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
        },
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// PATCH /store/social/posts/:id — edit own post (content, type, media, visibility)
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const postId = parseInt(req.params.id, 10)
  if (isNaN(postId)) {
    return res.status(400).json({ error: "invalid post id" })
  }

  const { type, content, media_urls, location, visibility, is_pinned, comments_enabled } = req.body as {
    type?: string
    content?: string
    media_urls?: string[]
    location?: string
    visibility?: string
    is_pinned?: boolean
    comments_enabled?: boolean
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      // Verify ownership
      const existing = await pool.query(
        `SELECT customer_id FROM posts WHERE id = $1`, [postId]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }
      if (existing.rows[0].customer_id !== customerId) {
        return res.status(403).json({ error: "not your post" })
      }

      const updates: string[] = []
      const params: any[] = []
      let idx = 1

      if (type !== undefined) { updates.push(`type = $${idx++}`); params.push(type) }
      if (content !== undefined) { updates.push(`content = $${idx++}`); params.push(content) }
      if (media_urls !== undefined) { updates.push(`media_urls = $${idx++}`); params.push(JSON.stringify(media_urls)) }
      if (location !== undefined) { updates.push(`location = $${idx++}`); params.push(location) }
      if (visibility !== undefined) { updates.push(`visibility = $${idx++}`); params.push(visibility) }
      if (is_pinned !== undefined) { updates.push(`is_pinned = $${idx++}`); params.push(is_pinned) }
      if (comments_enabled !== undefined) { updates.push(`comments_enabled = $${idx++}`); params.push(comments_enabled) }

      if (updates.length === 0) {
        return res.status(400).json({ error: "no fields to update" })
      }

      params.push(postId)
      const result = await pool.query(
        `UPDATE posts SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
        params
      )

      return res.json({ data: result.rows[0] })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id] PATCH error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// DELETE /store/social/posts/:id — delete own post
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const postId = parseInt(req.params.id, 10)
  if (isNaN(postId)) {
    return res.status(400).json({ error: "invalid post id" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const post = await pool.query(
        `SELECT customer_id FROM posts WHERE id = $1`,
        [postId]
      )
      if (post.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }
      if (post.rows[0].customer_id !== customerId) {
        return res.status(403).json({ error: "not your post" })
      }

      // Delete likes and comments first
      await pool.query(`DELETE FROM likes WHERE post_id = $1`, [postId])
      await pool.query(`DELETE FROM comments WHERE post_id = $1`, [postId])
      await pool.query(`DELETE FROM posts WHERE id = $1`, [postId])

      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id] DELETE error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}