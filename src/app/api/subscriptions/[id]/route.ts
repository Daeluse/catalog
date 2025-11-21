import { NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/with-auth'
import { db, findById } from '@/lib/db-adapter'
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-responses'
import { ApplicationDocument, SubscriptionDocument } from '@/types/database'

// DELETE /api/subscriptions/[id] - Delete subscription (authenticated, owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if (isAuthError(authResult)) return authResult.error

  const { user } = authResult

  try {
    const { id } = await params

    const subscription = await findById<SubscriptionDocument>('subscriptions', id)

    if (!subscription) {
      return notFoundResponse('Subscription')
    }

    // Verify ownership via application
    const application = await findById<ApplicationDocument>('applications', subscription.applicationId)

    if (!application) {
      return notFoundResponse('Application')
    }

    if (application.owner.userId !== user.id) {
      return forbiddenResponse('You do not own this subscription')
    }

    // Delete subscription
    await db.subscriptions.deleteOne({ _id: id })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Error deleting subscription:', error)
    return serverErrorResponse('Failed to delete subscription')
  }
}
