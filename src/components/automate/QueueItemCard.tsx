import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { QueueItemStatusPipeline } from './QueueItemStatusPipeline'
import type { QueueItem } from '../../types/automate'

interface QueueItemCardProps {
  item: QueueItem
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  onReQueue: (id: string) => void
  onViewSource?: (sourceId: string) => void
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return ''
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function QueueItemCard({ item, onRetry, onCancel, onReQueue, onViewSource }: QueueItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '14px 18px',
      }}
    >
      {/* Top row */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: source type icon + title + timestamp */}
        <div className="flex items-center gap-2.5" style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: 'rgba(239,68,68,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ▶
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-body font-semibold"
              style={{
                fontSize: 13,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.video_title ?? 'Untitled Video'}
            </div>
            <div className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {formatRelativeTime(item.created_at)}
              {item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ''}
            </div>
          </div>
        </div>

        {/* Right: actions + chevron */}
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {/* Per-status actions */}
          {item.status === 'pending' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onCancel(item.id) }}
              className="font-body font-semibold cursor-pointer"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--color-bg-inset)',
                border: 'none',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
          )}

          {item.status === 'completed' && item.source_id && onViewSource && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onViewSource(item.source_id!) }}
              className="font-body font-semibold cursor-pointer"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-accent-500)',
              }}
            >
              View Source
            </button>
          )}

          {item.status === 'failed' && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRetry(item.id) }}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--color-accent-50, rgba(214,58,0,0.06))',
                  border: '1px solid var(--color-accent-200, rgba(214,58,0,0.15))',
                  color: 'var(--color-accent-500)',
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onCancel(item.id) }}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--color-bg-inset)',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Dismiss
              </button>
            </>
          )}

          {item.status === 'skipped' && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onReQueue(item.id) }}
              className="font-body font-semibold cursor-pointer"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--color-bg-inset)',
                border: 'none',
                color: 'var(--color-text-secondary)',
              }}
            >
              Re-queue
            </button>
          )}

          <ChevronDown
            size={12}
            style={{
              color: 'var(--color-text-placeholder)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Status pipeline */}
      <QueueItemStatusPipeline item={item} />

      {/* Expanded details */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 10,
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Video URL */}
          {item.video_url && (
            <div className="flex items-center gap-1">
              <ExternalLink size={10} style={{ color: 'var(--color-accent-500)', flexShrink: 0 }} />
              <a
                href={item.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body"
                style={{
                  fontSize: 11,
                  color: 'var(--color-accent-500)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.video_url}
              </a>
            </div>
          )}

          {/* Published / Duration row */}
          <div className="flex items-center gap-3">
            {item.published_at && (
              <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Published: {new Date(item.published_at).toLocaleDateString()}
              </span>
            )}
            {item.duration_seconds != null && (
              <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                Duration: {formatDuration(item.duration_seconds)}
              </span>
            )}
          </div>

          {/* Transcript status */}
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
            Transcript:{' '}
            <span style={{
              color: item.transcript ? '#10b981' : item.status === 'failed' ? '#ef4444' : 'var(--color-text-secondary)',
            }}>
              {item.transcript ? 'Fetched' : item.status === 'failed' ? 'Failed' : 'Not fetched'}
            </span>
          </span>

          {/* Entity counts (completed only) */}
          {item.status === 'completed' && (
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {item.nodes_created} entities · {item.edges_created} relationships
            </span>
          )}

          {/* Error message */}
          {item.error_message && (
            <div
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 8,
                padding: 10,
                marginTop: 4,
              }}
            >
              <span className="font-body" style={{ fontSize: 11, color: '#ef4444' }}>
                {item.error_message}
              </span>
            </div>
          )}

          {/* Retry count */}
          {item.retry_count > 0 && (
            <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              Attempt {item.retry_count + 1} of {item.max_retries}
            </span>
          )}

          {/* Timing */}
          <div className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
            Queued: {formatRelativeTime(item.created_at)}
            {item.started_at && ` · Started: ${formatRelativeTime(item.started_at)}`}
            {item.completed_at && ` · Completed: ${formatRelativeTime(item.completed_at)}`}
          </div>
        </div>
      )}
    </div>
  )
}
