import { jwtVerify } from "jose"
import { Pool } from "pg"

export interface AuthUser {
  customer_id: string
  nickname: string | null
  avatar: string | null
  email: string
}

const JWT_SECRET = process.env.JWT_SECRET || ""
const DATABASE_URL = process.env.DATABASE_URL || ""

export async function verifyToken(token: string): Promise<AuthUser | null> {
  if (!JWT_SECRET) {
    console.error("[auth] JWT_SECRET not configured")
    return null
  }

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] })

    const customerId = payload.actor_id as string | undefined
    if (!customerId) return null

    // Look up customer details
    const pool = new Pool({ connectionString: DATABASE_URL, max: 1 })
    try {
      const result = await pool.query(
        `SELECT id, nickname, avatar, email FROM customer WHERE id = $1 AND deleted_at IS NULL`,
        [customerId]
      )
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        customer_id: row.id,
        nickname: row.nickname,
        avatar: row.avatar,
        email: row.email,
      }
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[auth] Token verification failed:", err)
    return null
  }
}
