import { useState, useCallback } from 'react'
import { TypeDistributionRing } from './TypeDistributionRing'
import type { ClusterData } from '../../types/explore'

interface ClusterBubbleProps {
  cluster: ClusterData
  dimmed: boolean
  onHover: (cluster: ClusterData | null, event: React.MouseEvent) => void
  onClick: (cluster: ClusterData) => void
}

export function ClusterBubble({
  cluster,
  dimmed,
  onHover,
  onClick,
}: ClusterBubbleProps) {
  const [hovered, setHovered] = useState(false)
  const { cx, cy, r } = cluster.position

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setHovered(true)
    onHover(cluster, e)
  }, [cluster, onHover])

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    setHovered(false)
    onHover(null, e)
  }, [onHover])

  const handleClick = useCallback(() => {
    onClick(cluster)
  }, [cluster, onClick])

  const scale = hovered && !dimmed ? 1.03 : 1
  const ringSize = r * 2

  return (
    <g
      transform={`translate(${cx}, ${cy})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        transition: 'opacity 0.18s ease, filter 0.18s ease, transform 0.15s ease',
        opacity: dimmed ? 0.12 : 1,
        filter: dimmed ? 'blur(0.5px)' : 'none',
      }}
    >
      {/* Scale wrapper */}
      <g transform={`scale(${scale})`}>
        {/* Background fill — radial gradient effect */}
        <circle
          r={r}
          fill="rgba(0,0,0,0.015)"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />

        {/* Type distribution ring */}
        <g transform={`translate(${-r}, ${-r})`}>
          <TypeDistributionRing
            distribution={cluster.typeDistribution}
            size={ringSize}
            strokeWidth={Math.max(4, r * 0.06)}
          />
        </g>

        {/* Anchor label */}
        <text
          y={-6}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 700,
            fill: 'var(--color-text-primary)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {cluster.anchor.label.length > 18
            ? cluster.anchor.label.slice(0, 16) + '…'
            : cluster.anchor.label}
        </text>

        {/* Entity count */}
        <text
          y={10}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fill: 'var(--color-text-secondary)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {cluster.entityCount} entities
        </text>
      </g>
    </g>
  )
}
