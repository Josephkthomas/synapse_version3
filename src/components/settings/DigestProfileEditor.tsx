import { useState, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { DIGEST_TEMPLATES, getTemplatesForFrequency } from '../../config/digestTemplates'
import { useDigestProfiles } from '../../hooks/useDigestProfiles'
import type { DigestProfile } from '../../types/feed'
import type { DigestModuleInput, DigestChannelInput } from '../../types/digest'

// Common IANA timezones for the selector
const COMMON_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo', 'Europe/London',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Stockholm', 'Europe/Zurich', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Seoul', 'Australia/Sydney', 'Pacific/Auckland',
]

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

interface SelectedModule {
  templateId: string
  customContext: string
  sortOrder: number
}

interface ChannelState {
  enabled: boolean
  config: Record<string, string>
  densityOverride?: 'brief' | 'standard' | 'comprehensive'
}

interface DigestProfileEditorProps {
  profile?: DigestProfile
  onClose: () => void
  onSaved: (id: string) => void
}

type Frequency = 'daily' | 'weekly' | 'monthly'
type Density = 'brief' | 'standard' | 'comprehensive'

export function DigestProfileEditor({ profile, onClose, onSaved }: DigestProfileEditorProps) {
  const { create, update } = useDigestProfiles()
  const isEditing = !!profile

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Step 1: Basics
  const [title, setTitle] = useState(profile?.title ?? '')
  const [frequency, setFrequency] = useState<Frequency>(profile?.frequency ?? 'daily')
  const [scheduleTime, setScheduleTime] = useState(
    profile?.scheduleTime ? profile.scheduleTime.substring(0, 5) : '07:00'
  )
  const [timezone, setTimezone] = useState(profile?.scheduleTimezone ?? getBrowserTimezone())
  const [density, setDensity] = useState<Density>(profile?.density ?? 'standard')

  // Step 2: Modules
  const [selectedModules, setSelectedModules] = useState<SelectedModule[]>(() => {
    if (!profile?.modules.length) return []
    return profile.modules
      .filter(m => m.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(m => ({ templateId: m.templateId, customContext: '', sortOrder: m.sortOrder }))
  })
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [expandedContext, setExpandedContext] = useState<string | null>(null)

  // Step 3: Channels
  const [emailChannel, setEmailChannel] = useState<ChannelState>({ enabled: false, config: {} })
  const [telegramChannel, setTelegramChannel] = useState<ChannelState>({ enabled: false, config: {} })
  const [slackChannel, setSlackChannel] = useState<ChannelState>({ enabled: false, config: {} })

  // Frequency changes: clear incompatible modules
  const handleFrequencyChange = useCallback((f: Frequency) => {
    setFrequency(f)
    setSelectedModules(prev => prev.filter(m => {
      const t = DIGEST_TEMPLATES.find(t => t.id === m.templateId)
      return t?.frequency === f
    }))
  }, [])

  const toggleTemplate = useCallback((templateId: string) => {
    setSelectedModules(prev => {
      const exists = prev.find(m => m.templateId === templateId)
      if (exists) return prev.filter(m => m.templateId !== templateId)
      return [...prev, { templateId, customContext: '', sortOrder: prev.length }]
    })
  }, [])

  // Drag-and-drop reordering
  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDragOverIndex(i)
  }
  const handleDrop = (_e: React.DragEvent, targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    setSelectedModules(prev => {
      const newList = [...prev]
      const moved = newList.splice(dragIndex, 1)[0]
      if (!moved) return newList
      newList.splice(targetIndex, 0, moved)
      return newList.map((m, i) => ({ ...m, sortOrder: i }))
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    if (!title.trim()) { setSaveError('Title is required'); return }
    if (selectedModules.length === 0) { setSaveError('Add at least one module'); setStep(2); return }

    setSaving(true)
    setSaveError(null)

    const modules: DigestModuleInput[] = selectedModules.map((m, i) => ({
      template_id: m.templateId,
      custom_context: m.customContext || undefined,
      sort_order: i,
    }))

    const channels: DigestChannelInput[] = []
    if (emailChannel.enabled && emailChannel.config.recipient_email) {
      channels.push({ channel_type: 'email', config: emailChannel.config, density_override: emailChannel.densityOverride })
    }
    if (telegramChannel.enabled) {
      channels.push({ channel_type: 'telegram', config: telegramChannel.config, density_override: telegramChannel.densityOverride })
    }
    if (slackChannel.enabled) {
      channels.push({ channel_type: 'slack', config: slackChannel.config, density_override: slackChannel.densityOverride })
    }

    try {
      if (isEditing && profile) {
        await update(profile.id, title.trim(), frequency, density, `${scheduleTime}:00`, timezone, modules, channels)
        onSaved(profile.id)
      } else {
        const id = await create(title.trim(), frequency, density, `${scheduleTime}:00`, timezone, modules, channels)
        onSaved(id)
      }
      onClose()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const frequencyOptions: { key: Frequency; label: string; sub: string }[] = [
    { key: 'daily', label: 'Daily', sub: '6 templates' },
    { key: 'weekly', label: 'Weekly', sub: '6 templates' },
    { key: 'monthly', label: 'Monthly', sub: '6 templates' },
  ]

  const densityOptions: { key: Density; label: string; sub: string }[] = [
    { key: 'brief', label: 'Brief', sub: '2–3 sentences' },
    { key: 'standard', label: 'Standard', sub: '1–2 paragraphs' },
    { key: 'comprehensive', label: 'Comprehensive', sub: '3–4 paragraphs' },
  ]

  const availableTemplates = getTemplatesForFrequency(frequency)
  const selectedTemplateIds = new Set(selectedModules.map(m => m.templateId))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <p className="font-display font-bold" style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
              {isEditing ? 'Edit Digest' : 'New Digest'}
            </p>
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Step {step} of 3 — {step === 1 ? 'Basics' : step === 2 ? 'Modules' : 'Delivery Channels'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer"
            style={{
              width: 32,
              height: 32,
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div
          className="flex shrink-0"
          style={{ padding: '12px 24px', gap: 8, borderBottom: '1px solid var(--border-subtle)' }}
        >
          {[1, 2, 3].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => step > s && setStep(s)}
              className="flex items-center gap-1.5"
              style={{
                cursor: step > s ? 'pointer' : 'default',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: step >= s ? 'var(--color-accent-500)' : 'var(--color-bg-inset)',
                  border: `1px solid ${step >= s ? 'var(--color-accent-500)' : 'var(--border-subtle)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span className="font-body font-bold" style={{ fontSize: 10, color: step >= s ? '#fff' : 'var(--color-text-secondary)' }}>
                  {s}
                </span>
              </div>
              <span
                className="font-body"
                style={{ fontSize: 12, color: step >= s ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: step === s ? 600 : 400 }}
              >
                {s === 1 ? 'Basics' : s === 2 ? 'Modules' : 'Channels'}
              </span>
              {s < 3 && <ChevronRight size={12} style={{ color: 'var(--color-text-placeholder)' }} />}
            </button>
          ))}
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ─── STEP 1: BASICS ─── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Title */}
              <div>
                <label className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', display: 'block', marginBottom: 6 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Daily Morning Brief"
                  className="font-body w-full"
                  style={{
                    fontSize: 13,
                    padding: '8px 12px',
                    background: 'var(--color-bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', display: 'block', marginBottom: 8 }}>
                  Frequency
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {frequencyOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleFrequencyChange(opt.key)}
                      className="cursor-pointer text-left rounded-[10px]"
                      style={{
                        padding: '12px 14px',
                        background: frequency === opt.key ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                        border: `1px solid ${frequency === opt.key ? 'rgba(214,58,0,0.3)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <p className="font-body font-semibold" style={{ fontSize: 13, color: frequency === opt.key ? 'var(--color-accent-500)' : 'var(--color-text-primary)' }}>
                        {opt.label}
                      </p>
                      <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {opt.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule time + timezone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', display: 'block', marginBottom: 6 }}>
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="font-body w-full"
                    style={{
                      fontSize: 13,
                      padding: '8px 12px',
                      background: 'var(--color-bg-inset)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', display: 'block', marginBottom: 6 }}>
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="font-body w-full"
                    style={{
                      fontSize: 12,
                      padding: '8px 12px',
                      background: 'var(--color-bg-inset)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                    }}
                  >
                    {COMMON_TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Density */}
              <div>
                <label className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', display: 'block', marginBottom: 8 }}>
                  Output Density
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {densityOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDensity(opt.key)}
                      className="cursor-pointer text-left rounded-[10px]"
                      style={{
                        padding: '12px 14px',
                        background: density === opt.key ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                        border: `1px solid ${density === opt.key ? 'rgba(214,58,0,0.3)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <p className="font-body font-semibold" style={{ fontSize: 13, color: density === opt.key ? 'var(--color-accent-500)' : 'var(--color-text-primary)' }}>
                        {opt.label}
                      </p>
                      <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {opt.sub}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: MODULES ─── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Template grid */}
              <div>
                <p className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', marginBottom: 10 }}>
                  Available Templates
                  <span className="font-body" style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                    ({frequency})
                  </span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {availableTemplates.map(t => {
                    const isSelected = selectedTemplateIds.has(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTemplate(t.id)}
                        className="cursor-pointer text-left rounded-[8px]"
                        style={{
                          padding: '12px 14px',
                          background: isSelected ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                          border: `1px solid ${isSelected ? 'rgba(214,58,0,0.3)' : 'var(--border-subtle)'}`,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <p className="font-body font-semibold" style={{ fontSize: 12, color: isSelected ? 'var(--color-accent-500)' : 'var(--color-text-primary)', marginBottom: 3 }}>
                          {t.name}
                        </p>
                        <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                          {t.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Selected modules — reorderable */}
              {selectedModules.length > 0 && (
                <div>
                  <p className="font-body font-semibold" style={{ fontSize: 12, color: 'var(--color-text-body)', marginBottom: 8 }}>
                    Selected Modules
                    <span className="font-body" style={{ fontWeight: 400, color: 'var(--color-text-secondary)', marginLeft: 6 }}>
                      drag to reorder
                    </span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedModules.map((mod, i) => {
                      const template = DIGEST_TEMPLATES.find(t => t.id === mod.templateId)
                      const isExpanded = expandedContext === mod.templateId
                      return (
                        <div
                          key={mod.templateId}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={e => handleDragOver(e, i)}
                          onDrop={e => handleDrop(e, i)}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: 'var(--color-bg-card)',
                            border: `1px solid ${dragOverIndex === i ? 'var(--color-accent-500)' : 'var(--border-subtle)'}`,
                            borderRadius: 8,
                            padding: '10px 12px',
                            cursor: 'grab',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical size={14} style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
                            <span className="font-body font-semibold flex-1" style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>
                              {template?.name ?? mod.templateId}
                            </span>
                            <button
                              type="button"
                              onClick={() => setExpandedContext(isExpanded ? null : mod.templateId)}
                              className="cursor-pointer font-body"
                              style={{ fontSize: 10, color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: '0 4px' }}
                            >
                              {isExpanded ? 'Hide context' : 'Add context'}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTemplate(mod.templateId)}
                              className="flex items-center justify-center cursor-pointer rounded"
                              style={{
                                width: 22,
                                height: 22,
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-text-secondary)',
                                flexShrink: 0,
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {isExpanded && (
                            <textarea
                              value={mod.customContext}
                              onChange={e => setSelectedModules(prev => prev.map(m =>
                                m.templateId === mod.templateId ? { ...m, customContext: e.target.value } : m
                              ))}
                              placeholder={template?.defaultContext ?? 'Add optional context for this module…'}
                              className="font-body w-full"
                              rows={2}
                              style={{
                                marginTop: 8,
                                fontSize: 12,
                                padding: '6px 10px',
                                background: 'var(--color-bg-inset)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 6,
                                color: 'var(--color-text-primary)',
                                outline: 'none',
                                resize: 'none',
                                width: '100%',
                              }}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedModules.length === 0 && (
                <div
                  className="flex flex-col items-center justify-center"
                  style={{ paddingTop: 24, paddingBottom: 24, color: 'var(--color-text-secondary)' }}
                >
                  <Plus size={20} style={{ marginBottom: 8 }} />
                  <p className="font-body" style={{ fontSize: 13 }}>Select at least one template above</p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 3: CHANNELS ─── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Configure optional delivery channels. Channels are not required — digests can be viewed in-app.
              </p>

              {/* Email */}
              <ChannelCard
                label="Email"
                enabled={emailChannel.enabled}
                onToggle={en => setEmailChannel(prev => ({ ...prev, enabled: en }))}
              >
                <input
                  type="email"
                  value={emailChannel.config.recipient_email ?? ''}
                  onChange={e => setEmailChannel(prev => ({ ...prev, config: { ...prev.config, recipient_email: e.target.value } }))}
                  placeholder="Recipient email address"
                  className="font-body w-full"
                  style={inputStyle}
                />
              </ChannelCard>

              {/* Telegram */}
              <ChannelCard
                label="Telegram"
                enabled={telegramChannel.enabled}
                onToggle={en => setTelegramChannel(prev => ({ ...prev, enabled: en }))}
                comingSoon
              >
                <input
                  type="text"
                  value={telegramChannel.config.bot_token ?? ''}
                  onChange={e => setTelegramChannel(prev => ({ ...prev, config: { ...prev.config, bot_token: e.target.value } }))}
                  placeholder="Bot token"
                  className="font-body w-full"
                  style={{ ...inputStyle, marginBottom: 8 }}
                />
                <input
                  type="text"
                  value={telegramChannel.config.chat_id ?? ''}
                  onChange={e => setTelegramChannel(prev => ({ ...prev, config: { ...prev.config, chat_id: e.target.value } }))}
                  placeholder="Chat ID"
                  className="font-body w-full"
                  style={inputStyle}
                />
              </ChannelCard>

              {/* Slack */}
              <ChannelCard
                label="Slack"
                enabled={slackChannel.enabled}
                onToggle={en => setSlackChannel(prev => ({ ...prev, enabled: en }))}
                comingSoon
              >
                <input
                  type="url"
                  value={slackChannel.config.webhook_url ?? ''}
                  onChange={e => setSlackChannel(prev => ({ ...prev, config: { ...prev.config, webhook_url: e.target.value } }))}
                  placeholder="Webhook URL"
                  className="font-body w-full"
                  style={inputStyle}
                />
              </ChannelCard>
            </div>
          )}

          {saveError && (
            <p className="font-body" style={{ fontSize: 12, color: '#ef4444', marginTop: 12 }}>
              {saveError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--color-bg-inset)',
          }}
        >
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
            style={{
              fontSize: 12,
              padding: '6px 14px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--color-text-body)',
            }}
          >
            {step > 1 && <ChevronLeft size={13} />}
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !title.trim()) { setSaveError('Title is required'); return }
                if (step === 2 && selectedModules.length === 0) { setSaveError('Add at least one module'); return }
                setSaveError(null)
                setStep(s => s + 1)
              }}
              className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
              style={{
                fontSize: 12,
                padding: '6px 14px',
                background: 'var(--color-accent-500)',
                border: 'none',
                color: '#fff',
              }}
            >
              Next <ChevronRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="font-body font-semibold cursor-pointer rounded-md"
              style={{
                fontSize: 12,
                padding: '6px 14px',
                background: saving ? 'var(--color-bg-inset)' : 'var(--color-accent-500)',
                border: 'none',
                color: saving ? 'var(--color-text-secondary)' : '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Digest'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '7px 10px',
  background: 'var(--color-bg-inset)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  outline: 'none',
}

function ChannelCard({
  label,
  enabled,
  onToggle,
  comingSoon,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  comingSoon?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: `1px solid ${enabled ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        borderRadius: 10,
        padding: '14px 16px',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: enabled ? 12 : 0 }}>
        <div className="flex items-center gap-2">
          <span className="font-body font-semibold" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
            {label}
          </span>
          {comingSoon && (
            <span
              className="font-body font-bold uppercase"
              style={{ fontSize: 9, color: 'var(--color-text-secondary)', padding: '1px 6px', background: 'var(--color-bg-inset)', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
            >
              Coming soon
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className="cursor-pointer"
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: enabled ? 'var(--color-accent-500)' : 'var(--color-bg-inset)',
            border: `1px solid ${enabled ? 'var(--color-accent-500)' : 'var(--border-default)'}`,
            position: 'relative',
            transition: 'all 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: enabled ? 18 : 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.15s ease',
            }}
          />
        </button>
      </div>
      {enabled && children}
    </div>
  )
}
