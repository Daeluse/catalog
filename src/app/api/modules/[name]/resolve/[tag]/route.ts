import { NextRequest } from "next/server";
import {
  successResponse,
  notFoundResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import {
  ResolveNotFoundError,
  ResolveRequestError,
  resolveTag,
} from "@/lib/resolve-tag";

// GET /api/modules/[name]/resolve/[tag] - Resolve version tag to remote entry URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; tag: string }> },
) {
  try {
    const { name, tag } = await params;

    const resolvedVersion = await resolveTag(name, tag);

    return successResponse(resolvedVersion);
  } catch (e) {
    if (e instanceof ResolveNotFoundError) {
      return notFoundResponse(e.message);
    } else if (e instanceof ResolveRequestError) {
      return errorResponse(e.message);
    }
    console.error("Error resolving version tag:", e);
    return serverErrorResponse("Failed to resolve version tag");
  }
}
