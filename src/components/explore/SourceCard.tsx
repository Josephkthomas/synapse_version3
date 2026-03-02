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

const CARD_WIDTH = 180
const CARD_HEIGHT = 52

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

  const date = new Date(source.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <g
      transform={`translate(${x - CARD_WIDTH / 2}, ${y - CARD_HEIGHT / 2})`}
      style={{
        cursor: 'pointer',
        opacity: dimmed ? 0.12 : 1,
        filter: dimmed ? 'blur(0.5px)' : 'none',
        transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.15s ease',
      }}
      onMouseEnter={() => onHover(source)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(source)}
    >
      {/* Selection ring */}
      {selected && (
        <rect
          x={-3}
          y={-3}
          width={CARD_WIDTH + 6}
          height={CARD_HEIGHT + 6}
          rx={13}
          ry={13}
          fill="none"
          stroke="white"
          strokeWidth={3}
        />
      )}
      {selected && (
        <rect
          x={-4}
          y={-4}
          width={CARD_WIDTH + 8}
          height={CARD_HEIGHT + 8}
          rx={14}
          ry={14}
          fill="none"
          stroke="var(--color-accent-500)"
          strokeWidth={2}
        />
      )}

      {/* Card background */}
      <rect
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        rx={10}
        ry={10}
        fill={`${cfg.color}14`}
        stroke={`${cfg.color}33`}
        strokeWidth={1}
      />

      {/* Source type icon */}
      <rect
        x={10}
        y={CARD_HEIGHT / 2 - 12}
        width={24}
        height={24}
        rx={5}
        ry={5}
        fill={`${cfg.color}20`}
      />
      <text
        x={22}
        y={CARD_HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 12 }}
      >
        {cfg.icon}
      </text>

      {/* Title — truncated */}
      <text
        x={42}
        y={18}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          fill: 'var(--color-text-primary)',
        }}
      >
        <tspan>
          {source.title.length > 18 ? source.title.slice(0, 18) + '…' : source.title}
        </tspan>
      </text>

      {/* Meta — entity count + date */}
      <text
        x={42}
        y={36}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 9,
          fill: 'var(--color-text-secondary)',
        }}
      >
        {source.entityCount} entities · {date}
      </text>
    </g>
  )
}

export { CARD_WIDTH, CARD_HEIGHT }
