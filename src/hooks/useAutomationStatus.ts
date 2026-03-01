import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { AutomationSummary, YouTubeChannel, ScanHistoryEntry } from '../types/automate'
import type { YouTubePlaylist } from '../types/youtube'
import {
  getAutomationSummary,
  getYouTubeChannels,
  getConnectedPlaylists,
  getScanHistory,
} from '../services/supabase'

export interface UseAutomationStatusReturn {
  summary: AutomationSummary | null
  channels: YouTubeChannel[]
  playlists: YouTubePlaylist[]
  scanHistory: ScanHistoryEntry[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAutomationStatus(): UseAutomationStatusReturn {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AutomationSummary | null>(null)
  const [channels, setChannels] = useState<YouTubeChannel[]>([])
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const [summaryResult, channelsResult, playlistsResult, historyResult] = await Promise.all([
        getAutomationSummary(user.id),
        getYouTubeChannels(user.id),
        getConnectedPlaylists(user.id),
        getScanHistory(user.id),
      ])

      setSummary(summaryResult)
      setChannels(channelsResult)
      setPlaylists(playlistsResult)
      setScanHistory(historyResult)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load automation status'
      setError(msg)
      console.warn('[useAutomationStatus]', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    summary,
    channels,
    playlists,
    scanHistory,
    isLoading,
    error,
    refresh: fetchAll,
  }
}
