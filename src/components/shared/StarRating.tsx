import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number | null
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({ rating, size = 14, interactive = false, onChange }: StarRatingProps) {
  const [hoverIndex, setHoverIndex] = useState(-1)
  const displayRating = hoverIndex >= 0 ? hoverIndex + 1 : (rating ?? 0)

  return (
    <div
      style={{ display: 'inline-flex', gap: 2 }}
      onMouseLeave={() => interactive && setHoverIndex(-1)}
    >
      {[0, 1, 2, 3, 4].map(i => {
        const filled = i < displayRating
        return (
          <button
            key={i}
            type="button"
            onClick={() => interactive && onChange?.(i + 1)}
            onMouseEnter={() => interactive && setHoverIndex(i)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              transition: 'transform 0.1s ease',
              transform: interactive && hoverIndex === i ? 'scale(1.2)' : undefined,
            }}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              fill={filled ? 'var(--color-accent-500)' : 'none'}
              style={{ color: filled ? 'var(--color-accent-500)' : 'var(--color-text-placeholder)' }}
            />
          </button>
        )
      })}
    </div>
  )
}
