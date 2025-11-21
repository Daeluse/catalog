import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db } from '@/lib/db-adapter'
import semver from 'semver'
import {
  successResponse,
  createdResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { checkModulePermission } from '@/lib/permissions'
import { validators, validationMessages } from '@/lib/validators'

// GET /api/modules/[name]/versions - List all versions (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params

    const versions = await db.versions.find({ moduleName: name })

    // Sort by semver
    versions.sort((a, b) => semver.rcompare(a.version, b.version))

    return successResponse({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return serverErrorResponse('Failed to fetch versions')
  }
}

// POST /api/modules/[name]/versions - Publish new version (authenticated)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) {
    return authResult.error
  }

  const { user } = authResult

  try {
    const { name } = await params
    const body = await request.json()
    const {
      version,
      federation,
      assets,
      buildTool,
      buildToolVersion,
      readme,
      changelog,
      dependencies,
      peerDependencies,
    } = body

    // Validate required fields
    const errors: Record<string, string> = {}

    if (!validators.notEmpty(version || '')) {
      errors.version = validationMessages.notEmpty
    } else if (!validators.semver(version)) {
      errors.version = validationMessages.semver
    }

    if (!federation) errors.federation = validationMessages.notEmpty
    if (!assets) errors.assets = validationMessages.notEmpty
    if (!validators.notEmpty(buildTool || '')) errors.buildTool = validationMessages.notEmpty
    if (!validators.notEmpty(buildToolVersion || ''))
      errors.buildToolVersion = validationMessages.notEmpty

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors)
    }

    // Find module and check permissions
    const module = await db.modules.findOne({ name })
    if (!module) {
      return notFoundResponse('Module')
    }

    const isAdmin = user.isAdmin || false
    const hasPermission = checkModulePermission(module, user.id, isAdmin, 'write')

    if (!hasPermission) {
      return forbiddenResponse('Insufficient permissions to publish versions for this module')
    }

    // Check if version already exists
    const existingVersion = await db.versions.findOne({
      moduleName: name,
      version,
    })

    if (existingVersion) {
      return conflictResponse('Version already exists')
    }

    // Create new version
    const newVersion = {
      moduleId: module._id,
      moduleName: name,
      version,
      federation,
      assets,
      buildTool,
      buildToolVersion,
      readme,
      changelog,
      dependencies: dependencies || {},
      peerDependencies,
      publishedBy: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      publishedAt: new Date(),
      downloadCount: 0,
      isPrerelease: semver.prerelease(version) !== null,
      isDeprecated: false,
    }

    const result = await db.versions.insertOne(newVersion)

    // Update module's latest version if this is newer
    if (!module.latestVersion || semver.gt(version, module.latestVersion)) {
      await db.modules.updateOne(
        { name },
        {
          $set: {
            latestVersion: version,
            latestVersionId: result.insertedId,
          },
        }
      )
    }

    return createdResponse({
      ...newVersion,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error('Error publishing version:', error)
    return serverErrorResponse('Failed to publish version')
  }
}
