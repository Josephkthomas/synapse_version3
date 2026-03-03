import { useMemo } from 'react'
import type { PipelineHistoryItem, PipelineMetrics } from '../types/pipeline'

export function usePipelineMetrics(items: PipelineHistoryItem[]): PipelineMetrics {
  return useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    const thisWeekItems = items.filter(i => now - new Date(i.createdAt).getTime() < weekMs)
    const lastWeekItems = items.filter(i => {
      const age = now - new Date(i.createdAt).getTime()
      return age >= weekMs && age < weekMs * 2
    })

    const completedThisWeek = thisWeekItems.filter(i => i.status === 'completed')
    const failedThisWeek = thisWeekItems.filter(i => i.status === 'failed')
    const activeItems = items.filter(i => i.status === 'pending' || i.status === 'processing' || i.status === 'extracting')

    const completedItems = items.filter(i => i.status === 'completed')
    const durations = completedItems.map(i => i.duration).filter(d => d > 0)
    const ratedItems = completedItems.filter(i => i.rating !== null)

    const sourcesThisWeek = thisWeekItems.filter(i => i.status !== 'pending' && i.status !== 'processing').length
    const sourcesLastWeek = lastWeekItems.filter(i => i.status !== 'pending' && i.status !== 'processing').length

    const entitiesThisWeek = completedThisWeek.reduce((sum, i) => sum + i.entityCount, 0)
    const avgEntitiesPerSource = completedItems.length > 0
      ? Math.round(completedItems.reduce((sum, i) => sum + i.entityCount, 0) / completedItems.length)
      : 0

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0

    const totalThisWeek = completedThisWeek.length + failedThisWeek.length
    const successRate = totalThisWeek > 0
      ? Math.round((completedThisWeek.length / totalThisWeek) * 100)
      : 100

    const avgRating = ratedItems.length > 0
      ? ratedItems.reduce((sum, i) => sum + (i.rating ?? 0), 0) / ratedItems.length
      : 0

    return {
      sourcesThisWeek,
      sourcesLastWeek,
      entitiesThisWeek,
      avgEntitiesPerSource,
      avgDuration,
      fastestDuration: durations.length > 0 ? Math.min(...durations) : 0,
      slowestDuration: durations.length > 0 ? Math.max(...durations) : 0,
      successRate,
      failedThisWeek: failedThisWeek.length,
      avgRating,
      ratedCount: ratedItems.length,
      activeProcessing: activeItems.length,
    }
  }, [items])
}
