/**
 * Database Adapter
 * Provides a unified interface for database operations across mock and production modes
 */

import { Model } from "mongoose";
import { connectDB } from "./db";
import { getMockDatabase } from "./db-mock";
import { env } from "./env";
import {
  MongoQuery,
  MongoUpdate,
  FindOptions,
  InsertResult,
  UpdateResult,
  DeleteResult,
} from "@/types/database";
import {
  Module,
  Version,
  Application,
  Subscription,
  ApiToken,
  IModule,
  IVersion,
  IApplication,
  ISubscription,
  IApiToken,
} from "@/models";

/**
 * Collection wrapper that works with both mock and real databases
 */
class CollectionAdapter<T> {
  constructor(
    private collectionName: string,
    private model?: Model<T>,
  ) {}

  private getMockCollection() {
    const db = getMockDatabase();
    return db.collection<T>(this.collectionName);
  }

  async find(
    query: MongoQuery = {},
    options?: FindOptions,
  ): Promise<(T & { _id: string; createdAt: Date; updatedAt: Date })[]> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      let results = await collection.find(query);

      // Apply sorting
      if (options?.sort) {
        const sortEntries = Object.entries(options.sort);
        if (sortEntries.length > 0) {
          const [field, order] = sortEntries[0];
          results.sort((a, b) => {
            const aVal = (a as Record<string, unknown>)[field];
            const bVal = (b as Record<string, unknown>)[field];
            if (aVal === bVal) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (order === 1) {
              return aVal > bVal ? 1 : -1;
            } else {
              return aVal < bVal ? 1 : -1;
            }
          });
        }
      }

      // Apply skip and limit
      if (options?.skip) {
        results = results.slice(options.skip);
      }
      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      let queryBuilder = this.model.find(query);

      if (options?.sort) queryBuilder = queryBuilder.sort(options.sort);
      if (options?.limit) queryBuilder = queryBuilder.limit(options.limit);
      if (options?.skip) queryBuilder = queryBuilder.skip(options.skip);

      return (await queryBuilder.lean()) as (T & {
        _id: string;
        createdAt: Date;
        updatedAt: Date;
      })[];
    }
  }

  async findOne(
    query: MongoQuery,
  ): Promise<(T & { _id: string; createdAt: Date; updatedAt: Date }) | null> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      return await collection.findOne(query);
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      return (await this.model.findOne(query).lean()) as
        | (T & { _id: string; createdAt: Date; updatedAt: Date })
        | null;
    }
  }

  async insertOne(
    doc: Partial<T> & Record<string, unknown>,
  ): Promise<InsertResult> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      return await collection.insertOne(doc);
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      const created = (await this.model.create(doc)) as T & {
        _id: string;
      }
      return { insertedId: created._id.toString() };
    }
  }

  async updateOne(
    query: MongoQuery,
    update: MongoUpdate<T>,
  ): Promise<UpdateResult> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      return await collection.updateOne(query, update);
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      const result = await this.model.updateOne(query, update);
      return {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      };
    }
  }

  async deleteOne(query: MongoQuery): Promise<DeleteResult> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      return await collection.deleteOne(query);
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      const result = await this.model.deleteOne(query);
      return { deletedCount: result.deletedCount };
    }
  }

  async countDocuments(query: MongoQuery = {}): Promise<number> {
    if (env.useMocks) {
      const collection = this.getMockCollection();
      return await collection.countDocuments(query);
    } else {
      if (!this.model) throw new Error("Mongoose model not provided");
      await connectDB();
      return await this.model.countDocuments(query);
    }
  }
}

/**
 * Database adapter providing access to all collections
 */
export const db = {
  modules: new CollectionAdapter<IModule>("modules", Module),
  versions: new CollectionAdapter<IVersion>("versions", Version),
  applications: new CollectionAdapter<IApplication>(
    "applications",
    Application,
  ),
  subscriptions: new CollectionAdapter<ISubscription>(
    "subscriptions",
    Subscription,
  ),
  apiTokens: new CollectionAdapter<IApiToken>("apitokens", ApiToken),
};

/**
 * Helper to get a document by ID (works with Mongoose models in non-mock mode)
 */
export async function findById<T>(
  collectionName:
    | "modules"
    | "versions"
    | "applications"
    | "subscriptions"
    | "apitokens",
  id: string,
): Promise<T | null> {
  if (env.useMocks) {
    const mockDb = getMockDatabase();
    const collection = mockDb.collection(collectionName);
    return (await collection.findOne({ _id: id })) as unknown as T | null;
  } else {
    await connectDB();
    const models: Record<string, Model<unknown>> = {
      modules: Module,
      versions: Version,
      applications: Application,
      subscriptions: Subscription,
      apitokens: ApiToken,
    };
    const model = models[collectionName];
    const result = await model.findById(id);
    return result ? (result.toObject() as T) : null;
  }
}
