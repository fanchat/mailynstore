import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/friends — list friends
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
        `SELECT f.friend_customer_id as id, c.email, c.nickname, c.avatar, c.signature,
                f.created_at as friend_since
         FROM friends f
         JOIN customer c ON c.id = f.friend_customer_id
         WHERE f.customer_id = $1
         UNION
         SELECT f.customer_id as id, c.email, c.nickname, c.avatar, c.signature,
                f.created_at as friend_since
         FROM friends f
         JOIN customer c ON c.id = f.customer_id
         WHERE f.friend_customer_id = $1
         ORDER BY friend_since DESC`,
        [customerId]
      )
      return res.json({ data: result.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/friends] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// POST /store/social/friends — send friend request
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const { target_customer_id } = req.body as { target_customer_id?: string }
  if (!target_customer_id) {
    return res.status(400).json({ error: "target_customer_id required" })
  }

  if (target_customer_id === customerId) {
    return res.status(400).json({ error: "cannot add yourself as friend" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      // Check if already friends
      const existing = await pool.query(
        `SELECT 1 FROM friends WHERE (customer_id = $1 AND friend_customer_id = $2)
         OR (customer_id = $2 AND friend_customer_id = $1)`,
        [customerId, target_customer_id]
      )
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "already friends" })
      }

      // Check if target exists
      const target = await pool.query(`SELECT 1 FROM customer WHERE id = $1`, [target_customer_id])
      if (target.rows.length === 0) {
        return res.status(404).json({ error: "target customer not found" })
      }

      // Check for pending request
      const pendingReq = await pool.query(
        `SELECT id, status FROM friend_requests
         WHERE ((customer_id = $1 AND target_customer_id = $2)
            OR (customer_id = $2 AND target_customer_id = $1))
           AND status = 'pending'`,
        [customerId, target_customer_id]
      )
      if (pendingReq.rows.length > 0) {
        return res.status(409).json({ error: "friend request already pending" })
      }

      // Create friend request
      const result = await pool.query(
        `INSERT INTO friend_requests (customer_id, target_customer_id, status, created_at, updated_at)
         VALUES ($1, $2, 'pending', now(), now()) RETURNING id`,
        [customerId, target_customer_id]
      )

      return res.status(201).json({ id: result.rows[0].id, status: "pending" })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/friends] POST error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// DELETE /store/social/friends/:id — remove friend
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const friendId = req.params.id as string
  if (!friendId) {
    return res.status(400).json({ error: "friend id required" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      await pool.query(
        `DELETE FROM friends
         WHERE (customer_id = $1 AND friend_customer_id = $2)
            OR (customer_id = $2 AND friend_customer_id = $1)`,
        [customerId, friendId]
      )
      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/friends] DELETE error:", err)
    return res.status(500).json({ error: "internal_error" })
  }
}