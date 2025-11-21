import { vi } from 'vitest'
import type { Session } from 'next-auth'

export const auth = vi.fn<() => Promise<Session | null>>(() => Promise.resolve(null))
export const signIn = vi.fn()
export const signOut = vi.fn()
export const handlers = { GET: vi.fn(), POST: vi.fn() }
