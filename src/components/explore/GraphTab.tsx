import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraphContext } from '../../hooks/useGraphContext'
import { useGraphData } from '../../hooks/useGraphData'
import { fetchEntityCluster } from '../../services/graphQueries'
import { GraphCanvas } from './GraphCanvas'
import type { GraphScope, SimulationNode } from '../../types/graph'
import type { KnowledgeSource } from '../../types/database'
import { supabase } from '../../services/supabase'

const SCOPES: { key: GraphScope; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'anchors', label: 'Anchors Only' },
  { key: 'sources', label: 'Sources Only' },
]

// Overlay panel styling
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  background: 'rgba(255,255,255,0.95)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: 10,
  padding: '10px 14px',
  zIndex: 10,
  pointerEvents: 'none',
}

function StatsOverlay({ sourceCount, anchorCount, edgeCount }: {
  sourceCount: number; anchorCount: number; edgeCount: number
}) {
  return (
    <div style={{ ...overlayStyle, top: 16, right: 16 }}>
      {[
        { count: sourceCount, label: 'Sources' },
        { count: anchorCount, label: 'Anchors' },
        { count: edgeCount, label: 'Connections' },
      ].map(({ count, label }, i) => (
        <div
          key={label}
          className="flex items-center gap-1 font-body"
          style={{ fontSize: 11, color: 'var(--color-text-body)', marginBottom: i < 2 ? 6 : 0 }}
        >
          <span style={{ fontWeight: 700 }}>{count}</span>
          <span style={{ fontWeight: 400 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

function LegendOverlay() {
  return (
    <div style={{ ...overlayStyle, bottom: 16, left: 16 }}>
      {/* Source */}
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <svg width="12" height="8" viewBox="0 0 12 8">
          <rect x="0" y="0" width="12" height="8" rx="2"
            fill="rgba(100,100,100,0.2)" />
        </svg>
        <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-body)' }}>Source</span>
      </div>
      {/* Anchor */}
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="rgba(100,100,100,0.2)" />
        </svg>
        <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-body)' }}>Anchor</span>
      </div>
      {/* Edge weight */}
      <div className="flex items-center gap-2">
        <svg width="20" height="10" viewBox="0 0 20 10">
          <line x1="0" y1="3" x2="20" y2="3"
            stroke="rgba(100,100,100,0.3)" strokeWidth="1" />
          <line x1="0" y1="7" x2="20" y2="7"
            stroke="rgba(100,100,100,0.3)" strokeWidth="4" />
        </svg>
        <span className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
          Edge weight = shared entities
        </span>
      </div>
    </div>
  )
}

function EmptyState({ hasAnchors, hasSources }: { hasAnchors: boolean; hasSources: boolean }) {
  const navigate = useNavigate()

  let message = 'Your knowledge graph will appear here'
  let sub = 'Ingest your first source to get started'
  let showButton = true

  if (hasSources && !hasAnchors) {
    message = 'Sources ingested — no anchors yet'
    sub = 'Create anchors in Settings to see connections'
    showButton = false
  } else if (!hasSources && hasAnchors) {
    message = 'Anchors are ready'
    sub = 'Ingest sources to see them connect to your anchors'
    showButton = true
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ pointerEvents: 'none' }}
    >
      <p
        className="font-body"
        style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}
      >
        {message}
      </p>
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: showButton ? 16 : 0 }}
      >
        {sub}
      </p>
      {showButton && (
        <button
          type="button"
          onClick={() => navigate('/ingest')}
          className="font-body font-semibold rounded-md cursor-pointer"
          style={{
            fontSize: 12,
            padding: '6px 14px',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
            pointerEvents: 'all',
          }}
        >
          Go to Ingest →
        </button>
      )}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{ pointerEvents: 'none' }}
    >
      <p
        className="font-body"
        style={{ fontSize: 14, color: 'var(--color-text-body)', marginBottom: 10 }}
      >
        Failed to load graph data
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="font-body font-semibold rounded-md cursor-pointer"
        style={{
          fontSize: 12,
          padding: '6px 14px',
          background: 'var(--color-bg-inset)',
          border: '1px solid var(--border-default)',
          color: 'var(--color-text-body)',
          pointerEvents: 'all',
        }}
      >
        Retry
      </button>
    </div>
  )
}

export function GraphTab() {
  const {
    graphScope,
    setGraphScope,
    expandedNodeId,
    setExpandedNodeId,
    expandedEntities,
    setExpandedEntities,
    selectedNodeId,
    setSelectedNodeId,
    setRightPanelContent,
    clearRightPanel,
  } = useGraphContext()

  const { data, loading, error, refetch } = useGraphData(graphScope)

  const handleScopeChange = useCallback((scope: GraphScope) => {
    setGraphScope(scope)
    setExpandedNodeId(null)
    setExpandedEntities(null)
  }, [setGraphScope, setExpandedNodeId, setExpandedEntities])

  const handleClickNode = useCallback(async (node: SimulationNode) => {
    setSelectedNodeId(node.id)

    if (node.kind === 'anchor') {
      // Fetch the full KnowledgeNode for NodeDetail
      const { data: kn } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('id', node.id)
        .maybeSingle()
      if (kn) {
        setRightPanelContent({ type: 'node', data: kn as import('../../types/database').KnowledgeNode })
      }
    } else {
      // Fetch the full KnowledgeSource for SourceDetail
      const { data: ks } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', node.id)
        .maybeSingle()
      if (ks) {
        setRightPanelContent({ type: 'source', data: ks as KnowledgeSource })
      }
    }
  }, [setSelectedNodeId, setRightPanelContent])

  const handleExpandNode = useCallback(async (nodeId: string, kind: 'source' | 'anchor') => {
    if (expandedNodeId === nodeId) {
      setExpandedNodeId(null)
      setExpandedEntities(null)
      return
    }

    setExpandedNodeId(nodeId)
    setExpandedEntities(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const entities = await fetchEntityCluster(nodeId, kind, user.id)
      setExpandedEntities(entities)
    } catch (err) {
      console.warn('Entity cluster fetch failed:', err)
      setExpandedNodeId(null)
    }
  }, [expandedNodeId, setExpandedNodeId, setExpandedEntities])

  const handleClickEmpty = useCallback(() => {
    setSelectedNodeId(null)
    clearRightPanel()
  }, [setSelectedNodeId, clearRightPanel])

  const isEmpty = data && data.sources.length === 0 && data.anchors.length === 0
  const hasSources = (data?.sources.length ?? 0) > 0
  const hasAnchors = (data?.anchors.length ?? 0) > 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-content)' }}>
      {/* Scope selector bar */}
      <div
        className="flex items-center shrink-0 gap-3"
        style={{
          padding: '8px 16px',
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          className="font-display font-bold uppercase"
          style={{ fontSize: 10, letterSpacing: '0.08em', color: 'var(--color-text-secondary)' }}
        >
          SCOPE
        </span>

        <div className="flex items-center gap-1.5">
          {SCOPES.map(({ key, label }) => {
            const isActive = graphScope === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleScopeChange(key)}
                className="font-body font-semibold cursor-pointer"
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: `1px solid ${isActive ? 'var(--color-accent-500)' : 'var(--border-subtle)'}`,
                  background: isActive ? 'var(--color-accent-50)' : 'transparent',
                  color: isActive ? 'var(--color-accent-500)' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <span
          className="font-body"
          style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
        >
          Click to select · Double-click to expand
        </span>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: '#f7f7f7' }}
          >
            <span className="font-body text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Loading graph…
            </span>
          </div>
        )}

        {error && !loading && (
          <>
            <div style={{ background: '#f7f7f7', width: '100%', height: '100%' }} />
            <ErrorState onRetry={refetch} />
          </>
        )}

        {!loading && !error && data && (
          <>
            {isEmpty ? (
              <div style={{ background: '#f7f7f7', width: '100%', height: '100%' }}>
                <EmptyState hasSources={hasSources} hasAnchors={hasAnchors} />
              </div>
            ) : (
              <GraphCanvas
                data={data}
                scope={graphScope}
                expandedNodeId={expandedNodeId}
                selectedNodeId={selectedNodeId}
                expandedEntities={expandedEntities}
                onClickNode={handleClickNode}
                onExpandNode={handleExpandNode}
                onClickEmpty={handleClickEmpty}
              />
            )}

            {/* Stats overlay — always show when data loaded */}
            {data.stats && (
              <StatsOverlay
                sourceCount={data.stats.sourceCount}
                anchorCount={data.stats.anchorCount}
                edgeCount={data.stats.edgeCount}
              />
            )}

            {/* Legend overlay */}
            <LegendOverlay />
          </>
        )}
      </div>
    </div>
  )
}
