import { useState, useEffect } from 'react'
import { X, Pause, Play, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { FrequencyIcon, getFrequencyConfig } from '../shared/FrequencyIcon'
import { getTemplateById } from '../../config/digestTemplates'
import { fetchDigestHistory } from '../../services/supabase'
import { supabase } from '../../services/supabase'
import type { DigestProfile } from '../../types/feed'
import type { DigestHistoryEntry } from '../../types/digest'

interface DigestDetailProps {
  profile: DigestProfile
  onClose: () => void
  onEdit: () => void
  onGenerateNow: () => void
  onDelete: () => void
  onToggleActive: () => void
  generating: boolean
}

function SL({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="font-display font-bold uppercase"
      style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginBottom: 8, ...style }}
    >
      {children}
    </div>
  )
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

function formatScheduleLabel(time: string, frequency: string, timezone: string): string {
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
    return `${freq} · ${timeStr} ${timezone}`
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

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function DigestDetail({
  profile,
  onClose,
  onEdit,
  onGenerateNow,
  onDelete,
  onToggleActive,
  generating,
}: DigestDetailProps) {
  const [deliveries, setDeliveries] = useState<DigestHistoryEntry[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deliveryCount, setDeliveryCount] = useState(0)

  const status = getStatusDisplay(profile)
  const activeModules = profile.modules
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  useEffect(() => {
    setDeliveriesLoading(true)
    setConfirmDelete(false)
    fetchDigestHistory(profile.id, 5)
      .then(entries => {
        setDeliveries(entries)
        setDeliveryCount(entries.length)
      })
      .catch(() => setDeliveries([]))
      .finally(() => setDeliveriesLoading(false))

    // Also get total count
    supabase
      .from('digest_history')
      .select('id', { count: 'exact', head: true })
      .eq('digest_profile_id', profile.id)
      .then(({ count }) => {
        if (count !== null) setDeliveryCount(count)
      })
  }, [profile.id])

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        background: 'var(--color-bg-card)',
        borderLeft: '1px solid var(--border-subtle)',
        animation: 'slideInRight 0.2s ease',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FrequencyIcon frequency={profile.frequency} size={18} boxSize={36} />
            <div>
              <div
                className="font-display"
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}
              >
                {profile.title}
              </div>
              <div
                className="font-body"
                style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1 }}
              >
                {formatScheduleLabel(profile.scheduleTime, profile.frequency, profile.scheduleTimezone)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: 'var(--color-text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: status.color }} />
          <span className="font-body" style={{ fontSize: 11, fontWeight: 600, color: status.color }}>
            {status.label}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            type="button"
            onClick={onToggleActive}
            className="font-body font-semibold"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-body)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {profile.isActive ? <Pause size={12} /> : <Play size={12} />}
            {profile.isActive ? 'Pause' : 'Resume'}
          </button>

          <button
            type="button"
            onClick={onGenerateNow}
            disabled={generating || activeModules.length === 0}
            className="font-body font-semibold"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(214,58,0,0.25)',
              background: generating ? 'var(--color-bg-inset)' : 'var(--color-accent-50)',
              color: generating ? 'var(--color-text-secondary)' : 'var(--color-accent-500)',
              fontSize: 11,
              cursor: generating || activeModules.length === 0 ? 'not-allowed' : 'pointer',
              opacity: activeModules.length === 0 ? 0.5 : 1,
            }}
          >
            <RefreshCw size={12} style={generating ? { animation: 'spin 1s linear infinite' } : undefined} />
            {generating ? 'Generating...' : 'Generate Now'}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="font-body font-semibold"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-body)',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          <div style={{ background: 'var(--color-bg-inset)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {activeModules.length}
            </div>
            <div className="font-body" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Modules
            </div>
          </div>
          <div style={{ background: 'var(--color-bg-inset)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {deliveryCount}
            </div>
            <div className="font-body" style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Delivered
            </div>
          </div>
        </div>

        {/* Modules section */}
        <SL style={{ marginBottom: 10 }}>Modules ({activeModules.length})</SL>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
          {activeModules.length === 0 ? (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              No modules configured. Click Edit to add modules.
            </p>
          ) : (
            activeModules.map(m => {
              let label: string
              let icon: string | undefined
              if (m.templateId === 'custom_agent') {
                try { label = (JSON.parse(m.customContext ?? '{}') as { name?: string }).name ?? 'Custom Agent' }
                catch { label = 'Custom Agent' }
                icon = undefined
              } else {
                const tpl = getTemplateById(m.templateId)
                label = tpl?.name ?? m.templateId
                icon = tpl?.icon
              }
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--color-bg-inset)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {icon && (
                    <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', width: 18, textAlign: 'center' }}>
                      {icon.charAt(0)}
                    </span>
                  )}
                  <span className="font-body" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', flex: 1 }}>
                    {label}
                  </span>
                  <span
                    className="font-body"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: getFrequencyConfig(profile.frequency).color,
                    }}
                  >
                    {getFrequencyConfig(profile.frequency).label}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Recent Deliveries */}
        <SL style={{ marginBottom: 10 }}>Recent Deliveries</SL>
        <div style={{ marginBottom: 24 }}>
          {deliveriesLoading ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <span className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                Loading...
              </span>
            </div>
          ) : deliveries.length === 0 ? (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '16px 0' }}>
              No deliveries yet. Click "Generate Now" to create the first one.
            </p>
          ) : (
            deliveries.map((entry, idx) => {
              const statusColor = entry.status === 'generated' || entry.status === 'delivered'
                ? '#22c55e'
                : entry.status === 'failed'
                  ? '#ef4444'
                  : '#f59e0b'
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: idx < deliveries.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                    <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-body)' }}>
                      {new Date(entry.generated_at ?? entry.content?.generatedAt ?? '').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {relativeTime(entry.generated_at ?? entry.content?.generatedAt ?? new Date().toISOString())}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Settings section */}
        <SL style={{ marginBottom: 10 }}>Settings</SL>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Density</span>
            <span
              className="font-body"
              style={{
                padding: '1px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                background: getDensityColor(profile.density) + '14',
                color: getDensityColor(profile.density),
                textTransform: 'capitalize',
              }}
            >
              {profile.density}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Schedule</span>
            <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-body)' }}>
              {formatScheduleLabel(profile.scheduleTime, profile.frequency, profile.scheduleTimezone)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Delivery</span>
            <span className="font-body" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-body)' }}>
              In-app
            </span>
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="font-body" style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
                Delete this digest?
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="font-body font-semibold"
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="font-body font-semibold"
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="font-body"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: '#ef4444',
                padding: 0,
              }}
            >
              <Trash2 size={13} />
              Delete Digest
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
