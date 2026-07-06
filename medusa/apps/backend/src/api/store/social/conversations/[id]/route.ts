import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../utils"

// GET /store/social/conversations/:id — get a single conversation by ID
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  console.log("[social/conversations/:id] GET called, id=", req.params.id, "customerId=", customerId)
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
      // Check the user is a member
      const check = await pool.query(
        `SELECT 1 FROM conversation_members
         WHERE conversation_id = $1 AND customer_id = $2`,
        [convId, customerId]
      )
      if (check.rows.length === 0) {
        return res.status(403).json({ error: "not a member of this conversation" })
      }

      // Get conversation info
      const conv = await pool.query(
        `SELECT id, type, name, created_at, updated_at
         FROM conversations WHERE id = $1`,
        [convId]
      )
      if (conv.rows.length === 0) {
        return res.status(404).json({ error: "conversation not found" })
      }

      // Get members
      const members = await pool.query(
        `SELECT cm.customer_id as id, c.email, c.nickname, c.avatar
         FROM conversation_members cm
         JOIN customer c ON c.id = cm.customer_id
         WHERE cm.conversation_id = $1`,
        [convId]
      )

      return res.json({
        data: {
          ...conv.rows[0],
          members: members.rows,
        },
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}
