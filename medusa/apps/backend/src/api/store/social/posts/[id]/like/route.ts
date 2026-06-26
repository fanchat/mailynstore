import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// POST /store/social/posts/:id/like — toggle like
export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
      // Check post exists
      const post = await pool.query(`SELECT 1 FROM posts WHERE id = $1`, [postId])
      if (post.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }

      // Toggle: if liked, unlike; if not, like
      const existing = await pool.query(
        `SELECT 1 FROM likes WHERE post_id = $1 AND customer_id = $2`,
        [postId, customerId]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          `DELETE FROM likes WHERE post_id = $1 AND customer_id = $2`,
          [postId, customerId]
        )
        return res.json({ liked: false })
      } else {
        await pool.query(
          `INSERT INTO likes (post_id, customer_id) VALUES ($1, $2)`,
          [postId, customerId]
        )
        return res.json({ liked: true })
      }
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/like] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}