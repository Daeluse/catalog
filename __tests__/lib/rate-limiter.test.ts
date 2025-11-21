import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { checkRateLimit, getRateLimitStatus, resetRateLimit } from '../../src/lib/rate-limiter'

describe('rate-limiter', () => {
  const testTokenId = 'test-token-123'

  beforeEach(() => {
    // Reset rate limit before each test
    resetRateLimit(testTokenId)
  })

  afterEach(() => {
    // Clean up after each test
    resetRateLimit(testTokenId)
    vi.restoreAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow first request and initialize rate limit', () => {
      const result = checkRateLimit(testTokenId)

      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(100)
      expect(result.remaining).toBe(99)
      expect(result.resetAt).toBeInstanceOf(Date)
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should decrement remaining count with each request', () => {
      const result1 = checkRateLimit(testTokenId)
      expect(result1.remaining).toBe(99)

      const result2 = checkRateLimit(testTokenId)
      expect(result2.remaining).toBe(98)

      const result3 = checkRateLimit(testTokenId)
      expect(result3.remaining).toBe(97)
    })

    it('should maintain same resetAt time within window', () => {
      const result1 = checkRateLimit(testTokenId)
      const resetAt1 = result1.resetAt.getTime()

      const result2 = checkRateLimit(testTokenId)
      const resetAt2 = result2.resetAt.getTime()

      expect(resetAt1).toBe(resetAt2)
    })

    it('should allow requests up to the limit', () => {
      // Make 99 requests (first one was made in initialization)
      for (let i = 0; i < 99; i++) {
        const result = checkRateLimit(testTokenId)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(99 - i)
      }
    })

    it('should deny requests after limit is reached', () => {
      // Make 100 requests to reach the limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(testTokenId)
      }

      // 101st request should be denied
      const result = checkRateLimit(testTokenId)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.limit).toBe(100)
    })

    it('should continue denying after limit is exceeded', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(testTokenId)
      }

      // Multiple requests after limit should all be denied
      const result1 = checkRateLimit(testTokenId)
      const result2 = checkRateLimit(testTokenId)
      const result3 = checkRateLimit(testTokenId)

      expect(result1.allowed).toBe(false)
      expect(result2.allowed).toBe(false)
      expect(result3.allowed).toBe(false)
    })

    it('should reset rate limit after window expires', () => {
      // Use fake timers
      vi.useFakeTimers()
      const now = new Date('2025-01-01T00:00:00Z')
      vi.setSystemTime(now)

      // Make first request
      const result1 = checkRateLimit(testTokenId)
      expect(result1.remaining).toBe(99)

      // Advance time by 1 hour + 1ms (window = 1 hour)
      vi.advanceTimersByTime(60 * 60 * 1000 + 1)

      // Next request should start a new window
      const result2 = checkRateLimit(testTokenId)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(99)
      expect(result2.resetAt.getTime()).toBeGreaterThan(result1.resetAt.getTime())

      vi.useRealTimers()
    })

    it('should handle multiple tokens independently', () => {
      const token1 = 'token-1'
      const token2 = 'token-2'

      // Make requests for token1
      checkRateLimit(token1)
      checkRateLimit(token1)
      const result1 = checkRateLimit(token1)

      // Make requests for token2
      const result2 = checkRateLimit(token2)

      // Token1 should have 97 remaining, token2 should have 99
      expect(result1.remaining).toBe(97)
      expect(result2.remaining).toBe(99)

      // Cleanup
      resetRateLimit(token1)
      resetRateLimit(token2)
    })

    it('should set resetAt to 1 hour from now on first request', () => {
      vi.useFakeTimers()
      const now = new Date('2025-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const result = checkRateLimit(testTokenId)
      const expectedResetAt = new Date('2025-01-01T13:00:00Z')

      expect(result.resetAt.getTime()).toBe(expectedResetAt.getTime())

      vi.useRealTimers()
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return initial status for new token', () => {
      const status = getRateLimitStatus(testTokenId)

      expect(status.limit).toBe(100)
      expect(status.remaining).toBe(100)
      expect(status.resetAt).toBeInstanceOf(Date)
      expect(status.resetAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return current status after requests', () => {
      checkRateLimit(testTokenId) // remaining: 99
      checkRateLimit(testTokenId) // remaining: 98
      checkRateLimit(testTokenId) // remaining: 97

      const status = getRateLimitStatus(testTokenId)

      expect(status.remaining).toBe(97)
      expect(status.limit).toBe(100)
    })

    it('should not modify rate limit count', () => {
      checkRateLimit(testTokenId) // remaining: 99

      const status1 = getRateLimitStatus(testTokenId)
      const status2 = getRateLimitStatus(testTokenId)
      const status3 = getRateLimitStatus(testTokenId)

      // All status checks should return same remaining count
      expect(status1.remaining).toBe(99)
      expect(status2.remaining).toBe(99)
      expect(status3.remaining).toBe(99)
    })

    it('should show 0 remaining after limit exceeded', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(testTokenId)
      }

      const status = getRateLimitStatus(testTokenId)
      expect(status.remaining).toBe(0)
    })

    it('should never show negative remaining count', () => {
      // Exhaust the limit and make extra requests
      for (let i = 0; i < 150; i++) {
        checkRateLimit(testTokenId)
      }

      const status = getRateLimitStatus(testTokenId)
      expect(status.remaining).toBe(0)
      expect(status.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should return fresh status after window expires', () => {
      vi.useFakeTimers()
      const now = new Date('2025-01-01T00:00:00Z')
      vi.setSystemTime(now)

      // Make requests
      checkRateLimit(testTokenId)
      checkRateLimit(testTokenId)

      // Advance time past window
      vi.advanceTimersByTime(60 * 60 * 1000 + 1)

      // Status should show fresh limits
      const status = getRateLimitStatus(testTokenId)
      expect(status.remaining).toBe(100)
      expect(status.limit).toBe(100)

      vi.useRealTimers()
    })

    it('should maintain same resetAt as checkRateLimit', () => {
      const checkResult = checkRateLimit(testTokenId)
      const status = getRateLimitStatus(testTokenId)

      expect(status.resetAt.getTime()).toBe(checkResult.resetAt.getTime())
    })
  })

  describe('resetRateLimit', () => {
    it('should clear rate limit for a token', () => {
      // Make some requests
      checkRateLimit(testTokenId)
      checkRateLimit(testTokenId)
      checkRateLimit(testTokenId)

      const beforeReset = getRateLimitStatus(testTokenId)
      expect(beforeReset.remaining).toBe(97)

      // Reset the rate limit
      resetRateLimit(testTokenId)

      // Next request should start fresh
      const afterReset = checkRateLimit(testTokenId)
      expect(afterReset.remaining).toBe(99)
    })

    it('should only reset specified token', () => {
      const token1 = 'token-1'
      const token2 = 'token-2'

      // Make requests for both tokens
      checkRateLimit(token1)
      checkRateLimit(token1)
      checkRateLimit(token2)

      // Reset only token1
      resetRateLimit(token1)

      // Token1 should be reset, token2 should retain count
      const status1 = checkRateLimit(token1)
      const status2 = getRateLimitStatus(token2)

      expect(status1.remaining).toBe(99) // Fresh
      expect(status2.remaining).toBe(99) // Still has 1 request counted

      // Cleanup
      resetRateLimit(token1)
      resetRateLimit(token2)
    })

    it('should handle resetting non-existent token', () => {
      // Should not throw error
      expect(() => resetRateLimit('non-existent-token')).not.toThrow()
    })

    it('should allow immediate fresh requests after reset', () => {
      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        checkRateLimit(testTokenId)
      }

      const beforeReset = checkRateLimit(testTokenId)
      expect(beforeReset.allowed).toBe(false)

      // Reset
      resetRateLimit(testTokenId)

      // Should allow requests again
      const afterReset = checkRateLimit(testTokenId)
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.remaining).toBe(99)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid sequential requests', () => {
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(testTokenId))
      }

      // All should be allowed
      results.forEach((result) => {
        expect(result.allowed).toBe(true)
      })

      // Remaining should decrease properly
      expect(results[0].remaining).toBe(99)
      expect(results[9].remaining).toBe(90)
    })

    it('should handle token IDs with special characters', () => {
      const specialTokens = [
        'token-with-dashes',
        'token_with_underscores',
        'token.with.dots',
        'token123with456numbers',
      ]

      specialTokens.forEach((tokenId) => {
        const result = checkRateLimit(tokenId)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(99)
        resetRateLimit(tokenId)
      })
    })

    it('should handle exactly at limit boundary', () => {
      // Make exactly 99 requests (100th is the limit)
      for (let i = 0; i < 99; i++) {
        checkRateLimit(testTokenId)
      }

      // 100th request should still be allowed
      const result100 = checkRateLimit(testTokenId)
      expect(result100.allowed).toBe(true)
      expect(result100.remaining).toBe(0)

      // 101st should be denied
      const result101 = checkRateLimit(testTokenId)
      expect(result101.allowed).toBe(false)
      expect(result101.remaining).toBe(0)
    })

    it('should maintain consistent state across check and get operations', () => {
      checkRateLimit(testTokenId) // 99
      const status1 = getRateLimitStatus(testTokenId)

      checkRateLimit(testTokenId) // 98
      const status2 = getRateLimitStatus(testTokenId)

      checkRateLimit(testTokenId) // 97
      const status3 = getRateLimitStatus(testTokenId)

      expect(status1.remaining).toBe(99)
      expect(status2.remaining).toBe(98)
      expect(status3.remaining).toBe(97)
    })
  })

  describe('time-based behavior', () => {
    it('should create new window when old one expires', () => {
      vi.useFakeTimers()
      const startTime = new Date('2025-01-01T00:00:00Z')
      vi.setSystemTime(startTime)

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        checkRateLimit(testTokenId)
      }

      const beforeExpiry = getRateLimitStatus(testTokenId)
      expect(beforeExpiry.remaining).toBe(50)

      // Advance time to just before expiry
      vi.advanceTimersByTime(60 * 60 * 1000 - 1000) // 59 minutes 59 seconds
      const almostExpired = checkRateLimit(testTokenId)
      expect(almostExpired.remaining).toBe(49) // Still in same window

      // Advance past expiry
      vi.advanceTimersByTime(2000) // Now 1 second past expiry
      const afterExpiry = checkRateLimit(testTokenId)
      expect(afterExpiry.remaining).toBe(99) // New window started

      vi.useRealTimers()
    })

    it('should calculate correct resetAt time', () => {
      vi.useFakeTimers()
      const fixedTime = new Date('2025-06-15T10:30:00Z')
      vi.setSystemTime(fixedTime)

      const result = checkRateLimit(testTokenId)
      const expectedResetAt = new Date('2025-06-15T11:30:00Z') // 1 hour later

      expect(result.resetAt.getTime()).toBe(expectedResetAt.getTime())

      vi.useRealTimers()
    })
  })
})
