import { NextRequest } from 'next/server'
import {
  successResponse,
  createdResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { validators, validationMessages } from '@/lib/validators'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db, findById } from '@/lib/db-adapter'
import { getPaginationParams } from '@/lib/pagination'
import { ApplicationDocument, ModuleDocument } from '@/types/database'

// GET /api/subscriptions - List user's subscriptions (authenticated)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const moduleId = searchParams.get('moduleId')
    const pagination = getPaginationParams(searchParams, { limit: 50 })

    // First, get user's applications
    const userApplications = await db.applications.find({
      'owner.userId': user.id,
    })

    const applicationIds = userApplications.map((app) => String(app._id))

    if (applicationIds.length === 0) {
      return successResponse({
        subscriptions: [],
        total: 0,
        limit: pagination.limit,
        skip: pagination.skip,
      })
    }

    // Build query for subscriptions
    const query: any = { applicationId: { $in: applicationIds } }
    if (status) query.status = status
    if (moduleId) query.moduleId = moduleId

    // Get subscriptions
    const subscriptions = await db.subscriptions.find(query, {
      sort: { requestedAt: -1 },
      limit: pagination.limit,
      skip: pagination.skip,
    })

    // Populate with application and module data
    const populatedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const [application, module] = await Promise.all([
          findById<ApplicationDocument>('applications', sub.applicationId),
          findById<ModuleDocument>('modules', sub.moduleId),
        ])

        return {
          ...sub,
          application: application || null,
          module: module || null,
        }
      })
    )

    const total = await db.subscriptions.countDocuments(query)

    return successResponse({
      subscriptions: populatedSubscriptions,
      total,
      limit: pagination.limit,
      skip: pagination.skip,
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return serverErrorResponse('Failed to fetch subscriptions')
  }
}

// POST /api/subscriptions - Create subscription request (authenticated)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const body = await request.json()
    const { applicationId, moduleId } = body

    // Validate required fields
    const errors: Record<string, string> = {}

    if (!validators.notEmpty(applicationId || ''))
      errors.applicationId = validationMessages.notEmpty
    if (!validators.notEmpty(moduleId || '')) errors.moduleId = validationMessages.notEmpty

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors)
    }

    // Verify application exists and user owns it
    const application = await db.applications.findOne({ _id: applicationId })

    if (!application) {
      return notFoundResponse('Application')
    }

    if (application.owner.userId !== user.id) {
      return forbiddenResponse('You do not own this application')
    }

    // Verify module exists and is active
    const module = await db.modules.findOne({ _id: moduleId })

    if (!module) {
      return notFoundResponse('Module')
    }

    if (module.status !== 'active') {
      return errorResponse('Module is not active')
    }

    // Check if subscription already exists
    const existing = await db.subscriptions.findOne({
      applicationId,
      moduleId,
    })

    if (existing) {
      return conflictResponse('Subscription already exists')
    }

    // Create subscription
    const newSubscription = {
      applicationId,
      moduleId,
      moduleName: module.name,
      status: 'pending' as const,
      requestedBy: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      requestedAt: new Date(),
    }

    const result = await db.subscriptions.insertOne(newSubscription)

    return createdResponse({
      ...newSubscription,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return serverErrorResponse('Failed to create subscription')
  }
}
