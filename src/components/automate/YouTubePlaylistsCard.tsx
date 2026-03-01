import { useNavigate } from 'react-router-dom'
import { IntegrationStatusCard } from './IntegrationStatusCard'
import type { YouTubePlaylist } from '../../types/youtube'
import type { AutomationSummary } from '../../types/automate'

interface YouTubePlaylistsCardProps {
  playlists: YouTubePlaylist[]
  summary: AutomationSummary
}

export function YouTubePlaylistsCard({ playlists, summary }: YouTubePlaylistsCardProps) {
  const navigate = useNavigate()
  const { playlistCount, activePlaylistCount, totalPlaylistVideos } = summary.youtube

  const status = activePlaylistCount > 0 ? 'active' : 'idle'
  const description = playlistCount > 0
    ? `${activePlaylistCount} playlist${activePlaylistCount !== 1 ? 's' : ''} · SYN codes assigned`
    : 'No playlists connected'
  const metric = `${totalPlaylistVideos} videos`

  return (
    <IntegrationStatusCard
      title="YouTube Playlists"
      description={description}
      status={status}
      metric={metric}
    >
      {playlists.length === 0 ? (
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', padding: '8px 0' }}
        >
          No playlists connected. Connect playlists from the Ingest tab.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {playlists.map(pl => (
            <div key={pl.id} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
              <div className="flex items-center gap-2">
                <span
                  className="font-body font-semibold"
                  style={{ fontSize: 12, color: 'var(--color-text-primary)' }}
                >
                  {pl.playlist_name ?? 'Unnamed Playlist'}
                </span>
                {pl.synapse_code && (
                  <span
                    className="font-body font-bold"
                    style={{
                      fontSize: 10,
                      color: 'var(--color-accent-500)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {pl.synapse_code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                >
                  {pl.known_video_count} videos
                </span>
                <span
                  className="font-body font-semibold"
                  style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background:
                      pl.status === 'active'
                        ? 'rgba(16,185,129,0.1)'
                        : pl.status === 'error'
                          ? 'rgba(239,68,68,0.1)'
                          : 'var(--color-bg-inset)',
                    color:
                      pl.status === 'active'
                        ? '#10b981'
                        : pl.status === 'error'
                          ? '#ef4444'
                          : 'var(--color-text-secondary)',
                  }}
                >
                  {pl.status === 'active' ? 'Active' : pl.status === 'error' ? 'Error' : 'Paused'}
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
        Manage Playlists
      </button>
    </IntegrationStatusCard>
  )
}
