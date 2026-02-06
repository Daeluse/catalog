import { IApiToken, IApplication, ISubscription, IVersion } from "@/models";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryServer | null = null;

/**
 * Set up an in-memory MongoDB instance for testing
 */
export async function setupTestDB(): Promise<void> {
  if (mongoServer) {
    throw new Error("Test DB is already set up. Call teardownTestDB() first.");
  }

  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect Mongoose to the in-memory instance
  await mongoose.connect(uri);
}

/**
 * Tear down the in-memory MongoDB instance
 */
export async function teardownTestDB(): Promise<void> {
  if (!mongoServer) {
    return;
  }

  // Disconnect Mongoose
  await mongoose.disconnect();

  // Stop the in-memory server
  await mongoServer.stop();
  mongoServer = null;
}

/**
 * Clear all collections in the test database
 */
export async function clearTestDB(): Promise<void> {
  if (!mongoose.connection.db) {
    throw new Error("Database not connected. Call setupTestDB() first.");
  }

  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

/**
 * Reset the mock database (for USE_MOCKS=true tests)
 */
export async function resetMockDB(): Promise<void> {
  // Import getMockDatabase dynamically to avoid circular dependencies
  const { getMockDatabase } = await import("../../src/lib/db-mock");
  const mockDb = getMockDatabase();

  // Clear all mock collections by deleting all documents
  const collections = [
    "modules",
    "versions",
    "applications",
    "subscriptions",
    "apitokens",
  ];

  for (const collectionName of collections) {
    const collection = mockDb.collection(collectionName);
    const allDocs = await collection.find({});
    for (const doc of allDocs) {
      await collection.deleteOne({ _id: doc._id });
    }
  }
}

/**
 * Create test data helpers
 */
export const testData = {
  /**
   * Create a test module
   */
  createModule(overrides: Record<string, unknown> = {}) {
    return {
      name: "@test/module",
      displayName: "Test Module",
      description: "A test module for unit tests",
      organization: "Test Org",
      category: "utility" as const,
      status: "active" as const,
      owner: {
        userId: "test-user-id",
        email: "test@example.com",
        name: "Test User",
      },
      maintainers: [],
      keywords: ["test"],
      totalDownloads: 0,
      weeklyDownloads: 0,
      ...overrides,
    };
  },

  /**
   * Create a test version
   */
  createVersion(overrides: Record<string, unknown> = {}): IVersion {
    return {
      moduleId: "test-module-id",
      moduleName: "@test/module",
      version: "1.0.0",
      buildTool: "webpack" as const,
      buildToolVersion: "5.0.0",
      isPrerelease: false,
      federation: {
        name: "@test/module",
        entry: "./src/index.ts",
        exposes: {
          "./Component": "./src/Component.tsx",
        },
        shared: {},
        remotes: {},
        manifestUrl: "",
        buildMeta: {
          buildTime: new Date(),
          buildVersion: "",
          globalName: "",
          pluginVersion: "",
          publicPath: "",
          remoteEntryType: "esm",
          remoteTypes: "",
        },
      },
      assets: {
        remoteEntry: {
          fileName: "remoteEntry.js",
          url: "http://localhost:3000/remoteEntry.js",
          hash: "abc123",
          size: 123,
        },
        manifest: {
          fileName: "mf-manifest.json",
          url: "http://localhost:3000/mf-manifest.json",
          hash: "def456",
          size: 456,
        },
        assets: [],
      },
      publishedBy: {
        userId: "test-user-id",
        email: "test@example.com",
        name: "Test User",
      },
      dependencies: {},
      publishedAt: new Date(),
      downloadCount: 0,
      isDeprecated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as IVersion;
  },

  /**
   * Create a test application
   */
  createApplication(overrides: Record<string, unknown> = {}): IApplication {
    return {
      name: "Test Application",
      description: "A test application",
      contactEmail: "test@example.com",
      status: "active" as const,
      owner: {
        userId: "test-user-id",
        email: "test@example.com",
        name: "Test User",
      },
      origins: ["https://example.com", "https://www.example.com"],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as IApplication;
  },

  /**
   * Create a test subscription
   */
  createSubscription(overrides: Record<string, unknown> = {}): ISubscription {
    return {
      applicationId: "test-app-id",
      moduleId: "test-module-id",
      moduleName: "@test/module",
      status: "pending" as const,
      requestedBy: {
        userId: "test-user-id",
        email: "test@example.com",
        name: "Test User",
      },
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as ISubscription;
  },

  /**
   * Create a test API token
   */
  createApiToken(overrides: Record<string, unknown> = {}): IApiToken {
    return {
      name: "Test API Token",
      tokenHash: "$2a$10$abcdefghijklmnopqrstuv", // Bcrypt hash
      userId: "test-user-id",
      userEmail: "test@example.com",
      userName: "Test User",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: "active" as const,
      lastUsedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as IApiToken;
  },
};
