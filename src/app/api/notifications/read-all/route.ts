import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db } from "@/lib/db-adapter";
import { successResponse, serverErrorResponse } from "@/lib/api-responses";

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const result = await db.notifications.updateMany(
      { userId: user.id, read: false },
      { $set: { read: true } },
    );

    return successResponse({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return serverErrorResponse("Failed to mark notifications as read");
  }
}
