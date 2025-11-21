import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db } from '@/lib/db-adapter'
import { getPaginationParams } from '@/lib/pagination'
import { canApproveSubscription } from '@/lib/permissions'
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-responses'

// GET /api/modules/[name]/subscriptions - List subscriptions for a module (authenticated, module owner/maintainer/admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) {
    return authResult.error
  }

  const { session } = authResult

  try {
    const { name } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const { limit, skip } = getPaginationParams(searchParams, { limit: 50 })

    // Get module
    const moduleDoc = await db.modules.findOne({ name })

    if (!module) {
      return notFoundResponse('Module')
    }

    // Check permission
    if (!canApproveSubscription(session, module)) {
      return forbiddenResponse('You do not have permission to view subscriptions for this module')
    }

    // Build query
    const query: Record<string, unknown> = {
      moduleId: moduleDoc._id,
    }

    if (status) {
      query.status = status
    }

    // Find all subscriptions for this module
    const subscriptions = await db.subscriptions.find(query)

    // Sort by most recent
    subscriptions.sort((a, b) => {
      const dateA = new Date(a.requestedAt || a.createdAt || 0)
      const dateB = new Date(b.requestedAt || b.createdAt || 0)
      return dateB.getTime() - dateA.getTime()
    })

    // Get total before pagination
    const total = subscriptions.length

    // Apply pagination
    const paginatedSubscriptions = subscriptions.slice(skip, skip + limit)

    // Populate with application data
    const populatedSubscriptions = await Promise.all(
      paginatedSubscriptions.map(async (sub) => {
        const application = await db.applications.findOne({
          _id: sub.applicationId,
        })

        return {
          ...sub,
          application: application || null,
        }
      })
    )

    return successResponse({
      subscriptions: populatedSubscriptions,
      total,
      limit,
      skip,
    })
  } catch (error) {
    console.error('Error fetching module subscriptions:', error)
    return serverErrorResponse('Failed to fetch subscriptions')
  }
}
