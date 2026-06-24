// Simple in-memory rate limiter for auth endpoints.
// Tracks failed attempts per IP, no external dependencies.
// Based on Medusa route files: import { checkRateLimit } from "../../lib/rate-limit"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 5 failed attempts per 5 minute window
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000
const KEY_PREFIX = "auth:"

// Periodic cleanup every 10 minutes — unref'd so it doesn't block shutdown
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}, 10 * 60 * 1000)

cleanupTimer.unref()

/**
 * Exported for testability — clears the rate-limit store and cancels the
 * cleanup interval so the process can exit cleanly.
 */
export function cleanupRateLimit(): void {
  clearInterval(cleanupTimer)
  store.clear()
}

/**
 * Checks whether the given IP has exceeded the rate limit.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const key = `${KEY_PREFIX}${ip}`
  let entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    store.set(key, entry)
  }

  entry.count++
  return entry.count <= MAX_ATTEMPTS
}

/**
 * Returns the number of remaining attempts for the given IP
 * within the current rate-limit window.
 */
export function getRateLimitRemaining(ip: string): number {
  const entry = store.get(`${KEY_PREFIX}${ip}`)
  if (!entry || entry.resetAt <= Date.now()) return MAX_ATTEMPTS
  return Math.max(0, MAX_ATTEMPTS - entry.count)
}
