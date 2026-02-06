import { ClientSecretCredential } from "@azure/identity";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { getMockBlobStorage, MockBlobStorage } from "./storage-mock";
import { env } from "./env";

class BlobStorageService {
  private containerClient: ContainerClient | null = null;
  private _mockStorage: MockBlobStorage | null = null;

  private getMockStorage(): MockBlobStorage {
    if (!this._mockStorage) {
      this._mockStorage = getMockBlobStorage();
    }
    return this._mockStorage;
  }

  constructor() {
    if (!env.useMocks) {
      this.initializeAzureStorage();
    }
  }

  private async initializeAzureStorage() {
    try {
      const blobServiceClient = new BlobServiceClient(
        `https://${env.azureStorageAccount}.blob.core.windows.net/`,
        new ClientSecretCredential(
          env.azureAdTenantId,
          env.azureSPNClientId,
          env.azureSPNClientSecret,
        ),
      );
      this.containerClient = blobServiceClient.getContainerClient(
        env.azureStorageContainer,
      );

      // Create container if it doesn't exist
      await this.containerClient.createIfNotExists();
    } catch (error) {
      console.error("Error initializing Azure Blob Storage:", error);
      throw error;
    }
  }

  async uploadBlob(
    blobPath: string,
    data: Buffer,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
      cacheControl?: string;
    },
  ): Promise<{
    url: string;
    hash: string;
    size: number;
  }> {
    if (env.useMocks) {
      const mockStorage = this.getMockStorage();
      return await mockStorage.uploadBlob(
        env.azureStorageContainer,
        blobPath,
        data,
        {
          contentType: options?.contentType,
          metadata: options?.metadata,
        },
      );
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error("Azure Blob Storage not initialized");
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);

    // Calculate hash for integrity
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(data).digest("hex");

    // Upload to Azure
    await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
        blobCacheControl:
          options?.cacheControl || "public, max-age=31536000, immutable",
      },
      metadata: {
        ...options?.metadata,
        hash,
      },
    });

    return {
      url: blockBlobClient.url,
      hash,
      size: data.length,
    };
  }

  async downloadBlob(blobPath: string): Promise<{
    data: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
  } | null> {
    if (env.useMocks) {
      const mockStorage = this.getMockStorage();
      return await mockStorage.downloadBlob(
        env.azureStorageContainer,
        blobPath,
      );
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error("Azure Blob Storage not initialized");
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      const downloadResponse = await blockBlobClient.download();

      if (!downloadResponse.readableStreamBody) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }
      const data = Buffer.concat(chunks);

      return {
        data,
        contentType: downloadResponse.contentType,
        metadata: downloadResponse.metadata,
      };
    } catch (error) {
      console.error(`Error downloading blob ${blobPath}:`, error);
      return null;
    }
  }

  async deleteBlob(blobPath: string): Promise<boolean> {
    if (env.useMocks) {
      const mockStorage = this.getMockStorage();
      return await mockStorage.deleteBlob(env.azureStorageContainer, blobPath);
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error("Azure Blob Storage not initialized");
    }

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error(`Error deleting blob ${blobPath}:`, error);
      return false;
    }
  }

  async listBlobs(
    prefix?: string,
  ): Promise<Array<{ name: string; size: number }>> {
    if (env.useMocks) {
      const mockStorage = this.getMockStorage();
      return await mockStorage.listBlobs(env.azureStorageContainer, prefix);
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error("Azure Blob Storage not initialized");
    }

    const blobs: Array<{ name: string; size: number }> = [];

    try {
      const listOptions = prefix ? { prefix } : {};
      const iterator = this.containerClient.listBlobsFlat(listOptions);

      for await (const blob of iterator) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
        });
      }
    } catch (error) {
      console.error("Error listing blobs:", error);
    }

    return blobs;
  }

  getPublicUrl(blobPath: string): string {
    if (env.useMocks) {
      const mockStorage = this.getMockStorage();
      return mockStorage.getPublicUrl(env.azureStorageContainer, blobPath);
    }

    // Azure Blob Storage implementation
    if (!this.containerClient) {
      throw new Error("Azure Blob Storage not initialized");
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);

    return blockBlobClient.url;
  }
}

// Singleton instance
let storageService: BlobStorageService | null = null;

export function getBlobStorageService(): BlobStorageService {
  if (!storageService) {
    storageService = new BlobStorageService();
  }
  return storageService;
}
