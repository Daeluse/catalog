import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getBlobStorageService } from '@/lib/storage'
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-responses'

// POST /api/modules/[name]/versions/assets - Upload module assets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return unauthorizedResponse()
  }

  try {
    const { name: moduleName } = await params
    const formData = await request.formData()
    const version = formData.get('version') as string
    const files = formData.getAll('files') as File[]
    const paths = formData.getAll('paths') as string[]

    if (!version) {
      return errorResponse('Version is required')
    }

    if (!files || files.length === 0) {
      return errorResponse('No files provided')
    }

    // Paths array should match files array length
    if (paths.length !== files.length) {
      return errorResponse('File paths mismatch')
    }

    // Get storage service
    const storage = getBlobStorageService()
    const uploadedAssets: any[] = []

    // Upload each file with its relative path
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const relativePath = paths[i] || file.name
      // Store files with their folder structure: moduleName/versions/version/relativePath
      const blobPath = `${moduleName}/versions/${version}/${relativePath}`
      const buffer = await file.arrayBuffer()

      try {
        const result = await storage.uploadBlob(
          blobPath,
          Buffer.from(buffer),
          {
            contentType: file.type || 'application/octet-stream',
            metadata: {
              moduleName,
              version,
              relativePath,
              uploadedBy: session.user.email || '',
              uploadedAt: new Date().toISOString(),
            },
          }
        )

        uploadedAssets.push({
          fileName: relativePath,
          url: result.url,
          hash: result.hash,
          size: result.size,
          type: file.type,
        })
      } catch (uploadError) {
        console.error(`Error uploading ${relativePath}:`, uploadError)
        return serverErrorResponse(`Failed to upload ${relativePath}`)
      }
    }

    return successResponse({
      success: true,
      assets: uploadedAssets,
      message: `Successfully uploaded ${uploadedAssets.length} file(s)`,
    })
  } catch (error) {
    console.error('Error uploading assets:', error)
    return serverErrorResponse('Failed to upload assets')
  }
}
