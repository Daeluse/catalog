import { X } from 'lucide-react'

interface ErrorMessageProps {
  error: string | null
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({
  error,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  if (!error) return null

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1 text-sm text-red-800 dark:text-red-400">{error}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-0.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
