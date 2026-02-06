import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import type {
  MongoQuery,
  MongoUpdate,
  MongoSortSpec,
  InsertResult,
  UpdateResult,
  DeleteResult,
} from "@/types/database";

// In-memory database for local development
class MockDatabase {
  private data: Map<string, Map<string, Record<string, unknown>>>;
  private dataDir: string;
  private initPromise: Promise<void>;

  constructor() {
    this.data = new Map();
    this.dataDir = path.join(process.cwd(), "mock-data");
    this.initPromise = this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      // Try to load existing data
      await this.loadFromDisk();
    } catch {
      console.log("Initializing fresh mock database");
    }
  }

  async waitForInit() {
    await this.initPromise;
  }

  private async loadFromDisk() {
    try {
      const files = await fs.readdir(this.dataDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const collectionName = file.replace(".json", "");
          const content = await fs.readFile(
            path.join(this.dataDir, file),
            "utf-8",
          );
          const items = JSON.parse(content);

          // Get or create collection
          if (!this.data.has(collectionName)) {
            this.data.set(collectionName, new Map());
          }
          const collection = this.data.get(collectionName)!;

          // Clear and populate (instead of replacing) to maintain references
          collection.clear();
          items.forEach((item: Record<string, unknown>) => {
            if (item._id && typeof item._id === "string") {
              collection.set(item._id, item);
            }
          });
        }
      }
      console.log("Loaded mock database from disk");
    } catch {
      console.log("No existing mock data found");
    }
  }

  private async saveToDisk(collectionName: string) {
    try {
      const collection = this.data.get(collectionName);
      if (collection) {
        const items = Array.from(collection.values());
        await fs.writeFile(
          path.join(this.dataDir, `${collectionName}.json`),
          JSON.stringify(items, null, 2),
          "utf-8",
        );
      }
    } catch (error) {
      console.error(`Error saving ${collectionName} to disk:`, error);
    }
  }

  collection<T = Record<string, unknown>>(name: string) {
    if (!this.data.has(name)) {
      this.data.set(name, new Map());
    }
    return new MockCollection<T>(this.data.get(name)!, name, this);
  }

  async close() {
    // Save all collections to disk
    for (const [collectionName] of this.data) {
      await this.saveToDisk(collectionName);
    }
  }
}

class MockCollection<T = Record<string, unknown>> {
  constructor(
    private items: Map<string, Record<string, unknown>>,
    private name: string,
    private db: MockDatabase,
  ) {}

  async findOne(
    query: MongoQuery,
  ): Promise<(T & { _id: string; createdAt: Date; updatedAt: Date }) | null> {
    await this.db.waitForInit();
    for (const item of this.items.values()) {
      if (this.matches(item, query)) {
        return { ...item } as T & {
          _id: string;
          createdAt: Date;
          updatedAt: Date;
        };
      }
    }
    return null;
  }

  async find(
    query: MongoQuery = {},
  ): Promise<(T & { _id: string; createdAt: Date; updatedAt: Date })[]> {
    await this.db.waitForInit();
    const results: (T & { _id: string; createdAt: Date; updatedAt: Date })[] =
      [];
    for (const item of this.items.values()) {
      if (this.matches(item, query)) {
        results.push({ ...item } as T & {
          _id: string;
          createdAt: Date;
          updatedAt: Date;
        });
      }
    }
    return results;
  }

  async insertOne(
    doc: Partial<T> & Record<string, unknown>,
  ): Promise<InsertResult> {
    await this.db.waitForInit();
    const id = (doc._id as string) || nanoid();
    const newDoc = {
      ...doc,
      _id: id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.set(id, newDoc as Record<string, unknown>);
    // Access private method via type assertion
    await (
      this.db as unknown as { saveToDisk: (name: string) => Promise<void> }
    ).saveToDisk(this.name);
    return { insertedId: id };
  }

  async updateOne(
    query: MongoQuery,
    update: MongoUpdate<T>,
  ): Promise<UpdateResult> {
    await this.db.waitForInit();
    for (const [id, item] of this.items.entries()) {
      if (this.matches(item, query)) {
        const updated = this.applyUpdate(item, update);
        updated.updatedAt = new Date();
        this.items.set(id, updated);
        // Access private method via type assertion
        await (
          this.db as unknown as { saveToDisk: (name: string) => Promise<void> }
        ).saveToDisk(this.name);
        return { modifiedCount: 1 };
      }
    }
    return { modifiedCount: 0 };
  }

  async deleteOne(query: MongoQuery): Promise<DeleteResult> {
    await this.db.waitForInit();
    for (const [id, item] of this.items.entries()) {
      if (this.matches(item, query)) {
        this.items.delete(id);
        // Access private method via type assertion
        await (
          this.db as unknown as { saveToDisk: (name: string) => Promise<void> }
        ).saveToDisk(this.name);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async countDocuments(query: MongoQuery = {}): Promise<number> {
    await this.db.waitForInit();
    let count = 0;
    for (const item of this.items.values()) {
      if (this.matches(item, query)) {
        count++;
      }
    }
    return count;
  }

  private matches(item: Record<string, unknown>, query: MongoQuery): boolean {
    if (Object.keys(query).length === 0) return true;

    for (const [key, value] of Object.entries(query)) {
      // Handle $or operator
      if (key === "$or") {
        if (!Array.isArray(value)) return false;
        const orMatches = value.some((subQuery: MongoQuery) =>
          this.matches(item, subQuery),
        );
        if (!orMatches) return false;
        continue;
      }

      if (key.includes(".")) {
        // Handle nested paths like "owner.userId"
        const keys = key.split(".");
        let current: unknown = item;
        for (const k of keys) {
          if (current && typeof current === "object") {
            current = (current as Record<string, unknown>)[k];
          } else {
            return false;
          }
        }
        if (current !== value) return false;
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Handle operators
        const operator = value as Record<string, unknown>;
        if ("$in" in operator) {
          if (!Array.isArray(operator.$in) || !operator.$in.includes(item[key]))
            return false;
        } else if ("$regex" in operator) {
          const regex = new RegExp(
            String(operator.$regex),
            String(operator.$options || ""),
          );
          if (!regex.test(String(item[key] || ""))) return false;
        } else if (
          "$gt" in operator ||
          "$gte" in operator ||
          "$lt" in operator ||
          "$lte" in operator
        ) {
          const itemValue = item[key] as number | Date;
          if (
            "$gt" in operator &&
            !(itemValue > (operator.$gt as number | Date))
          )
            return false;
          if (
            "$gte" in operator &&
            !(itemValue >= (operator.$gte as number | Date))
          )
            return false;
          if (
            "$lt" in operator &&
            !(itemValue < (operator.$lt as number | Date))
          )
            return false;
          if (
            "$lte" in operator &&
            !(itemValue <= (operator.$lte as number | Date))
          )
            return false;
        }
      } else if (item[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private applyUpdate(
    item: Record<string, unknown>,
    update: MongoUpdate<T>,
  ): Record<string, unknown> {
    const result = { ...item };

    if (update.$set) {
      Object.assign(result, update.$set);
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        result[key] = (Number(result[key]) || 0) + value;
      }
    }
    if (update.$push) {
      for (const [key, value] of Object.entries(update.$push)) {
        if (!Array.isArray(result[key])) {
          result[key] = [];
        }
        (result[key] as unknown[]).push(value);
      }
    }

    return result;
  }

  // Chainable query methods for Mongoose compatibility (unused but required for compatibility)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sort(_sortSpec: MongoSortSpec) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  limit(_n: number) {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  skip(_n: number) {
    return this;
  }
}

// Use globalThis to persist singleton across hot reloads in Next.js dev mode
declare global {
  var mockDatabase: MockDatabase | undefined;
}

export function getMockDatabase() {
  if (!global.mockDatabase) {
    global.mockDatabase = new MockDatabase();
  }
  return global.mockDatabase;
}

export function closeMockDatabase() {
  if (global.mockDatabase) {
    global.mockDatabase.close();
    global.mockDatabase = undefined;
  }
}
