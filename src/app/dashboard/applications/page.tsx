"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Globe } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useFetch } from "@/hooks/useFetch";
import { apiDelete } from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";
import { IApplication } from "@/models";

export default function ApplicationsPage() {
  const { data, loading, error, refetch } =
    useFetch<PaginatedResponse<IApplication>>("/api/applications");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      setDeleteError("");
      await apiDelete(`/api/applications/${id}`);
      setDeleteId(null);
      await refetch();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete application",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading applications..." />;
  }

  const applications = data?.applications || [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-zinc-900">
            My Applications
          </h1>
          <p className="text-zinc-600">
            Manage your applications and their allowed origins for Module
            Federation access
          </p>
        </div>
        <Button as={Link} href="/dashboard/applications/new">
          <Plus className="h-4 w-4" />
          New Application
        </Button>
      </div>

      <ErrorMessage error={error} className="mb-6" />
      <ErrorMessage error={deleteError} className="mb-6" />

      {/* Empty state */}
      {applications.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No applications yet"
          description="Create your first application to start consuming Module Federation modules"
          action={
            <Button as={Link} href="/dashboard/applications/new">
              <Plus className="h-4 w-4" />
              Create Application
            </Button>
          }
        />
      ) : (
        /* Applications grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Card
              key={app._id.toString()}
              variant="outlined"
              className="flex flex-col p-6"
            >
              <div className="mb-4 flex-1">
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                  {app.name}
                </h3>
                <p className="mb-3 text-sm text-zinc-600">{app.description}</p>
                <div className="space-y-2 text-xs text-zinc-500">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    <span>{app.origins.length} origin(s)</span>
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span>{" "}
                    {app.contactEmail}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-zinc-200 pt-4">
                <Button
                  as={Link}
                  href={`/dashboard/applications/${app._id}/edit`}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(app._id.toString())}
                  className="border border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Application"
        description="Are you sure you want to delete this application? This will also delete all associated subscriptions. This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
