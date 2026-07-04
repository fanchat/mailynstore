import { NextResponse } from "next/server"

// GET /api/carousel — fetch carousel items from mailynback public API
export async function GET() {
  try {
    const res = await fetch("http://192.168.1.126:7777/chatadmin/api/carousel/public", {
      next: { revalidate: 60 }, // cache for 60 seconds
    })
    if (!res.ok) {
      return NextResponse.json({ data: [] })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ data: [] })
  }
}
