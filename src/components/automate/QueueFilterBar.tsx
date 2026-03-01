import type { QueueStatusFilter } from '../../types/automate'

interface QueueFilterBarProps {
  filter: QueueStatusFilter
  onFilterChange: (filter: QueueStatusFilter) => void
  counts: {
    all: number
    pending: number
    processing: number
    completed: number
    failed: number
  }
}

const FILTERS: { key: QueueStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
]

const BADGE_COLORS: Record<QueueStatusFilter, { bg: string; text: string }> = {
  all: { bg: 'var(--color-bg-inset)', text: 'var(--color-text-secondary)' },
  pending: { bg: 'rgba(217,119,6,0.08)', text: '#b45309' },
  processing: { bg: 'rgba(214,58,0,0.06)', text: 'var(--color-accent-500)' },
  completed: { bg: 'rgba(16,185,129,0.08)', text: '#059669' },
  failed: { bg: 'rgba(239,68,68,0.08)', text: '#dc2626' },
}

export function QueueFilterBar({ filter, onFilterChange, counts }: QueueFilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ margin: '12px 0 16px' }}>
      {FILTERS.map(f => {
        const isActive = filter === f.key
        const count = counts[f.key]
        const badgeColor = BADGE_COLORS[f.key]

        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className="font-body font-semibold cursor-pointer flex items-center gap-1.5"
            style={{
              fontSize: 11,
              padding: '6px 14px',
              borderRadius: 20,
              background: isActive ? 'var(--color-accent-50, rgba(214,58,0,0.06))' : 'var(--color-bg-inset)',
              border: isActive
                ? '1px solid var(--color-accent-200, rgba(214,58,0,0.15))'
                : '1px solid var(--border-subtle)',
              color: isActive ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {f.label}
            {count > 0 && (
              <span
                className="font-body font-bold"
                style={{
                  fontSize: 9,
                  minWidth: 16,
                  height: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  background: isActive ? 'var(--color-accent-500)' : badgeColor.bg,
                  color: isActive ? 'white' : badgeColor.text,
                  padding: '0 4px',
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
