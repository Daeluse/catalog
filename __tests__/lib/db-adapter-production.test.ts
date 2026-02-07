import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";

describe("db-adapter (production mode)", () => {
  const originalEnv = process.env.USE_MOCKS;

  beforeEach(() => {
    // Set production mode
    process.env.USE_MOCKS = "false";
    process.env.MONGODB_URI = "mongodb://localhost:27017/test-db";

    // Reset modules to pick up new env
    vi.resetModules();
  });

  afterEach(async () => {
    // Restore original env
    process.env.USE_MOCKS = originalEnv;

    // Close mongoose connections
    await mongoose.disconnect();

    vi.restoreAllMocks();
  });

  describe("CollectionAdapter.find", () => {
    it("should find documents using Mongoose in production mode", async () => {
      const mockDocs = [
        { _id: "1", name: "Module 1", status: "active" },
        { _id: "2", name: "Module 2", status: "active" },
      ];

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDocs),
      });

      const mockModel = {
        find: mockFind,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.find(
        { status: "active" },
        { sort: { name: 1 }, limit: 10, skip: 0 },
      );

      expect(mockFind).toHaveBeenCalledWith({ status: "active" });
      expect(result).toEqual(mockDocs);
    });

    it("should find without options in production mode", async () => {
      const mockDocs = [{ _id: "1", name: "Module 1" }];

      const mockFind = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDocs),
      });

      const mockModel = {
        find: mockFind,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.find({});

      expect(mockFind).toHaveBeenCalledWith({});
      expect(result).toEqual(mockDocs);
    });
  });

  describe("CollectionAdapter.findOne", () => {
    it("should find one document using Mongoose in production mode", async () => {
      const mockDoc = { _id: "1", name: "Test Module" };

      const mockFindOne = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDoc),
      });

      const mockModel = {
        findOne: mockFindOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.findOne({ _id: "1" });

      expect(mockFindOne).toHaveBeenCalledWith({ _id: "1" });
      expect(result).toEqual(mockDoc);
    });

    it("should return null when not found in production mode", async () => {
      const mockFindOne = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });

      const mockModel = {
        findOne: mockFindOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.findOne({ _id: "non-existent" });

      expect(result).toBeNull();
    });
  });

  describe("CollectionAdapter.insertOne", () => {
    it("should insert document using Mongoose in production mode", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        name: "test",
      });

      // Mock the Module model
      const mockModel = {
        create: mockCreate,
      };

      // Mock connectDB
      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      // Import after mocking
      const { db } = await import("../../src/lib/db-adapter");

      // Replace the model with our mock
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.insertOne({ name: "test" });

      expect(mockCreate).toHaveBeenCalledWith({ name: "test" });
      expect(result.insertedId).toBe("507f1f77bcf86cd799439011");
    });
  });

  describe("CollectionAdapter.updateOne", () => {
    it("should update document using Mongoose in production mode", async () => {
      const mockUpdateOne = vi.fn().mockResolvedValue({
        modifiedCount: 1,
        matchedCount: 1,
      });

      const mockModel = {
        updateOne: mockUpdateOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.updateOne(
        { _id: "test-id" },
        { $set: { name: "updated" } },
      );

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: "test-id" },
        { $set: { name: "updated" } },
      );
      expect(result.modifiedCount).toBe(1);
      expect(result.matchedCount).toBe(1);
    });

    it("should return zero counts when no document matches", async () => {
      const mockUpdateOne = vi.fn().mockResolvedValue({
        modifiedCount: 0,
        matchedCount: 0,
      });

      const mockModel = {
        updateOne: mockUpdateOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.updateOne(
        { _id: "non-existent" },
        { $set: { name: "test" } },
      );

      expect(result.modifiedCount).toBe(0);
      expect(result.matchedCount).toBe(0);
    });
  });

  describe("CollectionAdapter.deleteOne", () => {
    it("should delete document using Mongoose in production mode", async () => {
      const mockDeleteOne = vi.fn().mockResolvedValue({
        deletedCount: 1,
      });

      const mockModel = {
        deleteOne: mockDeleteOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.deleteOne({ _id: "test-id" });

      expect(mockDeleteOne).toHaveBeenCalledWith({ _id: "test-id" });
      expect(result.deletedCount).toBe(1);
    });

    it("should return zero when no document deleted", async () => {
      const mockDeleteOne = vi.fn().mockResolvedValue({
        deletedCount: 0,
      });

      const mockModel = {
        deleteOne: mockDeleteOne,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const result = await db.modules.deleteOne({ _id: "non-existent" });

      expect(result.deletedCount).toBe(0);
    });
  });

  describe("CollectionAdapter.countDocuments", () => {
    it("should count documents using Mongoose in production mode", async () => {
      const mockCountDocuments = vi.fn().mockResolvedValue(42);

      const mockModel = {
        countDocuments: mockCountDocuments,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const count = await db.modules.countDocuments({ status: "active" });

      expect(mockCountDocuments).toHaveBeenCalledWith({ status: "active" });
      expect(count).toBe(42);
    });

    it("should count all documents with empty query", async () => {
      const mockCountDocuments = vi.fn().mockResolvedValue(100);

      const mockModel = {
        countDocuments: mockCountDocuments,
      };

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { db } = await import("../../src/lib/db-adapter");
      (db.modules as unknown as { model: unknown }).model = mockModel;

      const count = await db.modules.countDocuments();

      expect(mockCountDocuments).toHaveBeenCalledWith({});
      expect(count).toBe(100);
    });
  });

  describe("findById", () => {
    it("should find document by ID using Mongoose in production mode", async () => {
      const objectId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
      const mockDoc = {
        _id: objectId,
        name: "Test Module",
        toObject: vi.fn().mockReturnValue({
          _id: objectId,
          name: "Test Module",
        }),
      };

      const mockFindById = vi.fn().mockResolvedValue(mockDoc);

      // Mock the Module model with findById
      vi.doMock("../../src/models", () => ({
        Module: {
          findById: mockFindById,
        },
        Version: {},
        Application: {},
        Subscription: {},
        ApiToken: {},
        Notification: {},
      }));

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { findById } = await import("../../src/lib/db-adapter");

      const result = await findById("modules", "507f1f77bcf86cd799439011");

      expect(mockFindById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual({
        _id: objectId,
        name: "Test Module",
      });
      expect(mockDoc.toObject).toHaveBeenCalled();
    });

    it("should return null when document not found in production mode", async () => {
      const mockFindById = vi.fn().mockResolvedValue(null);

      vi.doMock("../../src/models", () => ({
        Module: {
          findById: mockFindById,
        },
        Version: {},
        Application: {},
        Subscription: {},
        ApiToken: {},
        Notification: {},
      }));

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { findById } = await import("../../src/lib/db-adapter");

      const result = await findById("modules", "non-existent-id");

      expect(mockFindById).toHaveBeenCalledWith("non-existent-id");
      expect(result).toBeNull();
    });

    it("should work with different collection types", async () => {
      const mockFindById = vi.fn().mockResolvedValue({
        _id: "123",
        version: "1.0.0",
        toObject: vi.fn().mockReturnValue({ _id: "123", version: "1.0.0" }),
      });

      vi.doMock("../../src/models", () => ({
        Module: {},
        Version: {
          findById: mockFindById,
        },
        Application: {},
        Subscription: {},
        ApiToken: {},
        Notification: {},
      }));

      vi.doMock("../../src/lib/db", () => ({
        connectDB: vi.fn().mockResolvedValue(undefined),
      }));

      const { findById } = await import("../../src/lib/db-adapter");

      const result = await findById("versions", "123");

      expect(mockFindById).toHaveBeenCalledWith("123");
      expect(result).toEqual({ _id: "123", version: "1.0.0" });
    });
  });
});
