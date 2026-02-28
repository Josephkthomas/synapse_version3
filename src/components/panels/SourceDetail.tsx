import { useEffect, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { SectionLabel } from '../ui/SectionLabel'
import { getEntityColor } from '../../config/entityTypes'
import { getSourceConfig } from '../../config/sourceTypes'
import { supabase, fetchNodeById, fetchCrossConnectionsForSource } from '../../services/supabase'
import { useGraphContext } from '../../hooks/useGraphContext'
import type { KnowledgeSource, KnowledgeNode } from '../../types/database'
import type { CrossConnection } from '../../types/feed'

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface SourceDetailProps {
  source: KnowledgeSource
  onClose?: () => void
}

export function SourceDetail({ source, onClose }: SourceDetailProps) {
  const { setRightPanelContent } = useGraphContext()
  const [entities, setEntities] = useState<KnowledgeNode[]>([])
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [crossConnections, setCrossConnections] = useState<CrossConnection[]>([])

  const cfg = getSourceConfig(source.source_type)

  useEffect(() => {
    setLoadingEntities(true)
    setEntities([])
    setCrossConnections([])

    supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type, confidence, created_at, description, is_anchor, user_id, source, source_type, source_url, source_id, tags, user_tags, quote')
      .eq('source_id', source.id)
      .order('confidence', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setEntities((data ?? []) as KnowledgeNode[])
        setLoadingEntities(false)
      })

    fetchCrossConnectionsForSource(source.id).then(setCrossConnections)
  }, [source.id])

  const handleEntityClick = async (nodeId: string) => {
    const node = await fetchNodeById(nodeId)
    if (node) setRightPanelContent({ type: 'node', data: node })
  }

  const handleCrossConnEntityClick = async (nodeId: string) => {
    const node = await fetchNodeById(nodeId)
    if (node) setRightPanelContent({ type: 'node', data: node })
  }

  const summary = (source.metadata as Record<string, unknown> | null)?.summary as string | null
  const contentPreview = source.content?.slice(0, 300) ?? null

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: cfg.color + '12',
              fontSize: 14,
            }}
          >
            {cfg.icon}
          </div>
          <h2
            className="font-display font-bold text-text-primary leading-tight truncate"
            style={{ fontSize: 14 }}
          >
            {source.title ?? 'Untitled Source'}
          </h2>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer hover:bg-bg-hover shrink-0"
            style={{ background: 'transparent', border: 'none', transition: 'background 0.15s ease' }}
            aria-label="Close"
          >
            <X size={14} style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        )}
      </div>

      {/* Metadata row */}
      <div className="font-body" style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
        {cfg.label}
        {source.created_at && (
          <>
            <span style={{ margin: '0 6px' }}>·</span>
            {formatRelativeTime(source.created_at)}
          </>
        )}
      </div>

      {/* Summary / content preview */}
      {(summary || contentPreview) && (
        <div>
          <SectionLabel>Summary</SectionLabel>
          <p
            className="font-body mt-2 leading-relaxed"
            style={{
              fontSize: 13,
              color: 'var(--color-text-body)',
              display: '-webkit-box',
              WebkitLineClamp: 6,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {summary ?? contentPreview}
          </p>
        </div>
      )}

      {/* Extracted entities */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <SectionLabel>Extracted Entities</SectionLabel>
          {!loadingEntities && entities.length > 0 && (
            <span
              className="font-body"
              style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
            >
              ({entities.length})
            </span>
          )}
        </div>

        {loadingEntities ? (
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="rounded-md animate-pulse"
                style={{ width: 60, height: 22, background: 'var(--color-bg-inset)' }}
              />
            ))}
          </div>
        ) : entities.length === 0 ? (
          <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-placeholder)' }}>
            No entities extracted yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {entities.map(entity => {
              const color = getEntityColor(entity.entity_type)
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => handleEntityClick(entity.id)}
                  className="inline-flex items-center gap-1 font-body font-semibold rounded cursor-pointer"
                  style={{
                    fontSize: 11,
                    padding: '3px 9px',
                    borderRadius: 5,
                    color,
                    backgroundColor: `${color}0f`,
                    border: `1px solid ${color}29`,
                    background: `${color}0f`,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: color,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  {entity.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cross-connections */}
      {crossConnections.length > 0 && (
        <div>
          <SectionLabel>Cross-Connections</SectionLabel>
          <div className="flex flex-col gap-1 mt-2">
            {crossConnections.map(cc => (
              <div
                key={cc.id}
                className="flex items-center flex-wrap"
                style={{ gap: '2px 3px' }}
              >
                <button
                  type="button"
                  onClick={() => handleCrossConnEntityClick(cc.fromNodeId)}
                  className="font-body font-medium cursor-pointer"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-accent-500)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  {cc.fromLabel}
                </button>
                <span
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}
                >
                  → {cc.relationType.replace(/_/g, ' ')} →
                </span>
                <button
                  type="button"
                  onClick={() => handleCrossConnEntityClick(cc.toNodeId)}
                  className="font-body font-medium cursor-pointer"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-accent-500)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  {cc.toLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-extract button */}
      <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          className="w-full font-body font-semibold rounded-md cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            fontSize: 12,
            padding: '7px 0',
            background: 'var(--color-bg-inset)',
            border: '1px solid var(--border-default)',
            color: 'var(--color-text-body)',
            opacity: 0.5,
          }}
          title="Available after extraction pipeline is built"
          disabled
        >
          <RefreshCw size={12} />
          Re-extract
        </button>
      </div>
    </div>
  )
}
