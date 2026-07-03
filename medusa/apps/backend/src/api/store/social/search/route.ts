import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/search?q=keyword&region=xxx — search users by email, company, services, job title, or work address
// Optional region filter: filters by work address (wp.office_address), not personal region.
// Returns up to 50 results with work profile info for business/service discovery.
// When no results match, returns a guidance message.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const q = (req.query.q as string || "").trim().toLowerCase()
  if (q.length < 1) {
    return res.status(400).json({ error: "query too short" })
  }

  const region = (req.query.region as string || "").trim().toLowerCase()

  const pattern = `%${q}%`

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      let sql: string
      let params: any[]

      if (region) {
        const regionPattern = `%${region}%`
        sql = `SELECT c.id, c.email, c.nickname, c.avatar, c.signature, c.region,
                      wp.company_name, wp.job_title, wp.services, wp.office_address, wp.contact
               FROM customer c
               LEFT JOIN work_profiles wp ON wp.customer_id = c.id
               WHERE (c.email ILIKE $1
                   OR wp.company_name ILIKE $1
                   OR wp.services ILIKE $1
                   OR wp.job_title ILIKE $1
                   OR wp.office_address ILIKE $1)
                 AND wp.office_address ILIKE $3
                 AND c.id != $2
               ORDER BY
                 CASE WHEN c.email ILIKE $1 THEN 0
                      WHEN wp.company_name ILIKE $1 THEN 1
                      WHEN wp.services ILIKE $1 THEN 2
                      ELSE 3
                 END
               LIMIT 50`
        params = [pattern, customerId, regionPattern]
      } else {
        sql = `SELECT c.id, c.email, c.nickname, c.avatar, c.signature, c.region,
                      wp.company_name, wp.job_title, wp.services, wp.office_address, wp.contact
               FROM customer c
               LEFT JOIN work_profiles wp ON wp.customer_id = c.id
               WHERE (c.email ILIKE $1
                   OR wp.company_name ILIKE $1
                   OR wp.services ILIKE $1
                   OR wp.job_title ILIKE $1
                   OR wp.office_address ILIKE $1)
                 AND c.id != $2
               ORDER BY
                 CASE WHEN c.email ILIKE $1 THEN 0
                      WHEN wp.company_name ILIKE $1 THEN 1
                      WHEN wp.services ILIKE $1 THEN 2
                      ELSE 3
                 END
               LIMIT 50`
        params = [pattern, customerId]
      }

      const result = await pool.query(sql, params)

      if (result.rows.length === 0) {
        let msg: string
        if (region) {
          msg = `在「${region}」没搜到相关商家。试试：\n✓ 写大范围（省、市、区名）\n✓ 换关键词（服务或公司名）\n✓ 或清空地区搜全国`
        } else {
          msg = "没搜到相关商家。试试：\n✓ 换个关键词（服务或公司名）\n✓ 或填上面的地区缩小范围"
        }
        return res.json({ data: [], message: msg })
      }

      return res.json({ data: result.rows })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/search] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}
