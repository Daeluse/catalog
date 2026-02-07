"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  BellOff,
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/Badge";
import { useFetch } from "@/hooks/useFetch";
import type { INotification } from "@/models";
import type { NotificationsResponse } from "@/types/api";
import { timeAgo } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type) {
    case "subscription_approved":
      return <CheckCircle size={18} className="text-green-500" />;
    case "subscription_rejected":
      return <XCircle size={18} className="text-red-500" />;
    case "subscription_revoked":
      return <AlertCircle size={18} className="text-orange-500" />;
    case "subscription_requested":
      return <Bell size={18} className="text-blue-500" />;
    default:
      return <Bell size={18} className="text-zinc-400" />;
  }
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const readParam = filter === "unread" ? "&read=false" : "";
  const { data, loading, error, refetch } =
    useFetch<NotificationsResponse>(
      `/api/notifications?limit=50${readParam}`,
    );

  const notifications = useMemo(
    () => data?.notifications ?? [],
    [data],
  );
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      refetch();
    } catch {
      // Silent bail on network failure
    }
  }, [refetch]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
        refetch();
      } catch {
        // Silent bail on network failure
      }
    },
    [refetch],
  );

  const handleNotificationClick = useCallback(
    async (notification: INotification & { _id: string }) => {
      if (!notification.read) {
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
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [refetch, router],
  );

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading notifications..." />;
  }

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "unread" as const, label: "Unread" },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-zinc-900">
            Notifications
          </h1>
          <p className="text-zinc-600">
            Stay up to date with subscription requests and updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      <ErrorMessage error={error} className="mb-6" />

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {tab.label}
            {tab.key === "unread" && unreadCount > 0 && (
              <>
                {" "}
                <Badge variant="danger">{unreadCount}</Badge>
              </>
            )}
          </button>
        ))}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={
            filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"
          }
          description={
            filter === "unread"
              ? "You're all caught up!"
              : "Notifications will appear here when there are subscription updates"
          }
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              variant="outlined"
              className={`cursor-pointer p-4 transition-colors hover:bg-zinc-50 ${
                !notification.read ? "border-l-4 border-l-blue-500" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm ${
                        notification.read
                          ? "text-zinc-700"
                          : "font-semibold text-zinc-900"
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(notification._id);
                    }}
                    className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
