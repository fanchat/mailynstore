import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { scryptSync, timingSafeEqual } from "crypto"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { Pool } from "pg"
import { checkRateLimit, getRateLimitRemaining } from "../../lib/rate-limit"
import { SignJWT } from "jose"

function verifyScrypt(password: string, storedB64: string): boolean {
  const raw = Buffer.from(storedB64, "base64")
  let off = 0
  const magic = raw.slice(off, off + 7).toString()
  if (magic !== "scrypt\u0000") return false
  off += 7
  const N = raw.readUInt32LE(off); off += 4
  const r = raw.readUInt32LE(off); off += 4
  const p = raw.readUInt32LE(off); off += 4
  const saltLen = raw.readUInt32LE(off); off += 4
  const salt = raw.subarray(off, off + saltLen); off += saltLen
  const expectedHash = raw.subarray(off, off + 32)
  const actualHash = scryptSync(password, salt, 32, { N, r, p })
  return timingSafeEqual(actualHash, expectedHash)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const clientIp = req.headers["x-forwarded-for"] as string || req.ip || "unknown"
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "too_many_requests", message: "Too many attempts. Try again later." })
  }

  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields", message: "email and password are required" })
  }

  const { projectConfig: { http, databaseUrl } } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const jwtSecret = http.jwtSecret
  if (!jwtSecret) {
    return res.status(500).json({ error: "server_error", message: "JWT_SECRET not configured" })
  }

  let pool: Pool | undefined
  try {
    pool = new Pool({ connectionString: databaseUrl, max: 1 })
    const piResult = await pool.query(
      `SELECT pi.auth_identity_id, pi.provider_metadata, ai.app_metadata
       FROM provider_identity pi
       JOIN auth_identity ai ON ai.id = pi.auth_identity_id
       WHERE pi.entity_id = $1 AND pi.provider = 'emailpass'`,
      [email]
    )

    if (piResult.rows.length === 0) {
      return res.status(401).json({ type: "unauthorized", message: "Invalid email or password" })
    }

    const rec = piResult.rows[0]
    const storedHash = rec.provider_metadata?.password
    if (!storedHash || !verifyScrypt(password, storedHash)) {
      return res.status(401).json({ type: "unauthorized", message: "Invalid email or password" })
    }

    // Find admin user — app_metadata.actor_id, then fallback to email lookup
    let userId = rec.app_metadata?.actor_id || null
    if (!userId) {
      const u = await pool.query(`SELECT id FROM "user" WHERE email = $1 AND deleted_at IS NULL`, [email])
      if (u.rows.length === 0) {
        return res.status(403).json({ type: "forbidden", message: "Email authenticated but no admin user found" })
      }
      userId = u.rows[0].id
    }

    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, avatar_url FROM "user" WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    )
    if (userResult.rows.length === 0) {
      return res.status(403).json({ type: "forbidden", message: "Admin user not found" })
    }

    const adminUser = userResult.rows[0]
    const now = Math.floor(Date.now() / 1000)

    const medusaToken = await new SignJWT({
      actor_id: adminUser.id,
      actor_type: "user",
      auth_identity_id: rec.auth_identity_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 7 * 24 * 3600)
      .sign(new TextEncoder().encode(jwtSecret))

    return res.json({
      medusa_token: medusaToken,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name || "",
        last_name: adminUser.last_name || "",
        avatar_url: adminUser.avatar_url || "",
      },
    })
  } catch (err) {
    console.error("[admin-auth] Error:", err)
    return res.status(500).json({ error: "internal_error", message: `Admin auth failed: ${err instanceof Error ? err.message : String(err)}` })
  } finally {
    if (pool) await pool.end()
  }
}
