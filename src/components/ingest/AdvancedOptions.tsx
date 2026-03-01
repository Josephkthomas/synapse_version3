import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { EXTRACTION_MODES } from '../../config/extractionModes'
import { ANCHOR_EMPHASIS_LEVELS } from '../../config/extractionModes'
import { useSettings } from '../../hooks/useSettings'
import { getEntityColor } from '../../config/entityTypes'
import type { ExtractionConfig } from '../../types/extraction'

interface AdvancedOptionsProps {
  mode: ExtractionConfig['mode']
  onModeChange: (mode: ExtractionConfig['mode']) => void
  emphasis: ExtractionConfig['anchorEmphasis']
  onEmphasisChange: (emphasis: ExtractionConfig['anchorEmphasis']) => void
  selectedAnchorIds: string[]
  onAnchorIdsChange: (ids: string[]) => void
  customGuidance: string
  onGuidanceChange: (guidance: string) => void
}

export function AdvancedOptions({
  mode,
  onModeChange,
  emphasis,
  onEmphasisChange,
  selectedAnchorIds,
  onAnchorIdsChange,
  customGuidance,
  onGuidanceChange,
}: AdvancedOptionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { anchors } = useSettings()

  const toggleAnchor = (id: string) => {
    if (selectedAnchorIds.includes(id)) {
      onAnchorIdsChange(selectedAnchorIds.filter(a => a !== id))
    } else {
      onAnchorIdsChange([...selectedAnchorIds, id])
    }
  }

  return (
    <div>
      {/* Toggle Row */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{
          padding: '12px 0',
          background: 'none',
          border: 'none',
        }}
      >
        <span
          className="font-body font-semibold"
          style={{
            fontSize: 13,
            color: 'var(--color-text-body)',
            transition: 'color 0.15s ease',
          }}
        >
          Advanced Extraction Options
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--color-text-secondary)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Collapsible Panel */}
      <div
        style={{
          maxHeight: isOpen ? 600 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '20px 22px',
            marginTop: 4,
          }}
        >
          {/* Extraction Mode */}
          <SectionLabel>EXTRACTION MODE</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
            {EXTRACTION_MODES.map(m => {
              const isSelected = mode === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className="text-left cursor-pointer"
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? hexToRgba(m.colorHex, 0.25) : 'var(--border-subtle)'}`,
                    background: isSelected ? hexToRgba(m.colorHex, 0.06) : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    className="font-body font-semibold"
                    style={{
                      fontSize: 12,
                      color: isSelected ? m.colorHex : 'var(--color-text-primary)',
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="font-body"
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.4,
                      marginTop: 2,
                    }}
                  >
                    {m.description}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Anchor Emphasis */}
          <SectionLabel style={{ marginTop: 16 }}>ANCHOR EMPHASIS</SectionLabel>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {ANCHOR_EMPHASIS_LEVELS.map(level => {
              const isSelected = emphasis === level.id
              const anchorColor = '#b45309'
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onEmphasisChange(level.id)}
                  className="font-body font-semibold cursor-pointer"
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 8,
                    textAlign: 'center',
                    fontSize: 12,
                    border: `1px solid ${isSelected ? hexToRgba(anchorColor, 0.25) : 'var(--border-subtle)'}`,
                    background: isSelected ? hexToRgba(anchorColor, 0.06) : 'transparent',
                    color: isSelected ? anchorColor : 'var(--color-text-primary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {level.label}
                </button>
              )
            })}
          </div>

          {/* Focus Anchors */}
          <SectionLabel style={{ marginTop: 16 }}>FOCUS ANCHORS</SectionLabel>
          {anchors.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {anchors.map(anchor => {
                const isActive = selectedAnchorIds.includes(anchor.id)
                const color = getEntityColor(anchor.entity_type)
                return (
                  <button
                    key={anchor.id}
                    type="button"
                    onClick={() => toggleAnchor(anchor.id)}
                    className="font-body font-semibold cursor-pointer flex items-center gap-1.5"
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      border: `1px solid ${isActive ? hexToRgba(color, 0.16) : 'var(--border-subtle)'}`,
                      background: isActive ? hexToRgba(color, 0.06) : 'var(--color-bg-inset)',
                      color: isActive ? color : 'var(--color-text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    {anchor.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                marginBottom: 16,
              }}
            >
              No anchors defined — add them in{' '}
              <span style={{ color: 'var(--color-text-body)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Settings
              </span>
            </p>
          )}

          {/* Custom Guidance */}
          <SectionLabel style={{ marginTop: 16 }}>CUSTOM GUIDANCE</SectionLabel>
          <textarea
            value={customGuidance}
            onChange={e => onGuidanceChange(e.target.value)}
            placeholder="Focus on action items and decisions..."
            rows={2}
            className="font-body w-full resize-y"
            style={{
              fontSize: 12,
              color: 'var(--color-text-body)',
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '8px 12px',
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(214,58,0,0.3)'
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-50)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// --- Internal Helpers ---

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="font-display font-bold uppercase"
      style={{
        fontSize: 10,
        letterSpacing: '0.08em',
        color: 'var(--color-text-secondary)',
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
