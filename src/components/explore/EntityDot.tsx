import { useCallback } from 'react'
import { getEntityColor } from '../../config/entityTypes'
import type { EntityNode } from '../../types/explore'

interface EntityDotProps {
  entity: EntityNode
  x: number
  y: number
  radius: number
  selected: boolean
  dimmed: boolean
  isPeripheral: boolean
  isHubLabel: boolean
  onHover: (entity: EntityNode | null, event: React.MouseEvent) => void
  onClick: (entity: EntityNode) => void
}

export function EntityDot({
  entity,
  x,
  y,
  radius,
  selected,
  dimmed,
  isPeripheral,
  isHubLabel,
  onHover,
  onClick,
}: EntityDotProps) {
  const color = getEntityColor(entity.entityType)
  const peripheralScale = isPeripheral ? 0.9 : 1
  const displayRadius = radius * peripheralScale

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    onHover(entity, e)
  }, [entity, onHover])

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    onHover(null, e)
  }, [onHover])

  const handleClick = useCallback(() => {
    onClick(entity)
  }, [entity, onClick])

  // Label truncation
  const maxLabelLen = isPeripheral ? 12 : 16
  const displayLabel = entity.label.length > maxLabelLen
    ? entity.label.slice(0, maxLabelLen - 1) + '…'
    : entity.label

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        transition: 'opacity 0.18s ease',
        opacity: dimmed ? 0.08 : isPeripheral ? 0.3 : 1,
      }}
    >
      {/* Selection ring */}
      {selected && (
        <>
          <circle
            r={displayRadius + 4}
            fill="none"
            stroke="white"
            strokeWidth={2}
          />
          <circle
            r={displayRadius + 6}
            fill="none"
            stroke={color}
            strokeWidth={2}
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </>
      )}

      {/* Bridge indicator — second-color ring */}
      {entity.isBridge && !selected && (
        <circle
          r={displayRadius + 3}
          fill="none"
          stroke="rgba(180,83,9,0.3)"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      )}

      {/* Glow shadow */}
      <circle
        r={displayRadius + 2}
        fill={color}
        opacity={0.12}
      />

      {/* Main dot */}
      <circle
        r={displayRadius}
        fill={color}
        style={{
          transition: 'r 0.15s ease',
          filter: selected ? `drop-shadow(0 0 4px ${color})` : undefined,
        }}
      />

      {/* Hub label (always visible for hub nodes) or selected label */}
      {(isHubLabel || selected) && (
        <text
          y={displayRadius + 14}
          textAnchor="middle"
          style={{
            fontFamily: isHubLabel ? 'var(--font-display)' : 'var(--font-body)',
            fontSize: isHubLabel ? 10 : 9,
            fontWeight: isHubLabel ? 700 : 600,
            fill: 'var(--color-text-primary)',
            pointerEvents: 'none',
            userSelect: 'none',
            textShadow: '0 0 4px var(--color-bg-content), 0 0 4px var(--color-bg-content)',
          }}
        >
          {displayLabel}
        </text>
      )}

      {/* Peripheral label (8px) */}
      {isPeripheral && !selected && (
        <text
          y={displayRadius + 12}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 8,
            fontWeight: 500,
            fill: 'var(--color-text-secondary)',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.6,
          }}
        >
          {displayLabel}
        </text>
      )}
    </g>
  )
}
