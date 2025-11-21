import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
      {Icon && (
        <Icon className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
      )}
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      {description && (
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
