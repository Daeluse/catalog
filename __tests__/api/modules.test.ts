import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, POST } from '../../src/app/api/modules/route'
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

describe('GET /api/modules', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    process.env.USE_MOCKS = 'true'
  })

  it('should return empty list when no modules exist', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toEqual([])
    expect(data.total).toBe(0)
  })

  it('should return list of active modules', async () => {
    // Create test modules
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module-1',
        displayName: 'Test Module 1',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module-2',
        displayName: 'Test Module 2',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/module-3',
        displayName: 'Test Module 3',
        status: 'deprecated',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(2) // Only active modules
    expect(data.total).toBe(2)
    // Check that both modules are present (order may vary)
    const names = data.modules.map((m: { name: string }) => m.name)
    expect(names).toContain('@test/module-1')
    expect(names).toContain('@test/module-2')
    expect(names).not.toContain('@test/module-3')
  })

  it('should filter modules by category', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/ui-module',
        category: 'ui',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/utility-module',
        category: 'utility',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { category: 'ui' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(data.modules[0].category).toBe('ui')
  })

  it('should filter modules by organization', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@acme/module',
        organization: 'Acme Corp',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@other/module',
        organization: 'Other Corp',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { organization: 'Acme Corp' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(data.modules[0].organization).toBe('Acme Corp')
  })

  it('should search modules by name', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/header-component',
        displayName: 'Header Component',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/footer-component',
        displayName: 'Footer Component',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { search: 'header' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(data.modules[0].name).toBe('@test/header-component')
  })

  it('should search modules by description', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/special-module',
        description: 'A module with special features',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/regular-module',
        description: 'A regular module',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { search: 'special' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(data.modules[0].description).toContain('special')
  })

  it('should sort modules by updatedAt (default)', async () => {
    const old = new Date('2024-01-01')
    const recent = new Date('2024-06-01')

    await db.modules.insertOne({
      ...testData.createModule({ name: '@test/old' }),
      updatedAt: old,
    })
    await db.modules.insertOne({
      ...testData.createModule({ name: '@test/recent' }),
      updatedAt: recent,
    })

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules[0].name).toBe('@test/recent') // Most recent first
  })

  it('should sort modules by downloads', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/popular',
        totalDownloads: 1000,
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/unpopular',
        totalDownloads: 10,
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { sort: 'downloads' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules[0].name).toBe('@test/popular')
    expect(data.modules[1].name).toBe('@test/unpopular')
  })

  it('should sort modules by name alphabetically', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/zebra',
        displayName: 'Zebra',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/alpha',
        displayName: 'Alpha',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { sort: 'name' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules[0].displayName).toBe('Alpha')
    expect(data.modules[1].displayName).toBe('Zebra')
  })

  it('should support pagination with limit', async () => {
    // Create 5 modules
    for (let i = 1; i <= 5; i++) {
      await db.modules.insertOne(
        testData.createModule({
          name: `@test/module-${i}`,
          status: 'active',
        })
      )
    }

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { limit: '2' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(2)
    expect(data.total).toBe(5)
    expect(data.limit).toBe(2)
  })

  it('should support pagination with skip', async () => {
    // Create modules with predictable order
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/first',
        displayName: 'AAA',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/second',
        displayName: 'BBB',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/third',
        displayName: 'CCC',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: { skip: '1', limit: '2', sort: 'name' },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(2)
    expect(data.modules[0].displayName).toBe('BBB')
    expect(data.modules[1].displayName).toBe('CCC')
  })

  it('should handle combined filters', async () => {
    await db.modules.insertOne(
      testData.createModule({
        name: '@acme/ui-component',
        organization: 'Acme Corp',
        category: 'ui',
        description: 'A UI component',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@acme/utility',
        organization: 'Acme Corp',
        category: 'utility',
        status: 'active',
      })
    )
    await db.modules.insertOne(
      testData.createModule({
        name: '@other/ui-component',
        organization: 'Other Corp',
        category: 'ui',
        status: 'active',
      })
    )

    const request = createMockRequest({
      url: 'http://localhost:3000/api/modules',
      searchParams: {
        organization: 'Acme Corp',
        category: 'ui',
        search: 'component',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.modules).toHaveLength(1)
    expect(data.modules[0].name).toBe('@acme/ui-component')
  })
})

describe('POST /api/modules', () => {
  beforeEach(async () => {
    await resetMockDB()
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(null)
    process.env.USE_MOCKS = 'true'
  })

  it('should require authentication', async () => {
    mockAuth.mockResolvedValue(null)

    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: testData.createModule(),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('should create a new module with valid data', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const moduleData = {
      name: '@test/new-module',
      displayName: 'New Module',
      description: 'A brand new module',
      organization: 'Test Org',
      category: 'utility',
      keywords: ['test', 'new'],
      repository: 'https://github.com/test/module',
      homepage: 'https://test.com',
      license: 'MIT',
    }

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: moduleData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe('@test/new-module')
    expect(data.displayName).toBe('New Module')
    expect(data.owner.userId).toBe('user-123')
    expect(data.status).toBe('active')
    expect(data.totalDownloads).toBe(0)

    // Verify it was saved to database
    const saved = await db.modules.findOne({ name: '@test/new-module' })
    expect(saved).not.toBeNull()
    expect(saved?.displayName).toBe('New Module')
  })

  it('should reject missing required fields', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/incomplete',
        // Missing displayName, description, organization, category
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBe('Validation failed')
    expect(data.errors).toBeDefined()
    expect(data.errors.displayName).toBeDefined()
    expect(data.errors.description).toBeDefined()
    expect(data.errors.organization).toBeDefined()
    expect(data.errors.category).toBeDefined()
  })

  it('should reject invalid module name format', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/invalid name with spaces',
        displayName: 'Invalid Name',
        description: 'Test',
        organization: 'Test',
        category: 'utility',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.errors.name).toBeDefined()
  })

  it('should reject duplicate module name', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    // Create existing module
    await db.modules.insertOne(
      testData.createModule({
        name: '@test/existing',
        status: 'active',
      })
    )

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/existing',
        displayName: 'Duplicate',
        description: 'Test',
        organization: 'Test',
        category: 'utility',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('already exists')
  })

  it('should set correct default values', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/defaults',
        displayName: 'Defaults Test',
        description: 'Test',
        organization: 'Test',
        category: 'utility',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.status).toBe('active')
    expect(data.totalDownloads).toBe(0)
    expect(data.weeklyDownloads).toBe(0)
    expect(data.maintainers).toEqual([])
    expect(data.keywords).toEqual([])
  })

  it('should preserve optional fields when provided', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/with-optionals',
        displayName: 'With Optionals',
        description: 'Test',
        organization: 'Test',
        category: 'utility',
        keywords: ['react', 'component'],
        repository: 'https://github.com/test/repo',
        homepage: 'https://example.com',
        license: 'MIT',
        icon: 'https://example.com/icon.png',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.keywords).toEqual(['react', 'component'])
    expect(data.repository).toBe('https://github.com/test/repo')
    expect(data.homepage).toBe('https://example.com')
    expect(data.license).toBe('MIT')
    expect(data.icon).toBe('https://example.com/icon.png')
  })

  it('should set owner from authenticated user', async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: 'owner-456',
      userEmail: 'owner@example.com',
      userName: 'Module Owner',
      tokenId: 'token-123',
    })

    const request = createMockRequestWithToken('valid-token', {
      method: 'POST',
      url: 'http://localhost:3000/api/modules',
      body: {
        name: '@test/owned-module',
        displayName: 'Owned Module',
        description: 'Test',
        organization: 'Test',
        category: 'utility',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.owner.userId).toBe('owner-456')
    expect(data.owner.email).toBe('owner@example.com')
    expect(data.owner.name).toBe('Module Owner')
  })
})
