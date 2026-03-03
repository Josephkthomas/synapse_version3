import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { AutomationSummary, ScanHistoryEntry } from '../types/automate'
import type { YouTubePlaylist } from '../types/youtube'
import {
  getAutomationSummary,
  getConnectedPlaylists,
  getScanHistory,
} from '../services/supabase'

export interface UseAutomationStatusReturn {
  summary: AutomationSummary | null
  playlists: YouTubePlaylist[]
  scanHistory: ScanHistoryEntry[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAutomationStatus(): UseAutomationStatusReturn {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AutomationSummary | null>(null)
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const [summaryResult, playlistsResult, historyResult] = await Promise.all([
        getAutomationSummary(user.id),
        getConnectedPlaylists(user.id),
        getScanHistory(user.id),
      ])

      setSummary(summaryResult)
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
    playlists,
    scanHistory,
    isLoading,
    error,
    refresh: fetchAll,
  }
}
