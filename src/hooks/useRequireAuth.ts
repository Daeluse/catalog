import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Hook to require authentication for a page
 * Redirects to sign-in if not authenticated
 * Returns loading and authentication status
 */
export function useRequireAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = encodeURIComponent(pathname)
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`)
    }
  }, [status, router, pathname])

  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}
