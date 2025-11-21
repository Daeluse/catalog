'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface ApprovalDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (notes?: string) => void
  action: 'approve' | 'reject' | 'revoke'
  applicationName: string
  origins: string[]
  loading?: boolean
}

const actionConfig = {
  approve: {
    title: 'Approve Subscription',
    description:
      'This will grant access to the module for all origins of this application.',
    confirmText: 'Approve',
    confirmClass: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
  },
  reject: {
    title: 'Reject Subscription',
    description: 'This will decline the subscription request.',
    confirmText: 'Reject',
    confirmClass:
      'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
  },
  revoke: {
    title: 'Revoke Subscription',
    description:
      'This will remove access to the module. The application will no longer be able to load module assets.',
    confirmText: 'Revoke',
    confirmClass:
      'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
  },
}

export function ApprovalDialog({
  isOpen,
  onClose,
  onConfirm,
  action,
  applicationName,
  origins,
  loading = false,
}: ApprovalDialogProps) {
  const [notes, setNotes] = useState('')

  const config = actionConfig[action]

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(notes || undefined)
    setNotes('')
  }

  const handleClose = () => {
    if (!loading) {
      setNotes('')
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {config.title}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          {config.description}
        </p>

        {/* Application details */}
        <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Application: {applicationName}
          </p>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Origins ({origins.length}):
            </p>
            <ul className="space-y-1">
              {origins.map((origin, index) => (
                <li
                  key={index}
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                >
                  {origin}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Optional notes */}
        <div className="mb-6">
          <label
            htmlFor="notes"
            className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
            placeholder={`Add a note about this ${action}...`}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${config.confirmClass}`}
          >
            {loading ? 'Processing...' : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
