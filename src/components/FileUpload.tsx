'use client'

import { useState, useCallback } from 'react'
import { formatBytes } from '@/lib/utils'

interface UploadedFile {
  file: File
  name: string
  relativePath: string // Preserve folder structure
  size: number
  type: string
  preview?: string
}

export interface FileWithPath {
  file: File
  relativePath: string
}

interface FileUploadProps {
  onFilesSelected: (files: FileWithPath[]) => void
  accept?: string
  maxFiles?: number
  maxSize?: number // in MB
  multiple?: boolean
  label?: string
  description?: string
  allowDirectories?: boolean // Enable folder upload
}

export function FileUpload({
  onFilesSelected,
  accept = ".js,.json,.map",
  maxFiles = 10,
  maxSize = 10, // 10MB default
  multiple = true,
  label = "Upload Files",
  description = "Drag and drop files here, or click to select files",
  allowDirectories = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract relative path from File object
  const getRelativePath = useCallback((file: File): string => {
    // @ts-ignore - webkitRelativePath is non-standard but widely supported
    const webkitPath = file.webkitRelativePath
    if (webkitPath) {
      // Remove the top-level folder name (e.g., "dist/")
      const parts = webkitPath.split('/')
      return parts.length > 1 ? parts.slice(1).join('/') : file.name
    }
    return file.name
  }, [])

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > maxSize) {
        return `${file.name} is too large. Maximum size is ${maxSize}MB.`
      }

      // Check file type if accept is specified
      if (accept) {
        const acceptedExtensions = accept.split(",").map((ext) => ext.trim())
        const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

        if (!acceptedExtensions.includes(fileExtension)) {
          return `${file.name} has an invalid file type. Accepted types: ${accept}`
        }
      }

      return null
    },
    [accept, maxSize]
  )

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(newFiles)

      // Check max files limit
      if (!multiple && fileArray.length > 1) {
        setError("Only one file can be uploaded")
        return
      }

      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Validate each file
      const validatedFiles: UploadedFile[] = []
      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          setError(validationError)
          return
        }

        const relativePath = getRelativePath(file)
        validatedFiles.push({
          file,
          name: file.name,
          relativePath,
          size: file.size,
          type: file.type,
        })
      }

      const updatedFiles = multiple ? [...files, ...validatedFiles] : validatedFiles
      setFiles(updatedFiles)
      onFilesSelected(updatedFiles.map((f) => ({ file: f.file, relativePath: f.relativePath })))
    },
    [files, maxFiles, multiple, onFilesSelected, validateFile]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // Handle folder drag and drop using File System Access API
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const items = Array.from(e.dataTransfer.items)

      // Check if any items are directories
      const hasDirectories = items.some(item => {
        const entry = item.webkitGetAsEntry?.()
        return entry?.isDirectory
      })

      if (hasDirectories && allowDirectories) {
        // Handle directory drops
        const allFiles: File[] = []

        for (const item of items) {
          const entry = item.webkitGetAsEntry?.()
          if (entry) {
            const files = await traverseFileTree(entry)
            allFiles.push(...files)
          }
        }

        if (allFiles.length > 0) {
          handleFiles(allFiles)
        }
      } else {
        // Handle regular file drops
        const droppedFiles = e.dataTransfer.files
        if (droppedFiles.length > 0) {
          handleFiles(droppedFiles)
        }
      }
    },
    [handleFiles, allowDirectories]
  )

  // Recursively traverse directory tree and collect files
  const traverseFileTree = async (item: any, path = ''): Promise<File[]> => {
    const files: File[] = []

    if (item.isFile) {
      try {
        const file = await new Promise<File>((resolve, reject) => {
          item.file((file: File) => {
            // Create a new File object with the relative path
            const newFile = new File([file], file.name, { type: file.type })
            // Attach the relative path as a custom property
            Object.defineProperty(newFile, 'webkitRelativePath', {
              value: path ? `${path}/${file.name}` : file.name,
              writable: false
            })
            resolve(newFile)
          }, reject)
        })
        files.push(file)
      } catch (error) {
        console.error(`Error reading file ${path}:`, error)
      }
    } else if (item.isDirectory) {
      const dirReader = item.createReader()

      // readEntries() must be called repeatedly until it returns an empty array
      // because it only returns up to 100 entries at a time
      const readAllEntries = async (): Promise<any[]> => {
        const allEntries: any[] = []

        const readBatch = async (): Promise<void> => {
          const entries = await new Promise<any[]>((resolve) => {
            dirReader.readEntries((entries: any[]) => resolve(entries))
          })

          if (entries.length > 0) {
            allEntries.push(...entries)
            await readBatch() // Read next batch
          }
        }

        await readBatch()
        return allEntries
      }

      try {
        const entries = await readAllEntries()

        for (const entry of entries) {
          const nestedPath = path ? `${path}/${item.name}` : item.name
          const nestedFiles = await traverseFileTree(entry, nestedPath)
          files.push(...nestedFiles)
        }
      } catch (error) {
        console.error(`Error reading directory ${path}:`, error)
      }
    }

    return files
  }

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        handleFiles(selectedFiles)
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback(
    (index: number) => {
      const updatedFiles = files.filter((_, i) => i !== index)
      setFiles(updatedFiles)
      onFilesSelected(updatedFiles.map((f) => ({ file: f.file, relativePath: f.relativePath })))
    },
    [files, onFilesSelected]
  )


  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-800"
            : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          {...(allowDirectories ? { webkitdirectory: '', directory: '', mozdirectory: '' } : {})}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300">
                Click to upload
              </span>{" "}
              or drag and drop
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {accept} (max {maxSize}MB per file, {maxFiles} files max)
            </p>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Uploaded Files ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-zinc-50 p-3 dark:bg-zinc-800"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {file.relativePath}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-4 flex-shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
