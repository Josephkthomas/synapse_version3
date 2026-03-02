import { useState } from 'react'
import type { QueryConfig, QueryMindsetId, ToolModeId, ModelTierId } from '../types/rag'
import { DEFAULT_QUERY_CONFIG } from '../types/rag'

export function useQueryComposer() {
  const [config, setConfig] = useState<QueryConfig>(DEFAULT_QUERY_CONFIG)
  const [isExpanded, setIsExpanded] = useState(false)

  const setMindset = (mindset: QueryMindsetId) =>
    setConfig(prev => ({ ...prev, mindset }))

  const toggleScopeAnchor = (anchorId: string) =>
    setConfig(prev => ({
      ...prev,
      scopeAnchors: prev.scopeAnchors.includes(anchorId)
        ? prev.scopeAnchors.filter(id => id !== anchorId)
        : [...prev.scopeAnchors, anchorId],
    }))

  const clearScope = () =>
    setConfig(prev => ({ ...prev, scopeAnchors: [] }))

  const setToolMode = (toolMode: ToolModeId) =>
    setConfig(prev => ({ ...prev, toolMode }))

  const setModelTier = (modelTier: ModelTierId) =>
    setConfig(prev => ({ ...prev, modelTier }))

  const toggleExpanded = () => setIsExpanded(prev => !prev)

  return {
    config,
    isExpanded,
    setMindset,
    toggleScopeAnchor,
    clearScope,
    setToolMode,
    setModelTier,
    toggleExpanded,
  }
}
