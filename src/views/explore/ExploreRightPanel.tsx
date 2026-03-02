import { NodeDetailPanel } from '../../components/explore/NodeDetailPanel'
import { ClusterDetailPanel } from '../../components/explore/ClusterDetailPanel'
import { SourceDetailPanel } from '../../components/explore/SourceDetailPanel'
import type { ExploreRightPanelContent, ClusterData, SourceNode, SourceEdge } from '../../types/explore'

interface ExploreRightPanelProps {
  content: ExploreRightPanelContent
  clusters: ClusterData[]
  // Entity navigation
  onNavigateToEntity: (entityId: string) => void
  onNavigateToCluster: (clusterId: string) => void
  // Source navigation
  allSources?: SourceNode[]
  sourceEdges?: SourceEdge[]
  onNavigateToSource?: (sourceId: string) => void
  onPivotToEntity?: (entityId: string) => void
  onViewInEntityGraph?: () => void
  // Common
  onClose: () => void
  onEntityUpdated: () => void
}

export function ExploreRightPanel({
  content,
  clusters,
  onNavigateToEntity,
  onNavigateToCluster,
  allSources,
  sourceEdges,
  onNavigateToSource,
  onPivotToEntity,
  onViewInEntityGraph,
  onClose,
  onEntityUpdated,
}: ExploreRightPanelProps) {
  if (!content) return null

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        background: 'var(--color-bg-card)',
        borderLeft: '1px solid var(--border-subtle)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {content.type === 'node' && (
        <NodeDetailPanel
          entity={content.data}
          clusters={clusters}
          onNavigateToEntity={onNavigateToEntity}
          onClose={onClose}
          onEntityUpdated={onEntityUpdated}
        />
      )}

      {content.type === 'cluster' && (
        <ClusterDetailPanel
          cluster={content.data}
          allClusters={clusters}
          onNavigateToCluster={onNavigateToCluster}
          onClose={onClose}
        />
      )}

      {content.type === 'source' && (
        <SourceDetailPanel
          source={content.data}
          allSources={allSources ?? []}
          sourceEdges={sourceEdges ?? []}
          onNavigateToSource={onNavigateToSource ?? (() => {})}
          onPivotToEntity={onPivotToEntity ?? (() => {})}
          onViewInEntityGraph={onViewInEntityGraph ?? (() => {})}
          onClose={onClose}
        />
      )}
    </div>
  )
}
