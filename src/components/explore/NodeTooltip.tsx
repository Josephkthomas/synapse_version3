import { getEntityColor } from '../../config/entityTypes'
import type { ClusterData, EntityNode } from '../../types/explore'

// Discriminated union — extended by 4B (entity), 4D will add source
export type TooltipData =
  | { kind: 'cluster'; data: ClusterData }
  | { kind: 'entity'; data: EntityNode }

interface NodeTooltipProps {
  tooltip: TooltipData
  x: number
  y: number
}

export function NodeTooltip({ tooltip, x, y }: NodeTooltipProps) {
  if (tooltip.kind === 'cluster') {
    return <ClusterTooltip data={tooltip.data} x={x} y={y} />
  }
  if (tooltip.kind === 'entity') {
    return <EntityTooltip data={tooltip.data} x={x} y={y} />
  }
  return null
}

// ─── Cluster Tooltip ──────────────────────────────────────────────────────────

function ClusterTooltip({ data, x, y }: { data: ClusterData; x: number; y: number }) {
  const typeCount = data.typeDistribution.length
  const topTypes = data.typeDistribution.slice(0, 5)

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 12,
        top: y - 8,
        zIndex: 50,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        maxWidth: 240,
        pointerEvents: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: getEntityColor(data.anchor.entityType),
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {data.anchor.label}
        </span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {data.entityCount} entities across {typeCount} type{typeCount !== 1 ? 's' : ''}. Click to expand.
      </p>

      {/* Type breakdown */}
      {topTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topTypes.map(t => (
            <div
              key={t.entityType}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: getEntityColor(t.entityType),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  color: 'var(--color-text-body)',
                  flex: 1,
                }}
              >
                {t.entityType}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  color: 'var(--color-text-secondary)',
                  minWidth: 20,
                  textAlign: 'right',
                }}
              >
                {t.count}
              </span>
              {/* Mini percentage bar */}
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: 'rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${t.percentage * 100}%`,
                    height: '100%',
                    borderRadius: 2,
                    background: getEntityColor(t.entityType),
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Entity Tooltip ───────────────────────────────────────────────────────────

function EntityTooltip({ data, x, y }: { data: EntityNode; x: number; y: number }) {
  const color = getEntityColor(data.entityType)

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 12,
        top: y - 8,
        zIndex: 50,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        maxWidth: 220,
        pointerEvents: 'none',
      }}
    >
      {/* Header: dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {data.label}
        </span>
      </div>

      {/* Type badge */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 500,
          color,
          background: `${color}12`,
          padding: '2px 6px',
          borderRadius: 4,
          display: 'inline-block',
          marginBottom: 4,
        }}
      >
        {data.entityType}
      </span>

      {/* Description */}
      {data.description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          {data.description.length > 80
            ? data.description.slice(0, 77) + '…'
            : data.description}
        </p>
      )}

      {/* Metadata line */}
      <div
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 9,
          color: 'var(--color-text-secondary)',
          display: 'flex',
          gap: 8,
        }}
      >
        <span>{data.connectionCount} connections</span>
        {data.isBridge && <span style={{ color: '#b45309' }}>Bridge</span>}
      </div>
    </div>
  )
}
