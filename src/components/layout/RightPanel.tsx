import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Anchor, Clock, Sparkles } from 'lucide-react'
import { useGraphContext } from '../../hooks/useGraphContext'
import { useSettings } from '../../hooks/useSettings'
import { supabase } from '../../services/supabase'
import { Dot } from '../ui/Dot'
import { SectionLabel } from '../ui/SectionLabel'
import { NodeDetail } from '../panels/NodeDetail'
import { SourceDetail } from '../panels/SourceDetail'
import type { KnowledgeNode } from '../../types/database'

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

function QuickAccess() {
  const { anchors } = useSettings()
  const { setRightPanelContent } = useGraphContext()
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([])

  useEffect(() => {
    async function fetchRecent() {
      const { data } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setRecentNodes(data as KnowledgeNode[])
    }
    fetchRecent()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Anchors */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Anchor size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <SectionLabel>Anchors</SectionLabel>
        </div>

        {anchors.length === 0 ? (
          <p className="text-[11px] text-text-placeholder px-1">
            No anchors set. Promote nodes from the Explore view.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {anchors.map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                onClick={() => setRightPanelContent({ type: 'node', data: anchor })}
                className="flex items-center gap-2 w-full border-none cursor-pointer px-2 py-1.5 rounded-[7px] hover:bg-bg-hover"
                style={{ background: 'transparent', transition: 'background 0.15s ease' }}
              >
                <Dot type={anchor.entity_type} size={7} />
                <span className="font-body text-[12px] font-medium text-text-primary truncate flex-1 text-left">
                  {anchor.label}
                </span>
                <span className="font-body text-[10px] text-text-secondary shrink-0">
                  {anchor.entity_type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <SectionLabel>Recent</SectionLabel>
        </div>

        {recentNodes.length === 0 ? (
          <p className="text-[11px] text-text-placeholder px-1">
            No entities yet. Ingest your first source to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {recentNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setRightPanelContent({ type: 'node', data: node })}
                className="flex items-center gap-2 w-full border-none cursor-pointer px-2 py-1.5 rounded-[7px] hover:bg-bg-hover"
                style={{ background: 'transparent', transition: 'background 0.15s ease' }}
              >
                <Dot type={node.entity_type} size={5} />
                <span className="font-body text-[11px] text-text-secondary truncate flex-1 text-left">
                  {node.label}
                </span>
                <span className="font-body text-[10px] text-text-placeholder shrink-0">
                  {formatRelativeTime(node.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


function AskContextPlaceholder() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <SectionLabel>Related Subgraph</SectionLabel>
        </div>
        <div className="rounded-md p-4" style={{ background: 'var(--color-bg-inset)' }}>
          <p className="font-body text-[11px] text-text-placeholder leading-relaxed">
            Related subgraph will appear here when you ask a question.
          </p>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={12} style={{ color: 'var(--color-text-secondary)' }} />
          <SectionLabel>Source Chunks</SectionLabel>
        </div>
        <div className="rounded-md p-4" style={{ background: 'var(--color-bg-inset)' }}>
          <p className="font-body text-[11px] text-text-placeholder leading-relaxed">
            Source chunks used as context will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}

export function RightPanel() {
  const location = useLocation()
  const { rightPanelContent, clearRightPanel } = useGraphContext()
  const isAskView = location.pathname === '/ask'

  const renderContent = () => {
    if (isAskView && !rightPanelContent) {
      return <AskContextPlaceholder />
    }
    if (rightPanelContent?.type === 'node') {
      return <NodeDetail node={rightPanelContent.data} onClose={clearRightPanel} />
    }
    if (rightPanelContent?.type === 'source') {
      return <SourceDetail source={rightPanelContent.data} onClose={clearRightPanel} />
    }
    return <QuickAccess />
  }

  const panelTitle = () => {
    if (!rightPanelContent) return isAskView ? 'Context' : 'Quick Access'
    if (rightPanelContent.type === 'node') return 'Entity Detail'
    if (rightPanelContent.type === 'source') return 'Source Detail'
    return 'Detail'
  }

  return (
    <aside
      className="flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        width: 310,
        background: 'var(--color-bg-card)',
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="shrink-0 px-4 flex items-center"
        style={{
          height: 50,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span className="font-display text-[12px] font-bold text-text-secondary uppercase tracking-[0.06em]">
          {panelTitle()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 18px' }}>
        {renderContent()}
      </div>
    </aside>
  )
}
