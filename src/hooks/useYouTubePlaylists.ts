import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import type { YouTubePlaylist, YouTubeVideo, QueueStats, PlaylistSettings } from '../types/youtube'
import {
  connectPlaylist as connectPlaylistDB,
  getConnectedPlaylists,
  updatePlaylistSettings as updatePlaylistSettingsDB,
  disconnectPlaylist as disconnectPlaylistDB,
  togglePlaylistStatus as togglePlaylistStatusDB,
  queueVideosForProcessing,
  getQueueStats,
} from '../services/supabase'
import { parsePlaylistUrl, fetchPlaylistMetadata, fetchPlaylistVideos } from '../services/youtube'

export interface UseYouTubePlaylistsReturn {
  playlists: YouTubePlaylist[]
  isLoading: boolean
  error: string | null
  queueStats: QueueStats
  connectPlaylist: (url: string) => Promise<void>
  disconnectPlaylist: (id: string) => Promise<void>
  toggleStatus: (id: string) => Promise<void>
  refreshVideos: (playlistId: string) => Promise<YouTubeVideo[]>
  queueVideos: (videos: YouTubeVideo[], playlistId: string) => Promise<number>
  updateSettings: (playlistId: string, settings: Partial<PlaylistSettings>) => void
}

const EMPTY_STATS: QueueStats = { pending: 0, processing: 0, completed: 0, failed: 0 }

export function useYouTubePlaylists(): UseYouTubePlaylistsReturn {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queueStats, setQueueStats] = useState<QueueStats>(EMPTY_STATS)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load playlists + queue stats on mount
  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    setIsLoading(true)
    Promise.all([
      getConnectedPlaylists(userId),
      getQueueStats(userId),
    ])
      .then(([playlistData, statsData]) => {
        setPlaylists(playlistData)
        setQueueStats(statsData)
      })
      .catch(err => {
        console.warn('[useYouTubePlaylists] Load failed:', err)
        setError('Failed to load playlists')
      })
      .finally(() => setIsLoading(false))
  }, [user?.id])

  const connectPlaylist = useCallback(async (url: string) => {
    if (!user?.id) return
    setError(null)

    const playlistId = parsePlaylistUrl(url)
    if (!playlistId) {
      setError('Invalid playlist URL. Please use a YouTube playlist link or playlist ID.')
      return
    }

    try {
      const metadata = await fetchPlaylistMetadata(playlistId)
      const created = await connectPlaylistDB(user.id, playlistId, url, metadata ?? undefined)
      setPlaylists(prev => [created, ...prev])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect playlist'
      setError(msg)
      throw err
    }
  }, [user?.id])

  const disconnectPlaylist = useCallback(async (id: string) => {
    try {
      await disconnectPlaylistDB(id)
      setPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect playlist'
      setError(msg)
    }
  }, [])

  const toggleStatus = useCallback(async (id: string) => {
    const playlist = playlists.find(p => p.id === id)
    if (!playlist) return

    const newIsActive = !playlist.is_active

    // Optimistic update
    setPlaylists(prev =>
      prev.map(p => (p.id === id ? { ...p, is_active: newIsActive } : p))
    )

    try {
      await togglePlaylistStatusDB(id, newIsActive)
    } catch (err) {
      // Revert on failure
      setPlaylists(prev =>
        prev.map(p => (p.id === id ? { ...p, is_active: playlist.is_active } : p))
      )
      const msg = err instanceof Error ? err.message : 'Failed to toggle playlist status'
      setError(msg)
    }
  }, [playlists])

  const refreshVideos = useCallback(async (playlistId: string): Promise<YouTubeVideo[]> => {
    try {
      return await fetchPlaylistVideos(playlistId)
    } catch (err) {
      console.warn('[useYouTubePlaylists] refreshVideos failed:', err)
      return []
    }
  }, [])

  const queueVideos = useCallback(async (
    videos: YouTubeVideo[],
    playlistId: string
  ): Promise<number> => {
    if (!user?.id) return 0

    try {
      const count = await queueVideosForProcessing(
        videos.map(v => ({
          video_id: v.video_id,
          video_title: v.video_title,
          video_url: v.video_url,
          thumbnail_url: v.thumbnail_url ?? undefined,
          published_at: v.published_at ?? undefined,
        })),
        playlistId,
        user.id
      )
      // Refresh stats after queueing
      const stats = await getQueueStats(user.id)
      setQueueStats(stats)
      return count
    } catch (err) {
      console.warn('[useYouTubePlaylists] queueVideos failed:', err)
      return 0
    }
  }, [user?.id])

  const updateSettings = useCallback((playlistId: string, settings: Partial<PlaylistSettings>) => {
    // Debounce 500ms per playlist
    const existing = debounceTimers.current.get(playlistId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(async () => {
      debounceTimers.current.delete(playlistId)
      try {
        await updatePlaylistSettingsDB(playlistId, settings)
        // Update local state
        setPlaylists(prev =>
          prev.map(p =>
            p.id === playlistId
              ? {
                  ...p,
                  extraction_mode: settings.extraction_mode ?? p.extraction_mode,
                  anchor_emphasis: settings.anchor_emphasis ?? p.anchor_emphasis,
                  linked_anchor_ids: settings.linked_anchor_ids ?? p.linked_anchor_ids,
                  custom_instructions: settings.custom_instructions !== undefined
                    ? settings.custom_instructions
                    : p.custom_instructions,
                }
              : p
          )
        )
      } catch (err) {
        console.warn('[useYouTubePlaylists] updateSettings failed:', err)
      }
    }, 500)

    debounceTimers.current.set(playlistId, timer)
  }, [])

  return {
    playlists,
    isLoading,
    error,
    queueStats,
    connectPlaylist,
    disconnectPlaylist,
    toggleStatus,
    refreshVideos,
    queueVideos,
    updateSettings,
  }
}
