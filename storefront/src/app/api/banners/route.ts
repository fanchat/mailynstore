import { NextResponse } from "next/server"

// GET /api/banners — fetch page banners from mailynback public API
export async function GET() {
  try {
    const host = process.env.MEDUSA_BACKEND?.replace(":9000", ":7777") || process.env.MAILYNBACK_URL || "http://localhost:7777"
    const res = await fetch(`${host}/chatadmin/api/banners/public`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return NextResponse.json({ data: { top: "", bottom: "" } })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ data: { top: "", bottom: "" } })
  }
}
