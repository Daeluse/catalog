/**
 * Pagination Utilities
 * Standardized pagination and sorting helpers for API routes
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit: number
  skip: number
}

/**
 * Pagination result metadata
 */
export interface PaginationMeta {
  total: number
  limit: number
  skip: number
  hasMore: boolean
  page: number
  totalPages: number
}

/**
 * Extract pagination parameters from URL search params
 * @param searchParams - URLSearchParams from request
 * @param defaults - Default values for limit and skip
 * @returns Pagination parameters with defaults applied
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaults: { limit?: number; skip?: number } = {}
): PaginationParams {
  const limit = parseInt(searchParams.get('limit') || String(defaults.limit || 20))
  const skip = parseInt(searchParams.get('skip') || String(defaults.skip || 0))

  return {
    limit: Math.min(Math.max(limit, 1), 100), // Clamp between 1 and 100
    skip: Math.max(skip, 0), // Ensure non-negative
  }
}

/**
 * Create pagination metadata
 * @param total - Total number of items
 * @param limit - Items per page
 * @param skip - Number of items to skip
 * @returns Pagination metadata
 */
export function createPaginationMeta(
  total: number,
  limit: number,
  skip: number
): PaginationMeta {
  const page = Math.floor(skip / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const hasMore = skip + limit < total

  return {
    total,
    limit,
    skip,
    hasMore,
    page,
    totalPages,
  }
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

/**
 * Create a paginated response
 * @param data - Array of data items
 * @param total - Total number of items (before pagination)
 * @param params - Pagination parameters
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(total, params.limit, params.skip),
  }
}

/**
 * Sort options for common fields
 */
export const SORT_OPTIONS = {
  UPDATED_DESC: { updatedAt: -1 as const },
  CREATED_DESC: { createdAt: -1 as const },
  NAME_ASC: { name: 1 as const },
  NAME_DESC: { name: -1 as const },
} as const

/**
 * Get sort option from request parameters
 * @param searchParams - URLSearchParams from request
 * @param defaultSort - Default sort option
 * @returns Sort specification object
 */
export function getSortOption(
  searchParams: URLSearchParams,
  defaultSort: Record<string, 1 | -1> = SORT_OPTIONS.UPDATED_DESC
): Record<string, 1 | -1> {
  const sort = searchParams.get('sort')

  switch (sort) {
    case 'updated':
      return SORT_OPTIONS.UPDATED_DESC
    case 'created':
      return SORT_OPTIONS.CREATED_DESC
    case 'name':
      return SORT_OPTIONS.NAME_ASC
    case 'name-desc':
      return SORT_OPTIONS.NAME_DESC
    default:
      return defaultSort
  }
}
