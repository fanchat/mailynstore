// Simple in-memory rate limiter for auth endpoints.
// Tracks failed attempts per IP, no external dependencies.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 5 failed attempts per 5 minute window
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 10 * 60 * 1000)

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `auth:${ip}`
  let entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    store.set(key, entry)
  }

  entry.count++
  return entry.count <= MAX_ATTEMPTS
}

export function getRateLimitRemaining(ip: string): number {
  const entry = store.get(`auth:${ip}`)
  if (!entry || entry.resetAt <= Date.now()) return MAX_ATTEMPTS
  return Math.max(0, MAX_ATTEMPTS - entry.count)
}
