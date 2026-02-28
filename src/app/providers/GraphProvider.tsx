import { createContext, useState, useCallback, type ReactNode } from 'react'
import type { RightPanelContent } from '../../types/panels'

export interface GraphContextValue {
  rightPanelContent: RightPanelContent
  setRightPanelContent: (content: RightPanelContent) => void
  clearRightPanel: () => void
}

export const GraphContext = createContext<GraphContextValue | null>(null)

export function GraphProvider({ children }: { children: ReactNode }) {
  const [rightPanelContent, setRightPanelContent] = useState<RightPanelContent>(null)
  const clearRightPanel = useCallback(() => setRightPanelContent(null), [])

  return (
    <GraphContext.Provider value={{ rightPanelContent, setRightPanelContent, clearRightPanel }}>
      {children}
    </GraphContext.Provider>
  )
}
