import { describe, it, expect, beforeEach } from 'vitest'
import { checkOriginApproval, setCorsHeaders, createCorsResponse } from '../../src/lib/cors'
import { NextResponse } from 'next/server'
import { resetMockDB, testData } from '../helpers/mock-db'
import { db } from '../../src/lib/db-adapter'

describe('checkOriginApproval', () => {
  beforeEach(async () => {
    await resetMockDB()
    process.env.USE_MOCKS = 'true'
  })

  it('should return null for null origin', async () => {
    const result = await checkOriginApproval(null, '@test/module')

    expect(result).toBeNull()
  })

  it('should return null when no subscriptions exist', async () => {
    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBeNull()
  })

  it('should return null when no approved subscriptions exist', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'pending', // Not approved
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBeNull()
  })

  it('should return null when application is not active', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'inactive',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBeNull()
  })

  it('should return null when origin does not match', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://different.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBeNull()
  })

  it('should return origin when approved subscription with matching origin exists', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com', 'https://app.example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBe('https://example.com')
  })

  it('should check multiple subscriptions until match is found', async () => {
    // Create first app without matching origin
    const app1 = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://other.com'],
        status: 'active',
      })
    )

    // Create second app with matching origin
    const app2 = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app1.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app2.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBe('https://example.com')
  })

  it('should handle application with no origins array', async () => {
    const app = await db.applications.insertOne({
      ...testData.createApplication({
        status: 'active',
      }),
      origins: undefined, // No origins
    })

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await checkOriginApproval('https://example.com', '@test/module')

    expect(result).toBeNull()
  })
})

describe('setCorsHeaders', () => {
  it('should set CORS headers on response', () => {
    const response = NextResponse.json({ data: 'test' })

    const result = setCorsHeaders(response, 'https://example.com')

    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(result.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(result.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    expect(result.headers.get('Access-Control-Max-Age')).toBe('86400')
  })

  it('should preserve existing response data', () => {
    const response = NextResponse.json({ data: 'test', count: 42 })

    const result = setCorsHeaders(response, 'https://example.com')

    // The response should still have the same body
    expect(result).toBe(response) // Same object reference
  })
})

describe('createCorsResponse', () => {
  beforeEach(async () => {
    await resetMockDB()
    process.env.USE_MOCKS = 'true'
  })

  it('should return null when origin is not approved', async () => {
    const result = await createCorsResponse('https://example.com', '@test/module')

    expect(result).toBeNull()
  })

  it('should return null for null origin', async () => {
    const result = await createCorsResponse(null, '@test/module')

    expect(result).toBeNull()
  })

  it('should create CORS response for approved origin', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await createCorsResponse(
      'https://example.com',
      '@test/module',
      { message: 'success' },
      200
    )

    expect(result).not.toBeNull()
    expect(result?.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    expect(result?.status).toBe(200)
  })

  it('should create response without data', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await createCorsResponse('https://example.com', '@test/module')

    expect(result).not.toBeNull()
    expect(result?.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
  })

  it('should use custom status code', async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        origins: ['https://example.com'],
        status: 'active',
      })
    )

    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: '@test/module' })
    )

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        moduleName: '@test/module',
        status: 'approved',
      })
    )

    const result = await createCorsResponse(
      'https://example.com',
      '@test/module',
      { error: 'not found' },
      404
    )

    expect(result).not.toBeNull()
    expect(result?.status).toBe(404)
  })
})
