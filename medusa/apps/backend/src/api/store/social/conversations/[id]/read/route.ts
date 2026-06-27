import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// POST /store/social/conversations/:id/read — mark conversation as read
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const convId = parseInt(req.params.id, 10)
  if (isNaN(convId)) {
    return res.status(400).json({ error: "invalid conversation id" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      await pool.query(
        `UPDATE conversation_members SET last_read_at = now(), updated_at = now()
         WHERE conversation_id = $1 AND customer_id = $2`,
        [convId, customerId]
      )
      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id/read] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}
