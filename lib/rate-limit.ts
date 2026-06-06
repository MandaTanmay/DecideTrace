/**
 * lib/rate-limit.ts
 *
 * A simple in-memory rate limiter for Next.js App Router API routes.
 * Limits requests based on IP address to prevent brute-force attacks.
 * Note: In a true serverless environment with multiple edge nodes,
 * an external store like Redis/Upstash is recommended. This works perfectly
 * for single-region deployments.
 */

interface RateLimitTracker {
  count: number
  expiresAt: number
}

// Global store to persist across hot-reloads in development
declare global {
  // eslint-disable-next-line no-var
  var _rateLimitStore: Map<string, RateLimitTracker> | undefined
}

const store = global._rateLimitStore || new Map<string, RateLimitTracker>()
if (process.env.NODE_ENV !== 'production') {
  global._rateLimitStore = store
}

/**
 * Checks if the given IP has exceeded the limit.
 * @param ip The IP address of the client
 * @param limit Max number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns boolean true if rate limit exceeded, false if allowed
 */
export function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = store.get(ip)

  // Clean up expired records occasionally to prevent memory leaks
  if (store.size > 1000) {
    for (const [key, val] of store.entries()) {
      if (val.expiresAt < now) {
        store.delete(key)
      }
    }
  }

  if (!record) {
    store.set(ip, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (now > record.expiresAt) {
    // Window expired, reset
    store.set(ip, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (record.count >= limit) {
    return true // Exceeded
  }

  record.count += 1
  return false
}
