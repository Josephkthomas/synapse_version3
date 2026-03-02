import { getSourceConfig } from '../../config/sourceTypes'
import type { SourceNode } from '../../types/explore'

interface SourceCardProps {
  source: SourceNode
  x: number
  y: number
  selected: boolean
  dimmed: boolean
  onHover: (source: SourceNode | null) => void
  onClick: (source: SourceNode) => void
}

// Dot radius scales with entity count: min 10, max 28
function dotRadius(entityCount: number): number {
  if (entityCount <= 0) return 10
  return Math.min(10 + Math.sqrt(entityCount) * 2.5, 28)
}

export const DOT_MAX_RADIUS = 28

export function SourceCard({
  source,
  x,
  y,
  selected,
  dimmed,
  onHover,
  onClick,
}: SourceCardProps) {
  const cfg = getSourceConfig(source.sourceType)
  const r = dotRadius(source.entityCount)

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{
        cursor: 'pointer',
        opacity: dimmed ? 0.15 : 1,
        transition: 'opacity 0.3s ease',
      }}
      onMouseEnter={() => onHover(source)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(source)}
    >
      {/* Selection ring */}
      {selected && (
        <>
          <circle r={r + 4} fill="none" stroke="white" strokeWidth={3} />
          <circle r={r + 5} fill="none" stroke="var(--color-accent-500)" strokeWidth={2} />
        </>
      )}

      {/* Main dot — filled with source type color */}
      <circle
        r={r}
        fill={`${cfg.color}22`}
        stroke={cfg.color}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* Source type icon */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: Math.max(10, r * 0.7), pointerEvents: 'none' }}
      >
        {cfg.icon}
      </text>
    </g>
  )
}
