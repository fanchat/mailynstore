import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SignJWT, jwtVerify } from "jose"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { Pool } from "pg"
import { randomUUID } from "crypto"
import { checkRateLimit } from "../../lib/rate-limit"

// Minimal type for customer module service used in this route
interface CustomerModuleService {
  listCustomers(filters: { email: string }, options: { take: number }): Promise<any[]>
  createCustomers(data: { email: string; first_name: string; metadata: Record<string, unknown> }): Promise<any>
}

type GroChatClaims = {
  user_id: number
  username: string
  email: string
  exp: number
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const clientIp = req.headers["x-forwarded-for"] as string || req.ip || "unknown"
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: "too_many_requests", message: "Too many attempts. Try again later." })
  }

  const { grochat_token } = req.body as { grochat_token?: string }
  if (!grochat_token) {
    return res.status(400).json({ error: "missing_grochat_token", message: "grochat_token is required" })
  }

  // Use dedicated GroChat shared secret to verify incoming token,
  // not the admin JWT secret. This prevents SSO token → admin token forgery.
  const grochatSecret = process.env.GROCHAT_SHARED_SECRET
  if (!grochatSecret) {
    return res.status(500).json({ error: "server_error", message: "GROCHAT_SHARED_SECRET not configured" })
  }

  let claims: GroChatClaims | null = null
  try {
    const { payload } = await jwtVerify(grochat_token, new TextEncoder().encode(grochatSecret))
    claims = payload as GroChatClaims
  } catch { /* invalid or expired */ }
  if (!claims) return res.status(401).json({ error: "invalid_token", message: "GroChat token is invalid or expired" })

  try {
    // Get jwtSecret from Medusa config module for signing Medusa tokens
    const { projectConfig: { http } } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const jwtSecret = http.jwtSecret
    // Find or create Medusa customer by email
    // In Medusa v2, modules are registered by their module name
    const customerModuleService = req.scope.resolve("customer") as CustomerModuleService
    let [customer] = await customerModuleService.listCustomers(
      { email: claims.email },
      { take: 1 }
    )

    if (!customer) {
      customer = await customerModuleService.createCustomers({
        email: claims.email,
        first_name: claims.username || claims.email.split("@")[0],
        metadata: { grochat_user_id: claims.user_id, grochat_username: claims.username },
      })
    }

    // Get real auth_identity_id (not customer.id which is different)
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
    let authIdentityId: string
    try {
      const aiResult = await pool.query(
        `SELECT ai.id FROM auth_identity ai
         JOIN provider_identity pi ON pi.auth_identity_id = ai.id
         WHERE pi.entity_id = $1 AND pi.provider = 'grochat'`,
        [customer.id]
      )
      if (aiResult.rows.length > 0) {
        authIdentityId = aiResult.rows[0].id
      } else {
        // Create auth_identity + provider_identity for this SSO user
        const aiInsert = await pool.query(
          `INSERT INTO auth_identity (id, app_metadata, created_at, updated_at)
           VALUES ($1, '{}', now(), now()) RETURNING id`,
          [randomUUID()]
        )
        authIdentityId = aiInsert.rows[0].id
        await pool.query(
          `INSERT INTO provider_identity (id, auth_identity_id, provider, entity_id, provider_metadata, created_at, updated_at)
           VALUES ($1, $2, 'grochat', $3, '{}', now(), now())`,
          [randomUUID(), authIdentityId, customer.id]
        )
      }
    } finally {
      await pool.end()
    }

    // Sign a Medusa-compatible JWT
    const now = Math.floor(Date.now() / 1000)
    const medusaToken = await new SignJWT({
      actor_id: customer.id,
      actor_type: "customer",
      auth_identity_id: authIdentityId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(now)
      .setExpirationTime(now + 7 * 24 * 3600)
      .sign(new TextEncoder().encode(jwtSecret))

    return res.json({
      medusa_token: medusaToken,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name || "",
      },
    })
  } catch (err) {
    console.error("[grochat-auth] Error:", err)
    return res.status(500).json({ error: "internal_error", message: `Failed to process GroChat auth: ${err instanceof Error ? err.message : String(err)}` })
  }
}