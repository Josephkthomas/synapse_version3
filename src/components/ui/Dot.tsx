import { getEntityColor } from '../../config/entityTypes'

interface DotProps {
  type: string
  size?: number
}

export function Dot({ type, size = 8 }: DotProps) {
  const color = getEntityColor(type)

  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}40`,
      }}
    />
  )
}
