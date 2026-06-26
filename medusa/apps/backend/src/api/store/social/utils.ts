import { MedusaRequest } from "@medusajs/framework/http"

export interface AuthContext {
  actor_id: string
  auth_identity_id: string
  actor_type: string
}

export function getCustomerId(req: MedusaRequest): string | null {
  const authContext = (req as any).auth_context as AuthContext | undefined
  if (!authContext) return null
  return authContext.actor_id || null
}
