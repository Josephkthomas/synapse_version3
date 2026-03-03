import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../services/supabase'

interface BackfillLastRun {
  timestamp: string
  processed: number
  errors: number
}

interface BackfillStatus {
  totalSources: number
  missingSummaries: number
  isRunning: boolean
  lastRun: BackfillLastRun | null
  batchProgress: string | null
  backfillErrors: string[]
}

const LS_KEY_LAST_RUN = 'synapse_backfill_last_run'
const LS_KEY_LAST_PROCESSED = 'synapse_backfill_last_processed'
const LS_KEY_LAST_ERRORS = 'synapse_backfill_last_errors'

function readLastRun(): BackfillLastRun | null {
  try {
    const ts = localStorage.getItem(LS_KEY_LAST_RUN)
    const processed = localStorage.getItem(LS_KEY_LAST_PROCESSED)
    const errors = localStorage.getItem(LS_KEY_LAST_ERRORS)
    if (ts) {
      return {
        timestamp: ts,
        processed: parseInt(processed || '0', 10),
        errors: parseInt(errors || '0', 10),
      }
    }
  } catch { /* localStorage may be unavailable */ }
  return null
}

function writeLastRun(processed: number, errors: number) {
  try {
    localStorage.setItem(LS_KEY_LAST_RUN, new Date().toISOString())
    localStorage.setItem(LS_KEY_LAST_PROCESSED, String(processed))
    localStorage.setItem(LS_KEY_LAST_ERRORS, String(errors))
  } catch { /* noop */ }
}

export function useBackfillStatus() {
  const [totalSources, setTotalSources] = useState(0)
  const [missingSummaries, setMissingSummaries] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState<BackfillLastRun | null>(readLastRun)
  const [batchProgress, setBatchProgress] = useState<string | null>(null)
  const [backfillErrors, setBackfillErrors] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const fetchCounts = useCallback(async () => {
    const [totalRes, missingRes] = await Promise.all([
      supabase
        .from('knowledge_sources')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('knowledge_sources')
        .select('id', { count: 'exact', head: true })
        .is('summary', null),
    ])
    setTotalSources(totalRes.count ?? 0)
    setMissingSummaries(missingRes.count ?? 0)
  }, [])

  // Initial fetch + auto-refresh every 30s
  useEffect(() => {
    void fetchCounts()
    const interval = setInterval(() => void fetchCounts(), 30_000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  // Cleanup abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const triggerBackfill = useCallback(async (
    sourceType?: string
  ): Promise<{ processed: number; remaining: number; errors: string[] }> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('Not authenticated')

    const params = new URLSearchParams()
    params.set('batch_size', '15')
    if (sourceType && sourceType !== 'All') {
      params.set('source_type', sourceType)
    }

    const response = await fetch(
      `/api/summaries/backfill?${params.toString()}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
      throw new Error(err.error ?? `Backfill failed: ${response.status}`)
    }

    return await response.json() as { processed: number; remaining: number; errors: string[] }
  }, [])

  const runBackfill = useCallback(async (sourceType?: string) => {
    setIsRunning(true)
    setBackfillErrors([])
    setBatchProgress(null)

    try {
      const result = await triggerBackfill(sourceType)
      writeLastRun(result.processed, result.errors.length)
      setLastRun(readLastRun())
      if (result.errors.length > 0) setBackfillErrors(result.errors)
      await fetchCounts()
    } catch (err) {
      setBackfillErrors([err instanceof Error ? err.message : 'Unknown error'])
    } finally {
      setIsRunning(false)
      setBatchProgress(null)
    }
  }, [triggerBackfill, fetchCounts])

  const runFullBackfill = useCallback(async () => {
    setIsRunning(true)
    setBackfillErrors([])
    setBatchProgress('Starting...')

    const controller = new AbortController()
    abortRef.current = controller

    let totalProcessed = 0
    let batchNum = 0
    const allErrors: string[] = []

    try {
      let remaining = Infinity
      while (remaining > 0 && !controller.signal.aborted) {
        batchNum++
        setBatchProgress(`Processing batch ${batchNum}...`)

        const result = await triggerBackfill()
        totalProcessed += result.processed
        remaining = result.remaining
        allErrors.push(...result.errors)

        setMissingSummaries(remaining)
        setBatchProgress(`Batch ${batchNum} done · ${totalProcessed} processed · ${remaining} remaining`)

        if (result.processed === 0) break
      }

      writeLastRun(totalProcessed, allErrors.length)
      setLastRun(readLastRun())
      if (allErrors.length > 0) setBackfillErrors(allErrors)
      await fetchCounts()
    } catch (err) {
      if (!controller.signal.aborted) {
        setBackfillErrors(prev => [...prev, err instanceof Error ? err.message : 'Unknown error'])
      }
    } finally {
      setIsRunning(false)
      setBatchProgress(null)
      abortRef.current = null
    }
  }, [triggerBackfill, fetchCounts])

  const refresh = fetchCounts

  const status: BackfillStatus = {
    totalSources,
    missingSummaries,
    isRunning,
    lastRun,
    batchProgress,
    backfillErrors,
  }

  return { status, refresh, runBackfill, runFullBackfill }
}
