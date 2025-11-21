import { vi } from 'vitest'
import type { Session } from 'next-auth'

/**
 * Mock implementation of the auth module
 * Usage in tests:
 *   import { mockAuthSession } from '@/test/helpers/mock-auth'
 *   mockAuthSession(createMockSession({ isAdmin: true }))
 */

export const auth = vi.fn<() => Promise<Session | null>>()
export const signIn = vi.fn()
export const signOut = vi.fn()
export const handlers = {
  GET: vi.fn(),
  POST: vi.fn(),
}

// Default to unauthenticated
auth.mockResolvedValue(null)
