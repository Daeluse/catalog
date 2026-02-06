import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import {
  noContentResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { revokeApiToken } from "@/lib/api-tokens";

// POST /api/api-tokens/[id]/delete - Revoke API token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const { id } = await params;

    const success = await revokeApiToken(id, user.id);

    if (!success) {
      return notFoundResponse("API token not found or already revoked");
    }

    return noContentResponse();
  } catch (error) {
    console.error("Error revoking API token:", error);
    return serverErrorResponse("Failed to revoke API token");
  }
}
