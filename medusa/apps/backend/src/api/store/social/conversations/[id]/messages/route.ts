import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../../../utils"

// GET /store/social/conversations/:id/messages
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const convId = parseInt(req.params.id, 10)
  if (isNaN(convId)) {
    return res.status(400).json({ error: "invalid conversation id" })
  }

  const cursor = req.query.cursor ? parseInt(req.query.cursor as string, 10) : undefined
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100)

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const memberCheck = await pool.query(
        `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND customer_id = $2`,
        [convId, customerId]
      )
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "not a member of this conversation" })
      }

      let query = `
        SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.media_url, m.created_at,
               c.email as sender_email, c.nickname as sender_nickname, c.avatar as sender_avatar
        FROM messages m
        LEFT JOIN customer c ON c.id = m.sender_id
        WHERE m.conversation_id = $1
      `
      const params: any[] = [convId]

      if (cursor) {
        params.push(cursor)
        query += ` AND m.id < $${params.length}`
      }

      query += ` ORDER BY m.id DESC LIMIT $${params.length + 1}`
      params.push(limit)

      const result = await pool.query(query, params)
      return res.json({
        data: result.rows.reverse(),
        next_cursor: result.rows.length > 0 ? result.rows[result.rows.length - 1].id : null,
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id/messages] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// POST /store/social/conversations/:id/messages — send a message
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const convId = parseInt(req.params.id, 10)
  if (isNaN(convId)) {
    return res.status(400).json({ error: "invalid conversation id" })
  }

  const { content, type, media_url } = req.body as {
    content?: string
    type?: string
    media_url?: string
  }

  if (!content && !media_url) {
    return res.status(400).json({ error: "content or media_url required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const memberCheck = await pool.query(
        `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND customer_id = $2`,
        [convId, customerId]
      )
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: "not a member" })
      }

      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, type, content, media_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now()) RETURNING id, created_at`,
        [convId, customerId, type || "text", content || "", media_url || null]
      )

      await pool.query(
        `UPDATE conversations SET updated_at = now() WHERE id = $1`,
        [convId]
      )

      return res.status(201).json({
        id: result.rows[0].id,
        conversation_id: convId,
        sender_id: customerId,
        type: type || "text",
        content: content || "",
        media_url: media_url || null,
        created_at: result.rows[0].created_at,
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/conversations/:id/messages] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}