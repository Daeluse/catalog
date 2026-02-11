import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockRequest } from "../helpers/mock-request";
import {
  createMockSession,
  createMockAdminSession,
} from "../helpers/mock-auth";

// Mock auth module
vi.mock("../../src/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

vi.mock("../../src/lib/api-tokens", () => ({
  validateApiToken: vi.fn(),
}));

vi.mock("../../src/lib/rate-limiter", () => ({
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
}));

const mockDeleteBlob = vi.fn(async () => true);

vi.mock("../../src/lib/storage", () => ({
  getBlobStorageService: vi.fn(() => ({
    deleteBlob: mockDeleteBlob,
  })),
}));

import { auth } from "../../src/lib/auth";
import { POST } from "../../src/app/api/assets/route";

const mockAuth = vi.mocked(auth);

describe("POST /api/assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteBlob.mockResolvedValue(true);
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "my-module/versions/1.0.0/remoteEntry.js",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for non-admin users", async () => {
    mockAuth.mockResolvedValue(createMockSession({ isAdmin: false }) as any);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "my-module/versions/1.0.0/remoteEntry.js",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should delete asset and return 204", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockDeleteBlob.mockResolvedValue(true);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "my-module/versions/1.0.0/remoteEntry.js",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockDeleteBlob).toHaveBeenCalledWith(
      "my-module/versions/1.0.0/remoteEntry.js",
    );
  });

  it("should handle scoped module paths", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockDeleteBlob.mockResolvedValue(true);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "@myorg/my-module/versions/1.0.0/remoteEntry.js",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(204);
    expect(mockDeleteBlob).toHaveBeenCalledWith(
      "@myorg/my-module/versions/1.0.0/remoteEntry.js",
    );
  });

  it("should return 404 when blob does not exist", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockDeleteBlob.mockResolvedValue(false);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "nonexistent/file.js",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Asset not found");
  });

  it("should return 500 when storage throws an error", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockDeleteBlob.mockRejectedValue(new Error("Storage unavailable"));

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/assets",
      body: {
        path: "my-module/versions/1.0.0/remoteEntry.js",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to delete storage asset");
  });
});
