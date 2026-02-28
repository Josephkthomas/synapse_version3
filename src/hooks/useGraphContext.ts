import { useContext } from 'react'
import { GraphContext } from '../app/providers/GraphProvider'

export function useGraphContext() {
  const context = useContext(GraphContext)
  if (context === null) {
    throw new Error('useGraphContext must be used within a GraphProvider')
  }
  return context
}
