"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModuleGuide } from "@/components/ModuleGuide";
import { useFetch } from "@/hooks/useFetch";
import { apiDelete } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { PaginatedResponse } from "@/types/api";
import { IModule, IVersion } from "@/models";

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const moduleName = params.name as string;

  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState(false);
  const [deleteVersionConfirm, setDeleteVersionConfirm] = useState<{
    isOpen: boolean;
    version: IVersion | null;
  }>({
    isOpen: false,
    version: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const {
    data: module,
    loading: moduleLoading,
    error: moduleError,
    refetch: refetchModule,
  } = useFetch<IModule>(`/api/modules/${moduleName}`);

  const {
    data: versionsData,
    loading: versionsLoading,
    refetch: refetchVersions,
  } = useFetch<PaginatedResponse<IVersion>>(
    `/api/modules/${moduleName}/versions`,
  );

  const loading = moduleLoading || versionsLoading;
  const error = moduleError;
  const versions = versionsData?.versions || [];

  const handleDeleteModule = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(`/api/modules/${moduleName}`);
      router.push("/dashboard");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting the module",
      );
    } finally {
      setDeleting(false);
      setDeleteModuleConfirm(false);
    }
  };

  const handleDeleteVersion = async () => {
    if (!deleteVersionConfirm.version) return;

    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(
        `/api/modules/${moduleName}/versions/${deleteVersionConfirm.version.version}`,
      );
      await refetchVersions();
      await refetchModule();
      setDeleteVersionConfirm({ isOpen: false, version: null });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting the version",
      );
    } finally {
      setDeleting(false);
    }
  };

  // Check if user can manage this module (owner, maintainer, or admin)
  const canManage =
    module &&
    session?.user &&
    (session.user.isAdmin || module.owner.userId === session.user.id);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading module..." />;
  }

  if (error || !module) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Module Not Found</h1>
          <p className="mt-2 text-zinc-600">{error || "Module not found"}</p>
          <Button as={Link} href="/" variant="secondary" className="mt-4">
            ← Back to catalog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Catalog
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-900">{module.displayName}</span>
        </nav>

        <ErrorMessage error={deleteError} />

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {module.displayName}
                  </h1>
                  <p className="mt-1 text-zinc-600">{module.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {module.latestVersion && (
                    <Badge className="bg-zinc-900 px-4 py-2 text-white">
                      v{module.latestVersion}
                    </Badge>
                  )}
                  {canManage && (
                    <Button
                      onClick={() => setDeleteModuleConfirm(true)}
                      variant="secondary"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Delete Module
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-4 text-lg text-zinc-700">{module.description}</p>

              {/* Keywords */}
              {module.keywords && module.keywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {module.keywords.map((keyword) => (
                    <Badge key={keyword}>{keyword}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Installation */}
            {versions.length > 0 && (
              <div className="mb-8">
                <ModuleGuide
                  moduleName={module.name}
                  versions={versions}
                  defaultVersion={versions[0]?._id.toString()}
                />
              </div>
            )}

            {/* Versions */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Versions
                </h2>
                {canManage && (
                  <Button
                    as={Link}
                    href={`/dashboard/modules/${moduleName}/publish`}
                    size="sm"
                  >
                    Publish New Version
                  </Button>
                )}
              </div>
              {versions.length === 0 ? (
                <p className="text-zinc-600">No versions published yet.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version._id.toString()}
                      className="flex items-center justify-between border-b border-zinc-200 pb-3 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-zinc-900">
                            {version.version}
                          </span>
                          {version.isPrerelease && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Pre-release
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600">
                          Published {formatDate(version.publishedAt)} • Built
                          with {version.buildTool}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-zinc-600">
                          {version.downloadCount.toLocaleString()} downloads
                        </div>
                        {canManage && (
                          <Button
                            onClick={() =>
                              setDeleteVersionConfirm({ isOpen: true, version })
                            }
                            variant="secondary"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-zinc-900">Statistics</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-zinc-600">Total Downloads</dt>
                  <dd className="text-2xl font-bold text-zinc-900">
                    {module.totalDownloads.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-600">Weekly Downloads</dt>
                  <dd className="text-lg font-semibold text-zinc-900">
                    {module.weeklyDownloads.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-600">Latest Version</dt>
                  <dd className="font-mono text-sm font-semibold text-zinc-900">
                    {module.latestVersion || "N/A"}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Info */}
            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-zinc-900">Information</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-600">Organization</dt>
                  <dd className="mt-1 font-medium text-zinc-900">
                    {module.organization}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Category</dt>
                  <dd className="mt-1 font-medium capitalize text-zinc-900">
                    {module.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-600">Published by</dt>
                  <dd className="mt-1 font-medium text-zinc-900">
                    {module.owner.name}
                  </dd>
                </div>
              </dl>

              {/* Links */}
              <div className="mt-6 space-y-2">
                {module.homepage && (
                  <a
                    href={module.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-zinc-900 hover:text-zinc-600"
                  >
                    Homepage →
                  </a>
                )}
                {module.repository && (
                  <a
                    href={module.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-zinc-900 hover:text-zinc-600"
                  >
                    Repository →
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Module Confirmation */}
      <ConfirmDialog
        isOpen={deleteModuleConfirm}
        title="Delete Module"
        description={`Are you sure you want to delete "${module.displayName}"? This will delete all versions and cannot be undone.`}
        confirmText="Delete Module"
        onConfirm={handleDeleteModule}
        onClose={() => setDeleteModuleConfirm(false)}
        confirmVariant="danger"
        loading={deleting}
      />

      {/* Delete Version Confirmation */}
      <ConfirmDialog
        isOpen={deleteVersionConfirm.isOpen}
        title="Delete Version"
        description={`Are you sure you want to delete version ${deleteVersionConfirm.version?.version}? This action cannot be undone.`}
        confirmText="Delete Version"
        onConfirm={handleDeleteVersion}
        onClose={() =>
          setDeleteVersionConfirm({ isOpen: false, version: null })
        }
        confirmVariant="danger"
        loading={deleting}
      />
    </main>
  );
}
