import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// GET /store/social/conversations/:id/members
export async function GET(req: MedusaRequest, res: MedusaResponse) {
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
      const result = await pool.query(
        `SELECT cm.customer_id, c.email, c.nickname, c.avatar, cm.last_read_at
         FROM conversation_members cm
         JOIN customer c ON c.id = cm.customer_id
         WHERE cm.conversation_id = $1`,
        [convId]
      )
      return res.json({ data: result.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id/members] error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// POST /store/social/conversations/:id/members — add members
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const convId = parseInt(req.params.id, 10)
  if (isNaN(convId)) {
    return res.status(400).json({ error: "invalid conversation id" })
  }

  const { customer_ids } = req.body as { customer_ids: string[] }
  if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
    return res.status(400).json({ error: "customer_ids required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      for (const cid of customer_ids) {
        await pool.query(
          `INSERT INTO conversation_members (conversation_id, customer_id, last_read_at, created_at, updated_at)
           VALUES ($1, $2, now(), now(), now())
           ON CONFLICT DO NOTHING`,
          [convId, cid]
        )
      }
      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id/members] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}