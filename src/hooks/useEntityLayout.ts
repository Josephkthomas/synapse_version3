import { useMemo } from 'react'
import type { EntityNode } from '../types/explore'
import type { EntityEdge } from '../services/exploreQueries'

export interface EntityPosition {
  x: number
  y: number
  radius: number
}

/**
 * Computes entity node positions using a synchronous force simulation.
 * Custom physics — no d3 dependency. Matches useClusterLayout pattern.
 */
export function useEntityLayout(
  entities: EntityNode[],
  edges: EntityEdge[],
  width: number,
  height: number
): Map<string, EntityPosition> {
  return useMemo(() => {
    if (!entities.length || width === 0 || height === 0) return new Map()

    const maxConn = Math.max(...entities.map(e => e.connectionCount), 1)

    // Use a virtual canvas larger than the SVG — entities spread out and the camera scrolls in
    const vw = Math.max(width * 1.6, 900)
    const vh = Math.max(height * 1.6, 900)

    // Initialize nodes spread across the virtual canvas
    const nodes = entities.map(e => ({
      id: e.id,
      x: vw / 2 + (Math.random() - 0.5) * vw * 0.85,
      y: vh / 2 + (Math.random() - 0.5) * vh * 0.85,
      vx: 0,
      vy: 0,
      radius: 5 + Math.min(e.connectionCount / maxConn, 1) * 9,
    }))

    // Build adjacency for link forces
    const nodeById = new Map(nodes.map(n => [n.id, n]))
    const linkPairs = edges
      .map(e => ({ source: nodeById.get(e.sourceNodeId), target: nodeById.get(e.targetNodeId) }))
      .filter(l => l.source && l.target) as { source: typeof nodes[number]; target: typeof nodes[number] }[]

    // Run 280 ticks
    for (let tick = 0; tick < 280; tick++) {
      const damping = 0.85

      // 1. Very weak center gravity — keeps graph loosely centered without compressing it
      for (const n of nodes) {
        const dx = vw / 2 - n.x
        const dy = vh / 2 - n.y
        n.vx += dx * 0.0006
        n.vy += dy * 0.0006
      }

      // 2. Node-node repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = a.radius + b.radius + 30
          if (dist < minDist) {
            const force = (minDist - dist) * 0.08
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }
          // Longer range charge repulsion
          if (dist < 200) {
            const charge = 280 / (dist * dist)
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
        const force = (dist - idealDist) * 0.003
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

    // Boundary clamping — use virtual canvas bounds with padding
    for (const n of nodes) {
      const pad = 50
      n.x = Math.max(pad, Math.min(vw - pad, n.x))
      n.y = Math.max(pad, Math.min(vh - pad, n.y))
    }

    // Re-center the layout at the SVG center (width/2, height/2)
    // so downstream code (boundaryRadius, boundary ghost circle) works correctly
    let sumX = 0, sumY = 0
    for (const n of nodes) { sumX += n.x; sumY += n.y }
    const comX = sumX / nodes.length
    const comY = sumY / nodes.length
    const offsetX = width / 2 - comX
    const offsetY = height / 2 - comY
    for (const n of nodes) { n.x += offsetX; n.y += offsetY }

    const result = new Map<string, EntityPosition>()
    for (const n of nodes) {
      result.set(n.id, { x: n.x, y: n.y, radius: n.radius })
    }
    return result
  }, [entities, edges, width, height])
}
