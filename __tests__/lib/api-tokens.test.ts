import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateTokenString,
  hashToken,
  verifyToken,
  createApiToken,
  validateApiToken,
  revokeApiToken,
  listApiTokens,
} from '../../src/lib/api-tokens'
import { resetMockDB } from '../helpers/mock-db'

describe('api-tokens', () => {
  beforeEach(async () => {
    // Reset mock database before each test
    await resetMockDB()
    // Set USE_MOCKS to true for tests
    process.env.USE_MOCKS = 'true'
  })

  describe('generateTokenString', () => {
    it('should generate a token with mfc_ prefix', () => {
      const token = generateTokenString()
      expect(token).toMatch(/^mfc_/)
    })

    it('should generate a token of correct length', () => {
      const token = generateTokenString()
      // mfc_ (4 chars) + 40 random chars = 44 total
      expect(token).toHaveLength(44)
    })

    it('should generate unique tokens', () => {
      const token1 = generateTokenString()
      const token2 = generateTokenString()
      const token3 = generateTokenString()

      expect(token1).not.toBe(token2)
      expect(token2).not.toBe(token3)
      expect(token1).not.toBe(token3)
    })

    it('should generate tokens with only safe URL characters', () => {
      const token = generateTokenString()
      // base64url alphabet: A-Z, a-z, 0-9, -, _
      expect(token).toMatch(/^mfc_[A-Za-z0-9_-]+$/)
    })
  })

  describe('hashToken', () => {
    it('should hash a token', async () => {
      const token = 'mfc_test_token_123'
      const hash = await hashToken(token)

      expect(hash).toBeTruthy()
      expect(hash).not.toBe(token)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are long
    })

    it('should produce different hashes for same token (due to salt)', async () => {
      const token = 'mfc_test_token_123'
      const hash1 = await hashToken(token)
      const hash2 = await hashToken(token)

      expect(hash1).not.toBe(hash2) // Different salts
      expect(hash1).toBeTruthy()
      expect(hash2).toBeTruthy()
    })

    it('should produce bcrypt format hash', async () => {
      const token = 'mfc_test_token_123'
      const hash = await hashToken(token)

      // bcrypt hash format: $2a$10$...
      expect(hash).toMatch(/^\$2[ayb]\$\d{2}\$/)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid token against its hash', async () => {
      const token = 'mfc_test_token_123'
      const hash = await hashToken(token)

      const isValid = await verifyToken(token, hash)
      expect(isValid).toBe(true)
    })

    it('should reject invalid token', async () => {
      const token = 'mfc_test_token_123'
      const hash = await hashToken(token)

      const isValid = await verifyToken('mfc_wrong_token', hash)
      expect(isValid).toBe(false)
    })

    it('should reject empty token', async () => {
      const token = 'mfc_test_token_123'
      const hash = await hashToken(token)

      const isValid = await verifyToken('', hash)
      expect(isValid).toBe(false)
    })

    it('should handle malformed hash gracefully', async () => {
      const token = 'mfc_test_token_123'

      const isValid = await verifyToken(token, 'invalid-hash')
      expect(isValid).toBe(false)
    })
  })

  describe('createApiToken', () => {
    it('should create a new API token', async () => {
      const result = await createApiToken(
        'user-123',
        'test@example.com',
        'Test User',
        'My API Token',
        30
      )

      expect(result.token).toBeTruthy()
      expect(result.token).toMatch(/^mfc_/)
      expect(result.tokenRecord).toBeTruthy()
    })

    it('should store token with correct user info', async () => {
      const result = await createApiToken(
        'user-456',
        'user@example.com',
        'User Name',
        'Test Token',
        30
      )

      expect(result.tokenRecord.userId).toBe('user-456')
      expect(result.tokenRecord.userEmail).toBe('user@example.com')
      expect(result.tokenRecord.userName).toBe('User Name')
      expect(result.tokenRecord.name).toBe('Test Token')
    })

    it('should set expiration date correctly', async () => {
      const expiresInDays = 30
      const beforeCreate = new Date()
      beforeCreate.setDate(beforeCreate.getDate() + expiresInDays)

      const result = await createApiToken(
        'user-123',
        'test@example.com',
        'Test User',
        'Token',
        expiresInDays
      )

      const afterCreate = new Date()
      afterCreate.setDate(afterCreate.getDate() + expiresInDays)

      const expiresAt = new Date(result.tokenRecord.expiresAt)
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })

    it('should set status to active', async () => {
      const result = await createApiToken(
        'user-123',
        'test@example.com',
        'Test User',
        'Token',
        30
      )

      expect(result.tokenRecord.status).toBe('active')
    })

    it('should store hashed token, not plain text', async () => {
      const result = await createApiToken(
        'user-123',
        'test@example.com',
        'Test User',
        'Token',
        30
      )

      expect(result.tokenRecord.tokenHash).not.toBe(result.token)
      expect(result.tokenRecord.tokenHash).toMatch(/^\$2[ayb]\$/)
    })

    it('should allow verification of created token', async () => {
      const result = await createApiToken(
        'user-123',
        'test@example.com',
        'Test User',
        'Token',
        30
      )

      const isValid = await verifyToken(result.token, result.tokenRecord.tokenHash)
      expect(isValid).toBe(true)
    })

    it('should support different expiration periods', async () => {
      const result7 = await createApiToken('user-1', 'a@test.com', 'User', 'Token7', 7)
      const result30 = await createApiToken('user-2', 'b@test.com', 'User', 'Token30', 30)
      const result90 = await createApiToken('user-3', 'c@test.com', 'User', 'Token90', 90)

      const now = Date.now()
      const expires7 = new Date(result7.tokenRecord.expiresAt).getTime()
      const expires30 = new Date(result30.tokenRecord.expiresAt).getTime()
      const expires90 = new Date(result90.tokenRecord.expiresAt).getTime()

      const day = 24 * 60 * 60 * 1000

      expect(expires7).toBeLessThan(expires30)
      expect(expires30).toBeLessThan(expires90)
      expect(expires7 - now).toBeLessThanOrEqual(7 * day + 1000)
      expect(expires30 - now).toBeLessThanOrEqual(30 * day + 1000)
      expect(expires90 - now).toBeLessThanOrEqual(90 * day + 1000)
    })
  })

  describe('validateApiToken', () => {
    it('should validate a valid active token', async () => {
      const { token } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      const result = await validateApiToken(token)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-123')
      expect(result?.userEmail).toBe('user@example.com')
      expect(result?.userName).toBe('Test User')
      expect(result?.tokenId).toBeTruthy()
    })

    it('should reject token without mfc_ prefix', async () => {
      const result = await validateApiToken('invalid_prefix_token')
      expect(result).toBeNull()
    })

    it('should reject empty token', async () => {
      const result = await validateApiToken('')
      expect(result).toBeNull()
    })

    it('should reject non-existent token', async () => {
      const result = await validateApiToken('mfc_nonexistent_token_12345678901234567890')
      expect(result).toBeNull()
    })

    it('should reject expired token', async () => {
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        1
      )

      // Manually set expiration to past
      const { getMockDatabase } = await import('../../src/lib/db-mock')
      const db = getMockDatabase()
      const tokensCollection = db.collection('apitokens')
      await tokensCollection.updateOne(
        { _id: tokenRecord._id },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      )

      const result = await validateApiToken(token)
      expect(result).toBeNull()
    })

    it('should reject revoked token', async () => {
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      // Revoke the token
      await revokeApiToken(tokenRecord._id, 'user-123')

      const result = await validateApiToken(token)
      expect(result).toBeNull()
    })

    it('should update lastUsedAt when validating', async () => {
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      const beforeValidation = Date.now()
      await validateApiToken(token)
      const afterValidation = Date.now()

      // Read token from database to check lastUsedAt
      const { getMockDatabase } = await import('../../src/lib/db-mock')
      const db = getMockDatabase()
      const tokensCollection = db.collection('apitokens')
      const updatedToken = await tokensCollection.findOne({ _id: tokenRecord._id })

      expect(updatedToken).not.toBeNull()
      expect(updatedToken!.lastUsedAt).toBeTruthy()
      const lastUsedTime = new Date(updatedToken!.lastUsedAt as Date).getTime()
      expect(lastUsedTime).toBeGreaterThanOrEqual(beforeValidation)
      expect(lastUsedTime).toBeLessThanOrEqual(afterValidation)
    })

    it('should handle multiple tokens for different users', async () => {
      const { token: token1 } = await createApiToken(
        'user-1',
        'user1@test.com',
        'User 1',
        'Token 1',
        30
      )

      const { token: token2 } = await createApiToken(
        'user-2',
        'user2@test.com',
        'User 2',
        'Token 2',
        30
      )

      const result1 = await validateApiToken(token1)
      const result2 = await validateApiToken(token2)

      expect(result1?.userId).toBe('user-1')
      expect(result2?.userId).toBe('user-2')
      expect(result1?.tokenId).not.toBe(result2?.tokenId)
    })

    it('should handle user with multiple active tokens', async () => {
      const { token: token1 } = await createApiToken(
        'user-1',
        'user@test.com',
        'User',
        'Token 1',
        30
      )

      const { token: token2 } = await createApiToken(
        'user-1',
        'user@test.com',
        'User',
        'Token 2',
        30
      )

      const result1 = await validateApiToken(token1)
      const result2 = await validateApiToken(token2)

      expect(result1?.userId).toBe('user-1')
      expect(result2?.userId).toBe('user-1')
      expect(result1?.tokenId).not.toBe(result2?.tokenId)
    })
  })

  describe('revokeApiToken', () => {
    it('should revoke an owned token', async () => {
      const { tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      const result = await revokeApiToken(tokenRecord._id, 'user-123')
      expect(result).toBe(true)

      // Verify token is revoked in database
      const { getMockDatabase } = await import('../../src/lib/db-mock')
      const db = getMockDatabase()
      const tokensCollection = db.collection('apitokens')
      const revokedToken = await tokensCollection.findOne({ _id: tokenRecord._id })

      expect(revokedToken).not.toBeNull()
      expect(revokedToken!.status).toBe('revoked')
    })

    it('should not revoke token owned by different user', async () => {
      const { tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      const result = await revokeApiToken(tokenRecord._id, 'different-user')
      expect(result).toBe(false)

      // Verify token is still active
      const { getMockDatabase } = await import('../../src/lib/db-mock')
      const db = getMockDatabase()
      const tokensCollection = db.collection('apitokens')
      const token = await tokensCollection.findOne({ _id: tokenRecord._id })

      expect(token).not.toBeNull()
      expect(token!.status).toBe('active')
    })

    it('should return false for non-existent token', async () => {
      const result = await revokeApiToken('nonexistent-id', 'user-123')
      expect(result).toBe(false)
    })

    it('should make revoked token invalid for validation', async () => {
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@example.com',
        'Test User',
        'Test Token',
        30
      )

      // Token should be valid before revocation
      const beforeRevoke = await validateApiToken(token)
      expect(beforeRevoke).not.toBeNull()

      // Revoke the token
      await revokeApiToken(tokenRecord._id, 'user-123')

      // Token should be invalid after revocation
      const afterRevoke = await validateApiToken(token)
      expect(afterRevoke).toBeNull()
    })
  })

  describe('listApiTokens', () => {
    it('should list all tokens for a user', async () => {
      await createApiToken('user-123', 'user@test.com', 'User', 'Token 1', 30)
      await createApiToken('user-123', 'user@test.com', 'User', 'Token 2', 30)
      await createApiToken('user-123', 'user@test.com', 'User', 'Token 3', 30)

      const tokens = await listApiTokens('user-123')

      expect(tokens).toHaveLength(3)
      expect(tokens[0].userId).toBe('user-123')
      expect(tokens[1].userId).toBe('user-123')
      expect(tokens[2].userId).toBe('user-123')
    })

    it('should only list tokens for specified user', async () => {
      await createApiToken('user-1', 'user1@test.com', 'User 1', 'Token 1', 30)
      await createApiToken('user-2', 'user2@test.com', 'User 2', 'Token 2', 30)
      await createApiToken('user-1', 'user1@test.com', 'User 1', 'Token 3', 30)

      const user1Tokens = await listApiTokens('user-1')
      const user2Tokens = await listApiTokens('user-2')

      expect(user1Tokens).toHaveLength(2)
      expect(user2Tokens).toHaveLength(1)
      expect(user1Tokens.every((t) => t.userId === 'user-1')).toBe(true)
      expect(user2Tokens.every((t) => t.userId === 'user-2')).toBe(true)
    })

    it('should return empty array for user with no tokens', async () => {
      const tokens = await listApiTokens('user-with-no-tokens')
      expect(tokens).toEqual([])
    })

    it('should include both active and revoked tokens', async () => {
      const { tokenRecord: token1 } = await createApiToken(
        'user-123',
        'user@test.com',
        'User',
        'Token 1',
        30
      )
      await createApiToken('user-123', 'user@test.com', 'User', 'Token 2', 30)

      // Revoke first token
      await revokeApiToken(token1._id, 'user-123')

      const tokens = await listApiTokens('user-123')

      expect(tokens).toHaveLength(2)
      expect(tokens.some((t) => t.status === 'active')).toBe(true)
      expect(tokens.some((t) => t.status === 'revoked')).toBe(true)
    })

    it('should include token metadata', async () => {
      await createApiToken('user-123', 'user@test.com', 'User', 'My Test Token', 30)

      const tokens = await listApiTokens('user-123')

      expect(tokens).toHaveLength(1)
      expect(tokens[0].name).toBe('My Test Token')
      expect(tokens[0].userId).toBe('user-123')
      expect(tokens[0].userEmail).toBe('user@test.com')
      expect(tokens[0].userName).toBe('User')
      expect(tokens[0].status).toBe('active')
      expect(tokens[0].expiresAt).toBeTruthy()
      expect(tokens[0].tokenHash).toBeTruthy()
    })
  })

  describe('token lifecycle integration', () => {
    it('should support complete token lifecycle', async () => {
      // 1. Create token
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@test.com',
        'Test User',
        'Lifecycle Token',
        30
      )

      expect(token).toBeTruthy()

      // 2. Validate token (should work)
      const validation1 = await validateApiToken(token)
      expect(validation1).not.toBeNull()
      expect(validation1?.userId).toBe('user-123')

      // 3. List tokens (should show 1 active token)
      const list1 = await listApiTokens('user-123')
      expect(list1).toHaveLength(1)
      expect(list1[0].status).toBe('active')

      // 4. Revoke token
      const revoked = await revokeApiToken(tokenRecord._id, 'user-123')
      expect(revoked).toBe(true)

      // 5. Validate token again (should fail)
      const validation2 = await validateApiToken(token)
      expect(validation2).toBeNull()

      // 6. List tokens (should still show 1 token, but revoked)
      const list2 = await listApiTokens('user-123')
      expect(list2).toHaveLength(1)
      expect(list2[0].status).toBe('revoked')
    })

    it('should maintain security throughout lifecycle', async () => {
      const { token, tokenRecord } = await createApiToken(
        'user-123',
        'user@test.com',
        'User',
        'Security Token',
        30
      )

      // Token hash should never match the plain token
      expect(tokenRecord.tokenHash).not.toContain(token.slice(4)) // Remove mfc_ prefix

      // Listing tokens should not expose plain token
      const tokens = await listApiTokens('user-123')
      expect(tokens[0]).not.toHaveProperty('token')
      expect(tokens[0].tokenHash).toBeTruthy()

      // Validation should not leak token information on failure
      const invalidResult = await validateApiToken('mfc_wrong_token_12345678901234567890')
      expect(invalidResult).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle very short expiration period', async () => {
      const { token } = await createApiToken(
        'user-123',
        'user@test.com',
        'User',
        'Short Token',
        0 // Same day expiration
      )

      // Should still be created and initially valid
      expect(token).toBeTruthy()
    })

    it('should handle very long token names', async () => {
      const longName = 'A'.repeat(200)
      const { tokenRecord } = await createApiToken(
        'user-123',
        'user@test.com',
        'User',
        longName,
        30
      )

      expect(tokenRecord.name).toBe(longName)
    })

    it('should handle special characters in user names', async () => {
      const result = await createApiToken(
        'user-123',
        'test+tag@example.com',
        "O'Brien-Smith (Admin)",
        'Token',
        30
      )

      expect(result.tokenRecord.userEmail).toBe('test+tag@example.com')
      expect(result.tokenRecord.userName).toBe("O'Brien-Smith (Admin)")
    })

    it('should handle rapid token creation', async () => {
      const tokens = await Promise.all([
        createApiToken('user-1', 'u@t.com', 'U', 'T1', 30),
        createApiToken('user-1', 'u@t.com', 'U', 'T2', 30),
        createApiToken('user-1', 'u@t.com', 'U', 'T3', 30),
      ])

      // All tokens should be unique
      const tokenStrings = tokens.map((t) => t.token)
      const uniqueTokens = new Set(tokenStrings)
      expect(uniqueTokens.size).toBe(3)

      // All should be valid
      for (const { token } of tokens) {
        const result = await validateApiToken(token)
        expect(result).not.toBeNull()
      }
    })
  })
})
