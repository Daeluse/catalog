import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { createApiToken, listApiTokens } from "@/lib/api-tokens";

// GET /api/api-tokens - List user's API tokens
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const tokens = await listApiTokens(user.id);

    // Don't return the token hash
    const sanitizedTokens = tokens.map((token) => ({
      _id: token._id,
      name: token.name,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      status: token.status,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    }));

    return successResponse({ data: sanitizedTokens });
  } catch (error) {
    console.error("Error fetching API tokens:", error);
    return serverErrorResponse("Failed to fetch API tokens");
  }
}

// POST /api/api-tokens - Create new API token
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { name, expiresInDays } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      errors.name = "Token name is required";
    } else if (name.trim().length > 100) {
      errors.name = "Token name must be 100 characters or less";
    }

    if (!expiresInDays || typeof expiresInDays !== "number") {
      errors.expiresInDays = "Expiration period is required";
    } else if (![30, 60, 90, 365].includes(expiresInDays)) {
      errors.expiresInDays = "Expiration must be 30, 60, 90, or 365 days";
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Create token
    const { token, tokenRecord } = await createApiToken(
      user.id,
      user.email,
      user.name,
      name.trim(),
      expiresInDays,
    );

    if (tokenRecord == null) {
      return serverErrorResponse("Failed to create API token");
    }

    // Return token value (only time it will be shown) and record
    return createdResponse({
      data: {
        token, // Plain text token - only shown once!
        record: {
          _id: tokenRecord._id,
          name: tokenRecord.name,
          expiresAt: tokenRecord.expiresAt,
          status: tokenRecord.status,
          createdAt: tokenRecord.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error creating API token:", error);
    return serverErrorResponse("Failed to create API token");
  }
}
