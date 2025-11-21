import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createMockSession, createMockAdminSession } from '../helpers/mock-auth'
import { createMockRequest, createMockRequestWithToken } from '../helpers/mock-request'

// Mock modules before importing the module under test
vi.mock('../../auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock('../../src/lib/api-tokens', () => ({
  validateApiToken: vi.fn(),
}))

vi.mock('../../src/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
  getRateLimitStatus: vi.fn(),
}))

vi.mock('../../src/lib/api-responses', () => ({
  unauthorizedResponse: vi.fn((message?: string) => {
    return NextResponse.json(
      { success: false, error: message || 'Authentication required' },
      { status: 401 }
    )
  }),
}))

// Now import the module under test
import {
  getUserFromSession,
  requireAuth,
  requireAdmin,
  optionalAuth,
  isAuthError,
  addRateLimitHeaders,
  withAuth,
  withAdmin,
  withOptionalAuth,
  AuthenticatedUser,
} from '../../src/lib/with-auth'

// Import mocked modules to get access to the mock functions
import { auth } from '../../auth'
import { validateApiToken } from '../../src/lib/api-tokens'
import { checkRateLimit, getRateLimitStatus } from '../../src/lib/rate-limiter'

// Get typed mocks
const mockAuth = vi.mocked(auth)
const mockValidateApiToken = vi.mocked(validateApiToken)
const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockGetRateLimitStatus = vi.mocked(getRateLimitStatus)

describe('with-auth', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(null as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUserFromSession', () => {
    it('should extract user from valid session', () => {
      const session = createMockSession({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
      })

      const user = getUserFromSession(session)

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
        authMethod: 'session',
      })
    })

    it('should extract admin user from admin session', () => {
      const session = createMockAdminSession()

      const user = getUserFromSession(session)

      expect(user?.isAdmin).toBe(true)
      expect(user?.authMethod).toBe('session')
    })

    it('should return null for null session', () => {
      const user = getUserFromSession(null)
      expect(user).toBeNull()
    })

    it('should return null for session without user', () => {
      const invalidSession = { expires: new Date().toISOString() } as Session
      const user = getUserFromSession(invalidSession)
      expect(user).toBeNull()
    })

    it('should set authMethod to session', () => {
      const session = createMockSession()
      const user = getUserFromSession(session)
      expect(user?.authMethod).toBe('session')
    })
  })

  describe('requireAuth - session authentication', () => {
    it('should authenticate with valid session', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const result = await requireAuth()

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.authMethod).toBe('session')
        expect(result.user.id).toBe('test-user-id')
        expect(result.session).toBe(session)
      }
    })

    it('should return error for unauthenticated session without request', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await requireAuth()

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(401)
      }
    })

    it('should preserve admin flag from session', async () => {
      const adminSession = createMockAdminSession()
      mockAuth.mockResolvedValue(adminSession as any)

      const result = await requireAuth()

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.isAdmin).toBe(true)
      }
    })
  })

  describe('requireAuth - API token authentication', () => {
    it('should authenticate with valid API token', async () => {
      mockAuth.mockResolvedValue(null as any) // No session
      const request = createMockRequestWithToken('valid-token-123')

      mockValidateApiToken.mockResolvedValue({
        userId: 'token-user-id',
        userEmail: 'token@example.com',
        userName: 'Token User',
        tokenId: 'token-123',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      mockGetRateLimitStatus.mockReturnValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      const result = await requireAuth(request)

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.authMethod).toBe('token')
        expect(result.user.id).toBe('token-user-id')
        expect(result.user.email).toBe('token@example.com')
        expect(result.user.tokenId).toBe('token-123')
        expect(result.rateLimit).toBeDefined()
      }
    })

    it('should return error for invalid API token', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequestWithToken('invalid-token')

      mockValidateApiToken.mockResolvedValue(null)

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        const body = await result.error.json()
        expect(body.error).toContain('Invalid or expired API token')
      }
    })

    it('should return 429 error when rate limit exceeded', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequestWithToken('valid-token')

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      const resetAt = new Date(Date.now() + 3600000)
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetAt,
      })

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(429)
        const body = await result.error.json()
        expect(body.error).toBe('Rate limit exceeded')
        expect(body.limit).toBe(100)
        expect(body.remaining).toBe(0)

        // Check rate limit headers
        expect(result.error.headers.get('X-RateLimit-Limit')).toBe('100')
        expect(result.error.headers.get('X-RateLimit-Remaining')).toBe('0')
        expect(result.error.headers.get('X-RateLimit-Reset')).toBeTruthy()
        expect(result.error.headers.get('Retry-After')).toBeTruthy()
      }
    })

    it('should prefer session auth over token auth when both present', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const request = createMockRequestWithToken('valid-token')

      const result = await requireAuth(request)

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.authMethod).toBe('session')
        expect(result.user.id).toBe('test-user-id')
      }

      // Token validation should not be called
      expect(mockValidateApiToken).not.toHaveBeenCalled()
    })

    it('should handle missing Authorization header', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequest()

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
    })

    it('should handle malformed Authorization header', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequest({
        headers: { authorization: 'InvalidFormat token123' },
      })

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
      expect(mockValidateApiToken).not.toHaveBeenCalled()
    })

    it('should handle Authorization header without Bearer prefix', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequest({
        headers: { authorization: 'token123' },
      })

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
      expect(mockValidateApiToken).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should allow admin user via session', async () => {
      const adminSession = createMockAdminSession()
      mockAuth.mockResolvedValue(adminSession as any)

      const result = await requireAdmin()

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.isAdmin).toBe(true)
      }
    })

    it('should deny non-admin user via session', async () => {
      const session = createMockSession({ isAdmin: false })
      mockAuth.mockResolvedValue(session as any)

      const result = await requireAdmin()

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(403)
        const body = await result.error.json()
        expect(body.error).toBe('Admin access required')
      }
    })

    it('should deny unauthenticated request', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await requireAdmin()

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(401)
      }
    })

    it('should deny API token users (tokens do not have isAdmin)', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequestWithToken('valid-token')

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      const result = await requireAdmin(request)

      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error.status).toBe(403)
      }
    })
  })

  describe('optionalAuth', () => {
    it('should return user when authenticated via session', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const result = await optionalAuth()

      expect(result.user).not.toBeNull()
      expect(result.user?.authMethod).toBe('session')
      expect(result.session).toBe(session)
    })

    it('should return user when authenticated via API token', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequestWithToken('valid-token')

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      mockGetRateLimitStatus.mockReturnValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      const result = await optionalAuth(request)

      expect(result.user).not.toBeNull()
      expect(result.user?.authMethod).toBe('token')
      expect(result.rateLimit).toBeDefined()
    })

    it('should return null when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await optionalAuth()

      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
      expect(result.rateLimit).toBeUndefined()
    })

    it('should never return error (even when rate limited)', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequestWithToken('valid-token')

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetAt: new Date(Date.now() + 3600000),
      })

      const result = await optionalAuth(request)

      // Should return null instead of error
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })
  })

  describe('isAuthError', () => {
    it('should return true for error result', () => {
      const errorResult = {
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }

      expect(isAuthError(errorResult)).toBe(true)
    })

    it('should return false for success result', () => {
      const session = createMockSession()
      const successResult = {
        user: getUserFromSession(session)!,
        session,
      }

      expect(isAuthError(successResult)).toBe(false)
    })
  })

  describe('addRateLimitHeaders', () => {
    it('should add rate limit headers when rate limit provided', () => {
      const response = NextResponse.json({ success: true })
      const rateLimit = {
        limit: 100,
        remaining: 75,
        resetAt: new Date('2025-01-01T12:00:00Z'),
      }

      const updatedResponse = addRateLimitHeaders(response, rateLimit)

      expect(updatedResponse.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(updatedResponse.headers.get('X-RateLimit-Remaining')).toBe('75')
      expect(updatedResponse.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('should not modify response when no rate limit provided', () => {
      const response = NextResponse.json({ success: true })
      const updatedResponse = addRateLimitHeaders(response, undefined)

      expect(updatedResponse.headers.get('X-RateLimit-Limit')).toBeNull()
      expect(updatedResponse.headers.get('X-RateLimit-Remaining')).toBeNull()
    })

    it('should calculate resetAt in seconds', () => {
      const response = NextResponse.json({ success: true })
      const resetAt = new Date('2025-01-01T12:00:00Z')
      const rateLimit = {
        limit: 100,
        remaining: 50,
        resetAt,
      }

      const updatedResponse = addRateLimitHeaders(response, rateLimit)
      const resetHeader = updatedResponse.headers.get('X-RateLimit-Reset')

      expect(resetHeader).toBe(Math.ceil(resetAt.getTime() / 1000).toString())
    })
  })

  describe('withAuth HOF', () => {
    it('should call handler when authenticated via session', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const mockHandler = vi.fn(async (req, user, sess) => {
        return NextResponse.json({ message: `Hello ${user.name}` })
      })

      const wrappedHandler = withAuth(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      const body = await response.json()
      expect(body.message).toBe('Hello Test User')
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const mockHandler = vi.fn()
      const wrappedHandler = withAuth(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })

    it('should add rate limit headers for API token auth', async () => {
      mockAuth.mockResolvedValue(null as any)

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      mockGetRateLimitStatus.mockReturnValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const wrappedHandler = withAuth(mockHandler)
      const request = createMockRequestWithToken('valid-token')
      const response = await wrappedHandler(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
    })

    it('should not add rate limit headers for session auth', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const wrappedHandler = withAuth(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
    })

    it('should pass context parameter to handler', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const mockHandler = vi.fn(async (req, user, sess, ctx) => {
        return NextResponse.json({ params: ctx })
      })

      const wrappedHandler = withAuth(mockHandler)
      const request = createMockRequest()
      const context = { params: { name: 'test-module' } }
      await wrappedHandler(request, context)

      expect(mockHandler).toHaveBeenCalledWith(request, expect.any(Object), session, context)
    })
  })

  describe('withAdmin HOF', () => {
    it('should call handler for admin user', async () => {
      const adminSession = createMockAdminSession()
      mockAuth.mockResolvedValue(adminSession as any)

      const mockHandler = vi.fn(async (req, user) => {
        return NextResponse.json({ message: `Admin: ${user.name}` })
      })

      const wrappedHandler = withAdmin(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      const body = await response.json()
      expect(body.message).toContain('Admin')
    })

    it('should return 403 for non-admin user', async () => {
      const session = createMockSession({ isAdmin: false })
      mockAuth.mockResolvedValue(session as any)

      const mockHandler = vi.fn()
      const wrappedHandler = withAdmin(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403)
    })

    it('should return 401 for unauthenticated user', async () => {
      mockAuth.mockResolvedValue(null as any)

      const mockHandler = vi.fn()
      const wrappedHandler = withAdmin(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
    })
  })

  describe('withOptionalAuth HOF', () => {
    it('should call handler with user when authenticated', async () => {
      const session = createMockSession()
      mockAuth.mockResolvedValue(session as any)

      const mockHandler = vi.fn(async (req, user, sess) => {
        return NextResponse.json({ authenticated: user !== null })
      })

      const wrappedHandler = withOptionalAuth(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      const body = await response.json()
      expect(body.authenticated).toBe(true)
    })

    it('should call handler with null user when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const mockHandler = vi.fn(async (req, user, sess) => {
        return NextResponse.json({ authenticated: user !== null })
      })

      const wrappedHandler = withOptionalAuth(mockHandler)
      const request = createMockRequest()
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      const body = await response.json()
      expect(body.authenticated).toBe(false)
    })

    it('should add rate limit headers for token auth', async () => {
      mockAuth.mockResolvedValue(null as any)

      mockValidateApiToken.mockResolvedValue({
        userId: 'user-id',
        userEmail: 'user@example.com',
        userName: 'User',
        tokenId: 'token-id',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      mockGetRateLimitStatus.mockReturnValue({
        limit: 100,
        remaining: 99,
        resetAt: new Date(Date.now() + 3600000),
      })

      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const wrappedHandler = withOptionalAuth(mockHandler)
      const request = createMockRequestWithToken('valid-token')
      const response = await wrappedHandler(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
    })
  })

  describe('edge cases and integration', () => {
    it('should handle concurrent session and token auth correctly', async () => {
      const session = createMockSession({ id: 'session-user' })
      mockAuth.mockResolvedValue(session as any)

      const request = createMockRequestWithToken('some-token')
      const result = await requireAuth(request)

      // Session should win
      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.id).toBe('session-user')
        expect(result.user.authMethod).toBe('session')
      }
    })

    it('should handle empty bearer token gracefully', async () => {
      mockAuth.mockResolvedValue(null as any)
      const request = createMockRequest({
        headers: { authorization: 'Bearer ' },
      })

      const result = await requireAuth(request)

      expect('error' in result).toBe(true)
    })

    it('should preserve all user properties from API token', async () => {
      mockAuth.mockResolvedValue(null as any)

      mockValidateApiToken.mockResolvedValue({
        userId: 'api-user-123',
        userEmail: 'api@example.com',
        userName: 'API User Name',
        tokenId: 'token-abc-123',
      })

      mockCheckRateLimit.mockReturnValue({
        allowed: true,
        limit: 100,
        remaining: 50,
        resetAt: new Date(Date.now() + 3600000),
      })

      mockGetRateLimitStatus.mockReturnValue({
        limit: 100,
        remaining: 50,
        resetAt: new Date(Date.now() + 3600000),
      })

      const request = createMockRequestWithToken('token')
      const result = await requireAuth(request)

      expect('user' in result).toBe(true)
      if ('user' in result) {
        expect(result.user.id).toBe('api-user-123')
        expect(result.user.email).toBe('api@example.com')
        expect(result.user.name).toBe('API User Name')
        expect(result.user.tokenId).toBe('token-abc-123')
        expect(result.user.authMethod).toBe('token')
      }
    })
  })
})
