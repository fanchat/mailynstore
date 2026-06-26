import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// POST /store/social/posts/:id/move-up — move post up one position in sort_order
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
        `SELECT id, sort_order FROM posts WHERE id = $1 AND customer_id = $2`,
        [postId, customerId]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "post not found or not your post" })
      }

      const currentOrder = existing.rows[0].sort_order

      // Find the post immediately above (sort_order < currentOrder, but < currentOrder)
      const above = await pool.query(
        `SELECT id, sort_order FROM posts
         WHERE customer_id = $1 AND sort_order < $2
         ORDER BY sort_order DESC LIMIT 1`,
        [customerId, currentOrder]
      )

      if (above.rows.length === 0) {
        return res.status(400).json({ error: "already at top" })
      }

      // Swap sort_order
      const aboveOrder = above.rows[0].sort_order
      const aboveId = above.rows[0].id

      await pool.query(`UPDATE posts SET sort_order = $1 WHERE id = $2`, [aboveOrder, postId])
      await pool.query(`UPDATE posts SET sort_order = $1 WHERE id = $2`, [currentOrder, aboveId])

      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/move-up] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}