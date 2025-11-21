import { NextRequest } from 'next/server'
import { db } from '@/lib/db-adapter'
import semver from 'semver'
import { successResponse, notFoundResponse, errorResponse, serverErrorResponse } from '@/lib/api-responses'

// GET /api/modules/[name]/resolve/[tag] - Resolve version tag to remote entry URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; tag: string }> }
) {
  try {
    const { name, tag } = await params

    // Fetch all versions for the module
    const versions = await db.versions.find({ moduleName: name })

    if (versions.length === 0) {
      return notFoundResponse('No versions found for this module')
    }

    let selectedVersion = null

    // Handle special tags
    if (tag === 'latest') {
      // Get the latest stable version (exclude prereleases)
      const stableVersions = versions.filter(
        (v) => !v.isPrerelease && v.version && semver.valid(v.version)
      )
      if (stableVersions.length === 0) {
        return notFoundResponse('No stable versions available')
      }
      stableVersions.sort((a, b) => semver.rcompare(a.version, b.version))
      selectedVersion = stableVersions[0]
    } else if (tag === 'next') {
      // Get the latest version including prereleases
      const validVersions = versions.filter((v) => v.version && semver.valid(v.version))
      if (validVersions.length === 0) {
        return notFoundResponse('No valid versions available')
      }
      validVersions.sort((a, b) => semver.rcompare(a.version, b.version))
      selectedVersion = validVersions[0]
    } else {
      // Try to match against semver range or specific version
      const validVersions = versions.filter((v) => v.version && semver.valid(v.version))

      if (validVersions.length === 0) {
        return notFoundResponse('No valid versions available')
      }

      // Check if tag is a specific valid version
      if (semver.valid(tag)) {
        selectedVersion = validVersions.find((v) => v.version === tag) || null
        if (!selectedVersion) {
          return notFoundResponse(`Version ${tag} not found`)
        }
      } else {
        // Try to match as a semver range
        try {
          const versionStrings = validVersions.map((v) => v.version)
          const matchedVersion = semver.maxSatisfying(versionStrings, tag)

          if (!matchedVersion) {
            return notFoundResponse(`No version matches the range: ${tag}`)
          }

          selectedVersion = validVersions.find((v) => v.version === matchedVersion) || null
        } catch {
          return errorResponse(`Invalid semver range: ${tag}`)
        }
      }
    }

    if (!selectedVersion) {
      return notFoundResponse('Unable to resolve version')
    }

    // Return the resolution result
    return successResponse({
      tag,
      resolvedVersion: selectedVersion.version,
      remoteEntry: selectedVersion.assets.remoteEntry.url,
      manifestUrl:
        selectedVersion.federation?.manifestUrl || selectedVersion.assets.manifest?.url,
      buildTool: selectedVersion.buildTool,
      isPrerelease: selectedVersion.isPrerelease,
      publishedAt: selectedVersion.publishedAt,
      metadata: {
        federation: {
          name: selectedVersion.federation?.name,
          entry: selectedVersion.federation?.entry,
          exposes: selectedVersion.federation?.exposes
            ? Object.keys(selectedVersion.federation.exposes)
            : [],
          shared: selectedVersion.federation?.shared || {},
        },
        assets: {
          remoteEntry: selectedVersion.assets.remoteEntry.url,
          manifest: selectedVersion.assets.manifest?.url,
          types: selectedVersion.assets.types?.url,
        },
      },
    })
  } catch (error) {
    console.error('Error resolving version tag:', error)
    return serverErrorResponse('Failed to resolve version tag')
  }
}
