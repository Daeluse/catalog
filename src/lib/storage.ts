import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { getMockBlobStorage } from './storage-mock'

const useMocks = process.env.USE_MOCKS === 'true'

class BlobStorageService {
  private containerClient: ContainerClient | null = null
  private mockStorage = useMocks ? getMockBlobStorage() : null

  constructor() {
    if (!useMocks) {
      this.initializeAzureStorage()
    }
  }

  private async initializeAzureStorage() {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
      this.containerClient = blobServiceClient.getContainerClient(containerName)

      // Create container if it doesn't exist
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for blobs
      })
    } catch (error) {
      console.error('Error initializing Azure Blob Storage:', error)
      throw error
    }
  }

  async uploadBlob(
    blobPath: string,
    data: Buffer,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
      cacheControl?: string
    }
  ): Promise<{
    url: string
    hash: string
    size: number
  }> {
    if (useMocks && this.mockStorage) {
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
      return await this.mockStorage.uploadBlob(containerName, blobPath, data, {
        contentType: options?.contentType,
        metadata: options?.metadata,
      })
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not initialized')
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)

    // Calculate hash for integrity
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(data).digest('hex')

    // Upload to Azure
    await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
        blobCacheControl: options?.cacheControl || 'public, max-age=31536000, immutable',
      },
      metadata: {
        ...options?.metadata,
        hash,
      },
    })

    return {
      url: blockBlobClient.url,
      hash,
      size: data.length,
    }
  }

  async downloadBlob(blobPath: string): Promise<{
    data: Buffer
    contentType?: string
    metadata?: Record<string, string>
  } | null> {
    if (useMocks && this.mockStorage) {
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
      return await this.mockStorage.downloadBlob(containerName, blobPath)
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not initialized')
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)
      const downloadResponse = await blockBlobClient.download()

      if (!downloadResponse.readableStreamBody) {
        return null
      }

      // Convert stream to buffer
      const chunks: Buffer[] = []
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk))
      }
      const data = Buffer.concat(chunks)

      return {
        data,
        contentType: downloadResponse.contentType,
        metadata: downloadResponse.metadata,
      }
    } catch (error) {
      console.error(`Error downloading blob ${blobPath}:`, error)
      return null
    }
  }

  async deleteBlob(blobPath: string): Promise<boolean> {
    if (useMocks && this.mockStorage) {
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
      return await this.mockStorage.deleteBlob(containerName, blobPath)
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not initialized')
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)
      await blockBlobClient.delete()
      return true
    } catch (error) {
      console.error(`Error deleting blob ${blobPath}:`, error)
      return false
    }
  }

  async listBlobs(prefix?: string): Promise<Array<{ name: string; size: number }>> {
    if (useMocks && this.mockStorage) {
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
      return await this.mockStorage.listBlobs(containerName, prefix)
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not initialized')
    }

    const blobs: Array<{ name: string; size: number }> = []

    try {
      const listOptions = prefix ? { prefix } : {}
      const iterator = this.containerClient.listBlobsFlat(listOptions)

      for await (const blob of iterator) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
        })
      }
    } catch (error) {
      console.error('Error listing blobs:', error)
    }

    return blobs
  }

  getPublicUrl(blobPath: string): string {
    if (useMocks && this.mockStorage) {
      const containerName = process.env.AZURE_STORAGE_CONTAINER || 'catalog-modules'
      return this.mockStorage.getPublicUrl(containerName, blobPath)
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not initialized')
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)

    // Use CDN URL if configured
    const cdnUrl = process.env.AZURE_STORAGE_CDN_URL
    if (cdnUrl) {
      return `${cdnUrl}/${blobPath}`
    }

    return blockBlobClient.url
  }
}

// Singleton instance
let storageService: BlobStorageService | null = null

export function getBlobStorageService(): BlobStorageService {
  if (!storageService) {
    storageService = new BlobStorageService()
  }
  return storageService
}
