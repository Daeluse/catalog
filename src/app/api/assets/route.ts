import { NextRequest } from "next/server";
import { isAuthError, requireAdmin } from "@/lib/with-auth";
import { getBlobStorageService } from "@/lib/storage";
import {
  noContentResponse,
  notFoundResponse,
  successResponse,
  serverErrorResponse,
  validationErrorResponse,
} from "@/lib/api-responses";
import { validationMessages, validators } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if ("error" in authResult) return authResult.error;

  try {
    const storage = getBlobStorageService();
    const blobs = await storage.listBlobs();

    const searchParam = request.nextUrl.searchParams.get("search");
    const filtered = searchParam
      ? blobs.filter((b) =>
          b.name.toLowerCase().includes(searchParam.toLowerCase()),
        )
      : blobs;

    const assets = filtered.map((blob) => {
      const parts = blob.name.split("/");
      // Expected pattern: {moduleName}/versions/{version}/{fileName}
      let moduleName: string | null = null;
      let version: string | null = null;

      const versionsIndex = parts.indexOf("versions");
      if (versionsIndex > 0) {
        moduleName = parts.slice(0, versionsIndex).join("/");
        version = parts[versionsIndex + 1] ?? null;
      }

      return {
        name: blob.name,
        size: blob.size,
        module: moduleName,
        version,
      };
    });

    return successResponse({ assets, total: assets.length });
  } catch (error) {
    console.error("Error listing storage assets:", error);
    return serverErrorResponse("Failed to list storage assets");
  }
}

// POST /api/assets - Delete a storage asset (admin only)
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult.error;

  try {
    const body = await request.json();
    let { path } = body;

    console.log("FOO");
    console.log(body);
    console.log(path);

    // Validate required fields
    const errors: Record<string, string> = {};
    if (!validators.notEmpty(path || ""))
      errors.name = validationMessages.notEmpty;

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Strip container name prefix if present (matching GET handler pattern)
    const containerName =
      process.env.AZURE_STORAGE_CONTAINER || "catalog-modules";
    if (path.startsWith(`${containerName}/`)) {
      path = path.substring(containerName.length + 1);
    }

    const storage = getBlobStorageService();
    const deleted = await storage.deleteBlob(path);

    if (!deleted) {
      return notFoundResponse("Asset");
    }

    return noContentResponse();
  } catch (error) {
    console.error("Error deleting storage asset:", error);
    return serverErrorResponse("Failed to delete storage asset");
  }
}
