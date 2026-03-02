import { useState, useCallback } from 'react'
import { ChevronDown, Pause, Play, RefreshCw, Trash2 } from 'lucide-react'
import type { YouTubePlaylist, YouTubeVideo, PlaylistSettings } from '../../types/youtube'
import { VideoListItem } from './VideoListItem'
import { PlaylistSettingsPanel } from './PlaylistSettingsPanel'

interface PlaylistCardProps {
  playlist: YouTubePlaylist
  onDisconnect: (id: string) => Promise<void>
  onRefreshVideos: (playlistId: string) => Promise<YouTubeVideo[]>
  onQueueVideos: (videos: YouTubeVideo[], playlistId: string) => Promise<number>
  onUpdateSettings: (playlistId: string, settings: Partial<PlaylistSettings>) => void
  onToggleStatus: (playlistId: string) => Promise<void>
}

export function PlaylistCard({
  playlist,
  onDisconnect,
  onRefreshVideos,
  onQueueVideos,
  onUpdateSettings,
  onToggleStatus,
}: PlaylistCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [queueing, setQueueing] = useState(false)

  const handleExpand = useCallback(async () => {
    const willExpand = !expanded
    setExpanded(willExpand)

    if (willExpand && videos.length === 0) {
      setVideosLoading(true)
      try {
        const fetched = await onRefreshVideos(playlist.playlist_id)
        setVideos(fetched)
      } finally {
        setVideosLoading(false)
      }
    }
  }, [expanded, videos.length, onRefreshVideos, playlist.playlist_id])

  const handleRefresh = useCallback(async () => {
    setVideosLoading(true)
    try {
      const fetched = await onRefreshVideos(playlist.playlist_id)
      setVideos(fetched)
      setSelectedIds(new Set())
    } finally {
      setVideosLoading(false)
    }
  }, [onRefreshVideos, playlist.playlist_id])

  const handleQueue = useCallback(async () => {
    const selected = videos.filter(v => selectedIds.has(v.video_id))
    if (selected.length === 0) return

    setQueueing(true)
    try {
      await onQueueVideos(selected, playlist.id)
      setSelectedIds(new Set())
    } finally {
      setQueueing(false)
    }
  }, [videos, selectedIds, onQueueVideos, playlist.id])

  const queueableVideos = videos.filter(v => v.status !== 'completed')
  const allQueueableSelected = queueableVideos.length > 0 && queueableVideos.every(v => selectedIds.has(v.video_id))

  const handleSelectAll = useCallback(() => {
    if (allQueueableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(queueableVideos.map(v => v.video_id)))
    }
  }, [allQueueableSelected, queueableVideos])

  const currentSettings: PlaylistSettings = {
    extraction_mode: playlist.extraction_mode,
    anchor_emphasis: playlist.anchor_emphasis,
    linked_anchor_ids: playlist.linked_anchor_ids ?? [],
    custom_instructions: playlist.custom_instructions,
  }

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: `1px solid ${expanded ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        borderRadius: 12,
        transition: 'border-color 0.15s ease',
        overflow: 'hidden',
      }}
    >
      {/* Header (collapsed view) */}
      <div
        className="flex items-center justify-between cursor-pointer"
        style={{ padding: '14px 20px' }}
        onClick={handleExpand}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-hover)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          {/* Playlist emoji */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--color-semantic-red-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ▶
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display font-bold"
              style={{
                fontSize: 14,
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {playlist.playlist_name || playlist.playlist_id}
            </div>
            <div className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              {playlist.known_video_count} videos
              {playlist.synapse_code && ` · ${playlist.synapse_code}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-1">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: playlist.is_active
                  ? 'var(--color-semantic-green-500)'
                  : 'var(--color-text-secondary)',
              }}
            />
            <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
              {playlist.is_active ? 'Active' : 'Paused'}
            </span>
          </div>

          {/* Chevron */}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'transform 0.2s ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
          {/* Video List */}
          <SectionLabel>Videos</SectionLabel>

          {videosLoading ? (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '12px 0' }}>
              Loading videos...
            </p>
          ) : videos.length === 0 ? (
            <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '12px 0' }}>
              No videos found. Try refreshing.
            </p>
          ) : (
            <>
              {/* Select all */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                style={{ padding: '6px 0', marginBottom: 4 }}
                onClick={handleSelectAll}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: allQueueableSelected ? 'var(--color-accent-500)' : 'var(--color-bg-inset)',
                    border: allQueueableSelected ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  {allQueueableSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="font-body font-semibold" style={{ fontSize: 11, color: 'var(--color-text-body)' }}>
                  Select all ({selectedIds.size} of {queueableVideos.length} selected)
                </span>
              </div>

              {/* Video list */}
              <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 12 }}>
                {videos.map(video => (
                  <VideoListItem
                    key={video.video_id}
                    video={video}
                    selected={selectedIds.has(video.video_id)}
                    onToggle={() => {
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(video.video_id)) next.delete(video.video_id)
                        else next.add(video.video_id)
                        return next
                      })
                    }}
                    disabled={video.status === 'completed'}
                  />
                ))}
              </div>

              {/* Add to Queue button */}
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleQueue}
                  disabled={queueing}
                  className="font-body font-semibold cursor-pointer"
                  style={{
                    fontSize: 12,
                    padding: '10px 20px',
                    borderRadius: 8,
                    background: 'var(--color-accent-500)',
                    border: 'none',
                    color: 'white',
                    width: '100%',
                    opacity: queueing ? 0.5 : 1,
                  }}
                >
                  {queueing ? 'Adding...' : `Add ${selectedIds.size} to Queue`}
                </button>
              )}
            </>
          )}

          {/* Playlist Settings */}
          <div style={{ marginTop: 20 }}>
            <PlaylistSettingsPanel
              settings={currentSettings}
              onSettingsChange={patch => onUpdateSettings(playlist.id, patch)}
            />
          </div>

          {/* Actions */}
          <div style={{ marginTop: 20 }}>
            <SectionLabel>Actions</SectionLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionButton
                icon={playlist.is_active ? <Pause size={12} /> : <Play size={12} />}
                label={playlist.is_active ? 'Pause' : 'Resume'}
                onClick={() => void onToggleStatus(playlist.id)}
              />
              <ActionButton
                icon={<RefreshCw size={12} />}
                label="Refresh Videos"
                onClick={handleRefresh}
              />

              {confirmDisconnect ? (
                <div className="flex items-center gap-2">
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-semantic-red-500)' }}>
                    Confirm?
                  </span>
                  <button
                    type="button"
                    onClick={async () => { await onDisconnect(playlist.id); setConfirmDisconnect(false) }}
                    className="font-body font-semibold cursor-pointer"
                    style={{
                      fontSize: 10,
                      padding: '4px 10px',
                      borderRadius: 5,
                      background: 'var(--color-semantic-red-500)',
                      border: 'none',
                      color: 'white',
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(false)}
                    className="font-body cursor-pointer"
                    style={{
                      fontSize: 10,
                      padding: '4px 10px',
                      borderRadius: 5,
                      background: 'var(--color-bg-inset)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(true)}
                  className="font-body font-semibold cursor-pointer flex items-center gap-1"
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-semantic-red-500)',
                  }}
                >
                  <Trash2 size={12} />
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-display font-bold"
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-text-secondary)',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-body font-semibold cursor-pointer flex items-center gap-1"
      style={{
        fontSize: 11,
        padding: '6px 12px',
        borderRadius: 6,
        background: 'var(--color-bg-inset)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--color-text-body)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
