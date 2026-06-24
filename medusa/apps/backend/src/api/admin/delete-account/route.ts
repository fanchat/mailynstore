import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { Pool } from "pg"
import { randomUUID } from "crypto"

// PATCH: admin/delete-account
// 用户通过商城前端发起销户请求后，由 storefront server action 调此接口完成销户
// 放在 admin 命名空间以避免 publishable key 限制

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { projectConfig: { databaseUrl } } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  if (!databaseUrl) {
    return res.status(500).json({ error: "server_error", message: "DATABASE_URL not configured" })
  }

  // 获取当前认证信息
  const authContext = (req as any).auth_context || {}
  const actorId = authContext.actor_id       // customer.id (may be empty in v2)
  const authIdentityId = authContext.auth_identity_id

  if (!actorId && !authIdentityId) {
    return res.status(401).json({ error: "unauthorized", message: "Not authenticated" })
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 })
  try {
    // 1) 删除购物车
    await pool.query("DELETE FROM cart WHERE customer_id = $1", [actorId])

    // 2) 匿名化订单
    await pool.query('UPDATE "order" SET customer_id = NULL WHERE customer_id = $1', [actorId])

    // 3) 删除 emailpass provider_identity
    await pool.query("DELETE FROM provider_identity WHERE entity_id = $1 AND provider = 'emailpass'",
      [actorId])

    // 4) 删除 auth_identity
    if (authIdentityId) {
      await pool.query("DELETE FROM auth_identity WHERE id = $1", [authIdentityId])
    }

    // 5) 软删 customer
    await pool.query("UPDATE customer SET deleted_at = now() WHERE id = $1", [actorId])

    return res.json({ success: true })
  } catch (err) {
    console.error("[delete-account] Error:", err)
    return res.status(500).json({
      error: "internal_error",
      message: `Failed to delete account: ${err instanceof Error ? err.message : String(err)}`
    })
  } finally {
    await pool.end()
  }
}
