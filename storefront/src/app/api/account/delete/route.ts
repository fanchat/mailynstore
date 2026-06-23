import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const GROCHAT_BACKEND_URL = process.env.GROCHAT_BACKEND_URL || "http://localhost:8080"

export async function POST(request: Request) {
  try {
    // Basic CSRF protection: check Origin or Referer
    const origin = request.headers.get("origin") || request.headers.get("referer") || ""
    const allowedBase = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000").replace(/\/$/, "")
    if (!origin.startsWith(allowedBase)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const cookieStore = await cookies()
    const jwt = cookieStore.get("_medusa_jwt")?.value

    if (!jwt) {
      return NextResponse.json({ error: "not logged in" }, { status: 401 })
    }

    // Call GroChat backend to delete the account
    const res = await fetch(`${GROCHAT_BACKEND_URL}/api/v1/user`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error")
      return NextResponse.json({ error: errText }, { status: 500 })
    }

    // Clear Medusa JWT cookie
    cookieStore.set("_medusa_jwt", "", { maxAge: 0 })

    const defaultRegion = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"
    return NextResponse.json({ success: true, redirect: `/${defaultRegion}/store` })
  } catch (err: any) {
    return NextResponse.json({ error: err.toString() }, { status: 500 })
  }
}
