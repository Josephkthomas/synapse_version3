import { Zap, Layers, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TOOL_MODES } from '../../config/toolModes'
import type { ToolModeId } from '../../types/rag'

const ICONS: Record<string, LucideIcon> = {
  Zap,
  Layers,
  Clock,
}

interface ToolModeSelectorProps {
  value: ToolModeId
  onChange: (id: ToolModeId) => void
}

export function ToolModeSelector({ value, onChange }: ToolModeSelectorProps) {
  return (
    <div>
      <span
        className="font-display font-bold uppercase"
        style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}
      >
        RETRIEVAL
      </span>
      <div className="flex items-center" style={{ gap: 4 }}>
        {TOOL_MODES.map(mode => {
          const isSelected = value === mode.id
          const Icon = ICONS[mode.icon]
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onChange(mode.id as ToolModeId)}
              className="font-body font-semibold cursor-pointer flex items-center"
              style={{
                gap: 4,
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 6,
                border: `1px solid ${isSelected ? 'rgba(214,58,0,0.2)' : 'var(--border-subtle)'}`,
                background: isSelected ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                color: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {Icon && <Icon size={12} style={{ color: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-secondary)' }} />}
              {mode.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
