import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../../utils"

// POST /store/social/friends/requests/:id/accept — accept friend request
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const requestId = parseInt(req.params.id, 10)
  if (isNaN(requestId)) {
    return res.status(400).json({ error: "invalid request id" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const request = await pool.query(
        `SELECT * FROM friend_requests WHERE id = $1 AND target_customer_id = $2 AND status = 'pending'`,
        [requestId, customerId]
      )
      if (request.rows.length === 0) {
        return res.status(404).json({ error: "pending request not found" })
      }

      const requesterId = request.rows[0].customer_id

      await pool.query(
        `UPDATE friend_requests SET status = 'accepted', updated_at = now() WHERE id = $1`,
        [requestId]
      )

      await pool.query(
        `INSERT INTO friends (customer_id, friend_customer_id, created_at)
         VALUES ($1, $2, now()), ($2, $1, now())
         ON CONFLICT DO NOTHING`,
        [customerId, requesterId]
      )

      return res.json({ success: true, status: "accepted" })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/friends/requests/:id/accept] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}