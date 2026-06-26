import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// POST /store/social/posts/:id/pin — toggle pin/unpin own post
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
      // Verify ownership
      const existing = await pool.query(
        `SELECT customer_id, is_pinned FROM posts WHERE id = $1`, [postId]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "post not found" })
      }
      if (existing.rows[0].customer_id !== customerId) {
        return res.status(403).json({ error: "not your post" })
      }

      const newPinned = !existing.rows[0].is_pinned
      await pool.query(
        `UPDATE posts SET is_pinned = $1 WHERE id = $2`,
        [newPinned, postId]
      )

      return res.json({ data: { is_pinned: newPinned } })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/pin] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}