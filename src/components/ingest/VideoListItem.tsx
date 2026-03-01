import type { YouTubeVideo } from '../../types/youtube'

interface VideoListItemProps {
  video: YouTubeVideo
  selected: boolean
  onToggle: () => void
  disabled?: boolean
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: 'var(--color-semantic-green-50)', color: 'var(--color-semantic-green-500)', label: 'Completed' },
  failed: { bg: 'var(--color-semantic-red-50)', color: 'var(--color-semantic-red-500)', label: 'Failed' },
  pending: { bg: 'var(--color-semantic-amber-50)', color: 'var(--color-semantic-amber-500)', label: 'Pending' },
  fetching_transcript: { bg: 'var(--color-accent-50)', color: 'var(--color-accent-500)', label: 'Processing' },
  extracting: { bg: 'var(--color-accent-50)', color: 'var(--color-accent-500)', label: 'Processing' },
}

export function VideoListItem({ video, selected, onToggle, disabled }: VideoListItemProps) {
  const statusStyle = video.status ? STATUS_STYLES[video.status] : null

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '8px 12px',
        borderRadius: 6,
        transition: 'background 0.1s ease',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
      onClick={() => { if (!disabled) onToggle() }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? 'var(--color-accent-500)' : 'var(--color-bg-inset)',
          border: selected ? 'none' : '1px solid var(--border-subtle)',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Title */}
      <span
        className="font-body flex-1"
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: disabled ? 'var(--color-text-secondary)' : 'var(--color-text-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {video.video_title}
      </span>

      {/* Duration */}
      {video.duration_seconds != null && (
        <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {formatDuration(video.duration_seconds)}
        </span>
      )}

      {/* Published date */}
      {video.published_at && (
        <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
          {formatDate(video.published_at)}
        </span>
      )}

      {/* Status badge */}
      {statusStyle && (
        <span
          className="font-body font-semibold"
          style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 10,
            background: statusStyle.bg,
            color: statusStyle.color,
            flexShrink: 0,
          }}
        >
          {statusStyle.label}
        </span>
      )}
    </div>
  )
}
