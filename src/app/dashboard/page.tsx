"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useFetch } from "@/hooks/useFetch";
import { apiDelete } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import { IModule } from "@/models";

export default function DashboardPage() {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    module: IModule | null;
  }>({
    isOpen: false,
    module: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { data, loading, refetch } =
    useFetch<PaginatedResponse<IModule>>("/api/modules");
  const modules = data?.modules || [];

  const handleDeleteModule = async () => {
    if (!deleteConfirm.module) return;

    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(
        `/api/modules/${encodeURIComponent(deleteConfirm.module.name)}`,
      );
      await refetch();
      setDeleteConfirm({ isOpen: false, module: null });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting the module",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="mt-2 text-zinc-600">
            Manage your Module Federation modules
          </p>
        </div>

        <ErrorMessage error={deleteError} />

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-600">Total Modules</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {modules.length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-600">Total Downloads</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {modules
                .reduce((sum, m) => sum + m.totalDownloads, 0)
                .toLocaleString()}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-600">Active Modules</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {modules.length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-zinc-600">Total Versions</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {modules.filter((m) => m.latestVersion).length}
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Button as={Link} href="/dashboard/modules/new">
            <Plus className="h-5 w-5" />
            Create New Module
          </Button>
        </div>

        {/* Modules List */}
        <div>
          <h2 className="mb-4 text-xl font-semibold text-zinc-900">
            Your Modules
          </h2>

          {modules.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No modules yet"
              description="You haven't published any modules yet."
              action={
                <Button as={Link} href="/dashboard/modules/new">
                  Create your first module
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <Card key={module._id.toString()} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {module.displayName}
                        </h3>
                        {module.latestVersion && (
                          <Badge>v{module.latestVersion}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {module.name}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">
                        {module.description}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <span className="capitalize">{module.category}</span>
                        <span>•</span>
                        <span>
                          {module.totalDownloads.toLocaleString()} downloads
                        </span>
                        <span>•</span>
                        <span>Updated {formatDate(module.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        as={Link}
                        href={`/modules/${encodeURIComponent(module.name)}`}
                        variant="secondary"
                        size="sm"
                      >
                        View
                      </Button>
                      <Button
                        as={Link}
                        href={`/dashboard/modules/${encodeURIComponent(module.name)}/edit`}
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, module })
                        }
                        variant="secondary"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Module"
        description={`Are you sure you want to delete "${deleteConfirm.module?.displayName}"? This will delete all versions and cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteModule}
        onClose={() => setDeleteConfirm({ isOpen: false, module: null })}
        confirmVariant="danger"
        loading={deleting}
      />
    </main>
  );
}
