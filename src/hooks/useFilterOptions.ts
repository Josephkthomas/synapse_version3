import { useState, useEffect } from 'react'
import { ENTITY_TYPE_COLORS } from '../config/entityTypes'
import { getDistinctSourceTypes, getAllTags } from '../services/supabase'
import { useSettings } from './useSettings'
import type { KnowledgeNode } from '../types/database'

interface UseFilterOptionsReturn {
  entityTypes: Array<{ value: string; label: string }>
  sourceTypes: Array<{ value: string; label: string }>
  tags: Array<{ value: string; label: string }>
  anchors: KnowledgeNode[]
  isLoading: boolean
}

export function useFilterOptions(): UseFilterOptionsReturn {
  const { anchors } = useSettings()
  const [sourceTypes, setSourceTypes] = useState<Array<{ value: string; label: string }>>([])
  const [tags, setTags] = useState<Array<{ value: string; label: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDistinctSourceTypes(), getAllTags()])
      .then(([sources, allTags]) => {
        setSourceTypes(sources.map(s => ({ value: s, label: s })))
        setTags(allTags.map(t => ({ value: t, label: t })))
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  const entityTypes = Object.keys(ENTITY_TYPE_COLORS).map(type => ({
    value: type,
    label: type,
  }))

  return { entityTypes, sourceTypes, tags, anchors, isLoading }
}
