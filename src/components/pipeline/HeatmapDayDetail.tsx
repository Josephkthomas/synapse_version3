import { X } from 'lucide-react'
import type { HeatmapCell } from '../../types/pipeline'

interface HeatmapDayDetailProps {
  cell: HeatmapCell
  onClose: () => void
}

const SOURCE_EMOJIS: Record<string, string> = {
  YouTube: '▶',
  Meeting: '🎙',
  Document: '📋',
  Note: '✏️',
  Research: '🔬',
}

export function HeatmapDayDetail({ cell, onClose }: HeatmapDayDetailProps) {
  const date = new Date(cell.date + 'T12:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const confidencePct = Math.round(cell.avgConfidence * 100)

  const confidenceColor = confidencePct > 85
    ? 'var(--semantic-green-500, #22c55e)'
    : confidencePct > 70
      ? 'var(--semantic-amber-500, #f59e0b)'
      : 'var(--semantic-red-500, #ef4444)'

  const sourceEntries = Object.entries(cell.sourceBreakdown).filter(([, v]) => v > 0)

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span
          className="font-body"
          style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}
        >
          Selected Day
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}
        >
          <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      <h3
        className="font-display"
        style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 16px 0' }}
      >
        {dayName}, {monthDay}
      </h3>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'Sources', value: String(cell.count) },
          { label: 'Entities', value: String(cell.entities) },
          { label: 'Avg Duration', value: `${cell.avgDuration.toFixed(1)}s` },
          { label: 'Confidence', value: confidencePct > 0 ? `${confidencePct}%` : '—', color: confidencePct > 0 ? confidenceColor : undefined },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--color-bg-inset)',
              borderRadius: 8,
              padding: 10,
              textAlign: 'center',
            }}
          >
            <div
              className="font-display"
              style={{ fontSize: 18, fontWeight: 800, color: stat.color ?? 'var(--color-text-primary)' }}
            >
              {stat.value}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-secondary)' }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      {sourceEntries.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <span
            className="font-body"
            style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}
          >
            Sources
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sourceEntries.map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{SOURCE_EMOJIS[type] ?? '📄'}</span>
                <span className="font-body" style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-body)', flex: 1 }}>
                  {type}
                </span>
                <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed indicator */}
      {cell.failed > 0 && (
        <div
          style={{
            marginTop: 12,
            background: 'var(--semantic-red-50, rgba(239,68,68,0.06))',
            border: '1px solid rgba(239,68,68,0.16)',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--semantic-red-500, #ef4444)' }}>
            {cell.failed} failed extraction{cell.failed !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', margin: '16px 0' }} />
    </div>
  )
}
