export type SummarySource = 'extracted' | 'generated' | 'user' | 'truncated'

export interface SummaryResult {
  summary: string
  source: SummarySource
}
