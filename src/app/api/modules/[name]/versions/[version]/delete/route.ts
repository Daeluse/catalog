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
import { IVersion } from "@/models";
import { Maintainer } from "@/types/api";

// Helper function to extract blob path from URL
function extractBlobPath(url: string): string | null {
  try {
    const containerName =
      process.env.AZURE_STORAGE_CONTAINER || "catalog-modules";

    // For mock mode: /api/assets/${containerName}/${blobPath}
    if (url.startsWith("/api/assets/")) {
      let blobPath = url.replace("/api/assets/", "");

      // Strip container name prefix if present
      if (blobPath.startsWith(`${containerName}/`)) {
        blobPath = blobPath.substring(containerName.length + 1);
      }

      return blobPath;
    }

    // For production mode: full Azure Blob Storage URL
    // Extract path after container name
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // Remove empty first element and container name
    const containerIndex = pathParts.indexOf(containerName);
    if (containerIndex >= 0) {
      return pathParts.slice(containerIndex + 1).join("/");
    }

    // Fallback: return the pathname without leading slash
    return urlObj.pathname.substring(1);
  } catch (error) {
    console.error("Error extracting blob path from URL:", url, error);
    return null;
  }
}

// Helper function to delete all assets for a version
async function deleteVersionAssets(versionDoc: IVersion): Promise<void> {
  const storage = getBlobStorageService();
  const blobPaths: string[] = [];

  // Collect all blob paths from the version's assets
  if (versionDoc.assets) {
    const { remoteEntry, manifest, assets } = versionDoc.assets;

    // Add required assets
    if (remoteEntry?.url) {
      const path = extractBlobPath(remoteEntry.url);
      if (path) blobPaths.push(path);
    }
    if (manifest?.url) {
      const path = extractBlobPath(manifest.url);
      if (path) blobPaths.push(path);
    }

    // Add chunk assets
    if (assets && Array.isArray(assets)) {
      for (const asset of assets) {
        if (asset?.url) {
          const path = extractBlobPath(asset.url);
          if (path) blobPaths.push(path);
        }
      }
    }
  }

  // Delete all collected blobs
  for (const blobPath of blobPaths) {
    try {
      await storage.deleteBlob(blobPath);
    } catch (error) {
      console.error(`Failed to delete blob ${blobPath}:`, error);
      // Continue deleting other blobs even if one fails
    }
  }
}

// POST /api/modules/[name]/versions/[version]/delete - Delete a specific version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; version: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) {
    return authResult.error;
  }
  const { user } = authResult;

  try {
    const { name, version } = await params;

    // Find module and check permissions
    const moduleDoc = await db.modules.findOne({ name });
    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    const isAdmin = user.isAdmin || false;
    const isOwner = moduleDoc.owner.userId === user.id;
    const isMaintainer = moduleDoc.maintainers?.some(
      (m: Maintainer) =>
        m.userId === user.id && ["admin", "write"].includes(m.role),
    );

    if (!isAdmin && !isOwner && !isMaintainer) {
      return forbiddenResponse(
        "You do not have permission to delete versions for this module",
      );
    }

    // Find the version
    const versionDoc = await db.versions.findOne({
      moduleName: name,
      version,
    });

    if (!versionDoc) {
      return notFoundResponse("Version");
    }

    // Delete associated assets from storage
    await deleteVersionAssets(versionDoc);

    // Delete the version
    await db.versions.deleteOne({ _id: versionDoc._id });

    // Update module's latest version if this was the latest
    if (moduleDoc.latestVersion === version) {
      const remainingVersions = await db.versions.find({ moduleName: name });
      if (remainingVersions.length > 0) {
        // Find the latest version from remaining versions
        remainingVersions.sort((a: IVersion, b: IVersion) => {
          return (
            new Date(b.publishedAt || b.createdAt).getTime() -
            new Date(a.publishedAt || a.createdAt).getTime()
          );
        });
        await db.modules.updateOne(
          { name },
          {
            $set: {
              latestVersion: remainingVersions[0].version,
              latestVersionId: remainingVersions[0]._id,
            },
          },
        );
      } else {
        // No versions left, clear latest version
        await db.modules.updateOne(
          { name },
          {
            $unset: {
              latestVersion: "",
              latestVersionId: "",
            },
          },
        );
      }
    }

    return successResponse({
      success: true,
      message: "Version deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting version:", error);
    return serverErrorResponse("Failed to delete version");
  }
}
