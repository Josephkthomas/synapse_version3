import { useMemo } from 'react'
import type { FeedItem } from '../types/feed'

export interface RecentConnection {
  fromSourceTitle: string
  entityLabel: string
  toSourceTitle: string
}

export function useRecentCrossConnection(feedItems: FeedItem[]): {
  connection: RecentConnection | null
} {
  const connection = useMemo(() => {
    for (const item of feedItems) {
      if (item.crossConnections.length > 0) {
        const cc = item.crossConnections[0]
        if (!cc) continue
        return {
          fromSourceTitle:
            item.source.title ?? item.source.source_type ?? 'a source',
          entityLabel: cc.fromLabel,
          toSourceTitle: cc.toSourceTitle ?? 'another source',
        }
      }
    }
    return null
  }, [feedItems])

  return { connection }
}
