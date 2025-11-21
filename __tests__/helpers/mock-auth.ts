import { Session } from 'next-auth'

/**
 * Create a mock NextAuth session
 */
export function createMockSession(options: {
  id?: string
  email?: string
  name?: string
  isAdmin?: boolean
} = {}): Session {
  const {
    id = 'test-user-id',
    email = 'test@example.com',
    name = 'Test User',
    isAdmin = false,
  } = options

  return {
    user: {
      id,
      email,
      name,
      isAdmin,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  }
}

/**
 * Create a mock admin session
 */
export function createMockAdminSession(): Session {
  return createMockSession({
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    isAdmin: true,
  })
}
