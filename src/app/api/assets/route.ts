import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/with-auth";
import { getBlobStorageService } from "@/lib/storage";
import { successResponse, serverErrorResponse } from "@/lib/api-responses";

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
      let module: string | null = null;
      let version: string | null = null;

      const versionsIndex = parts.indexOf("versions");
      if (versionsIndex > 0) {
        module = parts.slice(0, versionsIndex).join("/");
        version = parts[versionsIndex + 1] ?? null;
      }

      return {
        name: blob.name,
        size: blob.size,
        module,
        version,
      };
    });

    return successResponse({ assets, total: assets.length });
  } catch (error) {
    console.error("Error listing storage assets:", error);
    return serverErrorResponse("Failed to list storage assets");
  }
}
