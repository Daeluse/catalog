import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db, findById } from "@/lib/db-adapter";
import { canApproveSubscription } from "@/lib/permissions";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { SubscriptionUpdates } from "@/types/database";
import { IModule, ISubscription } from "@/models";

// PATCH /api/subscriptions/[id]/approve - Approve subscription request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user, session } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reviewNotes } = body;

    const subscription = await findById<ISubscription>("subscriptions", id);

    if (!subscription) {
      return notFoundResponse("Subscription");
    }

    // Get module to check permissions
    const moduleDoc = await findById<IModule>("modules", subscription.moduleId);

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    // Check permission
    if (!canApproveSubscription(session, moduleDoc)) {
      return forbiddenResponse(
        "You do not have permission to approve subscriptions for this module",
      );
    }

    // Update subscription
    const updates: SubscriptionUpdates = {
      status: "approved",
      reviewedBy: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      reviewedAt: new Date(),
    };

    if (reviewNotes) {
      updates.reviewNotes = reviewNotes;
    }

    await db.subscriptions.updateOne({ _id: id }, { $set: updates });

    const updatedSubscription = await findById<ISubscription>(
      "subscriptions",
      id,
    );
    return successResponse(updatedSubscription);
  } catch (error) {
    console.error("Error approving subscription:", error);
    return serverErrorResponse("Failed to approve subscription");
  }
}
