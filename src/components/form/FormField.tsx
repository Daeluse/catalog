import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
  htmlFor,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
        {required && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
      </label>
      {description && (
        <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
