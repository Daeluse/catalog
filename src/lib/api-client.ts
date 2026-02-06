/**
 * Centralized API client utilities
 * Provides consistent error handling and response parsing
 */

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.details,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * GET request
 */
export async function apiGet<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    method: "GET",
  });

  return handleResponse<T>(response);
}

/**
 * POST request
 */
export async function apiPost<T>(
  url: string,
  data?: Record<string, unknown>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * PATCH request
 */
export async function apiPatch<T>(
  url: string,
  data?: Record<string, unknown>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * PUT request
 */
export async function apiPut<T>(
  url: string,
  data?: Record<string, unknown>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  return handleResponse<T>(response);
}

/**
 * DELETE request
 */
export async function apiDelete<T = void>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${url}/delete`, {
    ...options,
    method: "POST",
  });

  return handleResponse<T>(response);
}

/**
 * Build query string from params object
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export { APIError };
