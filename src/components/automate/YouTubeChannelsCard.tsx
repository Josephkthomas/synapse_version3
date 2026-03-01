import { useNavigate } from 'react-router-dom'
import { IntegrationStatusCard } from './IntegrationStatusCard'
import type { YouTubeChannel } from '../../types/automate'
import type { AutomationSummary } from '../../types/automate'

interface YouTubeChannelsCardProps {
  channels: YouTubeChannel[]
  summary: AutomationSummary
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return 'Never'
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function YouTubeChannelsCard({ channels, summary }: YouTubeChannelsCardProps) {
  const navigate = useNavigate()
  const { channelCount, activeChannelCount, totalVideosIngested } = summary.youtube

  const status = activeChannelCount > 0 ? 'active' : 'idle'
  const description = channelCount > 0
    ? `${activeChannelCount} channel${activeChannelCount !== 1 ? 's' : ''} · RSS every 15min`
    : 'No channels connected'
  const metric = `${totalVideosIngested} videos`

  return (
    <IntegrationStatusCard
      title="YouTube Channels"
      description={description}
      status={status}
      metric={metric}
    >
      {channels.length === 0 ? (
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '8px 0' }}
        >
          No channels connected. Add channels to automatically ingest new videos.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
              <div>
                <span
                  className="font-body font-semibold"
                  style={{ fontSize: 12, color: 'var(--color-text-primary)' }}
                >
                  {ch.channel_name}
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginLeft: 8 }}
                >
                  Last checked: {formatRelativeTime(ch.last_checked_at)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                >
                  {ch.total_videos_ingested} videos
                </span>
                <span
                  className="font-body font-semibold"
                  style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: ch.is_active ? 'rgba(16,185,129,0.1)' : 'var(--color-bg-inset)',
                    color: ch.is_active ? '#10b981' : 'var(--color-text-secondary)',
                  }}
                >
                  {ch.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate('/ingest?tab=youtube')}
        className="font-body font-semibold cursor-pointer"
        style={{
          fontSize: 11,
          padding: '6px 12px',
          borderRadius: 6,
          background: 'transparent',
          border: '1px solid var(--border-subtle)',
          color: 'var(--color-text-secondary)',
          marginTop: 10,
        }}
      >
        Manage Channels
      </button>
    </IntegrationStatusCard>
  )
}
