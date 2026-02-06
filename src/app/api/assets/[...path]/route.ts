import { NextRequest, NextResponse } from "next/server";
import { getBlobStorageService } from "@/lib/storage";
import { checkOriginApproval, setCorsHeaders } from "@/lib/cors";
import {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";

/**
 * Extract module name from asset path
 * Path format: {moduleName}/versions/{version}/{fileName}
 */
function extractModuleName(path: string[]): string | null {
  if (path.length < 3) return null;
  // Module name could be scoped (@org/name) or simple (name)
  // If path[0] starts with @, module name is path[0]/path[1]
  if (path[0].startsWith("@") && path.length >= 4) {
    return `${path[0]}/${path[1]}`;
  }
  return path[0];
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const origin = request.headers.get("origin");

    // Extract module name from path
    const moduleName = extractModuleName(path);

    if (!moduleName) {
      return errorResponse("Invalid path");
    }

    // Check if origin is approved for this module
    const approvedOrigin = await checkOriginApproval(origin, moduleName);

    if (!approvedOrigin) {
      return forbiddenResponse("Origin not approved for this module");
    }

    // Return successful preflight response with CORS headers
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, approvedOrigin);
  } catch (error) {
    console.error("Error handling OPTIONS request:", error);
    return serverErrorResponse("Failed to process request");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const origin = request.headers.get("origin");

    let blobPath = path.join("/");

    // Strip container name prefix if present (for mock storage compatibility)
    const containerName =
      process.env.AZURE_STORAGE_CONTAINER || "catalog-modules";
    if (blobPath.startsWith(`${containerName}/`)) {
      blobPath = blobPath.substring(containerName.length + 1);
    }

    // Extract module name for CORS check
    const moduleName = extractModuleName(path);

    if (!moduleName) {
      return errorResponse("Invalid path");
    }

    // Check CORS approval if origin header is present
    if (origin) {
      const approvedOrigin = await checkOriginApproval(origin, moduleName);

      if (!approvedOrigin) {
        return forbiddenResponse("Origin not approved for this module");
      }
    }

    const storage = getBlobStorageService();

    const result = await storage.downloadBlob(blobPath);

    if (!result) {
      return notFoundResponse("File");
    }

    const response = new NextResponse(new Uint8Array(result.data), {
      headers: {
        "Content-Type": result.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    // Add CORS headers if origin is present and approved
    if (origin) {
      const approvedOrigin = await checkOriginApproval(origin, moduleName);
      if (approvedOrigin) {
        return setCorsHeaders(response, approvedOrigin);
      }
    }

    return response;
  } catch (error) {
    console.error("Error serving asset:", error);
    return serverErrorResponse("Failed to serve asset");
  }
}
