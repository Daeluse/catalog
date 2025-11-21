import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../../src/app/api/modules/[name]/versions/route'
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

import { auth } from '../../auth'
import { validateApiToken } from '../../src/lib/api-tokens'

const mockAuth = vi.mocked(auth)
const mockValidateApiToken = vi.mocked(validateApiToken)

describe('GET /api/modules/[name]/versions', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    process.env.USE_MOCKS = 'true'
  })

  it('should return empty list when no versions exist', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/module/versions',
    })

    const response = await GET(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.versions).toEqual([])
  })

  it('should return all versions for a module', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '1.0.0',
      })
    )
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '1.1.0',
      })
    )
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '2.0.0',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/module/versions',
    })

    const response = await GET(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.versions).toHaveLength(3)
  })

  it('should sort versions by semver in descending order', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    // Insert in random order
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '1.1.0',
      })
    )
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '2.0.0',
      })
    )
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '1.0.0',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules/@test/module/versions',
    })

    const response = await GET(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.versions[0].version).toBe('2.0.0')
    expect(data.versions[1].version).toBe('1.1.0')
    expect(data.versions[2].version).toBe('1.0.0')
  })
})

describe('POST /api/modules/[name]/versions', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    process.env.USE_MOCKS = 'true'
  })

  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null)

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    expect(response.status).toBe(401)
  })

  it('should validate required fields', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {},
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.errors.version).toBeDefined()
    expect(data.errors.federation).toBeDefined()
    expect(data.errors.assets).toBeDefined()
    expect(data.errors.buildTool).toBeDefined()
    expect(data.errors.buildToolVersion).toBeDefined()
  })

  it('should validate version is semver', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: 'not-a-semver',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.errors.version).toBeDefined()
  })

  it('should return 404 if module does not exist', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/nonexistent/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/nonexistent' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/nonexistent' }),
    })

    expect(response.status).toBe(404)
  })

  it('should check module permissions', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'owner-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'other-user',
      userEmail: 'other@example.com',
      userName: 'Other User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    expect(response.status).toBe(403)
  })

  it('should allow owner to publish version', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
        readme: '# Test Module',
        changelog: 'Initial release',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.version).toBe('1.0.0')
    expect(data.buildTool).toBe('webpack')
    expect(data.publishedBy.userId).toBe('user-123')
    expect(data.isPrerelease).toBe(false)
  })

  it('should allow maintainer to publish version', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'owner-123',
          email: 'owner@example.com',
          name: 'Owner',
        },
        maintainers: [
          {
            userId: 'maintainer-123',
            email: 'maintainer@example.com',
            name: 'Maintainer',
            role: 'write',
          },
        ],
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'maintainer-123',
      userEmail: 'maintainer@example.com',
      userName: 'Maintainer',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    expect(response.status).toBe(201)
  })

  it('should reject duplicate version', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
      })
    )

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: '@test/module',
        moduleId: moduleData.insertedId,
        version: '1.0.0',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    expect(response.status).toBe(409)
  })

  it('should detect prerelease versions', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0-beta.1',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    const response = await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.isPrerelease).toBe(true)
  })

  it('should update module latestVersion when publishing newer version', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
        latestVersion: '1.0.0',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '2.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    const updatedModule = await db.modules.findOne({ name: '@test/module' })
    expect(updatedModule?.latestVersion).toBe('2.0.0')
  })

  it('should not update latestVersion when publishing older version', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module',
        owner: {
          userId: 'user-123',
          email: 'user@example.com',
          name: 'User',
        },
        latestVersion: '2.0.0',
      })
    )

    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'user@example.com',
      userName: 'User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules/@test/module/versions',
      body: {
        version: '1.0.0',
        federation: { name: '@test/module' },
        assets: { remoteEntry: { url: 'https://example.com/remote.js' } },
        buildTool: 'webpack',
        buildToolVersion: '5.0.0',
      },
    })

    await POST(request, {
      params: Promise.resolve({ name: '@test/module' }),
    })

    const updatedModule = await db.modules.findOne({ name: '@test/module' })
    expect(updatedModule?.latestVersion).toBe('2.0.0')
  })
})
