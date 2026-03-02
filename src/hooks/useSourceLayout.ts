import { useMemo } from 'react'
import type { SourceNode, SourceEdge } from '../types/explore'

export interface SourcePosition {
  x: number
  y: number
}

/**
 * Computes source node positions using a synchronous force simulation.
 * Custom physics — no d3 dependency. Matches useEntityLayout pattern.
 */
export function useSourceLayout(
  sources: SourceNode[],
  edges: SourceEdge[],
  width: number,
  height: number
): Map<string, SourcePosition> {
  return useMemo(() => {
    if (!sources.length || width === 0 || height === 0) return new Map()

    // Initialize nodes with random positions
    const nodes = sources.map(s => ({
      id: s.id,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }))

    // Build adjacency for link forces
    const nodeById = new Map(nodes.map(n => [n.id, n]))
    const linkPairs = edges
      .map(e => ({
        source: nodeById.get(e.fromSourceId),
        target: nodeById.get(e.toSourceId),
        strength: Math.min(e.sharedEntityCount * 0.15, 0.6),
      }))
      .filter(l => l.source && l.target) as {
        source: (typeof nodes)[number]
        target: (typeof nodes)[number]
        strength: number
      }[]

    // Run 150 ticks
    for (let tick = 0; tick < 150; tick++) {
      const damping = 0.85

      // 1. Center gravity
      for (const n of nodes) {
        const dx = width / 2 - n.x
        const dy = height / 2 - n.y
        n.vx += dx * 0.004
        n.vy += dy * 0.004
      }

      // 2. Node-node repulsion (source cards are ~180x52, use larger collision radius)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          // Collision avoidance — cards are wider than circles
          const minDist = 120
          if (dist < minDist) {
            const force = (minDist - dist) * 0.05
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }

          // Longer range charge repulsion
          if (dist < 200) {
            const charge = 120 / (dist * dist)
            const fx = (dx / dist) * charge
            const fy = (dy / dist) * charge
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }
        }
      }

      // 3. Link attraction
      for (const link of linkPairs) {
        const dx = link.target.x - link.source.x
        const dy = link.target.y - link.source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const idealDist = 160
        const force = (dist - idealDist) * 0.003 * link.strength
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        link.source.vx += fx
        link.source.vy += fy
        link.target.vx -= fx
        link.target.vy -= fy
      }

      // 4. Apply velocities with damping
      for (const n of nodes) {
        n.vx *= damping
        n.vy *= damping
        n.x += n.vx
        n.y += n.vy
      }
    }

    // Boundary clamping — account for card dimensions
    for (const n of nodes) {
      n.x = Math.max(100, Math.min(width - 100, n.x))
      n.y = Math.max(40, Math.min(height - 40, n.y))
    }

    const result = new Map<string, SourcePosition>()
    for (const n of nodes) {
      result.set(n.id, { x: n.x, y: n.y })
    }
    return result
  }, [sources, edges, width, height])
}
