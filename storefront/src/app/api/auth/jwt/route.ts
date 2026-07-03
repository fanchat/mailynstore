import { NextResponse } from "next/server"
import { cookies } from "next/headers"

// Client-side JS calls this to read the HttpOnly _medusa_jwt cookie
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value || null
  return NextResponse.json({ token })
}
