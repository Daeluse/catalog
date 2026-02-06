import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db, findById } from "@/lib/db-adapter";
import { isApplicationOwner } from "@/lib/permissions";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { IApplication } from "@/models";

// POST /api/applications/[id]/delete - Delete application (authenticated, owner only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { session } = authResult;

  try {
    const { id } = await params;

    const application = await findById<IApplication>("applications", id);

    if (!application) {
      return notFoundResponse("Application");
    }

    // Check ownership
    if (!isApplicationOwner(session, application.owner.userId)) {
      return forbiddenResponse();
    }

    // Delete all subscriptions for this application
    const subscriptions = await db.subscriptions.find({ applicationId: id });
    for (const sub of subscriptions) {
      await db.subscriptions.deleteOne({ _id: sub._id });
    }

    await db.applications.deleteOne({ _id: id });

    return successResponse({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return serverErrorResponse("Failed to delete application");
  }
}
