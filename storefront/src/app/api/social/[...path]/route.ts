import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const MEDUSA_BACKEND = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

// Proxy /api/social/* to /store/social/*
// GET /api/social/feed?type=friend → GET /store/social/posts?type=friend
// POST /api/social/like → POST /store/social/posts/:id/like
// etc.
export async function GET(req: NextRequest) {
  return proxy(req)
}

export async function POST(req: NextRequest) {
  return proxy(req)
}

export async function DELETE(req: NextRequest) {
  return proxy(req)
}

export async function PUT(req: NextRequest) {
  return proxy(req)
}

export async function PATCH(req: NextRequest) {
  return proxy(req)
}

async function proxy(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value

  // Map frontend paths to backend paths
  const path = req.nextUrl.pathname.replace("/api/social", "/store/social")

  // Build query string
  const qs = req.nextUrl.searchParams.toString()
  const url = `${MEDUSA_BACKEND}${path}${qs ? "?" + qs : ""}`

  const method = req.method

  // Detect multipart upload — use FormData, don't set Content-Type
  const contentType = req.headers.get("content-type") || ""
  const isMultipart = contentType.includes("multipart/form-data")

  let body: string | FormData | undefined
  const headers: Record<string, string> = {
    "x-publishable-api-key": PUBLISHABLE_KEY,
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  if (isMultipart) {
    // Multipart upload: pass FormData through, let fetch set Content-Type with boundary
    try {
      body = await req.formData()
    } catch (e) {
      return NextResponse.json(
        { error: "proxy_error", detail: String(e) },
        { status: 400 }
      )
    }
  } else if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    // JSON body: use existing logic
    headers["Content-Type"] = "application/json"
    try {
      body = await req.text()
    } catch {}
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body || undefined,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    return NextResponse.json(
      { error: "proxy_error", detail: String(err) },
      { status: 502 }
    )
  }
}