"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import type { INotification } from "@/models";
import type { NotificationsResponse } from "@/types/api";
import { timeAgo } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data, refetch } = useFetch<NotificationsResponse>(
    "/api/notifications?read=false&limit=5",
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  const handleMarkAllRead = useCallback(async () => {
    setOpen(false);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      refetch();
    } catch {
      // Silent bail on network failure
    }
  }, [refetch]);

  const handleNotificationClick = useCallback(
    async (notification: INotification & { _id: string }) => {
      setOpen(false);
      try {
        await fetch(`/api/notifications/${notification._id}/read`, {
          method: "PATCH",
        });
        if (!notification.link) {
          refetch();
        }
      } catch {
        // Silent bail on network failure
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [refetch, router],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative cursor-pointer p-1 text-zinc-600 hover:text-zinc-900">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg mr-2"
          sideOffset={5}
          align="end"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-zinc-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              No unread notifications
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className="cursor-pointer"
                  onSelect={() => handleNotificationClick(notification)}
                >
                  <div className="px-4 py-3 hover:bg-zinc-50 border-b border-gray-50 last:border-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {notification.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard/notifications");
              }}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-1"
            >
              View all notifications
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
