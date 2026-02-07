import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db, findById } from "@/lib/db-adapter";
import { canApproveSubscription } from "@/lib/permissions";
import {
  successResponse,
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { IModule, ISubscription } from "@/models";
import { notifyUser } from "@/lib/notifications";

// PATCH /api/subscriptions/[id]/revoke - Revoke subscription
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

    if (subscription.status !== "approved") {
      return errorResponse("Subscription is not approved", 409);
    }

    // Get module to check permissions
    const moduleDoc = await findById<IModule>("modules", subscription.moduleId);

    if (!moduleDoc) {
      return notFoundResponse("Module");
    }

    // Check permission
    if (!canApproveSubscription(session, moduleDoc)) {
      return forbiddenResponse(
        "You do not have permission to revoke subscriptions for this module",
      );
    }

    // Update subscription
    const updates: Record<string, unknown> = {
      status: "revoked",
      revokedBy: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      revokedAt: new Date(),
    };

    if (reviewNotes) {
      updates.revokeReason = reviewNotes;
    }

    await db.subscriptions.updateOne({ _id: id }, { $set: updates });

    // Notify the requester about the revocation
    notifyUser(subscription.requestedBy.userId, {
      type: "subscription_revoked",
      title: "Subscription revoked",
      message: `Your access to ${subscription.moduleName} was revoked`,
      link: "/dashboard/subscriptions",
      metadata: {
        subscriptionId: id,
        moduleName: subscription.moduleName,
      },
    });

    const updatedSubscription = await findById<ISubscription>(
      "subscriptions",
      id,
    );
    return successResponse(updatedSubscription);
  } catch (error) {
    console.error("Error revoking subscription:", error);
    return serverErrorResponse("Failed to revoke subscription");
  }
}
