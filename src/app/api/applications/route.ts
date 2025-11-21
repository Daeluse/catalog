import { NextRequest } from 'next/server'
import { validateOrigins } from '@/lib/cors'
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { validators, validationMessages } from '@/lib/validators'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db } from '@/lib/db-adapter'
import { getPaginationParams } from '@/lib/pagination'

// GET /api/applications - List user's applications (authenticated)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const pagination = getPaginationParams(searchParams, { limit: 20 })

    // Query applications for this user
    const query = { 'owner.userId': user.id }
    const applications = await db.applications.find(query, {
      sort: { updatedAt: -1 },
      limit: pagination.limit,
      skip: pagination.skip,
    })

    const total = await db.applications.countDocuments(query)

    return successResponse({
      applications,
      total,
      limit: pagination.limit,
      skip: pagination.skip,
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    return serverErrorResponse('Failed to fetch applications')
  }
}

// POST /api/applications - Create new application (authenticated)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const body = await request.json()
    const { name, description, contactEmail, origins } = body

    // Validate required fields
    const errors: Record<string, string> = {}

    if (!validators.notEmpty(name || '')) errors.name = validationMessages.notEmpty
    if (!validators.notEmpty(description || ''))
      errors.description = validationMessages.notEmpty
    if (!validators.notEmpty(contactEmail || '')) {
      errors.contactEmail = validationMessages.notEmpty
    } else if (!validators.email(contactEmail)) {
      errors.contactEmail = validationMessages.email
    }

    if (!Array.isArray(origins) || origins.length === 0) {
      errors.origins = 'At least one origin is required'
    } else {
      const { invalid } = validateOrigins(origins)
      if (invalid.length > 0) {
        errors.origins = `Invalid origins: ${invalid.join(', ')}`
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors)
    }

    const { valid } = validateOrigins(origins)

    // Create application document
    const newApplication = {
      name,
      description,
      contactEmail: contactEmail.toLowerCase().trim(),
      owner: {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      origins: valid,
      status: 'active' as const,
    }

    const result = await db.applications.insertOne(newApplication)

    return createdResponse({
      ...newApplication,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error('Error creating application:', error)
    return serverErrorResponse('Failed to create application')
  }
}
