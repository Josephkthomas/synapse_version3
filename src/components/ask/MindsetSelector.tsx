import { useState, useRef } from 'react'
import { Target, TrendingUp, GitCompareArrows, Compass } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { QUERY_MINDSETS } from '../../config/queryMindsets'
import type { QueryMindsetId } from '../../types/rag'

const ICONS: Record<string, LucideIcon> = {
  Target,
  TrendingUp,
  GitCompareArrows,
  Compass,
}

interface MindsetSelectorProps {
  value: QueryMindsetId
  onChange: (id: QueryMindsetId) => void
}

interface TooltipState {
  mindsetId: string
  rect: DOMRect
}

export function MindsetSelector({ value, onChange }: MindsetSelectorProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (mindsetId: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tooltipTimerRef.current = setTimeout(() => {
      setTooltip({ mindsetId, rect })
    }, 300)
  }

  const handleMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setTooltip(null)
  }

  return (
    <div>
      <span
        className="font-display font-bold uppercase"
        style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}
      >
        MINDSET
      </span>
      <div className="flex items-center" style={{ gap: 4 }}>
        {QUERY_MINDSETS.map(mindset => {
          const isSelected = value === mindset.id
          const Icon = ICONS[mindset.icon]
          return (
            <button
              key={mindset.id}
              type="button"
              onClick={() => onChange(mindset.id as QueryMindsetId)}
              onMouseEnter={e => handleMouseEnter(mindset.id, e)}
              onMouseLeave={handleMouseLeave}
              className="font-body font-semibold cursor-pointer flex items-center"
              style={{
                gap: 4,
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${isSelected ? `rgba(${hexToRgb(mindset.color)},0.25)` : 'var(--border-subtle)'}`,
                background: isSelected ? `rgba(${hexToRgb(mindset.color)},0.08)` : 'var(--color-bg-inset)',
                color: isSelected ? mindset.color : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {Icon && <Icon size={12} style={{ color: isSelected ? mindset.color : 'var(--color-text-secondary)' }} />}
              {mindset.label}
            </button>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const mindset = QUERY_MINDSETS.find(m => m.id === tooltip.mindsetId)
        if (!mindset) return null
        return (
          <div
            className="font-body"
            style={{
              position: 'fixed',
              top: tooltip.rect.top - 8,
              left: tooltip.rect.left + tooltip.rect.width / 2,
              transform: 'translate(-50%, -100%)',
              zIndex: 1000,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              padding: '8px 12px',
              maxWidth: 220,
              fontSize: 11,
              fontWeight: 400,
              color: 'var(--color-text-body)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
            }}
          >
            {mindset.description}
          </div>
        )
      })()}
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
