import { YouTubeChannelsCard } from './YouTubeChannelsCard'
import { YouTubePlaylistsCard } from './YouTubePlaylistsCard'
import { MeetingIntegrationsCard } from './MeetingIntegrationsCard'
import { ChromeExtensionCard } from './ChromeExtensionCard'
import { IntegrationStatusCard } from './IntegrationStatusCard'
import type { AutomationSummary, YouTubeChannel } from '../../types/automate'
import type { YouTubePlaylist } from '../../types/youtube'

interface IntegrationDashboardProps {
  summary: AutomationSummary
  channels: YouTubeChannel[]
  playlists: YouTubePlaylist[]
  queueSectionRef?: React.RefObject<HTMLDivElement | null>
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return 'No activity'
  const diffMs = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function IntegrationDashboard({ summary, channels, playlists, queueSectionRef }: IntegrationDashboardProps) {
  const queueIsActive = summary.queue.processing > 0
  const queueStatus = queueIsActive ? 'active' : 'idle'
  const queueDescription = `${summary.queue.pending} pending · ${summary.queue.failed} failed`
  const queueMetric = `Last: ${formatRelativeTime(summary.queue.lastCompletedAt)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <YouTubeChannelsCard channels={channels} summary={summary} />
      <YouTubePlaylistsCard playlists={playlists} summary={summary} />
      <MeetingIntegrationsCard summary={summary} />

      {/* Processing Queue Summary Card — not expandable, scrolls to queue section */}
      <IntegrationStatusCard
        title="Processing Queue"
        description={queueDescription}
        status={queueStatus}
        metric={queueMetric}
        expandable={false}
        onClick={() => {
          queueSectionRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      <ChromeExtensionCard summary={summary} />
    </div>
  )
}
