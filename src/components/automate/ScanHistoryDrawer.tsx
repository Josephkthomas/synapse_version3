import { useState } from 'react'
import { ChevronDown, History } from 'lucide-react'
import type { ScanHistoryEntry } from '../../types/automate'

interface ScanHistoryDrawerProps {
  entries: ScanHistoryEntry[]
}

const SCAN_TYPE_ICONS: Record<string, string> = {
  auto_poll: '🔄',
  manual_scan: '🔍',
  process: '⚙️',
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  failed: '#ef4444',
  partial: '#f59e0b',
}

function formatRelativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ScanHistoryDrawer({ entries }: ScanHistoryDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      {/* Section Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ padding: '4px 0' }}
      >
        <span
          className="font-display font-bold"
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
          }}
        >
          Recent Activity
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--color-text-secondary)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ marginTop: 10 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <History
                size={24}
                strokeWidth={1.5}
                style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 8px' }}
              />
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
              >
                No scan activity yet. Activity will appear here once automated polling is configured.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>
                      {SCAN_TYPE_ICONS[entry.scan_type] ?? '📋'}
                    </span>
                    <span
                      className="font-body"
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-body)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.scan_type === 'auto_poll'
                        ? `Polled ${entry.channel_name ?? 'channel'}: found ${entry.videos_found}, added ${entry.videos_added}`
                        : entry.scan_type === 'manual_scan'
                          ? `Scanned ${entry.channel_name ?? 'channel'}: found ${entry.videos_found}`
                          : `Processed: ${entry.videos_processed} videos, ${entry.videos_failed} failed`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                    <span
                      className="font-body"
                      style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                    >
                      {formatRelativeTime(entry.created_at)}
                    </span>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: STATUS_COLORS[entry.status] ?? '#808080',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
