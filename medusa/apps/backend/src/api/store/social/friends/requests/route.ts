import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../utils"

// GET /store/social/friends/requests — list my friend requests
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const status = (req.query.status as string) || "pending"

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const received = await pool.query(
        `SELECT fr.id, fr.customer_id as requester_id, fr.status, fr.created_at,
                c.nickname, c.first_name, c.last_name, c.avatar, c.email
         FROM friend_requests fr
         JOIN customer c ON c.id = fr.customer_id
         WHERE fr.target_customer_id = $1 AND fr.status = $2
         ORDER BY fr.created_at DESC`,
        [customerId, status]
      )

      const sent = await pool.query(
        `SELECT fr.id, fr.target_customer_id as target_id, fr.status, fr.created_at,
                c.nickname, c.avatar, c.email
         FROM friend_requests fr
         JOIN customer c ON c.id = fr.target_customer_id
         WHERE fr.customer_id = $1 AND fr.status = $2
         ORDER BY fr.created_at DESC`,
        [customerId, status]
      )

      return res.json({ data: { received: received.rows, sent: sent.rows } })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/friends/requests] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}