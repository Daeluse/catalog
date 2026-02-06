import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";

describe("db (production mode)", () => {
  const originalEnv = process.env.USE_MOCKS;
  const originalMongoUri = process.env.MONGODB_URI;

  beforeEach(() => {
    // Set production mode
    process.env.USE_MOCKS = "false";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

    // Reset mongoose connection state
    vi.resetModules();
  });

  afterEach(async () => {
    // Restore original env
    process.env.USE_MOCKS = originalEnv;
    process.env.MONGODB_URI = originalMongoUri;

    // Close mongoose connections
    await mongoose.disconnect();

    vi.restoreAllMocks();
  });

  it("should connect to MongoDB in production mode", async () => {
    // Mock mongoose.connect
    const mockConnect = vi.spyOn(mongoose, "connect").mockResolvedValue({
      connections: [{ readyState: 1 }],
    } as unknown as typeof mongoose);

    // Import after setting environment
    const { connectDB } = await import("../../src/lib/db");

    await connectDB();

    expect(mockConnect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/test-db",
      { dbName: "catalog" },
    );
  });

  it("should use custom database name from env", async () => {
    process.env.MONGODB_DB = "custom-db";

    const mockConnect = vi.spyOn(mongoose, "connect").mockResolvedValue({
      connections: [{ readyState: 1 }],
    } as unknown as typeof mongoose);

    const { connectDB } = await import("../../src/lib/db");

    await connectDB();

    expect(mockConnect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/test-db",
      { dbName: "custom-db" },
    );

    delete process.env.MONGODB_DB;
  });

  it("should not reconnect if already connected", async () => {
    const mockConnect = vi.spyOn(mongoose, "connect").mockResolvedValue({
      connections: [{ readyState: 1 }],
    } as unknown as typeof mongoose);

    const { connectDB } = await import("../../src/lib/db");

    await connectDB();
    await connectDB();

    // Should only connect once
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("should throw error on connection failure", async () => {
    const error = new Error("Connection failed");
    vi.spyOn(mongoose, "connect").mockRejectedValue(error);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { connectDB } = await import("../../src/lib/db");

    await expect(connectDB()).rejects.toThrow("Connection failed");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "MongoDB connection error:",
      error,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should return mock database when USE_MOCKS is true", async () => {
    process.env.USE_MOCKS = "true";

    const mockConnect = vi.spyOn(mongoose, "connect");

    const { connectDB } = await import("../../src/lib/db");

    const result = await connectDB();

    // Should not call mongoose.connect
    expect(mockConnect).not.toHaveBeenCalled();

    // Should return mock database
    expect(result).toBeDefined();
    expect(typeof result!.collection).toBe("function");
  });
});
