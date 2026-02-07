"use client";

import { useState, useCallback } from "react";
import { useFetch } from "@/hooks/useFetch";
import { apiPost } from "@/lib/api-client";
import type { PaginatedResponse, SubscriptionWithDetails } from "@/types/api";
import type { ISubscription } from "@/models";

interface UseSubscriptionOptions {
  applicationId: string;
}

interface UseSubscriptionReturn {
  loading: boolean;
  error: string;
  subscribingTo: string | null;
  getSubscription: (moduleId: string) => SubscriptionWithDetails | undefined;
  subscribe: (moduleId: string) => Promise<void>;
}

export function useSubscription({
  applicationId,
}: UseSubscriptionOptions): UseSubscriptionReturn {
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const {
    data: subsData,
    loading,
    refetch: refetchSubscriptions,
  } = useFetch<PaginatedResponse<ISubscription>>(
    "/api/subscriptions?limit=100",
  );

  const getSubscription = useCallback(
    (moduleId: string): SubscriptionWithDetails | undefined => {
      return subsData?.subscriptions?.find(
        (sub) =>
          sub.moduleId === moduleId &&
          sub.application?._id.toString() === applicationId,
      );
    },
    [subsData, applicationId],
  );

  const subscribe = useCallback(
    async (moduleId: string) => {
      try {
        setSubscribingTo(moduleId);
        setError("");

        await apiPost("/api/subscriptions", {
          applicationId,
          moduleId,
        });

        await refetchSubscriptions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setSubscribingTo(null);
      }
    },
    [applicationId, refetchSubscriptions],
  );

  return {
    loading,
    error,
    subscribingTo,
    getSubscription,
    subscribe,
  };
}
