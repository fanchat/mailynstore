import { NextRequest, NextResponse } from "next/server"
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "fs"
import { join } from "path"

const LOG_DIR = join(process.env.HOME || "/tmp", ".mailyn-ntlog")
const LOG_FILE = join(LOG_DIR, "ping.ndjson")

function ensureLog() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  const ua = req.headers.get("user-agent") || "unknown"
  const timestamp = new Date().toISOString()

  // 查 IP 归属地
  let geo: Record<string, string> = {}
  if (ip && ip !== "unknown" && ip !== "127.0.0.1" && ip !== "::1") {
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === "success") {
          geo = {
            country: data.country || "",
            region: data.regionName || "",
            city: data.city || "",
            isp: data.isp || data.org || "",
          }
        }
      }
    } catch {
      // 查询失败不影响测试
    }
  }

  const log = `${timestamp}  OK  IP=${ip}${geo.isp ? " ISP=" + geo.isp : ""}${geo.city ? " " + geo.city : ""} ua="${ua.substring(0, 80)}"`
  console.log("[NETTEST]", log)

  // 写入日志文件
  try {
    ensureLog()
    const record = JSON.stringify({ ts: timestamp, ip, geo, ua: ua.substring(0, 80) }) + "\n"
    appendFileSync(LOG_FILE, record, "utf-8")
  } catch {
    // 写文件失败不影响测试主流程
  }

  return NextResponse.json(
    { ok: true, ip, geo },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    }
  )
}
