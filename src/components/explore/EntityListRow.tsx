import { Link2 } from 'lucide-react'
import { getEntityColor } from '../../config/entityTypes'
import type { EntityWithConnections } from '../../types/explore'

interface EntityListRowProps {
  entity: EntityWithConnections
  isSelected: boolean
  onSelect: () => void
  animationDelay: number
}

export function EntityListRow({ entity, isSelected, onSelect, animationDelay }: EntityListRowProps) {
  const color = getEntityColor(entity.entityType)

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        background: isSelected ? 'var(--color-accent-50)' : 'transparent',
        border: `1px solid ${isSelected ? 'rgba(214,58,0,0.12)' : 'transparent'}`,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        animation: 'fadeUp 0.3s ease both',
        animationDelay: `${animationDelay}s`,
      }}
      onMouseEnter={e => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'
      }}
      onMouseLeave={e => {
        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      {/* Entity dot */}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />

      {/* Label */}
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        letterSpacing: '-0.01em',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
        maxWidth: 160,
      }}>
        {entity.label}
      </span>

      {/* Type badge */}
      <span style={{
        padding: '1px 6px',
        borderRadius: 4,
        fontFamily: 'var(--font-body)',
        fontSize: 9,
        fontWeight: 600,
        background: color + '10',
        border: `1px solid ${color}28`,
        color,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        {entity.entityType}
      </span>

      {/* Top connections (2 max) */}
      <div style={{ display: 'flex', gap: 3, flex: 1, overflow: 'hidden', minWidth: 0 }}>
        {entity.topConnections.slice(0, 2).map(c => (
          <span key={c.id} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'var(--color-bg-inset)',
            fontFamily: 'var(--font-body)',
            fontSize: 9,
            color: 'var(--color-text-secondary)',
            flexShrink: 0,
            maxWidth: 80,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: getEntityColor(c.entityType), flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
          </span>
        ))}
      </div>

      {/* Connection count */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        color: 'var(--color-text-secondary)',
        flexShrink: 0,
      }}>
        <Link2 size={9} />
        {entity.connectionCount}
      </span>

      {/* Timestamp */}
      <span style={{
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        color: 'var(--color-text-placeholder)',
        flexShrink: 0,
        marginLeft: 4,
      }}>
        {new Date(entity.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}
