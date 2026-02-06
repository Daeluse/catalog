import { NextResponse } from "next/server";

/**
 * API Response Helpers
 * Standardized response creators for API routes
 */

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) {
  const response: { error: string; details?: Record<string, unknown> } = {
    error: message,
  };
  if (details) {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(resource: string) {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function validationErrorResponse(errors: Record<string, string>) {
  return NextResponse.json(
    {
      error: "Validation failed",
      errors,
    },
    { status: 422 },
  );
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function serverErrorResponse(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
