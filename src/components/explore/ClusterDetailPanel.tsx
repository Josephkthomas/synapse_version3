import { X } from 'lucide-react'
import { getEntityColor } from '../../config/entityTypes'
import type { ClusterData } from '../../types/explore'

interface ClusterDetailPanelProps {
  cluster: ClusterData
  allClusters: ClusterData[]
  onNavigateToCluster: (clusterId: string) => void
  onClose: () => void
}

export function ClusterDetailPanel({
  cluster,
  allClusters,
  onNavigateToCluster,
  onClose,
}: ClusterDetailPanelProps) {
  const color = getEntityColor(cluster.anchor.entityType)

  // Find connected clusters via cross-cluster edges
  const connectedClusters = cluster.crossClusterEdges
    .map(edge => {
      const target = allClusters.find(c => c.anchor.id === edge.targetClusterId)
      if (!target) return null
      return { cluster: target, weight: edge.totalWeight, shared: edge.sharedEntityCount }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.weight - a.weight)

  return (
    <div
      className="flex flex-col h-full"
      style={{
        overflowY: 'auto',
        padding: 24,
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer self-end"
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          color: 'var(--color-text-secondary)',
          marginBottom: 8,
        }}
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            flex: 1,
          }}
        >
          {cluster.anchor.label}
        </span>
      </div>

      {/* Type badge */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 600,
          color,
          background: `${color}14`,
          padding: '3px 8px',
          borderRadius: 6,
          display: 'inline-block',
          marginBottom: 16,
          alignSelf: 'flex-start',
        }}
      >
        Cluster · {cluster.anchor.entityType}
      </span>

      {/* Description */}
      {cluster.anchor.description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--color-text-body)',
            lineHeight: 1.6,
            marginBottom: 16,
          }}
        >
          {cluster.anchor.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex gap-4" style={{ marginBottom: 20 }}>
        <StatBlock label="Entities" value={cluster.entityCount} />
        <StatBlock label="Types" value={cluster.typeDistribution.length} />
        <StatBlock label="Connections" value={connectedClusters.length} />
      </div>

      {/* Type Distribution */}
      <SectionLabel>TYPE DISTRIBUTION</SectionLabel>
      <div className="flex flex-col gap-1.5" style={{ marginBottom: 20 }}>
        {cluster.typeDistribution.map(t => (
          <div key={t.entityType} className="flex items-center gap-2">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: getEntityColor(t.entityType),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                color: 'var(--color-text-body)',
                flex: 1,
              }}
            >
              {t.entityType}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              {t.count}
            </span>
            <div
              style={{
                width: 60,
                height: 4,
                borderRadius: 2,
                background: 'var(--color-bg-inset)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${t.percentage * 100}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: getEntityColor(t.entityType),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Connected Clusters */}
      {connectedClusters.length > 0 && (
        <>
          <SectionLabel>CONNECTED CLUSTERS ({connectedClusters.length})</SectionLabel>
          <div className="flex flex-col gap-1" style={{ marginBottom: 16 }}>
            {connectedClusters.map(({ cluster: target, weight, shared }) => (
              <button
                key={target.anchor.id}
                type="button"
                onClick={() => onNavigateToCluster(target.anchor.id)}
                className="flex items-center gap-2 w-full cursor-pointer font-body"
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  color: 'var(--color-text-body)',
                  background: 'none',
                  border: 'none',
                  borderRadius: 6,
                  textAlign: 'left',
                  transition: 'background 0.1s ease',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: getEntityColor(target.anchor.entityType),
                    flexShrink: 0,
                  }}
                />
                <span className="flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {target.anchor.label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    background: 'var(--color-bg-inset)',
                    padding: '1px 5px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {shared} shared · {weight} weight
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 8,
        display: 'block',
      }}
    >
      {children}
    </span>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col flex-1">
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          color: 'var(--color-text-secondary)',
        }}
      >
        {label}
      </span>
    </div>
  )
}
