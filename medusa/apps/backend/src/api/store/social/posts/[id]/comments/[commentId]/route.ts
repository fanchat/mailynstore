import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../../utils"

// DELETE /store/social/posts/:id/comments/:commentId — delete own comment
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const postId = parseInt(req.params.id, 10)
  const commentId = parseInt(req.params.commentId, 10)
  if (isNaN(postId) || isNaN(commentId)) {
    return res.status(400).json({ error: "invalid id" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const comment = await pool.query(
        `SELECT customer_id FROM comments WHERE id = $1 AND post_id = $2`,
        [commentId, postId]
      )
      if (comment.rows.length === 0) {
        return res.status(404).json({ error: "comment not found" })
      }
      if (comment.rows[0].customer_id !== customerId) {
        return res.status(403).json({ error: "not your comment" })
      }

      await pool.query(`DELETE FROM comments WHERE id = $1`, [commentId])
      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/posts/:id/comments/:commentId] DELETE error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}