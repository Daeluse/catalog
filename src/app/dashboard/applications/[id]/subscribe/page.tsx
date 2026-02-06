"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Search } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { SubscriptionStatusBadge } from "@/components/SubscriptionStatusBadge";
import { Badge } from "@/components/Badge";
import { useFetch } from "@/hooks/useFetch";
import { apiPost } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";
import { IApplication, IModule, ISubscription } from "@/models";

export default function SubscribeToModulesPage() {
  const params = useParams();
  const id = params.id as string;

  const [search, setSearch] = useState("");
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: appData, loading: appLoading } = useFetch<IApplication>(
    `/api/applications/${id}`,
  );
  const { data: modulesData, loading: modulesLoading } = useFetch<
    PaginatedResponse<IModule>
  >("/api/modules?limit=100");
  const {
    data: subsData,
    loading: subsLoading,
    refetch: refetchSubscriptions,
  } = useFetch<PaginatedResponse<ISubscription>>(
    "/api/subscriptions?limit=100",
  );

  const loading = appLoading || modulesLoading || subsLoading;

  const getSubscriptionStatus = (
    moduleId: string,
  ): ISubscription | undefined => {
    return subsData?.subscriptions?.find(
      (sub) =>
        sub.moduleId === moduleId && sub.application?._id.toString() === id,
    );
  };

  const handleSubscribe = async (moduleId: string) => {
    try {
      setSubscribingTo(moduleId);
      setError("");

      await apiPost("/api/subscriptions", {
        applicationId: id,
        moduleId,
      });

      await refetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubscribingTo(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading modules..." />;
  }

  const modules = modulesData?.modules || [];
  const filteredModules = modules.filter(
    (module) =>
      module.name.toLowerCase().includes(search.toLowerCase()) ||
      module.displayName.toLowerCase().includes(search.toLowerCase()) ||
      module.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <Link
          href={`/dashboard/applications/${id}/edit`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Application
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">
          Subscribe to Modules
        </h1>
        <p className="text-zinc-600">
          Request access to Module Federation modules for{" "}
          <span className="font-medium">{appData?.name}</span>
        </p>
      </div>

      <ErrorMessage error={error} className="mb-6" />

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>
      </div>

      {/* Modules list */}
      {filteredModules.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? "No modules found" : "No modules available"}
          description={
            search
              ? "Try a different search term"
              : "No modules have been published yet"
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredModules.map((module) => {
            const subscription = getSubscriptionStatus(module._id.toString());
            const canSubscribe = !subscription;

            return (
              <Card
                key={module._id.toString()}
                variant="outlined"
                className="p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {module.displayName}
                        </h3>
                        <p className="text-sm text-zinc-500">{module.name}</p>
                      </div>
                      {subscription && (
                        <SubscriptionStatusBadge status={subscription.status} />
                      )}
                    </div>
                    <p className="mb-3 text-sm text-zinc-600">
                      {module.description}
                    </p>
                    <div className="flex gap-2">
                      <Badge>{module.organization}</Badge>
                      <Badge>{module.category}</Badge>
                      {module.latestVersion && (
                        <Badge>v{module.latestVersion}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    {canSubscribe ? (
                      <Button
                        onClick={() => handleSubscribe(module._id.toString())}
                        disabled={subscribingTo === module._id.toString()}
                        size="sm"
                      >
                        {subscribingTo === module._id.toString()
                          ? "Requesting..."
                          : "Subscribe"}
                      </Button>
                    ) : subscription?.status === "pending" ? (
                      <p className="text-sm text-zinc-500">Awaiting approval</p>
                    ) : subscription?.status === "approved" ? (
                      <p className="text-sm text-green-600">Access granted</p>
                    ) : subscription?.status === "rejected" ? (
                      <p className="text-sm text-red-600">Request rejected</p>
                    ) : (
                      <p className="text-sm text-zinc-500">Access revoked</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
