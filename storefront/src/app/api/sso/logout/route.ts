import { NextResponse } from "next/server"
import { sdk } from "@lib/config"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"
  const locale = searchParams.get("locale") || defaultRegion

  try {
    // Clear Medusa JWT cookie
    const cookieStore = await cookies()
    cookieStore.set("_medusa_jwt", "", { maxAge: 0 })

    // Also call Medusa's logout API (non-blocking)
    await sdk.auth
      .logout()
      .then(() => {})
      .catch(() => {})
  } catch {
    // Best effort — cookie removal is what matters
  }

  return NextResponse.redirect(new URL(`/${locale}/account`, request.url))
}
