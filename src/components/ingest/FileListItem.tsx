import { FileText, FileType, File, X, Check, Loader } from 'lucide-react'
import type { UploadedFile } from '../../types/ingest'

interface FileListItemProps {
  file: UploadedFile
  onRemove: (id: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ format }: { format: string }) {
  const props = { size: 16, style: { color: 'var(--color-text-secondary)', flexShrink: 0 as const } }
  switch (format) {
    case 'pdf':
      return <FileType {...props} />
    case 'docx':
      return <File {...props} />
    default:
      return <FileText {...props} />
  }
}

export function FileListItem({ file, onRemove }: FileListItemProps) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        padding: '10px 16px',
      }}
    >
      <FileIcon format={file.format} />

      {/* Name */}
      <span
        className="font-body font-semibold flex-1"
        style={{
          fontSize: 12,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {file.name}
      </span>

      {/* Size */}
      <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
        {formatFileSize(file.size)}
      </span>

      {/* Format badge */}
      <span
        className="font-body font-semibold"
        style={{
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'var(--color-bg-inset)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {file.format}
      </span>

      {/* Status */}
      <StatusIndicator status={file.status} />

      {/* Warning */}
      {file.warning && (
        <span className="font-body" style={{ fontSize: 9, color: 'var(--color-semantic-amber-500)', flexShrink: 0 }}>
          ⚠
        </span>
      )}

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="cursor-pointer"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-semantic-red-500)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

function StatusIndicator({ status }: { status: UploadedFile['status'] }) {
  switch (status) {
    case 'ready':
      return (
        <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          Ready
        </span>
      )
    case 'extracting':
      return (
        <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <Loader size={10} style={{ color: 'var(--color-semantic-amber-500)', animation: 'spin 1s linear infinite' }} />
          <span className="font-body" style={{ fontSize: 10, color: 'var(--color-semantic-amber-500)' }}>
            Extracting...
          </span>
        </span>
      )
    case 'extracted':
      return (
        <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <Check size={10} style={{ color: 'var(--color-semantic-green-500)' }} />
          <span className="font-body" style={{ fontSize: 10, color: 'var(--color-semantic-green-500)' }}>
            Extracted
          </span>
        </span>
      )
    case 'failed':
      return (
        <span className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          <X size={10} style={{ color: 'var(--color-semantic-red-500)' }} />
          <span className="font-body" style={{ fontSize: 10, color: 'var(--color-semantic-red-500)' }}>
            Failed
          </span>
        </span>
      )
  }
}
