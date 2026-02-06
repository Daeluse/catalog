import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "../../src/app/api/subscriptions/route";
import { PATCH as APPROVE } from "../../src/app/api/subscriptions/[id]/approve/route";
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

describe("GET /api/subscriptions", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      url: "http://localhost:3000/api/subscriptions",
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
      url: "http://localhost:3000/api/subscriptions",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscriptions).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("should return only subscriptions for user's applications", async () => {
    // Create applications
    const userApp = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const otherApp = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "other-user",
          email: "other@example.com",
          name: "Other",
        },
      }) as any,
    );

    // Create modules
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    // Create subscriptions
    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: userApp.insertedId,
        moduleId: moduleData.insertedId,
      }) as any,
    );

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: otherApp.insertedId,
        moduleId: moduleData.insertedId,
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/subscriptions",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscriptions).toHaveLength(1);
    expect(data.subscriptions[0].applicationId).toBe(userApp.insertedId);
  });

  it("should filter by status", async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const moduleData = await db.modules.insertOne(testData.createModule());

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        status: "pending",
      }) as any,
    );

    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        status: "approved",
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      url: "http://localhost:3000/api/subscriptions?status=pending",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscriptions).toHaveLength(1);
    expect(data.subscriptions[0].status).toBe("pending");
  });

  it("should support pagination", async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const moduleData = await db.modules.insertOne(testData.createModule());

    // Create 5 subscriptions
    for (let i = 0; i < 5; i++) {
      await db.subscriptions.insertOne(
        testData.createSubscription({
          applicationId: app.insertedId,
          moduleId: moduleData.insertedId,
          moduleName: `@test/module-${i}`,
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
      url: "http://localhost:3000/api/subscriptions?limit=2&skip=1",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subscriptions).toHaveLength(2);
    expect(data.total).toBe(5);
    expect(data.limit).toBe(2);
    expect(data.skip).toBe(1);
  });
});

describe("POST /api/subscriptions", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: "app-123",
        moduleId: "module-123",
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
      url: "http://localhost:3000/api/subscriptions",
      body: {},
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.errors.applicationId).toBeDefined();
    expect(data.errors.moduleId).toBeDefined();
  });

  it("should return 404 if application does not exist", async () => {
    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: "nonexistent",
        moduleId: "module-123",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
  });

  it("should deny subscription for non-owned application", async () => {
    const app = await db.applications.insertOne(
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
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: app.insertedId,
        moduleId: "module-123",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it("should return 404 if module does not exist", async () => {
    const app = await db.applications.insertOne(
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
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: app.insertedId,
        moduleId: "nonexistent",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
  });

  it("should reject subscription to inactive module", async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const moduleData = await db.modules.insertOne(
      testData.createModule({
        status: "deprecated",
      }),
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("should create subscription successfully", async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const moduleData = await db.modules.insertOne(
      testData.createModule({
        name: "@test/my-module",
        status: "active",
      }),
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.applicationId).toBe(app.insertedId);
    expect(data.moduleId).toBe(moduleData.insertedId);
    expect(data.moduleName).toBe("@test/my-module");
    expect(data.status).toBe("pending");
    expect(data.requestedBy.userId).toBe("user-123");
  });

  it("should reject duplicate subscription", async () => {
    const app = await db.applications.insertOne(
      testData.createApplication({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }) as any,
    );

    const moduleData = await db.modules.insertOne(
      testData.createModule({
        status: "active",
      }),
    );

    // Create existing subscription
    await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
      }) as any,
    );

    mockValidateApiToken.mockResolvedValue({
      userId: "user-123",
      userEmail: "user@example.com",
      userName: "User",
      tokenId: "token-123",
    });

    const request = createMockRequestWithToken("valid-token", {
      method: "POST",
      url: "http://localhost:3000/api/subscriptions",
      body: {
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
  });
});

describe("PATCH /api/subscriptions/[id]/approve", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should require authentication", async () => {
    mockAuth.mockResolvedValue(null as any);

    const request = createMockRequest({
      method: "PATCH",
      url: "http://localhost:3000/api/subscriptions/sub-123/approve",
      body: {},
    });

    const response = await APPROVE(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent subscription", async () => {
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
      url: "http://localhost:3000/api/subscriptions/nonexistent/approve",
      body: {},
    });

    const response = await APPROVE(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should deny approval for non-owner/non-maintainer", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({
        owner: {
          userId: "owner-123",
          email: "owner@example.com",
          name: "Owner",
        },
      }),
    );

    const app = await db.applications.insertOne(
      testData.createApplication() as any,
    );

    const subscription = await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "other-user",
        email: "other@example.com",
        name: "Other",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      url: `http://localhost:3000/api/subscriptions/${subscription.insertedId}/approve`,
      body: {},
    });

    const response = await APPROVE(request, {
      params: Promise.resolve({ id: subscription.insertedId }),
    });

    expect(response.status).toBe(403);
  });

  it("should allow module owner to approve subscription", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({
        owner: {
          userId: "user-123",
          email: "user@example.com",
          name: "User",
        },
      }),
    );

    const app = await db.applications.insertOne(
      testData.createApplication() as any,
    );

    const subscription = await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        status: "pending",
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
      url: `http://localhost:3000/api/subscriptions/${subscription.insertedId}/approve`,
      body: {
        reviewNotes: "Approved for production use",
      },
    });

    const response = await APPROVE(request, {
      params: Promise.resolve({ id: subscription.insertedId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("approved");
    expect(data.reviewedBy.userId).toBe("user-123");
    expect(data.reviewNotes).toBe("Approved for production use");
    expect(data.reviewedAt).toBeDefined();
  });

  it("should allow maintainer to approve subscription", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({
        owner: {
          userId: "owner-123",
          email: "owner@example.com",
          name: "Owner",
        },
        maintainers: [
          {
            userId: "maintainer-123",
            email: "maintainer@example.com",
            name: "Maintainer",
            role: "write",
          },
        ],
      }),
    );

    const app = await db.applications.insertOne(
      testData.createApplication() as any,
    );

    const subscription = await db.subscriptions.insertOne(
      testData.createSubscription({
        applicationId: app.insertedId,
        moduleId: moduleData.insertedId,
        status: "pending",
      }) as any,
    );

    mockAuth.mockResolvedValue({
      user: {
        id: "maintainer-123",
        email: "maintainer@example.com",
        name: "Maintainer",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    } as any);

    const request = createMockRequest({
      method: "PATCH",
      url: `http://localhost:3000/api/subscriptions/${subscription.insertedId}/approve`,
      body: {},
    });

    const response = await APPROVE(request, {
      params: Promise.resolve({ id: subscription.insertedId }),
    });

    expect(response.status).toBe(200);
  });
});
