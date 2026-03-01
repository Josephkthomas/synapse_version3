import type { KnowledgeNode } from './database'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
}

export interface CommandPaletteItem {
  id: string
  label: string
  type: string
  category: 'Anchors' | 'Recent' | 'Nodes' | 'Navigation'
  nodeData?: KnowledgeNode
  action: () => void
}
