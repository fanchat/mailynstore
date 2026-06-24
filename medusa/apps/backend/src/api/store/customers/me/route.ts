import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { Pool } from "pg"

interface AuthContext {
  actor_id: string
  auth_identity_id: string
  actor_type: string
}

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  // Get auth context from JWT (set by Medusa v2 middleware)
  const authContext = (req as any).auth_context as AuthContext | undefined

  if (!authContext) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Authentication required",
    })
  }

  const customerId = authContext.actor_id
  const authIdentityId = authContext.auth_identity_id

  if (!customerId || !authIdentityId) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid authentication context",
    })
  }

  try {
    // Resolve database URL from Medusa config
    const configModule = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    ) as { projectConfig: { databaseUrl: string } }
    const databaseUrl = configModule.projectConfig.databaseUrl

    if (!databaseUrl) {
      return res.status(500).json({
        error: "server_error",
        message: "Database URL not configured",
      })
    }

    const pool = new Pool({ connectionString: databaseUrl, max: 1 })

    try {
      // Step 1: Delete carts associated with this customer
      await pool.query(`DELETE FROM cart WHERE customer_id = $1`, [customerId])

      // Step 2: Anonymize orders by removing customer association
      // Set customer_id to NULL to disassociate from the deleted account
      await pool.query(
        `UPDATE "order" SET customer_id = NULL WHERE customer_id = $1`,
        [customerId]
      )

      // Step 3: Delete provider_identity for emailpass provider
      // Must be done before deleting auth_identity due to FK constraint
      await pool.query(
        `DELETE FROM provider_identity WHERE entity_id = $1 AND provider = 'emailpass'`,
        [customerId]
      )

      // Step 4: Delete auth_identity
      await pool.query(`DELETE FROM auth_identity WHERE id = $1`, [
        authIdentityId,
      ])

      // Step 5: Soft delete customer (set deleted_at, don't hard delete)
      await pool.query(
        `UPDATE customer SET deleted_at = now() WHERE id = $1`,
        [customerId]
      )

      return res.json({ success: true })
    } finally {
      await pool.end()
    }
  } catch (err) {
    console.error("[customers/me] DELETE error:", err)
    return res.status(500).json({
      error: "internal_error",
      message: `Failed to delete account: ${
        err instanceof Error ? err.message : String(err)
      }`,
    })
  }
}
