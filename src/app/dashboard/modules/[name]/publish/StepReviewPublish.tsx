import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

interface VersionData {
  version: string
  buildTool: string
  buildToolVersion: string
  changelog: string
}

interface StepReviewPublishProps {
  versionData: VersionData
  uploadedAssets: any[]
  loading: boolean
  onPublish: () => void
  onBack: () => void
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
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">
          Review & Publish
        </h2>

        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Version
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
              {versionData.version}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Build Tool
            </dt>
            <dd className="mt-1 text-sm text-zinc-900 dark:text-white">
              {versionData.buildTool} {versionData.buildToolVersion}
            </dd>
          </div>
          {versionData.changelog && (
            <div>
              <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Changelog
              </dt>
              <dd className="mt-1 text-sm text-zinc-900 dark:text-white">
                {versionData.changelog}
              </dd>
            </div>
          )}
        </dl>

        {uploadedAssets.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Uploaded Assets ({uploadedAssets.length} files)
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
              {uploadedAssets.map((asset, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="truncate text-zinc-900 dark:text-white">
                    {asset.fileName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {(asset.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {uploadedAssets.length > 0 ? (
              <>
                <strong>Ready to publish:</strong> Your assets have been uploaded and will be
                associated with this version.
              </>
            ) : (
              <>
                <strong>Note:</strong> No assets were uploaded. You can still publish this
                version, but users won't be able to load the module until assets are added.
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
          {loading ? 'Publishing...' : 'Publish Version'}
        </Button>
      </div>
    </div>
  )
}
