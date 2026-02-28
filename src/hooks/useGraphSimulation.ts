import { useRef, useEffect } from 'react'
import type { GraphData, GraphScope, SimulationNode, SimulationEdge } from '../types/graph'

const GOLDEN_ANGLE = 2.39996322972865

function computeRadius(
  kind: 'source' | 'anchor',
  count: number,
  minCount: number,
  maxCount: number
): number {
  const range = maxCount - minCount || 1
  const t = (count - minCount) / range
  if (kind === 'source') return 26 + t * 6  // 26–32
  return 20 + t * 6                          // 20–26
}

export function useGraphSimulation(
  data: GraphData | null,
  scope: GraphScope,
  canvasWidth: number,
  canvasHeight: number
): {
  nodesRef: React.MutableRefObject<SimulationNode[]>
  edgesRef: React.MutableRefObject<SimulationEdge[]>
  tick: () => void
  resetPositions: () => void
} {
  const nodesRef = useRef<SimulationNode[]>([])
  const edgesRef = useRef<SimulationEdge[]>([])

  const initPositions = () => {
    if (!data) return

    const sources = data.sources
    const anchors = data.anchors

    const minEntityCount = Math.min(...sources.map(s => s.entityCount), 0)
    const maxEntityCount = Math.max(...sources.map(s => s.entityCount), 1)
    const minConnCount = Math.min(...anchors.map(a => a.connectionCount), 0)
    const maxConnCount = Math.max(...anchors.map(a => a.connectionCount), 1)

    const simNodes: SimulationNode[] = []

    if (scope === 'overview') {
      sources.forEach((s, i) => {
        const angle = i * GOLDEN_ANGLE
        simNodes.push({
          id: s.id,
          kind: 'source',
          x: canvasWidth * 0.3 + Math.cos(angle) * canvasWidth * 0.18,
          y: canvasHeight * 0.5 + Math.sin(angle) * canvasHeight * 0.25,
          vx: 0, vy: 0,
          radius: computeRadius('source', s.entityCount, minEntityCount, maxEntityCount),
          label: s.label,
          color: s.color,
          sourceType: s.sourceType,
          icon: s.icon,
          entityCount: s.entityCount,
          metadata: s.metadata,
          createdAt: s.createdAt,
        })
      })
      anchors.forEach((a, i) => {
        const angle = i * GOLDEN_ANGLE
        simNodes.push({
          id: a.id,
          kind: 'anchor',
          x: canvasWidth * 0.7 + Math.cos(angle) * canvasWidth * 0.15,
          y: canvasHeight * 0.4 + Math.sin(angle) * canvasHeight * 0.25,
          vx: 0, vy: 0,
          radius: computeRadius('anchor', a.connectionCount, minConnCount, maxConnCount),
          label: a.label,
          color: a.color,
          entityType: a.entityType,
          connectionCount: a.connectionCount,
          description: a.description,
          confidence: a.confidence,
        })
      })
    } else if (scope === 'anchors') {
      anchors.forEach((a, i) => {
        const angle = i * GOLDEN_ANGLE
        simNodes.push({
          id: a.id,
          kind: 'anchor',
          x: canvasWidth * 0.5 + Math.cos(angle) * canvasWidth * 0.3,
          y: canvasHeight * 0.5 + Math.sin(angle) * canvasHeight * 0.3,
          vx: 0, vy: 0,
          radius: computeRadius('anchor', a.connectionCount, minConnCount, maxConnCount),
          label: a.label,
          color: a.color,
          entityType: a.entityType,
          connectionCount: a.connectionCount,
          description: a.description,
          confidence: a.confidence,
        })
      })
    } else {
      // sources scope
      sources.forEach((s, i) => {
        const angle = i * GOLDEN_ANGLE
        simNodes.push({
          id: s.id,
          kind: 'source',
          x: canvasWidth * 0.5 + Math.cos(angle) * canvasWidth * 0.3,
          y: canvasHeight * 0.5 + Math.sin(angle) * canvasHeight * 0.3,
          vx: 0, vy: 0,
          radius: computeRadius('source', s.entityCount, minEntityCount, maxEntityCount),
          label: s.label,
          color: s.color,
          sourceType: s.sourceType,
          icon: s.icon,
          entityCount: s.entityCount,
          metadata: s.metadata,
          createdAt: s.createdAt,
        })
      })
    }

    nodesRef.current = simNodes
    edgesRef.current = data.edges.map(e => ({ sourceId: e.sourceId, anchorId: e.anchorId, weight: e.weight }))
  }

  // Re-initialize when data or canvas size changes
  useEffect(() => {
    initPositions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, canvasWidth, canvasHeight])

  const tick = () => {
    const nodes = nodesRef.current
    const edges = edgesRef.current
    const n = nodes.length

    // 1. Damping + random drift
    for (const node of nodes) {
      node.vx *= 0.96
      node.vy *= 0.96
      node.vx += (Math.random() - 0.5) * 0.08
      node.vy += (Math.random() - 0.5) * 0.08
    }

    // 2. Node-node repulsion (cap at 200 nodes for performance)
    const maxPairs = Math.min(n, 200)
    for (let i = 0; i < maxPairs; i++) {
      for (let j = i + 1; j < maxPairs; j++) {
        const a = nodes[i]
        const b = nodes[j]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const repelDist = 120
        if (dist < repelDist) {
          const force = (repelDist - dist) * 0.003
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx -= fx
          a.vy -= fy
          b.vx += fx
          b.vy += fy
        }
      }
    }

    // 3. Edge spring forces
    const nodeById = new Map<string, SimulationNode>()
    for (const node of nodes) nodeById.set(node.id, node)

    for (const edge of edges) {
      // In overview: sourceId/anchorId are real source/anchor IDs
      // In anchors scope: edge.sourceId and edge.anchorId are both anchor IDs
      // In sources scope: edge.sourceId and edge.anchorId are both source IDs
      const a = nodeById.get(edge.sourceId)
      const b = nodeById.get(edge.anchorId)
      if (!a || !b) continue

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const idealDist = 180
      const force = (dist - idealDist) * 0.0008
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }

    // 4. Boundary constraints + position update
    for (const node of nodes) {
      const pad = node.radius + 10
      if (node.x < pad) node.vx += 0.3
      if (node.x > canvasWidth - pad) node.vx -= 0.3
      if (node.y < pad) node.vy += 0.3
      if (node.y > canvasHeight - pad) node.vy -= 0.3

      node.x += node.vx
      node.y += node.vy
    }
  }

  const resetPositions = () => {
    initPositions()
  }

  return { nodesRef, edgesRef, tick, resetPositions }
}
