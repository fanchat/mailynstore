import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../utils"

// POST /store/social/conversations/direct — find or create a 1-on-1 conversation
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const { target_customer_id } = req.body as {
    target_customer_id: string
  }

  if (!target_customer_id) {
    return res.status(400).json({ error: "target_customer_id required" })
  }

  if (target_customer_id === customerId) {
    return res.status(400).json({ error: "cannot chat with yourself" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      // Check if direct conversation already exists between these two
      const existing = await pool.query(
        `SELECT c.id, c.type, c.name, c.created_at, c.updated_at
         FROM conversations c
         WHERE c.type = 'direct'
           AND (SELECT COUNT(*) FROM conversation_members cm WHERE cm.conversation_id = c.id) = 2
           AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.customer_id = $1)
           AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.customer_id = $2)`,
        [customerId, target_customer_id]
      )

      if (existing.rows.length > 0) {
        const conv = existing.rows[0]
        // Fetch members
        const members = await pool.query(
          `SELECT cm.customer_id as id, c.email, c.nickname, c.avatar
           FROM conversation_members cm
           JOIN customer c ON c.id = cm.customer_id
           WHERE cm.conversation_id = $1`,
          [conv.id]
        )
        return res.json({ id: conv.id, type: conv.type, name: conv.name, members: members.rows })
      }

      // Create new direct conversation
      const result = await pool.query(
        `INSERT INTO conversations (type, name, created_at, updated_at)
         VALUES ('direct', NULL, now(), now()) RETURNING id`
      )
      const convId = result.rows[0].id

      // Add both members
      for (const cid of [customerId, target_customer_id]) {
        await pool.query(
          `INSERT INTO conversation_members (conversation_id, customer_id, last_read_at, created_at, updated_at)
           VALUES ($1, $2, now(), now(), now())`,
          [convId, cid]
        )
      }

      // Fetch member info for response
      const members = await pool.query(
        `SELECT cm.customer_id as id, c.email, c.nickname, c.avatar
         FROM conversation_members cm
         JOIN customer c ON c.id = cm.customer_id
         WHERE cm.conversation_id = $1`,
        [convId]
      )

      return res.json({ id: convId, type: "direct", name: null, members: members.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/direct] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}