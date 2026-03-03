import { useState } from 'react'
import { Play } from 'lucide-react'
import { EntityBadge } from '../shared/EntityBadge'
import { StarRating } from '../shared/StarRating'
import { HistoryCardStepBar } from './HistoryCardStepBar'
import { ProviderIcon } from '../shared/ProviderIcon'
import type { PipelineHistoryItem } from '../../types/pipeline'

interface HistoryCardProps {
  item: PipelineHistoryItem
  isSelected: boolean
  onClick: () => void
  onRate?: (rating: number) => void
  onProcessNow?: () => void
  index: number
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function HistoryCard({ item, isSelected, onClick, onRate, onProcessNow, index }: HistoryCardProps) {
  const [hovered, setHovered] = useState(false)

  const isActive = item.status === 'pending' || item.status === 'processing' || item.status === 'extracting'
  const isFailed = item.status === 'failed'
  const isCompleted = item.status === 'completed'

  const entityEntries = Object.entries(item.entityBreakdown).sort((a, b) => b[1] - a[1])

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? 'var(--color-accent-50)' : 'var(--color-bg-card)',
        border: `1px solid ${isSelected ? 'rgba(214,58,0,0.3)' : 'var(--border-subtle)'}`,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        transform: hovered && !isSelected ? 'translateY(-1px)' : undefined,
        boxShadow: hovered && !isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : undefined,
        animation: `fadeUp 0.4s ease ${index * 0.05}s both`,
      }}
    >
      {/* Top row: icon + title + timestamp */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Source icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <ProviderIcon sourceType={item.sourceType} provider={item.provider} size={36} />
          {isActive && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: 'var(--color-accent-500)',
                border: '2px solid var(--color-bg-card)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          )}
        </div>

        {/* Title + metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span
              className="font-display"
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.title}
            </span>
            <span
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <div
            className="font-body"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}
          >
            {item.sourceType} · {item.mode.charAt(0).toUpperCase() + item.mode.slice(1)} · {item.emphasis.charAt(0).toUpperCase() + item.emphasis.slice(1)}
          </div>
        </div>
      </div>

      {/* Status-specific content */}
      <div style={{ marginTop: 12 }}>
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {item.step && <HistoryCardStepBar currentStep={item.step} />}
            {(item.status === 'pending' || item.step === 'transcript_ready') && onProcessNow && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onProcessNow() }}
                className="font-body font-semibold cursor-pointer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  background: 'var(--color-accent-50)',
                  border: '1px solid rgba(214,58,0,0.15)',
                  color: 'var(--color-accent-500)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={10} style={{ fill: 'currentColor' }} />
                Process Now
              </button>
            )}
          </div>
        )}

        {isCompleted && (
          <>
            {/* Stats row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-body)' }}>
                  <span style={{ fontWeight: 600 }}>{item.entityCount}</span> entities
                </span>
                <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-body)' }}>
                  <span style={{ fontWeight: 600 }}>{item.relationshipCount}</span> rels
                </span>
                {item.duration > 0 && (
                  <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {(item.duration / 1000).toFixed(1)}s
                  </span>
                )}
                {item.crossConnections > 0 && (
                  <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-accent-500)' }}>
                    +{item.crossConnections} cross
                  </span>
                )}
              </div>
              <div onClick={e => e.stopPropagation()}>
                {item.rating !== null ? (
                  <StarRating rating={item.rating} size={10} />
                ) : (
                  <StarRating rating={null} size={10} interactive onChange={onRate} />
                )}
              </div>
            </div>

            {/* Entity type badges */}
            {entityEntries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                {entityEntries.slice(0, 4).map(([type, count]) => (
                  <EntityBadge key={type} type={type} label={`${type} (${count})`} size="xs" />
                ))}
                {entityEntries.length > 4 && (
                  <span
                    className="font-body"
                    style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', padding: '2px 6px' }}
                  >
                    +{entityEntries.length - 4}
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {isFailed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: 'var(--semantic-red-500, #ef4444)',
                flexShrink: 0,
              }}
            />
            <span
              className="font-body"
              style={{ fontSize: 11, fontWeight: 600, color: 'var(--semantic-red-500, #ef4444)' }}
            >
              Failed
            </span>
            {item.error && (
              <span
                className="font-body"
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  marginLeft: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 300,
                }}
              >
                {item.error.slice(0, 55)}{item.error.length > 55 ? '...' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
