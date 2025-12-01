/**
 * Centralized Environment Configuration
 *
 * All environment variables are accessed through getter functions to ensure
 * they are read at call time (runtime) rather than at module load time.
 *
 * This is critical for Kubernetes deployments where secrets are injected
 * from a key vault at container startup, not at image build time.
 */

export const env = {
  // Feature flags
  get useMocks(): boolean {
    return process.env.USE_MOCKS === 'true'
  },

  // Database
  get mongodbUri(): string {
    return process.env.MONGODB_URI || ''
  },
  get mongodbDb(): string {
    return process.env.MONGODB_DB || 'catalog'
  },

  // Azure AD Authentication
  get azureAdClientId(): string {
    return process.env.AZURE_AD_CLIENT_ID || ''
  },
  get azureAdClientSecret(): string {
    return process.env.AZURE_AD_CLIENT_SECRET || ''
  },
  get azureAdTenantId(): string {
    return process.env.AZURE_AD_TENANT_ID || ''
  },

  // Azure Storage
  get azureStorageConnectionString(): string {
    return process.env.AZURE_STORAGE_CONNECTION_STRING || ''
  },
  get azureStorageContainer(): string {
    return process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
  },
  get azureStorageCdnUrl(): string | undefined {
    return process.env.AZURE_STORAGE_CDN_URL
  },

  // Local/Mock storage
  get localStoragePath(): string {
    return process.env.LOCAL_STORAGE_PATH || './storage'
  },

  // Next.js / Node environment
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development'
  },
  get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  },

  // NextAuth
  get nextAuthUrl(): string {
    return process.env.NEXTAUTH_URL || 'http://localhost:3000'
  },
  get nextAuthSecret(): string {
    return process.env.NEXTAUTH_SECRET || ''
  },
}
