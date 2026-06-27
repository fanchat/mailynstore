import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/search?q=keyword — search users by email, company, services, or job title
// Returns up to 50 results with work profile info for business/service discovery
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const q = (req.query.q as string || "").trim().toLowerCase()
  if (q.length < 1) {
    return res.status(400).json({ error: "query too short" })
  }

  const pattern = `%${q}%`

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const result = await pool.query(
        `SELECT c.id, c.email, c.nickname, c.avatar, c.signature,
                wp.company_name, wp.job_title, wp.services, wp.office_address, wp.contact
         FROM customer c
         LEFT JOIN work_profiles wp ON wp.customer_id = c.id
         WHERE (c.email ILIKE $1
             OR wp.company_name ILIKE $1
             OR wp.services ILIKE $1
             OR wp.job_title ILIKE $1)
           AND c.id != $2
         ORDER BY
           CASE WHEN c.email ILIKE $1 THEN 0
                WHEN wp.company_name ILIKE $1 THEN 1
                WHEN wp.services ILIKE $1 THEN 2
                ELSE 3
           END
         LIMIT 50`,
        [pattern, customerId]
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