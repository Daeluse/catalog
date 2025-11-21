import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// Mock Azure Blob Storage using local file system
class MockBlobStorage {
  private storagePath: string

  constructor(storagePath: string = './storage') {
    this.storagePath = path.resolve(process.cwd(), storagePath)
    this.initialize()
  }

  private async initialize() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true })
      console.log(`Mock blob storage initialized at: ${this.storagePath}`)
    } catch (error) {
      console.error('Error initializing mock storage:', error)
    }
  }

  async uploadBlob(
    containerName: string,
    blobPath: string,
    data: Buffer,
    options?: {
      contentType?: string
      metadata?: Record<string, string>
    }
  ): Promise<{
    url: string
    hash: string
    size: number
  }> {
    // Create container directory if it doesn't exist
    const containerPath = path.join(this.storagePath, containerName)
    await fs.mkdir(containerPath, { recursive: true })

    // Ensure all parent directories exist
    const fullPath = path.join(containerPath, blobPath)
    const dirname = path.dirname(fullPath)
    await fs.mkdir(dirname, { recursive: true })

    // Write file
    await fs.writeFile(fullPath, data)

    // Calculate hash
    const hash = crypto.createHash('sha256').update(data).digest('hex')

    // Store metadata if provided
    if (options?.metadata) {
      const metadataPath = `${fullPath}.metadata.json`
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          contentType: options.contentType,
          ...options.metadata,
        }, null, 2)
      )
    }

    // Return mock URL
    const url = `/api/assets/${containerName}/${blobPath}`

    return {
      url,
      hash,
      size: data.length,
    }
  }

  async downloadBlob(
    containerName: string,
    blobPath: string
  ): Promise<{
    data: Buffer
    contentType?: string
    metadata?: Record<string, string>
  } | null> {
    try {
      const fullPath = path.join(this.storagePath, containerName, blobPath)
      const data = await fs.readFile(fullPath)

      // Try to read metadata
      let metadata: Record<string, string> = {}
      let contentType: string | undefined

      try {
        const metadataPath = `${fullPath}.metadata.json`
        const metadataContent = await fs.readFile(metadataPath, 'utf-8')
        const parsed = JSON.parse(metadataContent)
        contentType = parsed.contentType
        delete parsed.contentType
        metadata = parsed
      } catch {
        // No metadata file, use defaults
        const ext = path.extname(blobPath).toLowerCase()
        contentType = this.getContentType(ext)
      }

      return {
        data,
        contentType,
        metadata,
      }
    } catch (error) {
      console.error(`Error reading blob ${containerName}/${blobPath}:`, error)
      return null
    }
  }

  async deleteBlob(containerName: string, blobPath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.storagePath, containerName, blobPath)
      await fs.unlink(fullPath)

      // Also delete metadata if exists
      try {
        await fs.unlink(`${fullPath}.metadata.json`)
      } catch {
        // Metadata file might not exist
      }

      return true
    } catch (error) {
      console.error(`Error deleting blob ${containerName}/${blobPath}:`, error)
      return false
    }
  }

  async listBlobs(
    containerName: string,
    prefix?: string
  ): Promise<Array<{ name: string; size: number }>> {
    try {
      const containerPath = path.join(this.storagePath, containerName)
      const blobs: Array<{ name: string; size: number }> = []

      const walk = async (dir: string, baseDir: string) => {
        const files = await fs.readdir(dir, { withFileTypes: true })

        for (const file of files) {
          const fullPath = path.join(dir, file.name)

          if (file.isDirectory()) {
            await walk(fullPath, baseDir)
          } else if (!file.name.endsWith('.metadata.json')) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/')

            if (!prefix || relativePath.startsWith(prefix)) {
              const stats = await fs.stat(fullPath)
              blobs.push({
                name: relativePath,
                size: stats.size,
              })
            }
          }
        }
      }

      await walk(containerPath, containerPath)
      return blobs
    } catch (error) {
      console.error(`Error listing blobs in ${containerName}:`, error)
      return []
    }
  }

  private getContentType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.css': 'text/css',
      '.html': 'text/html',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.ts': 'application/typescript',
    }

    return mimeTypes[extension] || 'application/octet-stream'
  }

  getPublicUrl(containerName: string, blobPath: string): string {
    return `/api/assets/${containerName}/${blobPath}`
  }
}

// Singleton instance
let mockStorage: MockBlobStorage | null = null

export function getMockBlobStorage(): MockBlobStorage {
  if (!mockStorage) {
    const storagePath = process.env.LOCAL_STORAGE_PATH || './storage'
    mockStorage = new MockBlobStorage(storagePath)
  }
  return mockStorage
}
