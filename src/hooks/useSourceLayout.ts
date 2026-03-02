import { useMemo } from 'react'
import type { SourceNode, SourceEdge, SourceGraphAnchor } from '../types/explore'

export interface SourcePosition {
  x: number
  y: number
  radius: number
}

interface LayoutNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  isAnchor: boolean
}

/** Dot radius scales with entity count: min 10, max 28 */
function dotRadius(entityCount: number): number {
  if (entityCount <= 0) return 10
  return Math.min(10 + Math.sqrt(entityCount) * 2.5, 28)
}

const ANCHOR_RADIUS = 14

/**
 * Computes source + anchor node positions using a synchronous force simulation.
 * Tuned for very spacious layout that emphasizes connections.
 */
export function useSourceLayout(
  sources: SourceNode[],
  edges: SourceEdge[],
  width: number,
  height: number,
  anchors: SourceGraphAnchor[] = [],
): Map<string, SourcePosition> {
  return useMemo(() => {
    if ((!sources.length && !anchors.length) || width === 0 || height === 0) return new Map()

    const nodes: LayoutNode[] = [
      ...sources.map(s => ({
        id: s.id,
        x: width / 2 + (Math.random() - 0.5) * width * 0.7,
        y: height / 2 + (Math.random() - 0.5) * height * 0.7,
        vx: 0, vy: 0,
        radius: dotRadius(s.entityCount),
        isAnchor: false,
      })),
      ...anchors.map(a => ({
        id: a.id,
        x: width / 2 + (Math.random() - 0.5) * width * 0.4,
        y: height / 2 + (Math.random() - 0.5) * height * 0.4,
        vx: 0, vy: 0,
        radius: ANCHOR_RADIUS,
        isAnchor: true,
      })),
    ]

    const nodeById = new Map(nodes.map(n => [n.id, n]))

    const sourceLinks = edges
      .map(e => ({
        source: nodeById.get(e.fromSourceId),
        target: nodeById.get(e.toSourceId),
        strength: Math.min(e.totalWeight * 0.08, 0.6),
      }))
      .filter(l => l.source && l.target) as {
        source: LayoutNode; target: LayoutNode; strength: number
      }[]

    const anchorLinks: { source: LayoutNode; target: LayoutNode; strength: number }[] = []
    for (const a of anchors) {
      const anchorNode = nodeById.get(a.id)
      if (!anchorNode) continue
      for (const srcId of a.connectedSourceIds) {
        const srcNode = nodeById.get(srcId)
        if (srcNode) anchorLinks.push({ source: srcNode, target: anchorNode, strength: 0.3 })
      }
    }

    const allLinks = [...sourceLinks, ...anchorLinks]

    for (let tick = 0; tick < 250; tick++) {
      const damping = 0.82

      // 1. Center gravity
      for (const n of nodes) {
        const grav = n.isAnchor ? 0.004 : 0.0015
        n.vx += (width / 2 - n.x) * grav
        n.vy += (height / 2 - n.y) * grav
      }

      // 2. Node-node repulsion — very spacious
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1

          const minDist = (a.isAnchor || b.isAnchor) ? 120 : 100
          if (dist < minDist) {
            const force = (minDist - dist) * 0.09
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx -= fx; a.vy -= fy
            b.vx += fx; b.vy += fy
          }

          if (dist < 400) {
            const charge = 250 / (dist * dist)
            const fx = (dx / dist) * charge
            const fy = (dy / dist) * charge
            a.vx -= fx; a.vy -= fy
            b.vx += fx; b.vy += fy
          }
        }
      }

      // 3. Link attraction
      for (const link of allLinks) {
        const dx = link.target.x - link.source.x
        const dy = link.target.y - link.source.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const idealDist = 180
        const force = (dist - idealDist) * 0.003 * link.strength
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        link.source.vx += fx; link.source.vy += fy
        link.target.vx -= fx; link.target.vy -= fy
      }

      // 4. Apply velocities
      for (const n of nodes) {
        n.vx *= damping
        n.vy *= damping
        n.x += n.vx
        n.y += n.vy
      }
    }

    const pad = 50
    for (const n of nodes) {
      n.x = Math.max(pad, Math.min(width - pad, n.x))
      n.y = Math.max(pad, Math.min(height - pad, n.y))
    }

    const result = new Map<string, SourcePosition>()
    for (const n of nodes) {
      result.set(n.id, { x: n.x, y: n.y, radius: n.radius })
    }
    return result
  }, [sources, edges, width, height, anchors])
}
