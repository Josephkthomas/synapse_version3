export const EXTRACTION_MODES = [
  {
    id: 'comprehensive' as const,
    label: 'Comprehensive',
    description: 'Maximum entity capture, all relationships',
    color: 'var(--e-topic)',
    colorHex: '#0891b2',
  },
  {
    id: 'strategic' as const,
    label: 'Strategic',
    description: 'High-level concepts, decisions',
    color: 'var(--e-goal)',
    colorHex: '#e11d48',
  },
  {
    id: 'actionable' as const,
    label: 'Actionable',
    description: 'Actions, goals, blockers, deadlines',
    color: 'var(--e-action)',
    colorHex: '#2563eb',
  },
  {
    id: 'relational' as const,
    label: 'Relational',
    description: 'Emphasis on connections',
    color: 'var(--e-insight)',
    colorHex: '#7c3aed',
  },
] as const

export type ExtractionMode = typeof EXTRACTION_MODES[number]['id']

export const ANCHOR_EMPHASIS_LEVELS = [
  {
    id: 'passive' as const,
    label: 'Passive',
    description: 'Minimal anchor bias',
  },
  {
    id: 'standard' as const,
    label: 'Standard',
    description: 'Balanced (recommended)',
  },
  {
    id: 'aggressive' as const,
    label: 'Aggressive',
    description: 'Strong anchor focus',
  },
] as const

export type AnchorEmphasis = typeof ANCHOR_EMPHASIS_LEVELS[number]['id']
