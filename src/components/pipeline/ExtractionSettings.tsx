import { useState, useEffect, useCallback } from 'react'
import { Sliders, Loader2, Check } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import { fetchOrCreateExtractionSettings, updateExtractionSettings } from '../../services/supabase'
import { EXTRACTION_MODES, ANCHOR_EMPHASIS_LEVELS } from '../../config/extractionModes'
import { EntityBadge } from '../shared/EntityBadge'

interface ExtractionSettingsProps {
  onSaved?: () => void
}

export function ExtractionSettings({ onSaved }: ExtractionSettingsProps) {
  const { anchors } = useSettings()
  const [mode, setMode] = useState<string>('comprehensive')
  const [emphasis, setEmphasis] = useState<string>('standard')
  const [guidance, setGuidance] = useState('')
  const [originalMode, setOriginalMode] = useState<string>('comprehensive')
  const [originalEmphasis, setOriginalEmphasis] = useState<string>('standard')
  const [originalGuidance, setOriginalGuidance] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrCreateExtractionSettings().then(settings => {
      if (settings) {
        setMode(settings.default_mode)
        setEmphasis(settings.default_anchor_emphasis)
        setOriginalMode(settings.default_mode)
        setOriginalEmphasis(settings.default_anchor_emphasis)
        // Guidance may be stored in settings.settings object
        const g = (settings.settings as Record<string, string>)?.custom_guidance ?? ''
        setGuidance(g)
        setOriginalGuidance(g)
      }
      setLoading(false)
    })
  }, [])

  const hasChanges = mode !== originalMode || emphasis !== originalEmphasis || guidance !== originalGuidance

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await updateExtractionSettings({
        default_mode: mode,
        default_anchor_emphasis: emphasis,
      })
      setOriginalMode(mode)
      setOriginalEmphasis(emphasis)
      setOriginalGuidance(guidance)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [mode, emphasis, guidance, onSaved])

  if (loading) {
    return (
      <div style={{ padding: '24px 20px' }}>
        <div className="animate-pulse" style={{ height: 200, background: 'var(--color-bg-inset)', borderRadius: 8 }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Sliders size={16} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Extraction Settings
        </span>
      </div>
      <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 20, marginTop: 4 }}>
        Default configuration for all new extractions. Override per-source during ingestion.
      </p>

      {/* Mode selector */}
      <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
        Default Mode
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
        {EXTRACTION_MODES.map(m => {
          const isActive = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                border: `1px solid ${isActive ? `${m.colorHex}40` : 'var(--border-subtle)'}`,
                background: isActive ? `${m.colorHex}0F` : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="font-body" style={{ fontSize: 12, fontWeight: 600, color: isActive ? m.colorHex : 'var(--color-text-primary)' }}>
                {m.label}
              </div>
              <div className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.4, marginTop: 2 }}>
                {m.description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Anchor emphasis */}
      <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
        Default Anchor Emphasis
      </span>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {ANCHOR_EMPHASIS_LEVELS.map(e => {
          const isActive = emphasis === e.id
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setEmphasis(e.id)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                textAlign: 'center',
                border: `1px solid ${isActive ? 'rgba(180,83,9,0.25)' : 'var(--border-subtle)'}`,
                background: isActive ? 'rgba(180,83,9,0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="font-body" style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#b45309' : 'var(--color-text-primary)' }}>
                {e.label}
              </div>
              <div className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {e.description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Linked anchors */}
      <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
        Default Linked Anchors
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24 }}>
        {anchors.length === 0 ? (
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-placeholder)' }}>
            No anchors configured
          </span>
        ) : (
          anchors.map(a => (
            <EntityBadge key={a.id} type="Anchor" label={a.label} size="xs" />
          ))
        )}
      </div>

      {/* Custom guidance */}
      <span className="font-body" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>
        Default Custom Guidance
      </span>
      <textarea
        value={guidance}
        onChange={e => setGuidance(e.target.value)}
        placeholder="E.g., Focus on action items and decisions. Prioritize technical architecture insights..."
        rows={3}
        className="font-body"
        style={{
          width: '100%',
          background: 'var(--color-bg-inset)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          padding: '10px 13px',
          fontSize: 12,
          color: 'var(--color-text-primary)',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
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

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className="font-body font-semibold"
        style={{
          width: '100%',
          marginTop: 16,
          padding: '10px 16px',
          borderRadius: 8,
          border: 'none',
          background: saved
            ? 'var(--semantic-green-500, #22c55e)'
            : 'var(--color-accent-500)',
          color: 'white',
          fontSize: 13,
          cursor: hasChanges && !saving ? 'pointer' : 'default',
          opacity: hasChanges || saving ? 1 : 0.4,
          boxShadow: hasChanges ? '0 2px 8px rgba(214,58,0,0.2)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'all 0.2s ease',
        }}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saved && <Check size={14} />}
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Defaults'}
      </button>

      {error && (
        <p className="font-body" style={{ fontSize: 11, color: 'var(--semantic-red-500, #ef4444)', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  )
}
