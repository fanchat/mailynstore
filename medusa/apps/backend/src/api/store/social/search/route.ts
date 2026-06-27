import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/search?q=email — search users by exact email (unique ID)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const q = (req.query.q as string || "").trim().toLowerCase()
  if (q.length < 1) {
    return res.status(400).json({ error: "query too short" })
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `SELECT id, email, nickname, avatar
         FROM customer
         WHERE email = $1
           AND id != $2
         LIMIT 1`,
        [q, customerId]
      )
      return res.json({ data: result.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/search] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}