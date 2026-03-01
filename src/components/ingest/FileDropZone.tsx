import { useRef, useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface FileDropZoneProps {
  onFilesAdded: (files: File[]) => void
  isDragging: boolean
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  error: string | null
}

const ACCEPTED_TYPES = '.pdf,.docx,.md,.txt,.csv'

export function FileDropZone({ onFilesAdded, isDragging, dragHandlers, error }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showError, setShowError] = useState(false)

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 5000)
      return () => clearTimeout(timer)
    } else {
      setShowError(false)
    }
  }, [error])

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files))
      // Reset input so same file can be selected again
      e.target.value = ''
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        {...dragHandlers}
        style={{
          borderRadius: 14,
          border: isDragging
            ? '2px solid var(--color-accent-300)'
            : '2px dashed var(--border-default)',
          background: isDragging ? 'var(--color-accent-50)' : 'transparent',
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
      >
        <Plus
          size={28}
          style={{
            color: isDragging ? 'var(--color-accent-500)' : 'var(--color-text-placeholder)',
            margin: '0 auto 12px',
          }}
        />
        <p
          className="font-body"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
            marginBottom: 6,
          }}
        >
          {isDragging ? 'Drop to upload' : 'Drop files or click to browse'}
        </p>
        <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          PDF · DOCX · Markdown · Plain text · CSV
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      {/* Error */}
      {showError && error && (
        <p className="font-body" style={{ fontSize: 11, color: 'var(--color-semantic-red-500)', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  )
}
