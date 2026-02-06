import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db } from "@/lib/db-adapter";
import { getBlobStorageService } from "@/lib/storage";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { checkModulePermission } from "@/lib/permissions";

// POST /api/modules/[name]/delete - Delete module (authenticated, owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { name } = await params;

    const moduleDoc = await db.modules.findOne({ name });

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    // Check permissions (owner or admin only)
    const isAdmin = user.isAdmin || false;
    const hasPermission = checkModulePermission(
      moduleDoc,
      user.id,
      isAdmin,
      "owner",
    );

    if (!hasPermission) {
      return forbiddenResponse("Only the module owner can delete this module");
    }

    // Delete all versions
    const versions = await db.versions.find({ moduleName: name });
    for (const v of versions) {
      await db.versions.deleteOne({ _id: v._id });
    }

    // Delete all associated assets from blob storage
    const storage = getBlobStorageService();
    try {
      // List all blobs with the module name prefix
      const blobs = await storage.listBlobs(name);

      // Delete each blob
      for (const blob of blobs) {
        try {
          await storage.deleteBlob(blob.name);
        } catch (error) {
          console.error(`Failed to delete blob ${blob.name}:`, error);
          // Continue with other blobs even if one fails
        }
      }
    } catch (error) {
      console.error("Error deleting module assets:", error);
      // Continue with module deletion even if asset cleanup fails
    }

    // Delete the module
    await db.modules.deleteOne({ name });

    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return serverErrorResponse("Failed to delete module");
  }
}
