import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../../src/app/api/modules/[name]/resolve/[tag]/route";
import { createMockRequest } from "../helpers/mock-request";
import { resetMockDB, testData } from "../helpers/mock-db";
import { db } from "../../src/lib/db-adapter";

describe("GET /api/modules/[name]/resolve/[tag]", () => {
  beforeEach(async () => {
    await resetMockDB();
    vi.clearAllMocks();
    process.env.USE_MOCKS = "true";
  });

  it("should return 404 when module has no versions", async () => {
    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });

    expect(response.status).toBe(404);
  });

  it('should resolve "latest" to most recent stable version', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
        isPrerelease: false,
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.1.0",
        isPrerelease: false,
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0-beta.1",
        isPrerelease: true,
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tag).toBe("latest");
    expect(data.resolvedVersion).toBe("1.1.0");
    expect(data.remoteEntry).toBeDefined();
    expect(data.buildTool).toBe("webpack");
  });

  it('should return 404 when no stable versions exist for "latest"', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0-beta.1",
        isPrerelease: true,
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });

    expect(response.status).toBe(404);
  });

  it('should resolve "next" to most recent version including prereleases', async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
        isPrerelease: false,
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0-beta.1",
        isPrerelease: true,
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/next",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "next" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tag).toBe("next");
    expect(data.resolvedVersion).toBe("2.0.0-beta.1");
    expect(data.metadata.isPrerelease).toBe(true);
  });

  it("should resolve specific version", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.1.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/1.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "1.0.0" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resolvedVersion).toBe("1.0.0");
  });

  it("should return 404 when specific version does not exist", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/2.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "2.0.0" }),
    });

    expect(response.status).toBe(404);
  });

  it("should resolve caret range (^1.0.0)", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.2.3",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/^1.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "^1.0.0" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tag).toBe("^1.0.0");
    expect(data.resolvedVersion).toBe("1.2.3");
  });

  it("should resolve tilde range (~1.1.0)", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.1.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.1.5",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.2.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/~1.1.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "~1.1.0" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tag).toBe("~1.1.0");
    expect(data.resolvedVersion).toBe("1.1.5");
  });

  it("should resolve comparison range (>=1.0.0)", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "0.9.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/>=1.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: ">=1.0.0" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resolvedVersion).toBe("2.0.0");
  });

  it("should resolve wildcard range (1.x)", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.5.0",
      }) as any,
    );
    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "2.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/1.x",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "1.x" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resolvedVersion).toBe("1.5.0");
  });

  it("should return 404 when no version matches range", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/^2.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "^2.0.0" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 404 for unmatched tag", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/invalid-tag",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "invalid-tag" }),
    });

    expect(response.status).toBe(404);
  });

  it("should include metadata in response", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
        federation: {
          name: "@test/module",
          entry: "./src/index.ts",
          exposes: {
            "./Component": "./src/Component.tsx",
            "./Header": "./src/Header.tsx",
          },
          shared: {
            react: { version: "19.0.0", singleton: true },
          },
        },
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata).toBeDefined();
    expect(data.metadata.federation.name).toBe("@test/module");
    expect(data.metadata.federation.exposes).toEqual([
      "./Component",
      "./Header",
    ]);
  });

  it("should include versionId in response", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    const version = await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.versionId).toBe(version.insertedId);
  });

  it("should increment download counts when resolving a version", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module", totalDownloads: 0 }),
    );

    const version = await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
        downloadCount: 0,
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/latest",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "latest" }),
    });

    expect(response.status).toBe(200);

    // Wait for fire-and-forget recordDownload to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mod = await db.modules.findOne({ name: "@test/module" });
    expect(mod!.totalDownloads).toBe(1);

    const ver = await db.versions.findOne({ _id: version.insertedId });
    expect(ver!.downloadCount).toBe(1);
  });

  it("should include publishedAt in response", async () => {
    const moduleData = await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    const publishedAt = new Date("2025-01-01T00:00:00Z");

    await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        moduleId: moduleData.insertedId,
        version: "1.0.0",
        publishedAt,
      }) as any,
    );

    const request = createMockRequest({
      url: "http://localhost:3000/api/modules/@test/module/resolve/1.0.0",
    });

    const response = await GET(request, {
      params: Promise.resolve({ name: "@test/module", tag: "1.0.0" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.publishedAt).toBeDefined();
  });
});
