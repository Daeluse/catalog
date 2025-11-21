import { NextRequest, NextResponse } from 'next/server'
import { validateApiToken } from './api-tokens'
import { checkRateLimit } from './rate-limiter'
import {
  unauthorizedResponse,
  forbiddenResponse,
} from './api-responses'

export interface ApiTokenUser {
  userId: string
  userEmail: string
  userName: string
  tokenId: string
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Authenticate request using API token
 * Returns user context if valid, or NextResponse with error if invalid
 */
export async function authenticateApiToken(
  request: NextRequest
): Promise<{ user: ApiTokenUser } | { error: NextResponse }> {
  // Extract token
  const token = extractBearerToken(request)
  if (!token) {
    return {
      error: unauthorizedResponse(
        'Missing or invalid Authorization header. Expected: Bearer mfc_...'
      ),
    }
  }

  // Validate token
  const user = await validateApiToken(token)
  if (!user) {
    return {
      error: unauthorizedResponse(
        'Invalid or expired API token'
      ),
    }
  }

  // Check rate limit
  const rateLimit = checkRateLimit(user.tokenId)
  if (!rateLimit.allowed) {
    const resetAtSeconds = Math.ceil(rateLimit.resetAt.getTime() / 1000)
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Rate limit: ${rateLimit.limit} requests per hour`,
        limit: rateLimit.limit,
        remaining: 0,
        resetAt: rateLimit.resetAt.toISOString(),
      },
      { status: 429 }
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', resetAtSeconds.toString())
    response.headers.set('Retry-After', Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString())

    return { error: response }
  }

  // Success - return user context
  return { user }
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  tokenId: string,
  rateLimit: { limit: number; remaining: number; resetAt: Date }
): NextResponse {
  const resetAtSeconds = Math.ceil(rateLimit.resetAt.getTime() / 1000)

  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', resetAtSeconds.toString())

  return response
}
