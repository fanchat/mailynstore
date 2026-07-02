import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const log = {
      time: new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "",
      ...body,
    }
    // Write to a log file
    const fs = await import("fs")
    const path = await import("path")
    const logFile = path.join(process.cwd(), ".client-errors.log")
    fs.appendFileSync(logFile, JSON.stringify(log) + "\n")
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
