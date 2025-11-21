/**
 * Simple in-memory rate limiter for API tokens
 * Limit: 100 requests per hour per token
 *
 * For production with multiple instances, consider using Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: Date
}

// In-memory store: tokenId -> RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = new Date()
  for (const [tokenId, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(tokenId)
    }
  }
}, 10 * 60 * 1000)

const RATE_LIMIT = 100 // requests per hour
const WINDOW_MS = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Check if a token has exceeded the rate limit
 * Returns true if request is allowed, false if rate limit exceeded
 */
export function checkRateLimit(tokenId: string): {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
} {
  const now = new Date()
  const entry = rateLimitStore.get(tokenId)

  // No entry or expired window - create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = new Date(now.getTime() + WINDOW_MS)
    rateLimitStore.set(tokenId, {
      count: 1,
      resetAt,
    })

    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
      resetAt,
    }
  }

  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(tokenId, entry)

  return {
    allowed: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get current rate limit status for a token
 */
export function getRateLimitStatus(tokenId: string): {
  limit: number
  remaining: number
  resetAt: Date
} {
  const now = new Date()
  const entry = rateLimitStore.get(tokenId)

  if (!entry || entry.resetAt < now) {
    const resetAt = new Date(now.getTime() + WINDOW_MS)
    return {
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT,
      resetAt,
    }
  }

  return {
    limit: RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    resetAt: entry.resetAt,
  }
}

/**
 * Reset rate limit for a token (useful for testing)
 */
export function resetRateLimit(tokenId: string): void {
  rateLimitStore.delete(tokenId)
}
