import { getEntityColor } from '../../config/entityTypes'

const SOURCE_COLORS: Record<string, string> = {
  YouTube: '#ef4444',
  Meeting: '#3b82f6',
  Document: '#059669',
  Note: '#ca8a04',
  Research: '#8b5cf6',
}

interface DistributionChartProps {
  entityData: Record<string, number>
  sourceData: Record<string, number>
  mode: 'entities' | 'sources'
  onModeChange: (mode: 'entities' | 'sources') => void
  dayView?: boolean
}

export function DistributionChart({
  entityData,
  sourceData,
  mode,
  onModeChange,
  dayView,
}: DistributionChartProps) {
  const data = mode === 'entities' ? entityData : sourceData
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {/* Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            padding: 2,
          }}
        >
          {(['entities', 'sources'] as const).map(m => {
            const isActive = mode === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className="font-body"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--color-bg-card)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {m === 'entities' ? 'Entities' : 'Sources'}
              </button>
            )
          })}
        </div>

        {dayView && (
          <span
            className="font-body"
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--color-accent-500)',
              background: 'var(--color-accent-50)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            Day view
          </span>
        )}
      </div>

      {total === 0 ? (
        <div
          className="font-body"
          style={{ fontSize: 11, color: 'var(--color-text-placeholder)', textAlign: 'center', padding: '16px 0' }}
        >
          No data available
        </div>
      ) : (
        <>
          {/* Distribution bar */}
          <div
            style={{
              display: 'flex',
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 10,
            }}
          >
            {entries.map(([type, count]) => {
              const pct = (count / total) * 100
              const color = mode === 'entities' ? getEntityColor(type) : (SOURCE_COLORS[type] ?? '#808080')
              return (
                <div
                  key={type}
                  style={{
                    width: `${pct}%`,
                    background: color,
                    transition: 'width 0.4s ease',
                    minWidth: pct > 0 ? 2 : 0,
                  }}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
            {entries.slice(0, 10).map(([type, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const color = mode === 'entities' ? getEntityColor(type) : (SOURCE_COLORS[type] ?? '#808080')
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span className="font-body" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-body)' }}>
                    {type}
                  </span>
                  <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {count} ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
