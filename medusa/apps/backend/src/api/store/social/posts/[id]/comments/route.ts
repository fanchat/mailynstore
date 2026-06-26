import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// GET /store/social/posts/:id/comments — list comments
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
        `SELECT cm.*, c.email as customer_email, c.nickname as customer_nickname,
                c.avatar as customer_avatar, c.signature as customer_signature
         FROM comments cm
         JOIN customer c ON c.id = cm.customer_id
         WHERE cm.post_id = $1
         ORDER BY cm.id ASC`,
        [postId]
      )

      const data = result.rows.map((row: any) => ({
        ...row,
        customer: {
          id: row.customer_id,
          email: row.customer_email,
          nickname: row.customer_nickname,
          avatar: row.customer_avatar,
          signature: row.customer_signature,
        },
      }))

      return res.json({ data })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/comments] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// POST /store/social/posts/:id/comments — add comment
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const postId = parseInt(req.params.id, 10)
  if (isNaN(postId)) {
    return res.status(400).json({ error: "invalid post id" })
  }

  const { content } = req.body as { content?: string }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "content required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const post = await pool.query(`SELECT 1 FROM posts WHERE id = $1`, [postId])
      if (post.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }

      const result = await pool.query(
        `INSERT INTO comments (post_id, customer_id, content, created_at)
         VALUES ($1, $2, $3, now()) RETURNING id, created_at`,
        [postId, customerId, content.trim()]
      )

      return res.status(201).json({
        id: result.rows[0].id,
        post_id: postId,
        customer_id: customerId,
        content: content.trim(),
        created_at: result.rows[0].created_at,
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/comments] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}