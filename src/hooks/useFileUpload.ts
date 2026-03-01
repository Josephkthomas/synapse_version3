import { useState, useCallback, useRef } from 'react'
import type { UploadedFile, FileFormat } from '../types/ingest'
import { extractTextFromFile, validateFile, FILE_SIZE_LIMITS } from '../utils/fileParser'

export interface UseFileUploadReturn {
  files: UploadedFile[]
  isDragging: boolean
  error: string | null
  addFiles: (fileList: FileList | File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

function getFileFormat(name: string): FileFormat | null {
  const ext = name.split('.').pop()?.toLowerCase()
  const valid: FileFormat[] = ['pdf', 'docx', 'md', 'txt', 'csv']
  return valid.includes(ext as FileFormat) ? (ext as FileFormat) : null
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragCounter = useRef(0)

  const processFile = useCallback(async (uploadedFile: UploadedFile) => {
    // Update status to extracting
    setFiles(prev =>
      prev.map(f => (f.id === uploadedFile.id ? { ...f, status: 'extracting' as const } : f))
    )

    try {
      let text = await extractTextFromFile(uploadedFile.file)
      let warning = uploadedFile.warning

      // Truncate if too long
      if (text.length > FILE_SIZE_LIMITS.MAX_CONTENT_CHARS) {
        text = text.substring(0, FILE_SIZE_LIMITS.MAX_CONTENT_CHARS)
        warning = 'Document truncated to first ~25,000 words.'
      }

      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'extracted' as const, extractedText: text, warning }
            : f
        )
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Text extraction failed'
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id ? { ...f, status: 'failed' as const, error: msg } : f
        )
      )
    }
  }, [])

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError(null)
      const incoming = Array.from(fileList)

      if (incoming.length + files.length > 5) {
        setError('Maximum 5 files at a time. Please upload in batches.')
        return
      }

      const newFiles: UploadedFile[] = []
      for (const file of incoming) {
        const validation = validateFile(file)
        if (!validation.valid) {
          setError(validation.error ?? 'Invalid file')
          continue
        }

        const format = getFileFormat(file.name)
        if (!format) continue

        newFiles.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          format,
          status: 'ready',
          warning: validation.warning,
        })
      }

      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles])
        // Auto-trigger text extraction
        for (const f of newFiles) {
          processFile(f)
        }
      }
    },
    [files.length, processFile]
  )

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setError(null)
  }, [])

  const dragHandlers = {
    onDragEnter: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      setIsDragging(true)
    }, []),

    onDragLeave: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    }, []),

    onDragOver: useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }, []),

    onDrop: useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current = 0
        setIsDragging(false)
        if (e.dataTransfer.files.length > 0) {
          addFiles(e.dataTransfer.files)
        }
      },
      [addFiles]
    ),
  }

  return { files, isDragging, error, addFiles, removeFile, clearFiles, dragHandlers }
}
