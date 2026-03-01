import { useEffect, useState } from 'react'
import type { RAGPipelineStep } from '../../types/rag'

interface RAGProgressIndicatorProps {
  step: RAGPipelineStep
  chunkCount?: number
}

const STEP_LABELS: Record<RAGPipelineStep, string> = {
  embedding: 'Embedding query...',
  semantic_search: 'Searching source chunks...',
  keyword_search: 'Searching knowledge nodes...',
  graph_traversal: 'Traversing graph connections...',
  context_assembly: 'Assembling context...',
  generating: 'Generating response...',
}

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export function RAGProgressIndicator({ step, chunkCount }: RAGProgressIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex(i => (i + 1) % BRAILLE_FRAMES.length)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  let label = STEP_LABELS[step]
  if (step === 'semantic_search' && chunkCount) {
    label = `Searching ${chunkCount.toLocaleString()} source chunks...`
  }

  const frame = BRAILLE_FRAMES[frameIndex] ?? '⠋'

  return (
    <div
      className="flex items-center font-body"
      style={{
        gap: 8,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        maxWidth: '85%',
        padding: '10px 16px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px 14px 14px 4px',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{frame}</span>
      <span>{label}</span>
    </div>
  )
}
