import { useYouTubePlaylists } from '../../hooks/useYouTubePlaylists'
import { hasYouTubeApiKey } from '../../services/youtube'
import { ConnectPlaylistForm } from './ConnectPlaylistForm'
import { QueueStatusBanner } from './QueueStatusBanner'
import { PlaylistCard } from './PlaylistCard'
import { AlertCircle } from 'lucide-react'

export function YouTubeTab() {
  const {
    playlists,
    isLoading,
    error,
    queueStats,
    connectPlaylist,
    disconnectPlaylist,
    refreshVideos,
    queueVideos,
    updateSettings,
  } = useYouTubePlaylists()

  const apiKeyAvailable = hasYouTubeApiKey()

  return (
    <div>
      {/* No API key banner */}
      {!apiKeyAvailable && (
        <div
          className="flex items-center gap-2"
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--color-semantic-amber-50)',
            border: '1px solid var(--color-semantic-amber-100)',
            marginBottom: 16,
          }}
        >
          <AlertCircle size={14} style={{ color: 'var(--color-semantic-amber-500)', flexShrink: 0 }} />
          <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-body)' }}>
            YouTube API key not configured — playlist names and video lists require API access. Add your key in Settings.
          </span>
        </div>
      )}

      {/* Connect form */}
      <ConnectPlaylistForm
        onConnect={connectPlaylist}
        disabled={!apiKeyAvailable}
      />

      {/* Error */}
      {error && (
        <p className="font-body" style={{ fontSize: 11, color: 'var(--color-semantic-red-500)', marginBottom: 12 }}>
          {error}
        </p>
      )}

      {/* Queue status banner */}
      <QueueStatusBanner stats={queueStats} />

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Loading playlists...
          </p>
        </div>
      )}

      {/* Playlist list */}
      {!isLoading && playlists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {playlists.map(playlist => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onDisconnect={disconnectPlaylist}
              onRefreshVideos={refreshVideos}
              onQueueVideos={queueVideos}
              onUpdateSettings={updateSettings}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && playlists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--color-text-placeholder)' }}>▶</div>
          <p
            className="font-display font-bold"
            style={{ fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6 }}
          >
            Connect YouTube playlists & channels
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
          >
            RSS polling · Three-tier transcript extraction · Per-playlist settings
          </p>
        </div>
      )}
    </div>
  )
}
