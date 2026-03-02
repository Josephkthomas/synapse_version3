import { useState, useRef } from 'react'
import { Rabbit, Brain } from 'lucide-react'
import { MODEL_TIERS } from '../../config/queryMindsets'
import type { ModelTierId } from '../../types/rag'

interface ModelSelectorProps {
  value: ModelTierId
  onChange: (id: ModelTierId) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [tooltip, setTooltip] = useState<{ id: string; rect: DOMRect } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = (id: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    timerRef.current = setTimeout(() => setTooltip({ id, rect }), 300)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          background: 'var(--color-bg-inset)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          height: 28,
        }}
      >
        {MODEL_TIERS.map(tier => {
          const isSelected = value === tier.id
          const Icon = tier.id === 'fast' ? Rabbit : Brain
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id as ModelTierId)}
              onMouseEnter={e => handleMouseEnter(tier.id, e)}
              onMouseLeave={handleMouseLeave}
              className="cursor-pointer flex items-center justify-center"
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                border: 'none',
                background: isSelected ? 'var(--color-bg-card)' : 'transparent',
                boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-placeholder)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                height: 22,
              }}
            >
              <Icon size={13} />
            </button>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const tier = MODEL_TIERS.find(t => t.id === tooltip.id)
        if (!tier) return null
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
              maxWidth: 200,
              fontSize: 11,
              color: 'var(--color-text-body)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <strong style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>{tier.label}</strong>
            {tier.description}
          </div>
        )
      })()}
    </div>
  )
}
