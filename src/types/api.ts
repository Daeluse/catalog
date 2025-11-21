// Shared user/owner types
export interface Owner {
  userId: string
  email: string
  name: string
}

export interface Maintainer extends Owner {
  role: 'admin' | 'write' | 'read'
}

// Module types
export interface ModuleListItem {
  _id: string
  name: string
  displayName: string
  description: string
  category: string
  organization: string
  latestVersion?: string
  totalDownloads: number
  weeklyDownloads: number
  status: 'active' | 'deprecated' | 'archived'
  updatedAt: string
  createdAt: string
}

export interface Module extends ModuleListItem {
  repository?: string
  homepage?: string
  license?: string
  keywords: string[]
  icon?: string
  owner: Owner
  maintainers: Maintainer[]
  latestVersionId?: string
}

// Version types
export interface VersionAsset {
  url: string
  hash: string
  size: number
}

export interface VersionChunk {
  name: string
  url: string
  hash: string
  size: number
}

export interface FederationMetadata {
  name: string
  entry: string
  manifestUrl: string
  exposes: Record<string, any>
  shared: Record<string, any>
  remotes?: Record<string, string>
  buildMeta: Record<string, any>
}

export interface Version {
  _id: string
  moduleId: string
  moduleName: string
  version: string
  federation: FederationMetadata
  assets: {
    remoteEntry: VersionAsset
    manifest: VersionAsset
    stats: VersionAsset
    types?: VersionAsset
    chunks: VersionChunk[]
    documentation?: VersionAsset
  }
  buildTool: 'webpack' | 'rspack' | 'rsbuild' | 'vite'
  buildToolVersion: string
  readme?: string
  changelog?: string
  dependencies: Record<string, string>
  peerDependencies?: Record<string, string>
  publishedBy: Owner
  publishedAt: string
  downloadCount: number
  isPrerelease: boolean
  isDeprecated: boolean
  deprecationMessage?: string
  createdAt: string
  updatedAt: string
}

// Application types
export interface Application {
  _id: string
  name: string
  description: string
  contactEmail: string
  owner: Owner
  origins: string[]
  status: 'active' | 'suspended'
  createdAt: string
  updatedAt: string
}

// Subscription types
export type SubscriptionStatus = 'pending' | 'approved' | 'rejected' | 'revoked'

export interface Subscription {
  _id: string
  applicationId: string
  moduleId: string
  moduleName: string
  status: SubscriptionStatus
  requestedBy: Owner
  requestedAt: string
  reviewedBy?: Owner
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionWithDetails extends Subscription {
  application: Application | null
  module: ModuleListItem | null
}

// API Response types
export interface PaginatedResponse<T> {
  data?: T[]
  modules?: T[]
  versions?: T[]
  applications?: T[]
  subscriptions?: SubscriptionWithDetails[]
  total: number
  limit: number
  skip: number
}

export interface APIError {
  error: string
  details?: any
}

// Form state types
export interface FormState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// Filter/query types
export interface ModuleFilters {
  search?: string
  category?: string
  organization?: string
  sort?: 'updated' | 'downloads' | 'name'
  limit?: number
  skip?: number
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus
  moduleId?: string
  limit?: number
  skip?: number
}
