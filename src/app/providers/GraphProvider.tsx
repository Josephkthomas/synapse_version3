import { createContext, useState, useCallback, type ReactNode } from 'react'
import type { RightPanelContent } from '../../types/panels'
import type { GraphScope, EntityDot } from '../../types/graph'

export interface GraphContextValue {
  rightPanelContent: RightPanelContent
  setRightPanelContent: (content: RightPanelContent) => void
  clearRightPanel: () => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  clearSelection: () => void
  // Graph tab state
  graphScope: GraphScope
  setGraphScope: (scope: GraphScope) => void
  expandedNodeId: string | null
  setExpandedNodeId: (id: string | null) => void
  expandedEntities: EntityDot[] | null
  setExpandedEntities: (entities: EntityDot[] | null) => void
}

export const GraphContext = createContext<GraphContextValue | null>(null)

export function GraphProvider({ children }: { children: ReactNode }) {
  const [rightPanelContent, setRightPanelContent] = useState<RightPanelContent>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [graphScope, setGraphScope] = useState<GraphScope>('overview')
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null)
  const [expandedEntities, setExpandedEntities] = useState<EntityDot[] | null>(null)

  const clearRightPanel = useCallback(() => setRightPanelContent(null), [])

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
    setRightPanelContent(null)
  }, [])

  return (
    <GraphContext.Provider value={{
      rightPanelContent,
      setRightPanelContent,
      clearRightPanel,
      selectedNodeId,
      setSelectedNodeId,
      clearSelection,
      graphScope,
      setGraphScope,
      expandedNodeId,
      setExpandedNodeId,
      expandedEntities,
      setExpandedEntities,
    }}>
      {children}
    </GraphContext.Provider>
  )
}
