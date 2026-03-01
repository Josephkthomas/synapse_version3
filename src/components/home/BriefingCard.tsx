import { Bot, Eye, Pencil, Zap } from 'lucide-react'
import { getTemplateById } from '../../config/digestTemplates'
import type { DigestProfile } from '../../types/feed'

function formatScheduleLabel(time: string, frequency: string): string {
  try {
    const parts = time.split(':').map(Number)
    const hours = parts[0] ?? 0
    const minutes = parts[1] ?? 0
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const freq = frequency.charAt(0).toUpperCase() + frequency.slice(1)
    return `${timeStr} · ${freq}`
  } catch {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1)
  }
}

interface BriefingCardProps {
  profile: DigestProfile
  onView?: () => void
  onEdit?: () => void
  onGenerateNow?: () => void
  generating?: boolean
}

export function BriefingCard({ profile, onView, onEdit, onGenerateNow, generating }: BriefingCardProps) {
  const isReady = profile.status === 'ready'
  const activeModules = profile.modules
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div
      className="rounded-[12px]"
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        padding: '14px 18px',
        marginBottom: 8,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isReady ? 'rgba(225,29,72,0.10)' : 'var(--color-bg-inset)',
            }}
          >
            <Bot
              size={16}
              style={{ color: isReady ? '#e11d48' : 'var(--color-text-secondary)' }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-body font-semibold text-text-primary truncate" style={{ fontSize: 14 }}>
              {profile.title}
            </p>
            <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {formatScheduleLabel(profile.scheduleTime, profile.frequency)}
              {' · '}
              {profile.scheduleTimezone}
            </p>
          </div>
        </div>

        <span
          className="font-body font-bold uppercase shrink-0"
          style={{
            fontSize: 10,
            padding: '3px 10px',
            borderRadius: 20,
            marginLeft: 8,
            background: isReady ? 'rgba(225,29,72,0.10)' : 'var(--color-bg-inset)',
            border: isReady
              ? '1px solid rgba(225,29,72,0.20)'
              : '1px solid var(--border-subtle)',
            color: isReady ? '#e11d48' : 'var(--color-text-secondary)',
          }}
        >
          {profile.status}
        </span>
      </div>

      {/* Module tags — human-readable names */}
      {activeModules.length > 0 && (
        <div className="flex flex-wrap gap-1" style={{ marginBottom: 10 }}>
          {activeModules.map(m => {
            let label: string
            if (m.templateId === 'custom_agent') {
              try { label = (JSON.parse(m.customContext ?? '{}') as { name?: string }).name ?? 'Custom Agent' }
              catch { label = 'Custom Agent' }
            } else {
              label = getTemplateById(m.templateId)?.name ?? m.templateId
            }
            return (
              <span
                key={m.id}
                className="font-body"
                style={{
                  fontSize: 10,
                  color: m.templateId === 'custom_agent' ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                  background: m.templateId === 'custom_agent' ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                  padding: '2px 7px',
                  borderRadius: 4,
                  border: m.templateId === 'custom_agent' ? '1px solid rgba(214,58,0,0.2)' : 'none',
                }}
              >
                {label}
              </span>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
            style={{
              fontSize: 11,
              padding: '5px 10px',
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-body)',
            }}
          >
            <Pencil size={11} /> Edit
          </button>
        )}
        {isReady && onView && (
          <button
            type="button"
            onClick={onView}
            className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
            style={{
              fontSize: 11,
              padding: '5px 10px',
              background: 'var(--color-bg-inset)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-body)',
            }}
          >
            <Eye size={11} /> View
          </button>
        )}
        {onGenerateNow && (
          <button
            type="button"
            onClick={onGenerateNow}
            disabled={generating}
            className="flex items-center gap-1.5 font-body font-semibold cursor-pointer rounded-md"
            style={{
              fontSize: 11,
              padding: '5px 10px',
              background: generating ? 'var(--color-bg-inset)' : 'var(--color-accent-500)',
              border: 'none',
              color: generating ? 'var(--color-text-secondary)' : '#fff',
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            <Zap size={11} />
            {generating ? 'Generating…' : 'Generate Now'}
          </button>
        )}
      </div>
    </div>
  )
}
