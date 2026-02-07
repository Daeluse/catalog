import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/with-auth";
import { db } from "@/lib/db-adapter";
import { successResponse, serverErrorResponse } from "@/lib/api-responses";
import { getPaginationParams } from "@/lib/pagination";

// GET /api/notifications - List notifications for current user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (isAuthError(authResult)) return authResult.error;

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const readParam = searchParams.get("read");
    const pagination = getPaginationParams(searchParams, { limit: 20 });

    const query: Record<string, unknown> = { userId: user.id };
    if (readParam !== null) {
      query.read = readParam === "true";
    }

    const [notifications, unreadCount, total] = await Promise.all([
      db.notifications.find(query, {
        sort: { createdAt: -1 },
        limit: pagination.limit,
        skip: pagination.skip,
      }),
      db.notifications.countDocuments({ userId: user.id, read: false }),
      db.notifications.countDocuments(query),
    ]);

    return successResponse({
      notifications,
      unreadCount,
      total,
      limit: pagination.limit,
      skip: pagination.skip,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return serverErrorResponse("Failed to fetch notifications");
  }
}
