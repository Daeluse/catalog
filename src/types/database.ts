/**
 * Database Type Definitions
 * Comprehensive type system for database operations and queries
 */

import { ObjectId } from 'mongoose'

// ============================================================================
// Base Types
// ============================================================================

export interface BaseDocument {
  _id: string | ObjectId
  createdAt: Date | string
  updatedAt: Date | string
}

export interface OwnerInfo {
  userId: string
  name: string
  email: string
}

// ============================================================================
// Module Types
// ============================================================================

export interface ModuleMaintainer {
  userId: string
  name: string
  email: string
  role: 'admin' | 'write' | 'read'
  addedAt: Date | string
}

export interface ModuleDocument extends BaseDocument {
  name: string
  displayName: string
  description: string
  organization: string
  category: 'navigation' | 'ui' | 'shared' | 'feature' | 'utility' | 'other'
  owner: OwnerInfo
  maintainers: ModuleMaintainer[]
  latestVersion?: string
  totalDownloads: number
  status: 'active' | 'deprecated' | 'archived'
  repository?: string
  homepage?: string
  license?: string
  keywords: string[]
}

export interface ModuleQuery {
  status?: 'active' | 'deprecated' | 'archived'
  category?: string
  organization?: string
  name?: string | RegExp
  $or?: Array<Record<string, unknown>>
  'owner.userId'?: string
}

export interface ModuleUpdates {
  displayName?: string
  description?: string
  organization?: string
  category?: string
  repository?: string
  homepage?: string
  license?: string
  keywords?: string[]
  status?: 'active' | 'deprecated' | 'archived'
  latestVersion?: string
  $inc?: { totalDownloads?: number }
}

// ============================================================================
// Version Types
// ============================================================================

export interface FederationExposes {
  [key: string]: {
    import: string
    name?: string
    assets?: {
      js?: { sync?: string[]; async?: string[] }
      css?: { sync?: string[]; async?: string[] }
    }
  }
}

export interface FederationShared {
  [key: string]: {
    version?: string
    singleton?: boolean
    requiredVersion?: string
    eager?: boolean
  }
}

export interface FederationMetadata {
  name: string
  entry?: string
  manifestUrl?: string
  exposes?: FederationExposes
  shared?: FederationShared
  remotes?: Record<string, string>
}

export interface VersionAssets {
  remoteEntry: { url: string }
  manifest?: { url: string }
  stats?: { url: string }
  types?: { url: string }
  documentation?: { url: string }
  chunks?: Array<{ url: string }>
}

export interface VersionDocument extends BaseDocument {
  moduleId: string
  moduleName: string
  version: string
  changelog?: string
  federation: FederationMetadata
  assets: VersionAssets
  buildTool: 'webpack' | 'rspack' | 'rsbuild' | 'vite'
  buildToolVersion?: string
  isPrerelease?: boolean
  publishedBy: OwnerInfo
  publishedAt?: Date | string
  downloadCount: number
}

export interface VersionQuery {
  moduleId?: string
  moduleName?: string
  version?: string
}

// ============================================================================
// Application Types
// ============================================================================

export interface ApplicationDocument extends BaseDocument {
  name: string
  description: string
  contactEmail: string
  origins: string[]
  owner: OwnerInfo
  status: 'active' | 'suspended'
}

export interface ApplicationQuery {
  'owner.userId'?: string
  status?: 'active' | 'suspended'
  _id?: string
}

export interface ApplicationUpdates {
  name?: string
  description?: string
  contactEmail?: string
  origins?: string[]
  status?: 'active' | 'suspended'
}

// ============================================================================
// Subscription Types
// ============================================================================

export interface SubscriptionDocument extends BaseDocument {
  applicationId: string
  moduleId: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  requestedBy: OwnerInfo
  requestedAt: Date | string
  reviewedBy?: OwnerInfo
  reviewedAt?: Date | string
  reviewNotes?: string
}

export interface SubscriptionQuery {
  applicationId?: string
  moduleId?: string
  status?: 'pending' | 'approved' | 'rejected' | 'revoked'
  _id?: string
}

export interface SubscriptionUpdates {
  status?: 'pending' | 'approved' | 'rejected' | 'revoked'
  reviewedBy?: OwnerInfo
  reviewedAt?: Date | string
  reviewNotes?: string
}

// ============================================================================
// API Token Types
// ============================================================================

export interface ApiTokenDocument extends BaseDocument {
  name: string
  tokenHash: string
  userId: string
  userEmail: string
  userName: string
  expiresAt: Date | string
  lastUsedAt?: Date | string
  status: 'active' | 'revoked'
}

export interface ApiTokenQuery {
  userId?: string
  status?: 'active' | 'revoked'
  _id?: string
}

// ============================================================================
// MongoDB Query Types
// ============================================================================

export interface MongoQuery {
  [key: string]: unknown
}

export interface MongoUpdate<T = Record<string, unknown>> {
  $set?: Partial<T> | Record<string, unknown>
  $inc?: Record<string, number>
  $push?: Record<string, unknown>
  $pull?: Record<string, unknown>
  $unset?: Record<string, '' | 1 | true>
}

export interface MongoSortSpec {
  [key: string]: 1 | -1
}

// ============================================================================
// Generic Collection Operations
// ============================================================================

export interface FindOptions {
  limit?: number
  skip?: number
  sort?: MongoSortSpec
}

export interface InsertResult {
  insertedId: string
}

export interface UpdateResult {
  modifiedCount: number
  matchedCount?: number
}

export interface DeleteResult {
  deletedCount: number
}

// ============================================================================
// Populated/Joined Types
// ============================================================================

export interface SubscriptionWithDetails extends SubscriptionDocument {
  application?: ApplicationDocument | null
  module?: ModuleDocument | null
}

// ============================================================================
// Type Guards
// ============================================================================

export function isModuleDocument(obj: unknown): obj is ModuleDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'displayName' in obj &&
    'organization' in obj
  )
}

export function isVersionDocument(obj: unknown): obj is VersionDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'moduleId' in obj &&
    'version' in obj &&
    'federation' in obj
  )
}

export function isApplicationDocument(obj: unknown): obj is ApplicationDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'origins' in obj &&
    'contactEmail' in obj
  )
}

export function isSubscriptionDocument(obj: unknown): obj is SubscriptionDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'applicationId' in obj &&
    'moduleId' in obj &&
    'status' in obj
  )
}
