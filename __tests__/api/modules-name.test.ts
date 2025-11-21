import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PATCH, DELETE } from '../../src/app/api/modules/[name]/route'
import { createMockRequest, createMockRequestWithToken } from '../helpers/mock-request'
import { resetMockDB, testData } from '../helpers/mock-db'
import { db } from '../../src/lib/db-adapter'

// Mock auth module
vi.mock('../../auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock('../../src/lib/api-tokens', () => ({
  validateApiToken: vi.fn(),
}))

vi.mock('../../src/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(() => ({
    allowed: true,
    limit: 100,
    remaining: 99,
    resetAt: new Date(Date.now() + 3600000),
  })),
  getRateLimitStatus: vi.fn(() => ({
    limit: 100,
    remaining: 99,
    resetAt: new Date(Date.now() + 3600000),
  })),
}))

vi.mock('../../src/lib/storage', () => ({
  getBlobStorageService: vi.fn(() => ({
    listBlobs: vi.fn(async () => []),
    deleteBlob: vi.fn(async () => {}),
  })),
}))

import { auth } from '../../auth'
import { validateApiToken } from '../../src/lib/api-tokens'

const mockAuth = vi.mocked(auth)
const mockValidateApiToken = vi.mocked(validateApiToken)

describe('GET /api/modules/[name]', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    process.env.USE_MOCKS = 'true'
  })

  it('should return module details for existing module', async () => {
    // Create a test module
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/my-module',
        displayName: 'My Module',
        description: 'Test module',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/my-module',
    })

    const response = await GET(request, { params: Promise.resolve({ name: '@test/my-module' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('@test/my-module')
    expect(data.displayName).toBe('My Module')
    expect(data.description).toBe('Test module')
  })

  it('should return 404 for non-existent module', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/nonexistent',
    })

    const response = await GET(request, { params: Promise.resolve({ name: '@test/nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('should return all module fields', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/complete',
        displayName: 'Complete Module',
        description: 'Full details',
        organization: 'Test Org',
        category: 'utility',
        keywords: ['test', 'example'],
        repository: 'https://github.com/test/repo',
        homepage: 'https://test.com',
        license: 'MIT',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/complete',
    })

    const response = await GET(request, { params: Promise.resolve({ name: '@test/complete' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.organization).toBe('Test Org')
    expect(data.category).toBe('utility')
    expect(data.keywords).toEqual(['test', 'example'])
    expect(data.repository).toBe('https://github.com/test/repo')
    expect(data.license).toBe('MIT')
  })
})

describe('PATCH /api/modules/[name]', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(null as any)
    process.env.USE_MOCKS = 'true'
  })

  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null as any)

    const request = createMockRequest({
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/module',
      body: { displayName: 'Updated Name' },
    })

    const response = await PATCH(request, { params: Promise.resolve({ name: '@test/module' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('should return 404 for non-existent module', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/nonexistent',
      body: { displayName: 'Updated' },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ name: '@test/nonexistent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('should allow owner to update module', async () => {
    // Create module owned by user-123
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/owned-module',
        displayName: 'Original Name',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'owner@example.com',
      userName: 'Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/owned-module',
      body: {
        displayName: 'Updated Name',
        description: 'Updated description',
      },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ name: '@test/owned-module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.displayName).toBe('Updated Name')
    expect(data.description).toBe('Updated description')

    // Verify database was updated
    const updated = await db.modules.findOne({ name: '@test/owned-module' })
    expect(updated?.displayName).toBe('Updated Name')
  })

  it('should deny non-owner from updating module', async () => {
    // Create module owned by user-123
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/someone-elses-module',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    // Try to update with different user
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-456',
      userEmail: 'other@example.com',
      userName: 'Other User',
      tokenId: 'token-456',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/someone-elses-module',
      body: { displayName: 'Hacked Name' },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ name: '@test/someone-elses-module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Insufficient permissions')
  })

  it('should allow maintainer to update module', async () => {
    // Create module with user-456 as maintainer
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/maintained-module',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        maintainers: [
          {
            userId: 'user-456',
            email: 'maintainer@example.com',
            name: 'Maintainer',
            role: 'write',
          },
        ],
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-456',
      userEmail: 'maintainer@example.com',
      userName: 'Maintainer',
      tokenId: 'token-456',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/maintained-module',
      body: { displayName: 'Updated by Maintainer' },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({ name: '@test/maintained-module' }),
    })

    expect(response.status).toBe(200)
  })

  it('should update only allowed fields', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'owner@example.com',
      userName: 'Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/module',
      body: {
        displayName: 'New Display Name',
        description: 'New description',
        repository: 'https://github.com/new/repo',
        homepage: 'https://new.com',
        license: 'Apache-2.0',
        keywords: ['new', 'keywords'],
        category: 'ui',
        icon: 'https://new.com/icon.png',
        status: 'deprecated',
      },
    })

    const response = await PATCH(request, { params: Promise.resolve({ name: '@test/module' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.displayName).toBe('New Display Name')
    expect(data.description).toBe('New description')
    expect(data.repository).toBe('https://github.com/new/repo')
    expect(data.status).toBe('deprecated')
  })

  it('should not allow updating name field', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/original',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'owner@example.com',
      userName: 'Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'PATCH',
      url: 'http://localhost:3000/api/modules/@test/original',
      body: {
        name: '@test/changed', // Attempt to change name
        displayName: 'Updated',
      },
    })

    const response = await PATCH(request, { params: Promise.resolve({ name: '@test/original' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('@test/original') // Name should not change
  })
})

describe('DELETE /api/modules/[name]', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(null as any)
    process.env.USE_MOCKS = 'true'
  })

  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null as any)

    const request = createMockRequest({
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/module',
    })

    const response = await DELETE(request, { params: Promise.resolve({ name: '@test/module' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('should return 404 for non-existent module', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/nonexistent',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ name: '@test/nonexistent' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('should allow owner to delete module', async () => {
    // Create module owned by user-123
    const moduleResult = await db.modules.insertOne(
      testData.createModule({
        name: '@test/deletable',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'owner@example.com',
      userName: 'Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/deletable',
    })

    const response = await DELETE(request, { params: Promise.resolve({ name: '@test/deletable' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Verify module was deleted from database
    const deleted = await db.modules.findOne({ name: '@test/deletable' })
    expect(deleted).toBeNull()
  })

  it('should deny non-owner from deleting module', async () => {
    // Create module owned by user-123
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/protected',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    // Try to delete with different user
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-456',
      userEmail: 'other@example.com',
      userName: 'Other User',
      tokenId: 'token-456',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/protected',
    })

    const response = await DELETE(request, { params: Promise.resolve({ name: '@test/protected' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Only the module owner')

    // Verify module still exists
    const stillExists = await db.modules.findOne({ name: '@test/protected' })
    expect(stillExists).not.toBeNull()
  })

  it('should deny maintainer from deleting module (owner only)', async () => {
    // Create module with user-456 as maintainer (not owner)
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/maintained',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        maintainers: [
          {
            userId: 'user-456',
            email: 'maintainer@example.com',
            name: 'Maintainer',
            role: 'write',
          },
        ],
        status: 'active',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-456',
      userEmail: 'maintainer@example.com',
      userName: 'Maintainer',
      tokenId: 'token-456',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/maintained',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ name: '@test/maintained' }),
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Only the module owner')
  })

  it('should delete associated versions', async () => {
    // Create module
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/with-versions',
        owner: {
          userId: 'user-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        status: 'active',
      })
    )

    // Create associated versions
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/with-versions',
        version: '1.0.0',
      })
    )
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/with-versions',
        version: '1.1.0',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'owner@example.com',
      userName: 'Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'DELETE',
      url: 'http://localhost:3000/api/modules/@test/with-versions',
    })

    const response = await DELETE(request, {
      params: Promise.resolve({ name: '@test/with-versions' }),
    })

    expect(response.status).toBe(200)

    // Verify versions were deleted
    const versions = await db.versions.find({ moduleName: '@test/with-versions' })
    expect(versions).toHaveLength(0)
  })
})
