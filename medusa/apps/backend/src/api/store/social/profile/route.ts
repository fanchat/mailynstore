import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getCustomerId } from "../utils"

// GET /store/social/profile — get my profile with work profile
// Optional ?customer_id=xxx to view another user's public profile
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const myId = getCustomerId(req)
  if (!myId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const targetId = (req.query.customer_id as string) || myId

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      const cust = await pool.query(
        `SELECT id, email, first_name, last_name, nickname, avatar, signature, region, gender, birthday
         FROM customer WHERE id = $1`,
        [targetId]
      )
      if (cust.rows.length === 0) {
        return res.status(404).json({ error: "customer not found" })
      }

      const c = cust.rows[0]

      const wp = await pool.query(
        `SELECT * FROM work_profiles WHERE customer_id = $1`,
        [targetId]
      )

      return res.json({
        data: {
          id: c.id,
          email: c.email,
          nickname: c.nickname,
          avatar: c.avatar,
          signature: c.signature,
          region: c.region,
          gender: c.gender,
          birthday: c.birthday,
          work_profile: wp.rows.length > 0 ? wp.rows[0] : null,
        },
      })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/profile] GET error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}

// PUT /store/social/profile — update profile fields
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "unauthorized" })
  }

  const { nickname, signature, region, gender, birthday,
          work_profile } = req.body as {
    nickname?: string
    signature?: string
    region?: string
    gender?: number
    birthday?: string
    work_profile?: {
      company_name?: string
      job_title?: string
      services?: string[]
      office_address?: string
      contact?: string
    }
  }

  try {
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl, max: 1 })
    try {
      // Update customer columns directly (not metadata)
      const updates: string[] = []
      const vals: any[] = []
      let idx = 1

      if (nickname !== undefined) { updates.push(`nickname = $${idx++}`); vals.push(nickname) }
      if (signature !== undefined) { updates.push(`signature = $${idx++}`); vals.push(signature) }
      if (region !== undefined) { updates.push(`region = $${idx++}`); vals.push(region) }
      if (gender !== undefined) { updates.push(`gender = $${idx++}`); vals.push(gender) }
      if (birthday !== undefined) { updates.push(`birthday = $${idx++}`); vals.push(birthday) }

      if (updates.length > 0) {
        vals.push(customerId)
        await pool.query(
          `UPDATE customer SET ${updates.join(", ")} WHERE id = $${idx}`,
          vals
        )
      }

      // Update work profile (upsert)
      if (work_profile) {
        const existing = await pool.query(
          `SELECT id FROM work_profiles WHERE customer_id = $1`,
          [customerId]
        )

        const wpData = {
          company_name: work_profile.company_name || null,
          job_title: work_profile.job_title || null,
          services: work_profile.services ? JSON.stringify(work_profile.services) : null,
          office_address: work_profile.office_address || null,
          contact: work_profile.contact || null,
        }

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE work_profiles SET company_name = $1, job_title = $2, services = $3,
             office_address = $4, contact = $5 WHERE customer_id = $6`,
            [wpData.company_name, wpData.job_title, wpData.services,
             wpData.office_address, wpData.contact, customerId]
          )
        } else {
          await pool.query(
            `INSERT INTO work_profiles (customer_id, company_name, job_title, services, office_address, contact)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [customerId, wpData.company_name, wpData.job_title, wpData.services,
             wpData.office_address, wpData.contact]
          )
        }
      }

      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[social/profile] PUT error:", err)
    return res.status(500).json({ error: "internal_error", detail: err instanceof Error ? err.message : String(err) })
  }
}