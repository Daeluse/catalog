import { db } from "@/lib/db-adapter";
import { IModule } from "@/models";

interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a specific user
 */
export async function notifyUser(
  userId: string,
  notification: NotificationPayload,
) {
  try {
    await db.notifications.insertOne({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      read: false,
      metadata: notification.metadata,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create notifications for all users who can approve subscriptions on a module.
 * This includes the module owner and maintainers with admin or write roles.
 */
export async function notifyModuleApprovers(
  module: IModule & { _id: string },
  notification: NotificationPayload,
) {
  const userIds = new Set<string>();

  // Module owner
  userIds.add(module.owner.userId);

  // Maintainers with admin or write role
  if (module.maintainers) {
    for (const maintainer of module.maintainers) {
      if (maintainer.role === "admin" || maintainer.role === "write") {
        userIds.add(maintainer.userId);
      }
    }
  }

  // Create a notification for each user
  const promises = Array.from(userIds).map((userId) =>
    notifyUser(userId, notification),
  );
  await Promise.all(promises);
}
