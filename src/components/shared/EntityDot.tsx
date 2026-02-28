import { getEntityColor } from '../../config/entityTypes'

interface EntityDotProps {
  type: string
  size?: number
}

export function EntityDot({ type, size = 8 }: EntityDotProps) {
  const color = getEntityColor(type)

  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    />
  )
}
