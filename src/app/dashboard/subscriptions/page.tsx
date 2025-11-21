'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { SubscriptionStatusBadge } from '@/components/SubscriptionStatusBadge'
import { Badge } from '@/components/Badge'
import { useFetch } from '@/hooks/useFetch'
import { formatDate } from '@/lib/utils'
import type { SubscriptionWithDetails, PaginatedResponse } from '@/types/api'

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, loading, error } = useFetch<PaginatedResponse<SubscriptionWithDetails>>(
    '/api/subscriptions?limit=100'
  )

  const subscriptions = useMemo(() => data?.subscriptions || [], [data])

  const filteredSubscriptions = useMemo(() => {
    if (statusFilter === 'all') return subscriptions
    return subscriptions.filter((sub) => sub.status === statusFilter)
  }, [statusFilter, subscriptions])

  const statusCounts = useMemo(() => ({
    all: subscriptions.length,
    pending: subscriptions.filter((s) => s.status === 'pending').length,
    approved: subscriptions.filter((s) => s.status === 'approved').length,
    rejected: subscriptions.filter((s) => s.status === 'rejected').length,
    revoked: subscriptions.filter((s) => s.status === 'revoked').length,
  }), [subscriptions])

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading subscriptions..." />
  }

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'revoked', label: 'Revoked' },
  ]

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          My Subscriptions
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          View and manage your module subscription requests
        </p>
      </div>

      <ErrorMessage error={error} className="mb-6" />

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
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
              variant={statusFilter === tab.key ? 'default' : 'default'}
              className={statusFilter === tab.key ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : ''}
            >
              {statusCounts[tab.key as keyof typeof statusCounts]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredSubscriptions.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            statusFilter === 'all'
              ? 'No subscriptions yet'
              : `No ${statusFilter} subscriptions`
          }
          description={
            statusFilter === 'all'
              ? 'Create an application and subscribe to modules to get started'
              : `You don't have any ${statusFilter} subscription requests`
          }
          action={
            statusFilter === 'all' ? (
              <Button as={Link} href="/dashboard/applications">
                Go to Applications
              </Button>
            ) : undefined
          }
        />
      ) : (
        /* Subscriptions list */
        <div className="space-y-4">
          {filteredSubscriptions.map((subscription) => (
            <Card key={subscription._id} variant="outlined" className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {subscription.module?.displayName || 'Unknown Module'}
                    </h3>
                    <SubscriptionStatusBadge status={subscription.status} />
                  </div>
                  <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {subscription.module?.name || 'N/A'}
                  </p>
                  {subscription.module?.description && (
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {subscription.module.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 dark:border-zinc-800">
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Application
                  </p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {subscription.application?.name || 'Unknown'}
                  </p>
                  {subscription.application && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {subscription.application.origins.length} origin(s)
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Requested
                  </p>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {formatDate(subscription.requestedAt)}
                  </p>
                  {subscription.reviewedAt && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      Reviewed {formatDate(subscription.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>

              {subscription.reviewNotes && (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Review Notes
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {subscription.reviewNotes}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
