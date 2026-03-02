export interface ToolMode {
  id: string
  label: string
  description: string
  icon: string
  pipelineOverrides: {
    chunkCount: number
    nodeCount: number
    traversalHops: number
    maxFrontier: number
    maxContextChunks: number
    maxNodeSummaries: number
    maxRelPaths: number
  }
}

export const TOOL_MODES: ToolMode[] = [
  {
    id: 'quick',
    label: 'Quick',
    description: 'Fast answer from top sources. Best for simple questions with clear answers.',
    icon: 'Zap',
    pipelineOverrides: {
      chunkCount: 5,
      nodeCount: 5,
      traversalHops: 1,
      maxFrontier: 10,
      maxContextChunks: 4,
      maxNodeSummaries: 8,
      maxRelPaths: 5,
    },
  },
  {
    id: 'deep',
    label: 'Deep',
    description: 'Thorough search with extended graph traversal. Best for complex or multi-faceted questions.',
    icon: 'Layers',
    pipelineOverrides: {
      chunkCount: 15,
      nodeCount: 15,
      traversalHops: 3,
      maxFrontier: 25,
      maxContextChunks: 10,
      maxNodeSummaries: 25,
      maxRelPaths: 20,
    },
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Chronological ordering of sources. Best for "what happened", "evolution of", temporal questions.',
    icon: 'Clock',
    pipelineOverrides: {
      chunkCount: 12,
      nodeCount: 10,
      traversalHops: 2,
      maxFrontier: 15,
      maxContextChunks: 8,
      maxNodeSummaries: 15,
      maxRelPaths: 10,
    },
  },
]

export const DEFAULT_TOOL_MODE_ID = 'deep'
