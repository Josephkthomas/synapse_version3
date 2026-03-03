import { useState } from 'react'
import { getTemplateById } from '../../config/digestTemplates'
import { FrequencyIcon, getFrequencyConfig } from '../shared/FrequencyIcon'
import type { DigestProfile } from '../../types/feed'

interface DigestCardProps {
  profile: DigestProfile
  isSelected: boolean
  onClick: () => void
  index?: number
}

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
    return `${freq} · ${timeStr}`
  } catch {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1)
  }
}

function getDensityColor(density: string): string {
  switch (density) {
    case 'brief': return '#3b82f6'
    case 'comprehensive': return '#8b5cf6'
    default: return '#6b7280'
  }
}

function getStatusDisplay(profile: DigestProfile): { label: string; color: string } {
  if (profile.status === 'ready') return { label: 'Ready', color: '#e11d48' }
  if (!profile.isActive) {
    const hasModules = profile.modules.some(m => m.isActive)
    if (!hasModules) return { label: 'Draft', color: '#f59e0b' }
    return { label: 'Paused', color: '#6b7280' }
  }
  return { label: 'Active', color: '#22c55e' }
}

export function DigestCard({ profile, isSelected, onClick, index = 0 }: DigestCardProps) {
  const [hovered, setHovered] = useState(false)
  const activeModules = profile.modules
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const status = getStatusDisplay(profile)
  const densityColor = getDensityColor(profile.density)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '16px 22px',
        borderRadius: 12,
        background: isSelected ? 'rgba(254,242,237,0.5)' : 'var(--color-bg-card)',
        border: isSelected
          ? '1px solid rgba(214,58,0,0.3)'
          : hovered
            ? '1px solid var(--border-default)'
            : '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered && !isSelected ? 'translateY(-1px)' : undefined,
        boxShadow: hovered && !isSelected ? '0 2px 8px rgba(0,0,0,0.04)' : undefined,
        animation: `fadeUp 0.3s ease ${index * 0.05}s both`,
        outline: 'none',
      }}
    >
      {/* Top row: icon + title/schedule | status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <FrequencyIcon frequency={profile.frequency} />
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display"
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {profile.title}
            </div>
            <div
              className="font-body"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
            >
              {formatScheduleLabel(profile.scheduleTime, profile.frequency)}
              {' · '}
              {profile.scheduleTimezone}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
          <span
            className="font-body"
            style={{ fontSize: 11, fontWeight: 600, color: status.color }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Module tags */}
      {activeModules.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {activeModules.slice(0, 3).map(m => {
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
                  fontWeight: 600,
                  color: m.templateId === 'custom_agent' ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                  background: m.templateId === 'custom_agent' ? 'var(--color-accent-50)' : 'var(--color-bg-inset)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: m.templateId === 'custom_agent' ? '1px solid rgba(214,58,0,0.2)' : 'none',
                }}
              >
                {label}
              </span>
            )
          })}
          {activeModules.length > 3 && (
            <span
              className="font-body"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                background: 'var(--color-bg-inset)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              +{activeModules.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: module count + density badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-body)' }}>
            {activeModules.length}
          </span>{' '}
          module{activeModules.length !== 1 ? 's' : ''}
        </span>
        <span
          className="font-body"
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            background: densityColor + '14',
            color: densityColor,
            textTransform: 'capitalize',
          }}
        >
          {profile.density}
        </span>
        <span
          className="font-body"
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            fontWeight: 600,
            color: getFrequencyConfig(profile.frequency).color,
          }}
        >
          {getFrequencyConfig(profile.frequency).label}
        </span>
      </div>
    </div>
  )
}
