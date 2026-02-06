import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "../../src/app/api/applications/route";
import {
  GET as GET_BY_ID,
  PATCH,
} from "../../src/app/api/applications/[id]/route";
import { POST as DELETE } from "../../src/app/api/applications/[id]/delete/route";
import {
  createMockRequest,
  createMockRequestWithToken,
} from "../helpers/mock-request";
import { resetMockDB, testData } from "../helpers/mock-db";
import { db } from "../../src/lib/db-adapter";

// Mock auth module
vi.mock("../../auth", () => ({
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

import { auth } from "../../src/lib/auth";
import { validateApiToken } from "../../src/lib/api-tokens";

const mockAuth = vi.mocked(auth);
const mockValidateApiToken = vi.mocked(validateApiToken);

describe("GET /api/applications", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/applications",
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should return empty list when user has no applications", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/applications",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applications).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("should return only user's applications", async () => {
    await db.applications.insertOne(
      testData.createApplication({
        name: "User App",
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    await db.applications.insertOne(
      testData.createApplication({
        name: "Other User App",
        owner: {
          userId: "other-user",
          email: "other@example.com",
          name: "Other",
        },
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/applications",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applications).toHaveLength(1);
    expect(data.applications[0].name).toBe("User App");
  });

  it("should support pagination", async () => {
    for (let i = 1; i <= 5; i++) {
      await db.applications.insertOne(
        testData.createApplication({
          name: `App ${i}`,
          owner: {
            userId: "user-123",
            email: "user@example.com",
            name: "User",
          },
        }) as any,
      );
    }

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/applications?limit=2&skip=1",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applications).toHaveLength(2);
    expect(data.limit).toBe(2);
    expect(data.skip).toBe(1);
    expect(data.total).toBe(5);
  });
});

describe("POST /api/applications", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/applications",
      body: {
        name: "Test App",
        description: "Test Description",
        contactEmail: "test@example.com",
        origins: ["https://example.com"],
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("should validate required fields", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/applications",
      body: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.errors.name).toBeDefined();
    expect(data.errors.description).toBeDefined();
    expect(data.errors.contactEmail).toBeDefined();
    expect(data.errors.origins).toBeDefined();
  });

  it("should validate email format", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/applications",
      body: {
        name: "Test App",
        description: "Test Description",
        contactEmail: "invalid-email",
        origins: ["https://example.com"],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.errors.contactEmail).toBeDefined();
  });

  it("should validate origins format", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/applications",
      body: {
        name: "Test App",
        description: "Test Description",
        contactEmail: "test@example.com",
        origins: ["not-a-url", "https://valid.com"],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.errors.origins).toBeDefined();
  });

  it("should create application successfully", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/applications",
      body: {
        name: "My Test App",
        description: "A test application",
        contactEmail: "Test@Example.com",
        origins: ["https://example.com", "https://www.example.com"],
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe("My Test App");
    expect(data.description).toBe("A test application");
    expect(data.contactEmail).toBe("test@example.com"); // Normalized to lowercase
    expect(data.origins).toEqual([
      "https://example.com",
      "https://www.example.com",
    ]);
    expect(data.owner.userId).toBe("user-123");
    expect(data.status).toBe("active");
  });
});

describe("GET /api/applications/[id]", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/applications/app-123",
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "app-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent application", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/applications/nonexistent",
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should deny access to other user's application", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        name: "Other User App",
        owner: {
          userId: "other-user",
          email: "other@example.com",
          name: "Other",
        },
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });

    expect(response.status).toBe(403);
  });

  it("should return application for owner", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        name: "My App",
        description: "My application",
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "user-123",
        email: "user@example.com",
        name: "User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("My App");
    expect(data.owner.userId).toBe("user-123");
  });
});

describe("PATCH /api/applications/[id]", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/applications/app-123",
      body: { name: "Updated Name" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "app-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent application", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "PATCH",
      url: "http://localhost:3000/api/applications/nonexistent",
      body: { name: "Updated" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should deny update for non-owner", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "other-user",
          email: "other@example.com",
          name: "Other",
        },
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "PATCH",
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
      body: { name: "Updated" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });

    expect(response.status).toBe(403);
  });

  it("should update application for owner", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        name: "Original Name",
        description: "Original Description",
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "user-123",
        email: "user@example.com",
        name: "User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
      body: {
        name: "Updated Name",
        description: "Updated Description",
      },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe("Updated Name");
    expect(data.description).toBe("Updated Description");
  });

  it("should validate fields when updating", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "PATCH",
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
      body: {
        contactEmail: "invalid-email",
        origins: ["not-a-url"],
      },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.errors.contactEmail).toBeDefined();
    expect(data.errors.origins).toBeDefined();
  });
});

describe("DELETE /api/applications/[id]", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "DELETE",
      url: "http://localhost:3000/api/applications/app-123",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "app-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent application", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "DELETE",
      url: "http://localhost:3000/api/applications/nonexistent",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should deny deletion for non-owner", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "other-user",
          email: "other@example.com",
          name: "Other",
        },
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "DELETE",
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });

    expect(response.status).toBe(403);
  });

  it("should delete application for owner", async () => {
    const result = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "user-123",
        email: "user@example.com",
        name: "User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      method: "DELETE",
      url: `http://localhost:3000/api/applications/${result.insertedId}`,
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: result.insertedId }),
    });

    expect(response.status).toBe(200);

    // Verify deletion
    const deleted = await db.applications.findOne({ _id: result.insertedId });
    expect(deleted).toBeNull();
  });

  it("should delete associated subscriptions", async () => {
    const appResult = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    // Create subscriptions for this application
    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: appResult.insertedId,
      }) as any,
    );
    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: appResult.insertedId,
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "user-123",
        email: "user@example.com",
        name: "User",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      method: "DELETE",
      url: `http://localhost:3000/api/applications/${appResult.insertedId}`,
    });

    await DELETE(request, {
      params: Promise.resolve({ id: appResult.insertedId }),
    });

    // Verify subscriptions were deleted
    const remainingSubscriptions = await db.subscriptions.find({
      applicationId: appResult.insertedId,
    });
    expect(remainingSubscriptions).toHaveLength(0);
  });
});
