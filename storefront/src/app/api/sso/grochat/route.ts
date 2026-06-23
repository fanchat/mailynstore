import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const GROCHAT_FRONTEND_URL = process.env.GROCHAT_FRONTEND_URL || "http://localhost:8081"
const STOREFRONT_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"

export async function GET() {
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"
  const cookieStore = await cookies()
  const jwt = cookieStore.get("_medusa_jwt")?.value

  if (!jwt) {
    return NextResponse.redirect(
      new URL(`/${defaultRegion}/account?login`, STOREFRONT_URL)
    )
  }

  // Medusa JWT 可直接在 GroChat 后端使用（AuthRequired 中间件用同一 JWT_SECRET 验签名）。
  // 不再需要 exchange 端点。Flutter 收到 token 后通过 /api/v1/user/me 获取用户信息。
  return NextResponse.redirect(
    new URL(`?token=${encodeURIComponent(jwt)}`, GROCHAT_FRONTEND_URL)
  )
}
