'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/Button'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useFetch } from '@/hooks/useFetch'
import { apiPost } from '@/lib/api-client'
import type { Module } from '@/types/api'
import type { FileWithPath } from '@/components/FileUpload'
import WizardProgress from './WizardProgress'
import StepVersionInfo from './StepVersionInfo'
import StepUploadAssets from './StepUploadAssets'
import StepReviewPublish from './StepReviewPublish'

export default function PublishVersionPage() {
  useRequireAuth()

  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const moduleName = params.name as string

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [versionData, setVersionData] = useState({
    version: '',
    buildTool: 'webpack',
    buildToolVersion: '',
    changelog: '',
  })

  const [manifestData, setManifestData] = useState('')
  const [assetFiles, setAssetFiles] = useState<FileWithPath[]>([])
  const [uploadedAssets, setUploadedAssets] = useState<any[]>([])

  const {
    data: module,
    loading: loadingModule,
    error: fetchError,
  } = useFetch<Module>(`/api/modules/${moduleName}`)

  // Check if user has permission to publish
  const hasPermission = useMemo(() => {
    if (!module || !session?.user) return false

    const isAdmin = session.user.isAdmin || false
    const isOwner = module.owner.userId === session.user.id
    const isMaintainer = module.maintainers?.some(
      (m) => m.userId === session.user.id && ['admin', 'write'].includes(m.role)
    )

    return isAdmin || isOwner || isMaintainer
  }, [module, session])

  // Redirect if no permission
  useEffect(() => {
    if (module && !hasPermission) {
      setError("You don't have permission to publish versions for this module")
      setTimeout(() => router.push(`/modules/${moduleName}`), 2000)
    }
  }, [module, hasPermission, moduleName, router])

  const handleVersionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setVersionData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleFilesSelected = (files: FileWithPath[]) => {
    setAssetFiles(files)
  }

  const handleUploadAssets = async () => {
    if (assetFiles.length === 0) {
      setError('Please select at least one file to upload')
      return
    }

    // Check if mf-manifest.json is included (could be at root or in subfolder)
    const manifestFileWithPath = assetFiles.find((f) =>
      f.relativePath === 'mf-manifest.json' || f.relativePath.endsWith('/mf-manifest.json')
    )
    if (!manifestFileWithPath) {
      setError('Please include mf-manifest.json in your upload')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Read and parse the manifest file
      const manifestText = await manifestFileWithPath.file.text()
      const manifest = JSON.parse(manifestText)
      setManifestData(manifestText)

      // Upload all files to blob storage with their relative paths
      const formData = new FormData()
      formData.append('version', versionData.version)
      assetFiles.forEach(({ file, relativePath }) => {
        formData.append('files', file)
        formData.append('paths', relativePath)
      })

      const response = await fetch(`/api/modules/${moduleName}/versions/assets`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedAssets(data.assets)
        setStep(3) // Move to review step
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to upload assets')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(
        'An error occurred while uploading assets. Please check that mf-manifest.json is valid JSON.'
      )
    } finally {
      setUploading(false)
    }
  }

  const handlePublish = async () => {
    setLoading(true)
    setError(null)

    try {
      // Parse manifest
      let manifest
      try {
        manifest = JSON.parse(manifestData)
      } catch (err) {
        setError('Invalid JSON in manifest file')
        setLoading(false)
        return
      }

      // Build the federation metadata from manifest
      const federation = {
        name: manifest.name || moduleName,
        entry: manifest.remoteEntry || '',
        manifestUrl: '', // Will be set after upload
        exposes: manifest.exposes || {},
        shared: manifest.shared || {},
        remotes: manifest.remotes || {},
        buildMeta: {
          buildVersion: manifest.version || versionData.version,
          globalName: manifest.globalName || moduleName,
          remoteEntryType: manifest.remoteEntryType || 'esm',
          remoteTypes: manifest.types,
          publicPath: manifest.publicPath || '',
          pluginVersion: manifest.pluginVersion || '1.0.0',
          buildTime: new Date(),
        },
      }

      // Use uploaded assets or create simplified structure
      const assets =
        uploadedAssets.length > 0
          ? {
              files: uploadedAssets,
              remoteEntry: uploadedAssets.find((a) => a.fileName.includes('remoteEntry')),
              manifest: uploadedAssets.find((a) => a.fileName.includes('manifest')),
              stats: uploadedAssets.find((a) => a.fileName.includes('stats')),
            }
          : {
              // Fallback for testing without uploads
              remoteEntry: {
                url: `/api/assets/${moduleName}/versions/${versionData.version}/remoteEntry.js`,
                hash: 'mock-hash',
                size: 1000,
              },
              manifest: {
                url: `/api/assets/${moduleName}/versions/${versionData.version}/mf-manifest.json`,
                hash: 'mock-hash',
                size: 500,
              },
              stats: {
                url: `/api/assets/${moduleName}/versions/${versionData.version}/mf-stats.json`,
                hash: 'mock-hash',
                size: 300,
              },
              files: [],
            }

      await apiPost(`/api/modules/${moduleName}/versions`, {
        version: versionData.version,
        buildTool: versionData.buildTool,
        buildToolVersion: versionData.buildToolVersion,
        changelog: versionData.changelog,
        federation,
        assets,
        dependencies: manifest.dependencies || {},
        peerDependencies: manifest.peerDependencies,
      })

      router.push(`/modules/${moduleName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while publishing the version')
    } finally {
      setLoading(false)
    }
  }

  if (loadingModule) {
    return <LoadingSpinner fullScreen message="Checking permissions..." />
  }

  if (fetchError || !module) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Module Not Found</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{fetchError || 'Module not found'}</p>
          <Button as={Link} href="/dashboard" variant="secondary" className="mt-4">
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Don't render form if there's a permission error
  if (error && !hasPermission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Access Denied</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">{error}</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/modules/${moduleName}/edit`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Module
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Publish New Version</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Publish a new version for <span className="font-mono">{moduleName}</span>
          </p>
        </div>

        {/* Progress Steps */}
        <WizardProgress
          currentStep={step}
          steps={[
            { num: 1, label: 'Version Info' },
            { num: 2, label: 'Upload Assets & Config' },
            { num: 3, label: 'Review & Publish' },
          ]}
        />

        <ErrorMessage error={error} />

        {/* Step 1: Version Info */}
        {step === 1 && (
          <StepVersionInfo
            versionData={versionData}
            onChange={handleVersionChange}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: Upload Assets & Config */}
        {step === 2 && (
          <StepUploadAssets
            assetFiles={assetFiles}
            uploadedAssets={uploadedAssets}
            uploading={uploading}
            onFilesSelected={handleFilesSelected}
            onUpload={handleUploadAssets}
            onBack={() => setStep(1)}
          />
        )}

        {/* Step 3: Review & Publish */}
        {step === 3 && (
          <StepReviewPublish
            versionData={versionData}
            uploadedAssets={uploadedAssets}
            loading={loading}
            onPublish={handlePublish}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </main>
  )
}
