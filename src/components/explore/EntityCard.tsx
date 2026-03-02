import { Link2 } from 'lucide-react'
import { getEntityColor } from '../../config/entityTypes'
import { getSourceConfig } from '../../config/sourceTypes'
import type { EntityWithConnections } from '../../types/explore'

interface EntityCardProps {
  entity: EntityWithConnections
  isSelected: boolean
  onSelect: () => void
  animationDelay: number
}

export function EntityCard({ entity, isSelected, onSelect, animationDelay }: EntityCardProps) {
  const color = getEntityColor(entity.entityType)
  const sourceConfig = entity.sourceType ? getSourceConfig(entity.sourceType) : null

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? 'var(--color-accent-50)' : 'var(--color-bg-card)',
        border: `1px solid ${isSelected ? 'rgba(214,58,0,0.15)' : 'var(--border-subtle)'}`,
        borderRadius: 8,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background 0.18s ease',
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${animationDelay}s`,
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border-default)'
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border-subtle)'
          el.style.transform = ''
          el.style.boxShadow = ''
        }
      }}
    >
      {/* Connection count badge */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 20,
        background: 'var(--color-bg-inset)',
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
      }}>
        <Link2 size={9} />
        {entity.connectionCount}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingRight: 40 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entity.label}
        </span>
      </div>

      {/* Entity type badge */}
      <div style={{ marginBottom: entity.description ? 8 : 10 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '1px 7px',
          borderRadius: 4,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 600,
          background: color + '10',
          border: `1px solid ${color}28`,
          color,
        }}>
          {entity.entityType}
        </span>
      </div>

      {/* Description */}
      {entity.description && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--color-text-body)',
          lineHeight: 1.5,
          marginBottom: 10,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {entity.description}
        </p>
      )}

      {/* Top connections */}
      {entity.topConnections.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {entity.topConnections.slice(0, 3).map(c => (
            <span key={c.id} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--color-bg-inset)',
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: 'var(--color-text-secondary)',
              maxWidth: 120,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: getEntityColor(c.entityType), flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Source */}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          maxWidth: '60%',
        }}>
          {sourceConfig && <span style={{ fontSize: 11 }}>{sourceConfig.icon}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entity.sourceName ?? entity.sourceType ?? '—'}
          </span>
        </span>

        {/* Confidence */}
        {entity.confidence != null && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
          }}>
            <span style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'var(--color-bg-inset)',
              overflow: 'hidden',
              display: 'inline-block',
            }}>
              <span style={{
                display: 'block',
                height: '100%',
                width: `${Math.round(entity.confidence * 100)}%`,
                background: color,
                borderRadius: 2,
              }} />
            </span>
            {Math.round(entity.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
