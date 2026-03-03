import { useRef } from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { SourceCard } from './SourceCard'
import { EntityChain } from './EntityChain'
import { ExploreButton } from './ExploreButton'
import type { RAGResponseContext, InlineCitation } from '../../types/rag'

interface AskRightPanelProps {
  context: RAGResponseContext
  highlightedCitationIndex?: number | null
  lastQuery?: string
}

export function AskRightPanel({ context, highlightedCitationIndex = null, lastQuery = '' }: AskRightPanelProps) {
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Get citation index for each chunk by matching source_id
  const getChunkCitationIndex = (chunk: { source_id: string }, allCitations: InlineCitation[]): number | undefined => {
    const match = allCitations.find(c => c.source_id === chunk.source_id)
    return match?.index
  }

  const totalMs = context.sourceChunks.length > 0 ? undefined : undefined

  return (
    <div className="flex flex-col h-full" style={{ position: 'relative' }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 16px 80px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h3
            className="font-display font-bold"
            style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}
          >
            Sources &amp; Context
          </h3>
          <p
            className="font-body"
            style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
          >
            {context.sourceChunks.length} sources · {context.relatedNodes.length} entities · {context.citations.length} citations
            {totalMs !== undefined ? ` · ${(totalMs / 1000).toFixed(1)}s` : ''}
          </p>
        </div>

        {/* Sources section */}
        {context.sourceChunks.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>SOURCES</SectionLabel>
            <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
              {(() => {
                let lastSourceId: string | null = null
                return context.sourceChunks.map((chunk, i) => {
                  const citIndex = getChunkCitationIndex(chunk, context.citations)
                  const isHighlighted = highlightedCitationIndex !== null && citIndex === highlightedCitationIndex
                  const isSameSource = lastSourceId === chunk.source_id
                  lastSourceId = chunk.source_id
                  return (
                    <div
                      key={chunk.id}
                      ref={el => {
                        if (el && citIndex !== undefined) cardRefs.current.set(citIndex, el)
                        else if (!el && citIndex !== undefined) cardRefs.current.delete(citIndex)
                      }}
                      data-chunk-index={i}
                    >
                      <SourceCard
                        chunk={chunk}
                        citationIndex={citIndex}
                        isHighlighted={isHighlighted}
                        isSameSourceAsPrevious={isSameSource}
                      />
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Entities section */}
        {context.relatedNodes.length > 0 && (
          <div style={{ marginBottom: 20, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <SectionLabel>ENTITIES</SectionLabel>
            <div className="flex flex-wrap" style={{ gap: 4, marginTop: 8 }}>
              {context.relatedNodes.slice(0, 20).map(node => (
                <span
                  key={node.id}
                  className="font-body font-medium"
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: 'var(--color-bg-inset)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-body)',
                  }}
                >
                  {node.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connections section */}
        {context.relatedEdges.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <SectionLabel>CONNECTIONS</SectionLabel>
            <div className="flex flex-col" style={{ gap: 6, marginTop: 8 }}>
              {(() => {
                const nodeMap = new Map(context.relatedNodes.map(n => [n.id, n.label]))
                return context.relatedEdges.slice(0, 15).map(edge => {
                  const from = nodeMap.get(edge.source_node_id)
                  const to = nodeMap.get(edge.target_node_id)
                  if (!from || !to) return null
                  return (
                    <EntityChain
                      key={edge.id}
                      path={{
                        from,
                        relation: edge.relation_type ?? 'relates_to',
                        to,
                        evidence: edge.evidence ?? undefined,
                      }}
                    />
                  )
                }).filter(Boolean)
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Explore button */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'var(--color-bg-content)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <ExploreButton context={context} queryText={lastQuery} />
      </div>
    </div>
  )
}
