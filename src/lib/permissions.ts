/**
 * Shared permission checking utilities for API routes
 * Consolidated from authorization.ts to eliminate duplication
 */

import { Session } from 'next-auth'

export type PermissionRole = 'owner' | 'write' | 'read'

/**
 * Check if a user has permission to perform an action on a module
 * @param module - The module object
 * @param userId - The user's ID
 * @param isAdmin - Whether the user is an admin
 * @param requiredRole - The minimum role required ('owner', 'write', or 'read')
 * @returns true if the user has permission, false otherwise
 */
interface ModulePermissionData {
  owner: {
    userId: string
  }
  maintainers?: Array<{
    userId: string
    role: 'admin' | 'write' | 'read'
  }>
}

export function checkModulePermission(
  module: ModulePermissionData,
  userId: string,
  isAdmin: boolean,
  requiredRole: PermissionRole = 'write'
): boolean {
  const isOwner = module.owner.userId === userId

  // Admins and owners always have full access
  if (isAdmin || isOwner) return true

  // If owner is required, deny
  if (requiredRole === 'owner') return false

  // For write/read permission, check maintainers
  const hasWriteAccess = module.maintainers?.some(
    (m) => m.userId === userId && ['admin', 'write'].includes(m.role)
  )

  if (requiredRole === 'write') return hasWriteAccess

  // For read permission, also check read-only maintainers
  const hasReadAccess = module.maintainers?.some(
    (m) => m.userId === userId && ['admin', 'write', 'read'].includes(m.role)
  )

  return hasReadAccess
}

/**
 * Check if a user can approve subscriptions for a module
 * Requirements: Must be platform admin, module owner, or maintainer with admin/write role
 */
export function canApproveSubscription(
  session: Session | null,
  module: ModulePermissionData
): boolean {
  if (!session?.user) return false
  return checkModulePermission(module, session.user.id!, session.user.isAdmin || false, 'write')
}

/**
 * Check if a user owns an application
 */
export function isApplicationOwner(
  session: Session | null,
  ownerId: string
): boolean {
  if (!session?.user) return false
  return session.user.id === ownerId
}

/**
 * Check if a user can manage a module (edit, delete, add maintainers)
 * Requirements: Must be platform admin, module owner, or maintainer with admin role
 */
export function canManageModule(
  session: Session | null,
  module: ModulePermissionData
): boolean {
  if (!session?.user) return false

  const userId = session.user.id!
  const isAdmin = session.user.isAdmin || false

  // Platform admins can manage any module
  if (isAdmin) return true

  // Module owner can manage
  if (module.owner.userId === userId) return true

  // Maintainers with admin role can manage
  return module.maintainers?.some(
    (m) => m.userId === userId && m.role === 'admin'
  ) || false
}

/**
 * Check if a user can publish versions for a module
 * Requirements: Must be platform admin, module owner, or maintainer with admin/write role
 */
export function canPublishVersion(
  session: Session | null,
  module: ModulePermissionData
): boolean {
  // Same permissions as approving subscriptions
  return canApproveSubscription(session, module)
}
