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

const mockListBlobs = vi.fn(async () => []);

vi.mock("../../src/lib/storage", () => ({
  getBlobStorageService: vi.fn(() => ({
    listBlobs: mockListBlobs,
  })),
}));

import { auth } from "../../src/lib/auth";
import { GET } from "../../src/app/api/assets/route";

const mockAuth = vi.mocked(auth);

describe("GET /api/assets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListBlobs.mockResolvedValue([]);
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 403 for non-admin users", async () => {
    mockAuth.mockResolvedValue(createMockSession({ isAdmin: false }) as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
    });

    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return asset list for admin users", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockListBlobs.mockResolvedValue([
      {
        name: "@myorg/my-module/versions/1.0.0/remoteEntry.js",
        size: 1024,
      },
      {
        name: "@myorg/my-module/versions/1.0.0/mf-manifest.json",
        size: 512,
      },
    ] as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(2);
    expect(data.assets).toHaveLength(2);
    expect(data.assets[0]).toEqual({
      name: "@myorg/my-module/versions/1.0.0/remoteEntry.js",
      size: 1024,
      module: "@myorg/my-module",
      version: "1.0.0",
    });
    expect(data.assets[1]).toEqual({
      name: "@myorg/my-module/versions/1.0.0/mf-manifest.json",
      size: 512,
      module: "@myorg/my-module",
      version: "1.0.0",
    });
  });

  it("should filter assets by search param", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockListBlobs.mockResolvedValue([
      {
        name: "@myorg/my-module/versions/1.0.0/remoteEntry.js",
        size: 1024,
      },
      {
        name: "@myorg/my-module/versions/1.0.0/mf-manifest.json",
        size: 512,
      },
      {
        name: "@other/lib/versions/2.0.0/remoteEntry.js",
        size: 2048,
      },
    ] as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
      searchParams: { search: "manifest" },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.assets).toHaveLength(1);
    expect(data.assets[0].name).toBe(
      "@myorg/my-module/versions/1.0.0/mf-manifest.json",
    );
  });

  it("should return empty array when storage is empty", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockListBlobs.mockResolvedValue([]);

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.assets).toEqual([]);
  });

  it("should return 500 when storage throws an error", async () => {
    mockAuth.mockResolvedValue(createMockAdminSession() as any);
    mockListBlobs.mockRejectedValue(new Error("Storage unavailable"));

    const request = createMockRequest({
      url: "http://localhost:3000/api/assets",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to list storage assets");
  });
});
