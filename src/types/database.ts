/**
 * Database Type Definitions
 * Comprehensive type system for database operations and queries
 */

import { Owner } from "./api";

// ============================================================================
// Module Types
// ============================================================================

export interface ModuleUpdates {
  displayName?: string;
  description?: string;
  organization?: string;
  category?: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  status?: "active" | "deprecated" | "archived";
  latestVersion?: string;
  $inc?: { totalDownloads?: number };
}

// ============================================================================
// Version Types
// ============================================================================

export interface VersionQuery {
  moduleId?: string;
  moduleName?: string;
  version?: string;
}

// ============================================================================
// Application Types
// ============================================================================

export interface ApplicationQuery {
  "owner.userId"?: string;
  status?: "active" | "suspended";
  _id?: string;
}

export interface ApplicationUpdates {
  name?: string;
  description?: string;
  contactEmail?: string;
  origins?: string[];
  status?: "active" | "suspended";
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionQuery {
  applicationId?: string;
  moduleId?: string;
  status?: "pending" | "approved" | "rejected" | "revoked";
  _id?: string;
}

export interface SubscriptionUpdates {
  status?: "pending" | "approved" | "rejected" | "revoked";
  reviewedBy?: Owner;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// ============================================================================
// API Token Types
// ============================================================================

export interface ApiTokenQuery {
  userId?: string;
  status?: "active" | "revoked";
  _id?: string;
}

// ============================================================================
// MongoDB Query Types
// ============================================================================

export interface MongoQuery {
  [key: string]: unknown;
}

export interface MongoUpdate<T = Record<string, unknown>> {
  $set?: Partial<T> | Record<string, unknown>;
  $inc?: Record<string, number>;
  $push?: Record<string, unknown>;
  $pull?: Record<string, unknown>;
  $unset?: Record<string, "" | 1 | true>;
}

export interface MongoSortSpec {
  [key: string]: 1 | -1;
}

// ============================================================================
// Generic Collection Operations
// ============================================================================

export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: MongoSortSpec;
}

export interface InsertResult {
  insertedId: string;
}

export interface UpdateResult {
  modifiedCount: number;
  matchedCount?: number;
}

export interface DeleteResult {
  deletedCount: number;
}
