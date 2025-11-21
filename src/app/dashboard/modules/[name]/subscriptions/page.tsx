'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, Check, X, Ban } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/Badge'
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge'
import { ApprovalDialog } from '@/components/ApprovalDialog'
import { useFetch } from '@/hooks/useFetch'
import { apiPatch } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import type { Module, SubscriptionWithDetails, PaginatedResponse } from '@/types/api'

export default function ModuleSubscriptionsPage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const [statusFilter, setStatusFilter] = useState<string>('pending')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<
    'approve' | 'reject' | 'revoke'
  >('approve')
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionWithDetails | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const { data: module, loading: moduleLoading, error: moduleError } = useFetch<Module>(
    `/api/modules/${encodeURIComponent(name)}`
  )

  const { data: subsData, loading: subsLoading, error: subsError, refetch } =
    useFetch<PaginatedResponse<SubscriptionWithDetails>>(
      `/api/modules/${encodeURIComponent(name)}/subscriptions?limit=100`
    )

  const loading = moduleLoading || subsLoading
  const error = moduleError || subsError
  const subscriptions = subsData?.subscriptions || []

  const filteredSubscriptions = useMemo(() => {
    if (statusFilter === 'all') return subscriptions
    return subscriptions.filter((sub) => sub.status === statusFilter)
  }, [statusFilter, subscriptions])

  const statusCounts = useMemo(
    () => ({
      all: subscriptions.length,
      pending: subscriptions.filter((s) => s.status === 'pending').length,
      approved: subscriptions.filter((s) => s.status === 'approved').length,
      rejected: subscriptions.filter((s) => s.status === 'rejected').length,
      revoked: subscriptions.filter((s) => s.status === 'revoked').length,
    }),
    [subscriptions]
  )

  const handleAction = async (
    action: 'approve' | 'reject' | 'revoke',
    subscription: SubscriptionWithDetails
  ) => {
    setDialogAction(action)
    setSelectedSubscription(subscription)
    setDialogOpen(true)
  }

  const confirmAction = async (notes?: string) => {
    if (!selectedSubscription) return

    try {
      setActionLoading(true)
      setActionError('')

      await apiPatch(`/api/subscriptions/${selectedSubscription._id}/${dialogAction}`, {
        reviewNotes: notes,
      })

      await refetch()
      setDialogOpen(false)
      setSelectedSubscription(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading subscriptions..." />
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Subscription Requests
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage subscription requests for{' '}
          <span className="font-medium">{module?.displayName || name}</span>
        </p>
      </div>

      <ErrorMessage error={error} className="mb-6" />
      <ErrorMessage error={actionError} className="mb-6" />

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {[
          { key: 'pending', label: 'Pending' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'revoked', label: 'Revoked' },
          { key: 'all', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}{' '}
            <Badge
              variant="default"
              className={
                statusFilter === tab.key
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : ''
              }
            >
              {statusCounts[tab.key as keyof typeof statusCounts]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredSubscriptions.length === 0 && (
        <EmptyState
          icon={Package}
          title={
            statusFilter === 'all'
              ? 'No subscription requests'
              : `No ${statusFilter} requests`
          }
          description={
            statusFilter === 'pending'
              ? 'No pending subscription requests at this time'
              : `There are no ${statusFilter} subscription requests`
          }
        />
      )}

      {/* Subscriptions list */}
      {filteredSubscriptions.length > 0 && (
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => (
            <Card key={subscription._id} variant="outlined" className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {subscription.application?.name || 'Unknown Application'}
                    </h3>
                    <SubscriptionStatusBadge status={subscription.status} />
                  </div>
                  {subscription.application?.description && (
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {subscription.application.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 dark:border-zinc-800">
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Email
                  </p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {subscription.application?.contactEmail || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Requested By
                  </p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {subscription.requestedBy.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatDate(subscription.requestedAt)}
                  </p>
                </div>

                {subscription.application && (
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Allowed Origins ({subscription.application.origins.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {subscription.application.origins.map((origin, idx) => (
                        <Badge key={idx}>{origin}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {subscription.reviewNotes && (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Review Notes
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {subscription.reviewNotes}
                  </p>
                  {subscription.reviewedBy && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      Reviewed by {subscription.reviewedBy.name} on{' '}
                      {subscription.reviewedAt &&
                        formatDate(subscription.reviewedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                {subscription.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleAction('approve', subscription)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleAction('reject', subscription)}
                      variant="danger"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                {subscription.status === 'approved' && (
                  <Button
                    onClick={() => handleAction('revoke', subscription)}
                    variant="secondary"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Ban className="h-4 w-4" />
                    Revoke Access
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Dialog */}
      {selectedSubscription?.application && (
        <ApprovalDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false)
            setSelectedSubscription(null)
          }}
          onConfirm={confirmAction}
          action={dialogAction}
          applicationName={selectedSubscription.application.name}
          origins={selectedSubscription.application.origins}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
