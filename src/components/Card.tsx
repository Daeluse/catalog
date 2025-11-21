import { ElementType, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outlined'
  as?: ElementType
}

export function Card({
  children,
  className,
  variant = 'default',
  as: Component = 'div',
  ...props
}: CardProps & Omit<ComponentPropsWithoutRef<ElementType>, keyof CardProps>) {
  return (
    <Component
      className={cn(
        'rounded-lg',
        variant === 'default' &&
          'bg-white shadow-sm dark:bg-zinc-900',
        variant === 'outlined' &&
          'border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
