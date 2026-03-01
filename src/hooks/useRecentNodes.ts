import { useState, useCallback } from 'react'
import type { KnowledgeNode } from '../types/database'

const MAX_RECENT = 5

export function useRecentNodes() {
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([])

  const addRecentNode = useCallback((node: KnowledgeNode) => {
    setRecentNodes(prev =>
      [node, ...prev.filter(n => n.id !== node.id)].slice(0, MAX_RECENT)
    )
  }, [])

  return { recentNodes, addRecentNode }
}
