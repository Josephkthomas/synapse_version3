import { useState, useEffect, useMemo } from 'react'
import { useAuth } from './useAuth'
import { fetchHeatmapSessions, type HeatmapRawSession } from '../services/supabase'
import type { HeatmapCell } from '../types/pipeline'

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDayOfWeek(date: Date): number {
  // 0 = Monday, 6 = Sunday
  return (date.getDay() + 6) % 7
}

export function useHeatmapData() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<HeatmapRawSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchHeatmapSessions(user.id)
      .then(setSessions)
      .finally(() => setLoading(false))
  }, [user?.id])

  const { cells, maxCount } = useMemo(() => {
    // Build 13-week × 7-day grid
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find the Monday of the current week
    const currentDay = getDayOfWeek(today)
    const currentMonday = new Date(today)
    currentMonday.setDate(today.getDate() - currentDay)

    // Start date is 12 weeks before current Monday
    const startDate = new Date(currentMonday)
    startDate.setDate(currentMonday.getDate() - 12 * 7)

    // Group sessions by date
    const sessionsByDate: Record<string, HeatmapRawSession[]> = {}
    for (const s of sessions) {
      const key = getDateKey(new Date(s.created_at))
      if (!sessionsByDate[key]) sessionsByDate[key] = []
      sessionsByDate[key].push(s)
    }

    // Build grid cells
    const gridCells: HeatmapCell[] = []
    let max = 0

    for (let week = 0; week < 13; week++) {
      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(startDate)
        cellDate.setDate(startDate.getDate() + week * 7 + day)
        const key = getDateKey(cellDate)
        const daySessions = sessionsByDate[key] ?? []

        const count = daySessions.length
        if (count > max) max = count

        const entities = daySessions.reduce((sum, s) => sum + s.entity_count, 0)
        const relationships = daySessions.reduce((sum, s) => sum + s.relationship_count, 0)
        const durationsMs = daySessions.filter(s => s.extraction_duration_ms).map(s => s.extraction_duration_ms!)
        const avgDuration = durationsMs.length > 0
          ? durationsMs.reduce((sum, d) => sum + d, 0) / durationsMs.length / 1000
          : 0
        const failed = daySessions.filter(s => s.entity_count === 0 && s.extraction_duration_ms !== null).length

        // Source breakdown
        const sourceBreakdown: Record<string, number> = {}
        for (const s of daySessions) {
          const t = s.source_type ?? 'Unknown'
          sourceBreakdown[t] = (sourceBreakdown[t] ?? 0) + 1
        }

        gridCells.push({
          week,
          day,
          date: key,
          count,
          entities,
          relationships,
          avgConfidence: 0, // Would need node-level query; approximate
          avgDuration,
          failed,
          sourceBreakdown,
          entityBreakdown: {}, // Would need node query per day; defer
          confidenceBuckets: [0, 0, 0, 0, 0],
        })
      }
    }

    return { cells: gridCells, maxCount: max }
  }, [sessions])

  return { cells, loading, maxCount }
}
