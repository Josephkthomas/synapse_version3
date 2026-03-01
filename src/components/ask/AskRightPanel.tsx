import { useState } from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { MiniGraph } from '../explore/MiniGraph'
import { SourceChunkCard } from './SourceChunkCard'
import type { RAGResponseContext } from '../../types/rag'

interface AskRightPanelProps {
  context: RAGResponseContext
}

export function AskRightPanel({ context }: AskRightPanelProps) {
  const [showAllChunks, setShowAllChunks] = useState(false)

  const contextNodeIds = context.relatedNodes.map(n => n.id)
  const MAX_CHUNKS = 5
  const visibleChunks = showAllChunks
    ? context.sourceChunks
    : context.sourceChunks.slice(0, MAX_CHUNKS)
  const hasMore = context.sourceChunks.length > MAX_CHUNKS

  return (
    <div className="flex flex-col gap-5">
      {/* Related subgraph */}
      <div>
        <SectionLabel>Related Subgraph</SectionLabel>
        <div
          className="mt-2"
          style={{
            background: 'var(--color-bg-content)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <MiniGraph contextNodeIds={contextNodeIds} />
        </div>
        <p
          className="font-body mt-1.5"
          style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
        >
          {context.relatedNodes.length} nodes · {context.relatedEdges.length} relationships
        </p>
      </div>

      {/* Source chunks */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <SectionLabel>Source Chunks</SectionLabel>
          <span
            className="font-body"
            style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
          >
            ({context.sourceChunks.length} used)
          </span>
        </div>

        {context.sourceChunks.length === 0 ? (
          <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-placeholder)' }}>
            No source chunks were retrieved for this response.
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {visibleChunks.map(chunk => (
              <SourceChunkCard key={chunk.id} chunk={chunk} />
            ))}

            {hasMore && !showAllChunks && (
              <button
                type="button"
                onClick={() => setShowAllChunks(true)}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  textAlign: 'left',
                }}
              >
                Show all {context.sourceChunks.length} chunks
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
