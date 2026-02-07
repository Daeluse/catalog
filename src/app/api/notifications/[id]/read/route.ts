import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db, findById } from "@/lib/db-adapter";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-responses";
import { INotification } from "@/models";

// PATCH /api/notifications/[id]/read - Mark a single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { id } = await params;

    const notification = await findById<INotification>("notifications", id);

    if (!notification) {
      return notFoundResponse("Notification");
    }

    if (notification.userId !== user.id) {
      return forbiddenResponse("You do not own this notification");
    }

    await db.notifications.updateOne({ _id: id }, { $set: { read: true } });

    return successResponse({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return serverErrorResponse("Failed to mark notification as read");
  }
}
