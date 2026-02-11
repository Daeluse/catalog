"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HardDrive, Search, FileBox, Trash2 } from "lucide-react";

import { useFetch } from "@/hooks/useFetch";
import { apiPost } from "@/lib/api-client";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EmptyState } from "@/components/EmptyState";

interface StorageAsset {
  name: string;
  size: number;
  module: string | null;
  version: string | null;
}

interface StorageResponse {
  assets: StorageAsset[];
  total: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AdminStoragePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteAsset, setDeleteAsset] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const url = session?.user?.isAdmin ? "/api/assets" : null;
  const { data, loading, error, refetch } = useFetch<StorageResponse>(url);

  const handleDelete = async () => {
    if (!deleteAsset) return;
    try {
      setDeleting(true);
      await apiPost(`/api/assets`, {
        path: deleteAsset,
      });
      await refetch();
    } catch {
      // Error is handled by the refetch/UI
    } finally {
      setDeleting(false);
      setDeleteAsset(null);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    if (!search) return data.assets;
    const term = search.toLowerCase();
    return data.assets.filter((a) => a.name.toLowerCase().includes(term));
  }, [data, search]);

  const totalSize = useMemo(
    () => filteredAssets.reduce((sum, a) => sum + a.size, 0),
    [filteredAssets],
  );

  // Redirect non-admins once session is loaded
  if (sessionStatus !== "loading" && !session?.user?.isAdmin) {
    router.replace("/dashboard");
    return null;
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner message="Loading storage assets..." />
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Storage Assets</h1>
        <p className="text-gray-600">Browse all files stored in blob storage</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage error={error} />
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <FileBox className="h-8 w-8 text-zinc-400" />
            <div>
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredAssets.length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <HardDrive className="h-8 w-8 text-zinc-400" />
            <div>
              <p className="text-sm text-gray-500">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatFileSize(totalSize)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 py-2 pl-10 pr-4 text-sm focus:border-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Asset list */}
      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={FileBox}
          title="No assets found"
          description={
            search
              ? "No assets match your search criteria."
              : "No files are currently stored in blob storage."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => {
            const fileName = asset.name.split("/").pop() || asset.name;
            return (
              <Card key={asset.name} variant="outlined">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {fileName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {asset.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {asset.module && (
                      <Badge variant="info">{asset.module}</Badge>
                    )}
                    {asset.version && (
                      <Badge variant="default">v{asset.version}</Badge>
                    )}
                    <Badge variant="success">
                      {formatFileSize(asset.size)}
                    </Badge>
                    <button
                      onClick={() => setDeleteAsset(asset.name)}
                      className="ml-1 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteAsset !== null}
        title="Delete Asset"
        description={`Are you sure you want to delete "${deleteAsset}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteAsset(null)}
        confirmVariant="danger"
        loading={deleting}
      />
    </main>
  );
}
