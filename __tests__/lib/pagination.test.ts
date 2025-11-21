import { describe, it, expect } from 'vitest'
import {
  getPaginationParams,
  createPaginatedResponse,
  createPaginationMeta,
  getSortOption,
  SORT_OPTIONS,
} from '../../src/lib/pagination'

describe('getPaginationParams', () => {
  it('should use default values when no params provided', () => {
    const searchParams = new URLSearchParams()

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(20)
    expect(result.skip).toBe(0)
  })

  it('should use custom default limit', () => {
    const searchParams = new URLSearchParams()

    const result = getPaginationParams(searchParams, { limit: 50 })

    expect(result.limit).toBe(50)
    expect(result.skip).toBe(0)
  })

  it('should parse limit from query params', () => {
    const searchParams = new URLSearchParams('limit=10')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(10)
  })

  it('should parse skip from query params', () => {
    const searchParams = new URLSearchParams('skip=5')

    const result = getPaginationParams(searchParams)

    expect(result.skip).toBe(5)
  })

  it('should parse both limit and skip', () => {
    const searchParams = new URLSearchParams('limit=15&skip=10')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(15)
    expect(result.skip).toBe(10)
  })

  it('should enforce maximum limit of 100', () => {
    const searchParams = new URLSearchParams('limit=200')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(100)
  })

  it('should enforce minimum limit of 1', () => {
    const searchParams = new URLSearchParams('limit=0')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(1)
  })

  it('should enforce minimum limit for negative values', () => {
    const searchParams = new URLSearchParams('limit=-10')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(1)
  })

  it('should enforce minimum skip of 0', () => {
    const searchParams = new URLSearchParams('skip=-5')

    const result = getPaginationParams(searchParams)

    expect(result.skip).toBe(0)
  })

  it('should handle decimal values by converting to integer', () => {
    const searchParams = new URLSearchParams('limit=15.7&skip=10.3')

    const result = getPaginationParams(searchParams)

    expect(result.limit).toBe(15)
    expect(result.skip).toBe(10)
  })
})

describe('createPaginationMeta', () => {
  it('should create pagination metadata with correct values', () => {
    const result = createPaginationMeta(100, 20, 40)

    expect(result.total).toBe(100)
    expect(result.limit).toBe(20)
    expect(result.skip).toBe(40)
    expect(result.page).toBe(3) // floor(40/20) + 1 = 3
    expect(result.totalPages).toBe(5) // ceil(100/20) = 5
    expect(result.hasMore).toBe(true) // 40 + 20 = 60 < 100
  })

  it('should set hasMore to true when more items exist', () => {
    const result = createPaginationMeta(10, 5, 0)

    expect(result.hasMore).toBe(true) // 0 + 5 = 5 < 10
  })

  it('should set hasMore to false when no more items exist', () => {
    const result = createPaginationMeta(5, 10, 0)

    expect(result.hasMore).toBe(false) // 0 + 10 = 10 >= 5
  })

  it('should set hasMore to false when exactly at the end', () => {
    const result = createPaginationMeta(20, 10, 10)

    expect(result.hasMore).toBe(false) // 10 + 10 = 20 = 20
  })

  it('should calculate correct page number for first page', () => {
    const result = createPaginationMeta(100, 20, 0)

    expect(result.page).toBe(1) // floor(0/20) + 1 = 1
  })

  it('should calculate correct totalPages', () => {
    const result = createPaginationMeta(22, 20, 0)

    expect(result.totalPages).toBe(2) // ceil(22/20) = 2
  })
})

describe('createPaginatedResponse', () => {
  it('should create paginated response with all fields', () => {
    const items = [{ id: 1 }, { id: 2 }]
    const total = 100
    const params = { limit: 20, skip: 40 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.data).toEqual(items)
    expect(result.pagination.total).toBe(100)
    expect(result.pagination.limit).toBe(20)
    expect(result.pagination.skip).toBe(40)
    expect(result.pagination.hasMore).toBe(true) // 40 + 20 = 60 < 100
    expect(result.pagination.page).toBe(3)
    expect(result.pagination.totalPages).toBe(5)
  })

  it('should set hasMore to true when more items exist', () => {
    const items = [{ id: 1 }]
    const total = 10
    const params = { limit: 5, skip: 0 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.pagination.hasMore).toBe(true) // 0 + 5 = 5 < 10
  })

  it('should set hasMore to false when no more items exist', () => {
    const items = [{ id: 1 }]
    const total = 5
    const params = { limit: 10, skip: 0 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.pagination.hasMore).toBe(false) // 0 + 10 = 10 >= 5
  })

  it('should set hasMore to false when exactly at the end', () => {
    const items = [{ id: 1 }]
    const total = 20
    const params = { limit: 10, skip: 10 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.pagination.hasMore).toBe(false) // 10 + 10 = 20 = 20
  })

  it('should handle empty items array', () => {
    const items: unknown[] = []
    const total = 0
    const params = { limit: 20, skip: 0 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.hasMore).toBe(false)
  })

  it('should handle last page with fewer items than limit', () => {
    const items = [{ id: 1 }, { id: 2 }]
    const total = 22
    const params = { limit: 20, skip: 20 }

    const result = createPaginatedResponse(items, total, params)

    expect(result.data).toHaveLength(2)
    expect(result.pagination.hasMore).toBe(false) // 20 + 20 = 40 >= 22
  })
})

describe('getSortOption', () => {
  it('should return default sort when no sort param provided', () => {
    const searchParams = new URLSearchParams()

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.UPDATED_DESC)
  })

  it('should return custom default sort', () => {
    const searchParams = new URLSearchParams()
    const customDefault = { name: 1 as const }

    const result = getSortOption(searchParams, customDefault)

    expect(result).toEqual(customDefault)
  })

  it('should parse "updated" sort option', () => {
    const searchParams = new URLSearchParams('sort=updated')

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.UPDATED_DESC)
  })

  it('should parse "created" sort option', () => {
    const searchParams = new URLSearchParams('sort=created')

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.CREATED_DESC)
  })

  it('should parse "name" sort option', () => {
    const searchParams = new URLSearchParams('sort=name')

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.NAME_ASC)
  })

  it('should parse "name-desc" sort option', () => {
    const searchParams = new URLSearchParams('sort=name-desc')

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.NAME_DESC)
  })

  it('should return default for invalid sort option', () => {
    const searchParams = new URLSearchParams('sort=invalid')

    const result = getSortOption(searchParams)

    expect(result).toEqual(SORT_OPTIONS.UPDATED_DESC)
  })
})
