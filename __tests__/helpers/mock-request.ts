import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  } = {},
): NextRequest {
  const {
    method = "GET",
    url = "http://localhost:3000",
    headers = {},
    body,
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit as any);
}

/**
 * Create a mock NextRequest with Bearer token authentication
 */
export function createMockRequestWithToken(
  token: string,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
): NextRequest {
  return createMockRequest({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Create a mock multipart/form-data request
 */
export function createMockMultipartRequest(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    formData?: FormData;
  } = {},
): NextRequest {
  const {
    method = "POST",
    url = "http://localhost:3000",
    headers = {},
    formData,
  } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "multipart/form-data",
      ...headers,
    },
  };

  if (formData) {
    requestInit.body = formData as unknown as BodyInit;
  }

  return new NextRequest(url, requestInit as any);
}
