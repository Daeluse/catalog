import { describe, it, expect } from 'vitest'
import {
  checkModulePermission,
  canApproveSubscription,
  isApplicationOwner,
  canManageModule,
  canPublishVersion,
} from '../../src/lib/permissions'
import { createMockSession, createMockAdminSession } from '../helpers/mock-auth'

describe('permissions', () => {
  const createMockModule = (overrides: any = {}) => ({
    owner: { userId: 'owner-id', email: 'owner@test.com', name: 'Owner' },
    maintainers: [],
    ...overrides,
  })

  describe('checkModulePermission', () => {
    describe('admin access', () => {
      it('should grant admin full access regardless of role', () => {
        const module = createMockModule()
        expect(checkModulePermission(module, 'any-user-id', true, 'owner')).toBe(true)
        expect(checkModulePermission(module, 'any-user-id', true, 'write')).toBe(true)
        expect(checkModulePermission(module, 'any-user-id', true, 'read')).toBe(true)
      })
    })

    describe('owner access', () => {
      it('should grant owner full access', () => {
        const module = createMockModule()
        expect(checkModulePermission(module, 'owner-id', false, 'owner')).toBe(true)
        expect(checkModulePermission(module, 'owner-id', false, 'write')).toBe(true)
        expect(checkModulePermission(module, 'owner-id', false, 'read')).toBe(true)
      })

      it('should deny non-owner for owner-level permission', () => {
        const module = createMockModule()
        expect(checkModulePermission(module, 'other-user', false, 'owner')).toBe(false)
      })
    })

    describe('maintainer access - write role', () => {
      it('should grant write access to admin maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'admin' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'write')).toBe(true)
      })

      it('should grant write access to write maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'write' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'write')).toBe(true)
      })

      it('should deny write access to read-only maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'read' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'write')).toBe(false)
      })

      it('should deny write access to non-maintainers', () => {
        const module = createMockModule()
        expect(checkModulePermission(module, 'random-user', false, 'write')).toBe(false)
      })
    })

    describe('maintainer access - read role', () => {
      it('should grant read access to admin maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'admin' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'read')).toBe(true)
      })

      it('should grant read access to write maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'write' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'read')).toBe(true)
      })

      it('should grant read access to read-only maintainers', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'read' }],
        })
        expect(checkModulePermission(module, 'maintainer-id', false, 'read')).toBe(true)
      })

      it('should deny read access to non-maintainers', () => {
        const module = createMockModule()
        expect(checkModulePermission(module, 'random-user', false, 'read')).toBe(false)
      })
    })

    describe('multiple maintainers', () => {
      it('should find correct user in maintainer list', () => {
        const module = createMockModule({
          maintainers: [
            { userId: 'user-1', role: 'read' },
            { userId: 'user-2', role: 'write' },
            { userId: 'user-3', role: 'admin' },
          ],
        })

        expect(checkModulePermission(module, 'user-1', false, 'read')).toBe(true)
        expect(checkModulePermission(module, 'user-1', false, 'write')).toBe(false)

        expect(checkModulePermission(module, 'user-2', false, 'write')).toBe(true)
        expect(checkModulePermission(module, 'user-2', false, 'read')).toBe(true)

        expect(checkModulePermission(module, 'user-3', false, 'write')).toBe(true)
        expect(checkModulePermission(module, 'user-3', false, 'read')).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should handle modules without maintainers array', () => {
        const module = createMockModule({ maintainers: undefined })
        // When maintainers is undefined, the function returns undefined (which is falsy)
        expect(checkModulePermission(module, 'user-id', false, 'write')).toBeFalsy()
        expect(checkModulePermission(module, 'user-id', false, 'read')).toBeFalsy()
      })

      it('should handle empty maintainers array', () => {
        const module = createMockModule({ maintainers: [] })
        expect(checkModulePermission(module, 'user-id', false, 'write')).toBe(false)
        expect(checkModulePermission(module, 'user-id', false, 'read')).toBe(false)
      })

      it('should default to write permission when no role specified', () => {
        const module = createMockModule({
          maintainers: [{ userId: 'maintainer-id', role: 'write' }],
        })
        // No fourth parameter = defaults to 'write'
        expect(checkModulePermission(module, 'maintainer-id', false)).toBe(true)
      })
    })
  })

  describe('canApproveSubscription', () => {
    it('should allow admin to approve any subscription', () => {
      const module = createMockModule()
      const session = createMockAdminSession()
      expect(canApproveSubscription(session, module)).toBe(true)
    })

    it('should allow module owner to approve subscriptions', () => {
      const module = createMockModule({ owner: { userId: 'owner-id' } })
      const session = createMockSession({ id: 'owner-id' })
      expect(canApproveSubscription(session, module)).toBe(true)
    })

    it('should allow maintainer with write role to approve', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'write' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canApproveSubscription(session, module)).toBe(true)
    })

    it('should allow maintainer with admin role to approve', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'admin' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canApproveSubscription(session, module)).toBe(true)
    })

    it('should deny maintainer with read role', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'read' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canApproveSubscription(session, module)).toBe(false)
    })

    it('should deny non-maintainer users', () => {
      const module = createMockModule()
      const session = createMockSession({ id: 'random-user' })
      expect(canApproveSubscription(session, module)).toBe(false)
    })

    it('should deny null session', () => {
      const module = createMockModule()
      expect(canApproveSubscription(null, module)).toBe(false)
    })

    it('should deny session without user', () => {
      const module = createMockModule()
      const invalidSession = { user: null, expires: new Date().toISOString() } as any
      expect(canApproveSubscription(invalidSession, module)).toBe(false)
    })
  })

  describe('isApplicationOwner', () => {
    it('should return true when user owns the application', () => {
      const session = createMockSession({ id: 'user-123' })
      expect(isApplicationOwner(session, 'user-123')).toBe(true)
    })

    it('should return false when user does not own the application', () => {
      const session = createMockSession({ id: 'user-123' })
      expect(isApplicationOwner(session, 'user-456')).toBe(false)
    })

    it('should return false for null session', () => {
      expect(isApplicationOwner(null, 'user-123')).toBe(false)
    })

    it('should return false for session without user', () => {
      const invalidSession = { user: null, expires: new Date().toISOString() } as any
      expect(isApplicationOwner(invalidSession, 'user-123')).toBe(false)
    })

    it('should handle different owner ID formats', () => {
      const session = createMockSession({ id: 'abc-123-def-456' })
      expect(isApplicationOwner(session, 'abc-123-def-456')).toBe(true)
      expect(isApplicationOwner(session, 'different-id')).toBe(false)
    })
  })

  describe('canManageModule', () => {
    it('should allow admin to manage any module', () => {
      const module = createMockModule()
      const session = createMockAdminSession()
      expect(canManageModule(session, module)).toBe(true)
    })

    it('should allow module owner to manage', () => {
      const module = createMockModule({ owner: { userId: 'owner-id' } })
      const session = createMockSession({ id: 'owner-id' })
      expect(canManageModule(session, module)).toBe(true)
    })

    it('should allow maintainer with admin role to manage', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'admin' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canManageModule(session, module)).toBe(true)
    })

    it('should deny maintainer with write role from managing', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'write' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canManageModule(session, module)).toBe(false)
    })

    it('should deny maintainer with read role from managing', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'read' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canManageModule(session, module)).toBe(false)
    })

    it('should deny non-maintainer users', () => {
      const module = createMockModule()
      const session = createMockSession({ id: 'random-user' })
      expect(canManageModule(session, module)).toBe(false)
    })

    it('should deny null session', () => {
      const module = createMockModule()
      expect(canManageModule(null, module)).toBe(false)
    })

    it('should handle modules without maintainers', () => {
      const module = createMockModule({ maintainers: undefined })
      const session = createMockSession({ id: 'user-id' })
      expect(canManageModule(session, module)).toBe(false)
    })
  })

  describe('canPublishVersion', () => {
    it('should have same permissions as canApproveSubscription', () => {
      const module = createMockModule()
      const adminSession = createMockAdminSession()
      const userSession = createMockSession({ id: 'user-id' })

      // Both functions should return the same results
      expect(canPublishVersion(adminSession, module)).toBe(canApproveSubscription(adminSession, module))
      expect(canPublishVersion(userSession, module)).toBe(canApproveSubscription(userSession, module))
      expect(canPublishVersion(null, module)).toBe(canApproveSubscription(null, module))
    })

    it('should allow owner to publish versions', () => {
      const module = createMockModule({ owner: { userId: 'owner-id' } })
      const session = createMockSession({ id: 'owner-id' })
      expect(canPublishVersion(session, module)).toBe(true)
    })

    it('should allow write maintainer to publish versions', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'write' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canPublishVersion(session, module)).toBe(true)
    })

    it('should deny read maintainer from publishing versions', () => {
      const module = createMockModule({
        maintainers: [{ userId: 'maintainer-id', role: 'read' }],
      })
      const session = createMockSession({ id: 'maintainer-id' })
      expect(canPublishVersion(session, module)).toBe(false)
    })
  })

  describe('permission hierarchy', () => {
    it('should follow the permission hierarchy: admin > owner > write > read', () => {
      const module = createMockModule({
        owner: { userId: 'owner-id' },
        maintainers: [
          { userId: 'admin-maintainer', role: 'admin' },
          { userId: 'write-maintainer', role: 'write' },
          { userId: 'read-maintainer', role: 'read' },
        ],
      })

      const adminSession = createMockAdminSession()
      const ownerSession = createMockSession({ id: 'owner-id' })
      const adminMaintainerSession = createMockSession({ id: 'admin-maintainer' })
      const writeMaintainerSession = createMockSession({ id: 'write-maintainer' })
      const readMaintainerSession = createMockSession({ id: 'read-maintainer' })
      const randomUserSession = createMockSession({ id: 'random-user' })

      // Admin can do everything
      expect(canManageModule(adminSession, module)).toBe(true)
      expect(canPublishVersion(adminSession, module)).toBe(true)

      // Owner can do everything
      expect(canManageModule(ownerSession, module)).toBe(true)
      expect(canPublishVersion(ownerSession, module)).toBe(true)

      // Admin maintainer can manage and publish
      expect(canManageModule(adminMaintainerSession, module)).toBe(true)
      expect(canPublishVersion(adminMaintainerSession, module)).toBe(true)

      // Write maintainer can publish but not manage
      expect(canManageModule(writeMaintainerSession, module)).toBe(false)
      expect(canPublishVersion(writeMaintainerSession, module)).toBe(true)

      // Read maintainer cannot publish or manage
      expect(canManageModule(readMaintainerSession, module)).toBe(false)
      expect(canPublishVersion(readMaintainerSession, module)).toBe(false)

      // Random user cannot do anything
      expect(canManageModule(randomUserSession, module)).toBe(false)
      expect(canPublishVersion(randomUserSession, module)).toBe(false)
    })
  })
})
