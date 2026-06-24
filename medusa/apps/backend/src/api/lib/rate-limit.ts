// Bridge file — route.ts files import `../../lib/rate-limit` from within src/api/*,
// which resolves to this file (src/api/lib/rate-limit.ts). We re-export from the
// actual implementation at src/lib/rate-limit.ts.
export { checkRateLimit, getRateLimitRemaining, cleanupRateLimit } from "../../lib/rate-limit"
