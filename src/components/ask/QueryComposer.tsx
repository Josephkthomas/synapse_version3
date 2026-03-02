import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { MindsetSelector } from './MindsetSelector'
import { ScopeFilter } from './ScopeFilter'
import { ToolModeSelector } from './ToolModeSelector'
import { ModelSelector } from './ModelSelector'
import { QUERY_MINDSETS } from '../../config/queryMindsets'
import { TOOL_MODES } from '../../config/toolModes'
import type { QueryConfig, QueryMindsetId, ToolModeId, ModelTierId } from '../../types/rag'
import { useSettings } from '../../hooks/useSettings'

interface QueryComposerProps {
  config: QueryConfig
  isExpanded: boolean
  onToggleExpanded: () => void
  onSetMindset: (id: QueryMindsetId) => void
  onToggleScopeAnchor: (anchorId: string) => void
  onClearScope: () => void
  onSetToolMode: (id: ToolModeId) => void
  onSetModelTier: (id: ModelTierId) => void
}

function getSummaryText(config: QueryConfig, anchors: { id: string; label: string }[]): string {
  const mindsetLabel = QUERY_MINDSETS.find(m => m.id === config.mindset)?.label ?? 'Analytical'
  const toolLabel = TOOL_MODES.find(t => t.id === config.toolMode)?.label ?? 'Deep'
  const scopeLabel = config.scopeAnchors.length === 0
    ? 'All sources'
    : config.scopeAnchors
        .map(id => anchors.find(a => a.id === id)?.label)
        .filter(Boolean)
        .join(', ')
  return `${mindsetLabel} · ${toolLabel} · ${scopeLabel}`
}

export function QueryComposer({
  config,
  isExpanded,
  onToggleExpanded,
  onSetMindset,
  onToggleScopeAnchor,
  onClearScope,
  onSetToolMode,
  onSetModelTier,
}: QueryComposerProps) {
  const { anchors } = useSettings()
  const summaryText = getSummaryText(config, anchors)

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'height 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {isExpanded ? (
        /* Expanded toolbar */
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Row 1: Mindset + Model Selector */}
          <div className="flex items-start" style={{ gap: 16 }}>
            <div style={{ flex: 1 }}>
              <MindsetSelector value={config.mindset} onChange={onSetMindset} />
            </div>
            <div
              style={{
                borderLeft: '1px solid var(--border-subtle)',
                paddingLeft: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
              }}
            >
              <span
                className="font-display font-bold uppercase"
                style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}
              >
                MODEL
              </span>
              <ModelSelector value={config.modelTier} onChange={onSetModelTier} />
            </div>
          </div>

          {/* Row 2: Scope */}
          <ScopeFilter
            selectedAnchors={config.scopeAnchors}
            onToggleAnchor={onToggleScopeAnchor}
            onClearScope={onClearScope}
          />

          {/* Row 3: Retrieval + Collapse */}
          <div className="flex items-end" style={{ gap: 16 }}>
            <div style={{ flex: 1 }}>
              <ToolModeSelector value={config.toolMode} onChange={onSetToolMode} />
            </div>
            <button
              type="button"
              onClick={onToggleExpanded}
              className="font-body font-semibold cursor-pointer flex items-center shrink-0"
              style={{
                gap: 4,
                fontSize: 11,
                color: 'var(--color-accent-500)',
                background: 'none',
                border: 'none',
                padding: 0,
                marginBottom: 2,
              }}
            >
              Collapse <ChevronUp size={10} />
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed summary */
        <div
          className="flex items-center"
          style={{ padding: '0 16px', height: 36, gap: 8 }}
        >
          <Settings2 size={11} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
          <span
            className="font-body flex-1"
            style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {summaryText}
          </span>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="font-body font-semibold cursor-pointer flex items-center shrink-0"
            style={{
              gap: 3,
              fontSize: 11,
              color: 'var(--color-accent-500)',
              background: 'none',
              border: 'none',
              padding: 0,
            }}
          >
            Customize <ChevronDown size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
