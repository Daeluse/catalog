import { connectDB } from './db'
import { ApiToken } from '@/models'
import { getMockDatabase } from './db-mock'
import { ApiTokenDocument } from '@/types/database'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const useMocks = process.env.USE_MOCKS === 'true'

/**
 * Generate a cryptographically secure API token
 * Format: mfc_<40 random alphanumeric characters>
 */
export function generateTokenString(): string {
  const randomBytes = crypto.randomBytes(30)
  const tokenValue = randomBytes.toString('base64url').slice(0, 40)
  return `mfc_${tokenValue}`
}

/**
 * Hash a token for secure storage
 */
export async function hashToken(token: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(token, salt)
}

/**
 * Verify a token against a hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash)
}

/**
 * Create a new API token
 */
export async function createApiToken(
  userId: string,
  userEmail: string,
  userName: string,
  name: string,
  expiresInDays: number
): Promise<{ token: string; tokenRecord: ApiTokenDocument }> {
  const tokenString = generateTokenString()
  const tokenHash = await hashToken(tokenString)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const tokenData = {
    name,
    tokenHash,
    userId,
    userEmail,
    userName,
    expiresAt,
    status: 'active' as const,
  }

  if (useMocks) {
    const db = getMockDatabase()
    const tokensCollection = db.collection('apitokens')
    const result = await tokensCollection.insertOne(tokenData)
    const tokenRecord = await tokensCollection.findOne({ _id: result.insertedId })
    return { token: tokenString, tokenRecord }
  }

  await connectDB()
  const tokenRecord = await ApiToken.create(tokenData)
  return { token: tokenString, tokenRecord: tokenRecord.toObject() }
}

/**
 * Validate an API token and return the associated user info
 * Returns null if token is invalid, expired, or revoked
 */
export async function validateApiToken(token: string): Promise<{
  userId: string
  userEmail: string
  userName: string
  tokenId: string
} | null> {
  if (!token || !token.startsWith('mfc_')) {
    return null
  }

  try {
    if (useMocks) {
      const db = getMockDatabase()
      const tokensCollection = db.collection<ApiTokenDocument>('apitokens')
      const allTokens = await tokensCollection.find({ status: 'active' })

      // Check each active token
      for (const tokenRecord of allTokens) {
        const isValid = await verifyToken(token, tokenRecord.tokenHash)

        if (isValid) {
          // Check expiration
          if (new Date() > new Date(tokenRecord.expiresAt)) {
            return null
          }

          // Update lastUsedAt
          await tokensCollection.updateOne(
            { _id: tokenRecord._id },
            { $set: { lastUsedAt: new Date() } }
          )

          return {
            userId: tokenRecord.userId,
            userEmail: tokenRecord.userEmail,
            userName: tokenRecord.userName,
            tokenId: tokenRecord._id,
          }
        }
      }

      return null
    }

    // Production mode
    await connectDB()
    const activeTokens = await ApiToken.find({ status: 'active' }).lean()

    // Check each active token
    for (const tokenRecord of activeTokens) {
      const isValid = await verifyToken(token, tokenRecord.tokenHash)

      if (isValid) {
        // Check expiration
        if (new Date() > new Date(tokenRecord.expiresAt)) {
          return null
        }

        // Update lastUsedAt
        await ApiToken.updateOne(
          { _id: tokenRecord._id },
          { $set: { lastUsedAt: new Date() } }
        )

        return {
          userId: tokenRecord.userId,
          userEmail: tokenRecord.userEmail,
          userName: tokenRecord.userName,
          tokenId: String(tokenRecord._id),
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error validating API token:', error)
    return null
  }
}

/**
 * Revoke an API token
 */
export async function revokeApiToken(
  tokenId: string,
  userId: string
): Promise<boolean> {
  try {
    if (useMocks) {
      const db = getMockDatabase()
      const tokensCollection = db.collection<ApiTokenDocument>('apitokens')

      const token = await tokensCollection.findOne({ _id: tokenId })
      if (!token || token.userId !== userId) {
        return false
      }

      await tokensCollection.updateOne(
        { _id: tokenId },
        { $set: { status: 'revoked' } }
      )
      return true
    }

    await connectDB()
    const result = await ApiToken.updateOne(
      { _id: tokenId, userId },
      { $set: { status: 'revoked' } }
    )
    return result.modifiedCount > 0
  } catch (error) {
    console.error('Error revoking API token:', error)
    return false
  }
}

/**
 * List all API tokens for a user
 */
export async function listApiTokens(userId: string): Promise<ApiTokenDocument[]> {
  try {
    if (useMocks) {
      const db = getMockDatabase()
      const tokensCollection = db.collection<ApiTokenDocument>('apitokens')
      return await tokensCollection.find({ userId })
    }

    await connectDB()
    const tokens = await ApiToken.find({ userId })
      .sort({ createdAt: -1 })
      .lean()
    return tokens
  } catch (error) {
    console.error('Error listing API tokens:', error)
    return []
  }
}
