import { useState, useEffect, useCallback, useRef } from 'react'

interface UseFetchOptions<T> extends RequestInit {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  skip?: boolean // Skip the initial fetch
}

interface UseFetchReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching data from an API endpoint
 * Handles loading, error states, and provides refetch functionality
 */
export function useFetch<T = unknown>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { onSuccess, onError, skip = false, ...fetchOptions } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  // Stable reference to fetchOptions to avoid unnecessary re-fetches
  const fetchOptionsRef = useRef(fetchOptions)
  useEffect(() => {
    fetchOptionsRef.current = fetchOptions
  }, [JSON.stringify(fetchOptions)]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, fetchOptionsRef.current)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const result = await response.json()
      setData(result)

      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [url, onSuccess, onError])

  useEffect(() => {
    if (!skip) {
      fetchData()
    }
  }, [fetchData, skip])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
