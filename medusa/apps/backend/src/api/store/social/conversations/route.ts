import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// POST /store/social/conversations — create a conversation
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const { type, name, customer_ids } = req.body as {
    type: string
    name?: string
    customer_ids: string[]
  }

  if (!type || !["direct", "group"].includes(type)) {
    return res.status(400).json({ error: "type must be 'direct' or 'group'" })
  }
  if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
    return res.status(400).json({ error: "customer_ids required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `INSERT INTO conversations (type, name, created_at, updated_at)
         VALUES ($1, $2, now(), now()) RETURNING id`,
        [type, name || null]
      )
      const convId = result.rows[0].id

      const allMembers = [...new Set([customerId, ...customer_ids])]
      for (const cid of allMembers) {
        await pool.query(
          `INSERT INTO conversation_members (conversation_id, customer_id, last_read_at, created_at, updated_at)
           VALUES ($1, $2, now(), now(), now())`,
          [convId, cid]
        )
      }

      return res.json({ id: convId, type, name: name || null })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// GET /store/social/conversations — list my conversations
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `SELECT c.id, c.type, c.name, c.created_at, c.updated_at,
                (SELECT cm.last_read_at FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.customer_id = $1) as last_read_at
         FROM conversations c
         JOIN conversation_members cm ON cm.conversation_id = c.id
         WHERE cm.customer_id = $1
         ORDER BY c.updated_at DESC NULLS LAST`,
        [customerId]
      )
      return res.json({ data: result.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}