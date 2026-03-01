import { EXTRACTION_MODES, ANCHOR_EMPHASIS_LEVELS } from '../../config/extractionModes'
import { useSettings } from '../../hooks/useSettings'
import { ENTITY_TYPE_COLORS } from '../../config/entityTypes'
import type { PlaylistSettings } from '../../types/youtube'

interface PlaylistSettingsPanelProps {
  settings: PlaylistSettings
  onSettingsChange: (settings: Partial<PlaylistSettings>) => void
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-display font-bold"
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-secondary)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

export function PlaylistSettingsPanel({ settings, onSettingsChange }: PlaylistSettingsPanelProps) {
  const { anchors } = useSettings()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>Extraction Settings</SectionLabel>

      {/* Mode Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {EXTRACTION_MODES.map(mode => {
          const isActive = settings.extraction_mode === mode.id
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSettingsChange({ extraction_mode: mode.id })}
              className="font-body cursor-pointer"
              style={{
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${isActive ? hexToRgba(mode.colorHex, 0.25) : 'var(--border-subtle)'}`,
                background: isActive ? hexToRgba(mode.colorHex, 0.06) : 'transparent',
                textAlign: 'left',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <div
                className="font-body font-semibold"
                style={{ fontSize: 11, color: 'var(--color-text-primary)', marginBottom: 2 }}
              >
                {mode.label}
              </div>
              <div className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                {mode.description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Emphasis Row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {ANCHOR_EMPHASIS_LEVELS.map(level => {
          const isActive = settings.anchor_emphasis === level.id
          return (
            <button
              key={level.id}
              type="button"
              onClick={() => onSettingsChange({ anchor_emphasis: level.id })}
              className="font-body font-semibold flex-1 cursor-pointer"
              style={{
                fontSize: 11,
                padding: '8px 0',
                borderRadius: 8,
                border: `1px solid ${isActive ? hexToRgba('#b45309', 0.25) : 'var(--border-subtle)'}`,
                background: isActive ? hexToRgba('#b45309', 0.06) : 'transparent',
                color: isActive ? '#b45309' : 'var(--color-text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {level.label}
            </button>
          )
        })}
      </div>

      {/* Anchor Chips */}
      {anchors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {anchors.map(anchor => {
            const isSelected = settings.linked_anchor_ids.includes(anchor.id)
            const color = ENTITY_TYPE_COLORS[anchor.entity_type] ?? '#888'
            return (
              <button
                key={anchor.id}
                type="button"
                onClick={() => {
                  const newIds = isSelected
                    ? settings.linked_anchor_ids.filter(id => id !== anchor.id)
                    : [...settings.linked_anchor_ids, anchor.id]
                  onSettingsChange({ linked_anchor_ids: newIds })
                }}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: `1px solid ${isSelected ? hexToRgba(color, 0.25) : 'var(--border-subtle)'}`,
                  background: isSelected ? hexToRgba(color, 0.06) : 'transparent',
                  color: isSelected ? color : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {anchor.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Custom Instructions */}
      <textarea
        value={settings.custom_instructions ?? ''}
        onChange={e => onSettingsChange({ custom_instructions: e.target.value || null })}
        placeholder="Custom extraction instructions..."
        rows={2}
        className="font-body w-full resize-y"
        style={{
          fontSize: 12,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'var(--color-bg-inset)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--color-text-body)',
          outline: 'none',
        }}
      />
    </div>
  )
}
