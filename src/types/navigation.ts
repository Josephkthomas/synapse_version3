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
  category: 'Anchors' | 'Nodes' | 'Navigation'
  action: () => void
}
