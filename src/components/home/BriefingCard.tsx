import { Bot } from 'lucide-react'
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
}

export function BriefingCard({ profile }: BriefingCardProps) {
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

      {/* Module tags */}
      {activeModules.length > 0 && (
        <div
          className="flex flex-wrap gap-1"
          style={{ marginBottom: isReady ? 8 : 0 }}
        >
          {activeModules.map(m => (
            <span
              key={m.id}
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-inset)',
                padding: '2px 7px',
                borderRadius: 4,
              }}
            >
              {m.templateId}
            </span>
          ))}
        </div>
      )}

      {/* Preview text — only for ready status */}
      {isReady && (
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--color-text-body)',
            lineHeight: 1.4,
            fontStyle: 'italic',
          }}
        >
          Your briefing is ready to view.
        </p>
      )}
    </div>
  )
}
