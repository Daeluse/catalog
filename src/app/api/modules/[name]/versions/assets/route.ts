import { NextRequest } from "next/server";
import { getBlobStorageService } from "@/lib/storage";
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { Asset } from "@/models/Version";
import { env } from "@/lib/env";
import { requireAuth, isAuthError } from "@/lib/with-auth";

// POST /api/modules/[name]/versions/assets - Upload module assets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { name: moduleName } = await params;
    const formData = await request.formData();
    const version = formData.get("version") as string;
    const files = formData.getAll("files") as File[];
    const paths = formData.getAll("paths") as string[];

    if (!version) {
      return errorResponse("Version is required");
    }

    if (!files || files.length === 0) {
      return errorResponse("No files provided");
    }

    // Paths array should match files array length
    if (paths.length !== files.length) {
      return errorResponse("File paths mismatch");
    }

    // Get storage service
    const storage = getBlobStorageService();
    const uploadedAssets: Asset[] = [];

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // Upload each file with its relative path
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = paths[i] || file.name;

      // Reject path traversal
      if (relativePath.includes("..") || relativePath.startsWith("/")) {
        return errorResponse(`Invalid file path: ${file.name}`);
      }

      // Reject oversized files
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse(`File ${file.name} exceeds the 50MB size limit`);
      }

      // Store files with their folder structure: moduleName/versions/version/relativePath
      const blobPath = `${moduleName}/versions/${version}/${relativePath}`;
      const buffer = await file.arrayBuffer();

      try {
        const result = await storage.uploadBlob(blobPath, Buffer.from(buffer), {
          contentType: file.type || "application/octet-stream",
          metadata: {
            moduleName,
            version,
            relativePath,
            uploadedBy: user.email || "",
            uploadedAt: new Date().toISOString(),
          },
        });

        uploadedAssets.push({
          fileName: file.name,
          url: `/api/assets/${env.azureStorageContainer}/${blobPath}`,
          size: result.size,
          hash: result.hash,
        });
      } catch (uploadError) {
        console.error(`Error uploading ${relativePath}:`, uploadError);
        return serverErrorResponse(`Failed to upload ${relativePath}`);
      }
    }

    return successResponse({
      success: true,
      data: {
        assets: uploadedAssets,
        remoteEntry: uploadedAssets.find((a) =>
          a.fileName.includes("remoteEntry"),
        ),
        manifest: uploadedAssets.find((a) => a.fileName.includes("manifest")),
      },
      message: `Successfully uploaded ${uploadedAssets.length} file(s)`,
    });
  } catch (error) {
    console.error("Error uploading assets:", error);
    return serverErrorResponse("Failed to upload assets");
  }
}
