import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db } from "@/lib/db-adapter";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { checkModulePermission } from "@/lib/permissions";
import { ModuleUpdates } from "@/types/database";
import { IModule } from "@/models";

// GET /api/modules/[name] - Get module details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;

    const moduleDoc = await db.modules.findOne({ name });

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    return successResponse(moduleDoc);
  } catch (error) {
    console.error("Error fetching module:", error);
    return serverErrorResponse("Failed to fetch module");
  }
}

// PATCH /api/modules/[name] - Update module (authenticated, owner/maintainer only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { name } = await params;
    const body = await request.json();

    const moduleDoc = await db.modules.findOne({ name });

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    // Check permissions
    const isAdmin = user.isAdmin || false;
    const hasPermission = checkModulePermission(
      moduleDoc,
      user.id,
      isAdmin,
      "write",
    );

    if (!hasPermission) {
      return forbiddenResponse(
        "Insufficient permissions to update this module",
      );
    }

    // Update allowed fields
    const allowedFields = [
      "displayName",
      "description",
      "repository",
      "homepage",
      "keywords",
      "category",
      "icon",
      "status",
    ];

    const updates: ModuleUpdates = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field as keyof ModuleUpdates] = body[field];
      }
    }

    await db.modules.updateOne({ name }, { $set: updates as Partial<IModule> });

    const updated = await db.modules.findOne({ name });
    return successResponse(updated);
  } catch (error) {
    console.error("Error updating module:", error);
    return serverErrorResponse("Failed to update module");
  }
}
