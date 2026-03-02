import { getEntityColor } from '../../config/entityTypes'

interface TypeDistributionBarProps {
  distribution: Array<[string, number]>
  total: number
}

export function TypeDistributionBar({ distribution, total }: TypeDistributionBarProps) {
  if (total === 0 || distribution.length === 0) return null

  const top4 = distribution.slice(0, 4)
  const remainder = distribution.length - 4

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--color-bg-card)',
    }}>
      {/* Horizontal bar */}
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        minWidth: 0,
      }}>
        {distribution.map(([type, count]) => (
          <div
            key={type}
            title={`${type}: ${count}`}
            style={{
              width: `${(count / total) * 100}%`,
              background: getEntityColor(type) + '99', // 60% opacity
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        {top4.map(([type, count]) => (
          <span key={type} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: getEntityColor(type), flexShrink: 0 }} />
            {type} ({count})
          </span>
        ))}
        {remainder > 0 && (
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--color-text-placeholder)',
          }}>
            +{remainder} types
          </span>
        )}
      </div>
    </div>
  )
}
