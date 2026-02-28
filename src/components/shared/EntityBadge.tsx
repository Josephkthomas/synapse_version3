import { getEntityColor } from '../../config/entityTypes'

interface EntityBadgeProps {
  type: string
  label?: string
  size?: 'sm' | 'xs'
}

export function EntityBadge({ type, label, size = 'sm' }: EntityBadgeProps) {
  const color = getEntityColor(type)
  const fontSize = size === 'xs' ? '10px' : '11px'
  const padding = size === 'xs' ? '2px 6px' : '3px 8px'

  return (
    <span
      className="inline-flex items-center font-body font-semibold rounded"
      style={{
        fontSize,
        padding,
        color,
        backgroundColor: `${color}10`,
        border: `1px solid ${color}29`,
        lineHeight: 1.4,
      }}
    >
      {label ?? type}
    </span>
  )
}
