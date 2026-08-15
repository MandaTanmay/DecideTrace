/**
 * lib/rate-limit.ts
 *
 * Enhanced rate limiter for Next.js App Router API routes.
 * Supports both in-memory (development) and Redis (production) backends.
 * Limits requests based on IP address to prevent brute-force attacks.
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
 * Redis client interface for distributed rate limiting
 * In production, implement this with actual Redis client
 */
interface RedisClient {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<void>
  get(key: string): Promise<string | null>
  del(key: string): Promise<void>
}

let redisClient: RedisClient | null = null

/**
 * Initialize Redis client for distributed rate limiting
 * Call this in production with actual Redis client
 */
export function initRedis(client: RedisClient): void {
  redisClient = client
}

/**
 * Checks if the given IP has exceeded the limit using Redis if available
 * @param identifier Unique identifier (IP, userId, etc.)
 * @param limit Max number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns boolean true if rate limit exceeded, false if allowed
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  // Use Redis if available (production)
  if (redisClient) {
    return checkRateLimitRedis(identifier, limit, windowMs)
  }

  // Fall back to in-memory (development)
  return checkRateLimitInMemory(identifier, limit, windowMs)
}

/**
 * In-memory rate limiting (development)
 */
function checkRateLimitInMemory(
  identifier: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now()
  const record = store.get(identifier)

  // Clean up expired records occasionally to prevent memory leaks
  if (store.size > 1000) {
    for (const [key, val] of store.entries()) {
      if (val.expiresAt < now) {
        store.delete(key)
      }
    }
  }

  if (!record) {
    store.set(identifier, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (now > record.expiresAt) {
    // Window expired, reset
    store.set(identifier, { count: 1, expiresAt: now + windowMs })
    return false
  }

  if (record.count >= limit) {
    return true // Exceeded
  }

  record.count += 1
  return false
}

/**
 * Redis-based rate limiting (production)
 */
async function checkRateLimitRedis(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  try {
    const key = `ratelimit:${identifier}`
    const current = await redisClient!.incr(key)
    
    if (current === 1) {
      // First request, set expiration
      await redisClient!.expire(key, Math.ceil(windowMs / 1000))
    }
    
    return current > limit
  } catch (error) {
    console.error('Redis rate limiting failed, falling back to allow:', error)
    // Fail open - allow request if Redis fails
    return false
  }
}

/**
 * Reset rate limit for a specific identifier
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(`ratelimit:${identifier}`)
    } catch (error) {
      console.error('Failed to reset rate limit in Redis:', error)
    }
  } else {
    store.delete(identifier)
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(
  identifier: string
): Promise<{ count: number; limit: number; remaining: number; resetAt: number } | null> {
  if (redisClient) {
    try {
      const key = `ratelimit:${identifier}`
      const current = await redisClient.get(key)
      if (current) {
        return {
          count: parseInt(current),
          limit: 100, // Default limit
          remaining: Math.max(0, 100 - parseInt(current)),
          resetAt: Date.now() + 60000, // Approximate
        }
      }
    } catch (error) {
      console.error('Failed to get rate limit status from Redis:', error)
    }
  } else {
    const record = store.get(identifier)
    if (record) {
      return {
        count: record.count,
        limit: 100,
        remaining: Math.max(0, 100 - record.count),
        resetAt: record.expiresAt,
      }
    }
  }
  
  return null
}
