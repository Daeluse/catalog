import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { FileUpload, type FileWithPath } from '@/components/FileUpload'

interface UploadedAsset {
  fileName: string
  size: number
}

interface StepUploadAssetsProps {
  assetFiles: FileWithPath[]
  uploadedAssets: UploadedAsset[]
  uploading: boolean
  onFilesSelected: (files: FileWithPath[]) => void
  onUpload: () => void
  onBack: () => void
}

export default function StepUploadAssets({
  assetFiles,
  uploadedAssets,
  uploading,
  onFilesSelected,
  onUpload,
  onBack,
}: StepUploadAssetsProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
          Upload Module Federation Assets
        </h2>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Upload your Module Federation build output folder (usually <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">dist</code>).
          The folder structure will be preserved, including the <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">assets/</code> directory.
        </p>

        <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Select your build output folder (e.g., dist) to upload all files at once with their folder structure preserved.
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            Required file: mf-manifest.json • Other files: remoteEntry.js, assets folder, chunks, CSS, etc.
          </p>
        </div>

        <FileUpload
          onFilesSelected={onFilesSelected}
          accept=".js,.json,.map,.css,.woff,.woff2,.ttf,.eot,.svg,.png,.jpg,.jpeg,.gif,.html"
          maxFiles={100}
          maxSize={25}
          multiple={true}
          allowDirectories={true}
          label="Module Assets"
          description="Select your build output folder (e.g., dist) to upload"
        />

        {uploadedAssets.length > 0 && (
          <div className="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Successfully uploaded {uploadedAssets.length} file(s)
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">
          Back
        </Button>
        <Button
          onClick={onUpload}
          disabled={assetFiles.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload & Continue'}
        </Button>
      </div>
    </div>
  )
}
