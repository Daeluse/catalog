import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db } from '@/lib/db-adapter'
import { getBlobStorageService } from '@/lib/storage'
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { checkModulePermission } from '@/lib/permissions'
import { ModuleDocument, ModuleUpdates, VersionDocument } from '@/types/database'

// GET /api/modules/[name] - Get module details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const module = await db.modules.findOne({ name })

    if (!module) {
      return notFoundResponse('Module')
    }

    return successResponse(module)
  } catch (error) {
    console.error('Error fetching module:', error)
    return serverErrorResponse('Failed to fetch module')
  }
}

// PATCH /api/modules/[name] - Update module (authenticated, owner/maintainer only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const { name } = await params
    const body = await request.json()

    const module = await db.modules.findOne({ name })

    if (!module) {
      return notFoundResponse('Module')
    }

    // Check permissions
    const isAdmin = user.isAdmin || false
    const hasPermission = checkModulePermission(module, user.id, isAdmin, 'write')

    if (!hasPermission) {
      return forbiddenResponse('Insufficient permissions to update this module')
    }

    // Update allowed fields
    const allowedFields = [
      'displayName',
      'description',
      'repository',
      'homepage',
      'license',
      'keywords',
      'category',
      'icon',
      'status',
    ]

    const updates: ModuleUpdates = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field as keyof ModuleUpdates] = body[field]
      }
    }

    await db.modules.updateOne({ name }, { $set: updates as Partial<ModuleDocument> })

    const updated = await db.modules.findOne({ name })
    return successResponse(updated)
  } catch (error) {
    console.error('Error updating module:', error)
    return serverErrorResponse('Failed to update module')
  }
}

// DELETE /api/modules/[name] - Delete module (authenticated, owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const { name } = await params

    const module = await db.modules.findOne({ name })

    if (!module) {
      return notFoundResponse('Module')
    }

    // Check permissions (owner or admin only)
    const isAdmin = user.isAdmin || false
    const hasPermission = checkModulePermission(module, user.id, isAdmin, 'owner')

    if (!hasPermission) {
      return forbiddenResponse('Only the module owner can delete this module')
    }

    // Delete all versions
    const versions = await db.versions.find({ moduleName: name })
    for (const v of versions) {
      await db.versions.deleteOne({ _id: v._id })
    }

    // Delete all associated assets from blob storage
    const storage = getBlobStorageService()
    try {
      // List all blobs with the module name prefix
      const blobs = await storage.listBlobs(name)

      // Delete each blob
      for (const blob of blobs) {
        try {
          await storage.deleteBlob(blob.name)
        } catch (error) {
          console.error(`Failed to delete blob ${blob.name}:`, error)
          // Continue with other blobs even if one fails
        }
      }
    } catch (error) {
      console.error('Error deleting module assets:', error)
      // Continue with module deletion even if asset cleanup fails
    }

    // Delete the module
    await db.modules.deleteOne({ name })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Error deleting module:', error)
    return serverErrorResponse('Failed to delete module')
  }
}
