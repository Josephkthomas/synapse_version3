import { getEntityColor } from '../../config/entityTypes'
import type { TypeDistributionEntry } from '../../types/explore'

interface TypeDistributionRingProps {
  distribution: TypeDistributionEntry[]
  size: number // diameter
  strokeWidth?: number
}

export function TypeDistributionRing({
  distribution,
  size,
  strokeWidth = 5,
}: TypeDistributionRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const cy = size / 2

  if (distribution.length === 0) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={strokeWidth}
      />
    )
  }

  // Build arc segments
  let offset = 0
  const arcs = distribution.map((entry) => {
    const dashLength = entry.percentage * circumference
    const gap = circumference - dashLength
    const currentOffset = offset
    offset += dashLength

    return (
      <circle
        key={entry.entityType}
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={getEntityColor(entry.entityType)}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${gap}`}
        strokeDashoffset={-currentOffset}
        strokeLinecap="butt"
        style={{ transition: 'stroke-dasharray 0.3s ease, stroke-dashoffset 0.3s ease' }}
      />
    )
  })

  return (
    <g transform={`rotate(-90, ${cx}, ${cy})`}>
      {arcs}
    </g>
  )
}
