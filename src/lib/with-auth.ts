/**
 * Authentication Helpers
 * Utilities for handling authentication in API routes
 * Supports both NextAuth session and API token authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Session } from "next-auth";
import { unauthorizedResponse } from "./api-responses";
import { validateApiToken } from "./api-tokens";
import { checkRateLimit, getRateLimitStatus } from "./rate-limiter";

/**
 * User information extracted from session or API token
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  tokenId?: string; // Present if authenticated via API token
  authMethod: "session" | "token"; // Track which auth method was used
}

/**
 * Extract user from session with type safety
 */
export function getUserFromSession(
  session: Session | null,
): AuthenticatedUser | null {
  if (!session?.user) return null;

  return {
    id: session.user.id!,
    email: session.user.email!,
    name: session.user.name!,
    isAdmin: session.user.isAdmin,
    authMethod: "session",
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Require authentication and return user or error response
 * Supports both NextAuth session and API token authentication
 * @param request - NextRequest object (optional, needed for API token auth)
 * @returns User object with session or rate limit info, or error response
 */
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  allowed: boolean;
}

export async function requireAuth(
  request?: NextRequest,
): Promise<
  | { user: AuthenticatedUser; session: Session; rateLimit?: RateLimitInfo }
  | { error: NextResponse }
> {
  // Clone request if provided
  const clonedRequest =
    request == null ? null : (request.clone() as NextRequest);

  // First, try session-based authentication
  const session = await auth();

  if (session?.user) {
    const user = getUserFromSession(session);
    if (user) {
      return { user, session };
    }
  }

  // If no session and request provided, try API token authentication
  if (clonedRequest) {
    const token = extractBearerToken(clonedRequest);
    if (token) {
      // Validate token
      const apiUser = await validateApiToken(token);
      if (!apiUser) {
        return {
          error: unauthorizedResponse("Invalid or expired API token"),
        };
      }

      // Check rate limit
      const rateLimit = checkRateLimit(apiUser.tokenId);
      if (!rateLimit.allowed) {
        const resetAtSeconds = Math.ceil(rateLimit.resetAt.getTime() / 1000);
        const response = NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: `Too many requests. Rate limit: ${rateLimit.limit} requests per hour`,
            limit: rateLimit.limit,
            remaining: 0,
            resetAt: rateLimit.resetAt.toISOString(),
          },
          { status: 429 },
        );

        // Add rate limit headers
        response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
        response.headers.set("X-RateLimit-Remaining", "0");
        response.headers.set("X-RateLimit-Reset", resetAtSeconds.toString());
        response.headers.set(
          "Retry-After",
          Math.ceil(
            (rateLimit.resetAt.getTime() - Date.now()) / 1000,
          ).toString(),
        );

        return { error: response };
      }

      // Convert API token user to AuthenticatedUser format
      const user: AuthenticatedUser = {
        id: apiUser.userId,
        email: apiUser.userEmail,
        name: apiUser.userName,
        tokenId: apiUser.tokenId,
        authMethod: "token",
      };

      // Return user with empty session and rate limit info
      return {
        user,
        session: {} as Session, // Empty session for token auth
        rateLimit: getRateLimitStatus(apiUser.tokenId),
      };
    }
  }

  // No valid authentication found
  return { error: unauthorizedResponse() };
}

/**
 * Require admin authentication
 * @param request - NextRequest object (optional, needed for API token auth)
 * @returns Admin user object or error response
 */
export async function requireAdmin(
  request?: NextRequest,
): Promise<
  | { user: AuthenticatedUser; session: Session; rateLimit?: RateLimitInfo }
  | { error: NextResponse }
> {
  const authResult = await requireAuth(request);

  if ("error" in authResult) {
    return authResult;
  }

  if (!authResult.user.isAdmin) {
    return {
      error: NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      ),
    };
  }

  return authResult;
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * @param request - NextRequest object (optional, needed for API token auth)
 * @returns User object or null (never returns error)
 */
export async function optionalAuth(request?: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  session: Session | null;
  rateLimit?: RateLimitInfo;
}> {
  const authResult = await requireAuth(request);

  if ("error" in authResult) {
    return { user: null, session: null };
  }

  return {
    user: authResult.user,
    session: authResult.session,
    rateLimit: authResult.rateLimit,
  };
}

/**
 * Type guard to check if auth result is an error
 */
export function isAuthError(
  result:
    | { user: AuthenticatedUser; session: Session; rateLimit?: RateLimitInfo }
    | { error: NextResponse },
): result is { error: NextResponse } {
  return "error" in result;
}

/**
 * Helper to add rate limit headers to response (for API token requests)
 */
export function addRateLimitHeaders(
  response: NextResponse,
  rateLimit?: RateLimitInfo,
): NextResponse {
  if (!rateLimit) {
    return response;
  }

  const resetAtSeconds = Math.ceil(rateLimit.resetAt.getTime() / 1000);
  response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", resetAtSeconds.toString());

  return response;
}

/**
 * Higher-order function to wrap route handlers with authentication
 * Supports both session and API token authentication
 * Usage:
 * export const GET = withAuth(async (request, user, session) => {
 *   // user is guaranteed to be authenticated (via session or API token)
 *   return successResponse({ message: `Hello ${user.name}` })
 * })
 */
export function withAuth(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    session: Session,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: Record<string, unknown>,
  ): Promise<NextResponse> => {
    const authResult = await requireAuth(request);

    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const response = await handler(
      request,
      authResult.user,
      authResult.session,
      context,
    );

    // Add rate limit headers if authenticated via API token
    if (authResult.rateLimit) {
      return addRateLimitHeaders(response, authResult.rateLimit);
    }

    return response;
  };
}

/**
 * Higher-order function to wrap route handlers with admin authentication
 * Supports both session and API token authentication
 */
export function withAdmin(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    session: Session,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: Record<string, unknown>,
  ): Promise<NextResponse> => {
    const authResult = await requireAdmin(request);

    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const response = await handler(
      request,
      authResult.user,
      authResult.session,
      context,
    );

    // Add rate limit headers if authenticated via API token
    if (authResult.rateLimit) {
      return addRateLimitHeaders(response, authResult.rateLimit);
    }

    return response;
  };
}

/**
 * Higher-order function for routes with optional authentication
 * Supports both session and API token authentication
 */
export function withOptionalAuth(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser | null,
    session: Session | null,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) {
  return async (
    request: NextRequest,
    context?: Record<string, unknown>,
  ): Promise<NextResponse> => {
    const { user, session, rateLimit } = await optionalAuth(request);
    const response = await handler(request, user, session, context);

    // Add rate limit headers if authenticated via API token
    if (rateLimit) {
      return addRateLimitHeaders(response, rateLimit);
    }

    return response;
  };
}
