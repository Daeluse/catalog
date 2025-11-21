import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db, findById } from '@/lib/db-adapter'
import { validateOrigins } from '@/lib/cors'
import { isApplicationOwner } from '@/lib/permissions'
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { validators, validationMessages } from '@/lib/validators'
import { ApplicationDocument, ApplicationUpdates } from '@/types/database'

// GET /api/applications/[id] - Get single application (authenticated, owner only)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { session } = authResult

  try {
    const { id } = await params

    const application = await findById<ApplicationDocument>('applications', id)

    if (!application) {
      return notFoundResponse('Application')
    }

    // Check ownership
    if (!isApplicationOwner(session, application.owner.userId)) {
      return forbiddenResponse()
    }

    return successResponse(application)
  } catch (error) {
    console.error('Error fetching application:', error)
    return serverErrorResponse('Failed to fetch application')
  }
}

// PATCH /api/applications/[id] - Update application (authenticated, owner only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { session } = authResult

  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, contactEmail, origins } = body

    // Validate fields if provided
    const errors: Record<string, string> = {}

    if (name !== undefined && !validators.notEmpty(name)) {
      errors.name = validationMessages.notEmpty
    }

    if (description !== undefined && !validators.notEmpty(description)) {
      errors.description = validationMessages.notEmpty
    }

    if (contactEmail !== undefined) {
      if (!validators.notEmpty(contactEmail)) {
        errors.contactEmail = validationMessages.notEmpty
      } else if (!validators.email(contactEmail)) {
        errors.contactEmail = validationMessages.email
      }
    }

    if (origins !== undefined) {
      if (!Array.isArray(origins) || origins.length === 0) {
        errors.origins = 'At least one origin is required'
      } else {
        const { invalid } = validateOrigins(origins)
        if (invalid.length > 0) {
          errors.origins = `Invalid origins: ${invalid.join(', ')}`
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors)
    }

    const application = await findById<ApplicationDocument>('applications', id)

    if (!application) {
      return notFoundResponse('Application')
    }

    // Check ownership
    if (!isApplicationOwner(session, application.owner.userId)) {
      return forbiddenResponse()
    }

    // Update allowed fields
    const updates: ApplicationUpdates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (contactEmail !== undefined)
      updates.contactEmail = contactEmail.toLowerCase().trim()
    if (origins !== undefined) {
      const { valid } = validateOrigins(origins)
      updates.origins = valid
    }

    await db.applications.updateOne({ _id: id }, { $set: updates })

    const updated = await findById<ApplicationDocument>('applications', id)
    return successResponse(updated)
  } catch (error) {
    console.error('Error updating application:', error)
    return serverErrorResponse('Failed to update application')
  }
}

// DELETE /api/applications/[id] - Delete application (authenticated, owner only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { session } = authResult

  try {
    const { id } = await params

    const application = await findById<ApplicationDocument>('applications', id)

    if (!application) {
      return notFoundResponse('Application')
    }

    // Check ownership
    if (!isApplicationOwner(session, application.owner.userId)) {
      return forbiddenResponse()
    }

    // Delete all subscriptions for this application
    const subscriptions = await db.subscriptions.find({ applicationId: id })
    for (const sub of subscriptions) {
      await db.subscriptions.deleteOne({ _id: sub._id })
    }

    await db.applications.deleteOne({ _id: id })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Error deleting application:', error)
    return serverErrorResponse('Failed to delete application')
  }
}
