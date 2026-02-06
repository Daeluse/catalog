import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Asset } from "@/models/Version";

interface VersionData {
  version: string;
  buildTool: string;
  buildToolVersion: string;
  changelog: string;
}

interface StepReviewPublishProps {
  versionData: VersionData;
  uploadedAssets: Asset[];
  loading: boolean;
  onPublish: () => void;
  onBack: () => void;
}

export default function StepReviewPublish({
  versionData,
  uploadedAssets,
  loading,
  onPublish,
  onBack,
}: StepReviewPublishProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900">
          Review & Publish
        </h2>

        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-zinc-600">Version</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {versionData.version}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-600">Build Tool</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              {versionData.buildTool} {versionData.buildToolVersion}
            </dd>
          </div>
          {versionData.changelog && (
            <div>
              <dt className="text-sm font-medium text-zinc-600">Changelog</dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {versionData.changelog}
              </dd>
            </div>
          )}
        </dl>

        {uploadedAssets.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-600">
              Uploaded Assets ({uploadedAssets.length} files)
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3">
              {uploadedAssets.map((asset, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-zinc-900">
                    {asset.fileName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {(asset.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            {uploadedAssets.length > 0 ? (
              <>
                <strong>Ready to publish:</strong> Your assets have been
                uploaded and will be associated with this version.
              </>
            ) : (
              <>
                <strong>Note:</strong> No assets were uploaded. You can still
                publish this version, but users won&apos;t be able to load the
                module until assets are added.
              </>
            )}
          </p>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button onClick={onPublish} disabled={loading}>
          {loading ? "Publishing..." : "Publish Version"}
        </Button>
      </div>
    </div>
  );
}
