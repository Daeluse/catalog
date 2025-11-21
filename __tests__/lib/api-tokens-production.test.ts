import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import mongoose from 'mongoose'

describe('api-tokens (production mode)', () => {
  const originalEnv = process.env.USE_MOCKS

  beforeEach(() => {
    // Set production mode
    process.env.USE_MOCKS = 'false'
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db'

    // Reset modules
    vi.resetModules()
  })

  afterEach(async () => {
    // Restore original env
    process.env.USE_MOCKS = originalEnv

    // Close mongoose connections
    await mongoose.disconnect()

    vi.restoreAllMocks()
  })

  describe('createApiToken', () => {
    it('should create token using Mongoose in production mode', async () => {
      const mockTokenObject = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test Token',
        tokenHash: 'hashed-value',
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test User',
        status: 'active',
        expiresAt: new Date('2025-12-31'),
        toObject: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          name: 'Test Token',
          userId: 'user-123',
        }),
      }

      const mockCreate = vi.fn().mockResolvedValue(mockTokenObject)

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          create: mockCreate,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const { createApiToken } = await import('../../src/lib/api-tokens')

      const result = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      expect(mockCreate).toHaveBeenCalled()
      expect(result.token).toMatch(/^mfc_/)
      expect(result.tokenRecord).toEqual({
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Token',
        userId: 'user-123',
      })
      expect(mockTokenObject.toObject).toHaveBeenCalled()
    })
  })

  describe('validateApiToken', () => {
    it('should validate token using Mongoose in production mode', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)

      const mockTokens = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          tokenHash: '$2a$10$validhashvalue',
          userId: 'user-123',
          userEmail: 'user@example.com',
          userName: 'Test User',
          status: 'active',
          expiresAt: futureDate,
        },
      ]

      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTokens),
      })

      const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
          updateOne: mockUpdateOne,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      // Mock bcrypt to return true for our test token
      vi.doMock('bcryptjs', () => ({
        default: {
          compare: vi.fn().mockResolvedValue(true),
          genSalt: vi.fn(),
          hash: vi.fn(),
        },
      }))

      const { validateApiToken } = await import('../../src/lib/api-tokens')

      const result = await validateApiToken('mfc_validtoken123')

      expect(mockFind).toHaveBeenCalledWith({ status: 'active' })
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: mockTokens[0]._id },
        { $set: { lastUsedAt: expect.any(Date) } }
      )
      expect(result).toEqual({
        userId: 'user-123',
        userEmail: 'user@example.com',
        userName: 'Test User',
        tokenId: '507f1f77bcf86cd799439011',
      })
    })

    it('should return null for expired token in production mode', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const mockTokens = [
        {
          _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
          tokenHash: '$2a$10$validhashvalue',
          userId: 'user-123',
          userEmail: 'user@example.com',
          userName: 'Test User',
          status: 'active',
          expiresAt: pastDate,
        },
      ]

      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockTokens),
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      vi.doMock('bcryptjs', () => ({
        default: {
          compare: vi.fn().mockResolvedValue(true),
        },
      }))

      const { validateApiToken } = await import('../../src/lib/api-tokens')

      const result = await validateApiToken('mfc_validtoken123')

      expect(result).toBeNull()
    })

    it('should return null when no matching token in production mode', async () => {
      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const { validateApiToken } = await import('../../src/lib/api-tokens')

      const result = await validateApiToken('mfc_invalidtoken')

      expect(result).toBeNull()
    })

    it('should handle errors gracefully in production mode', async () => {
      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('Database error')),
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { validateApiToken } = await import('../../src/lib/api-tokens')

      const result = await validateApiToken('mfc_sometoken')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error validating API token:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('revokeApiToken', () => {
    it('should revoke token using Mongoose in production mode', async () => {
      const mockUpdateOne = vi.fn().mockResolvedValue({
        modifiedCount: 1,
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          updateOne: mockUpdateOne,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const { revokeApiToken } = await import('../../src/lib/api-tokens')

      const result = await revokeApiToken('token-123', 'user-123')

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 'token-123', userId: 'user-123' },
        { $set: { status: 'revoked' } }
      )
      expect(result).toBe(true)
    })

    it('should return false when token not found in production mode', async () => {
      const mockUpdateOne = vi.fn().mockResolvedValue({
        modifiedCount: 0,
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          updateOne: mockUpdateOne,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const { revokeApiToken } = await import('../../src/lib/api-tokens')

      const result = await revokeApiToken('non-existent', 'user-123')

      expect(result).toBe(false)
    })

    it('should handle errors gracefully when revoking in production mode', async () => {
      const mockUpdateOne = vi
        .fn()
        .mockRejectedValue(new Error('Database error'))

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          updateOne: mockUpdateOne,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { revokeApiToken } = await import('../../src/lib/api-tokens')

      const result = await revokeApiToken('token-123', 'user-123')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error revoking API token:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('listApiTokens', () => {
    it('should list tokens using Mongoose in production mode', async () => {
      const mockTokens = [
        {
          _id: '1',
          name: 'Token 1',
          userId: 'user-123',
          status: 'active',
        },
        {
          _id: '2',
          name: 'Token 2',
          userId: 'user-123',
          status: 'revoked',
        },
      ]

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockTokens),
        }),
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const { listApiTokens } = await import('../../src/lib/api-tokens')

      const result = await listApiTokens('user-123')

      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-123' })
      expect(result).toEqual(mockTokens)
    })

    it('should return empty array on error in production mode', async () => {
      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      })

      vi.doMock('../../src/models', () => ({
        ApiToken: {
          find: mockFind,
        },
      }))

      vi.doMock('../../src/lib/db', () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }))

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const { listApiTokens } = await import('../../src/lib/api-tokens')

      const result = await listApiTokens('user-123')

      expect(result).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error listing API tokens:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
})
