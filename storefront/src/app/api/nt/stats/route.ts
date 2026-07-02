import { NextRequest, NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import { join } from "path"

const LOG_FILE = join(process.env.HOME || "/tmp", ".mailyn-ntlog", "ping.ndjson")

export async function GET(_req: NextRequest) {
  if (!existsSync(LOG_FILE)) {
    return NextResponse.json({ total: 0, today: 0, ips: [], carriers: [], history: [] })
  }

  const lines = readFileSync(LOG_FILE, "utf-8").trim().split("\n").filter(Boolean)
  const records = lines.map((l) => {
    try {
      return JSON.parse(l)
    } catch {
      return null
    }
  }).filter(Boolean)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const todayRecords = records.filter((r: any) => r.ts >= todayStart)

  // IP 统计
  const ipCount = new Map<string, number>()
  const carrierCount = new Map<string, number>()
  const citySet = new Set<string>()

  for (const r of todayRecords) {
    ipCount.set(r.ip, (ipCount.get(r.ip) || 0) + 1)
    if (r.geo?.isp) {
      const carrier = r.geo.isp.replace(/有限公司.*$/, "").substring(0, 20)
      carrierCount.set(carrier, (carrierCount.get(carrier) || 0) + 1)
    }
    if (r.geo?.city) citySet.add(r.geo.city)
  }

  // 按请求数排序
  const topIPs = [...ipCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([ip, count]) => {
      // 找该 IP 的最新记录获取 geo
      const last = todayRecords.filter((r: any) => r.ip === ip).pop()
      return { ip, count, geo: last?.geo || {} }
    })

  const topCarriers = [...carrierCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }))

  // 小时分布
  const hourCount = new Array(24).fill(0)
  for (const r of todayRecords) {
    const h = new Date(r.ts).getHours()
    hourCount[h]++
  }

  // 最近 50 条记录
  const recent = records.slice(-50).reverse()

  return NextResponse.json({
    total: records.length,
    today: todayRecords.length,
    todayIPs: ipCount.size,
    ips: topIPs,
    carriers: topCarriers,
    hours: hourCount,
    cities: [...citySet].join(", "),
    recent,
  })
}
