import { useMemo } from 'react'
import type { ClusterData } from '../types/explore'

interface LayoutCluster extends ClusterData {
  position: { cx: number; cy: number; r: number }
}

/**
 * Computes cluster bubble positions using a synchronous force simulation.
 * No d3 dependency — uses the same custom physics approach as useGraphSimulation.
 */
export function useClusterLayout(
  clusters: ClusterData[],
  width: number,
  height: number
): LayoutCluster[] {
  return useMemo(() => {
    if (!clusters.length || width === 0 || height === 0) return []

    const maxCount = Math.max(...clusters.map(c => c.entityCount), 1)
    const minR = 70
    const maxR = Math.min(width, height) * 0.22

    // Initialize node positions with slight randomness around center
    const nodes = clusters.map(c => ({
      ...c,
      x: width / 2 + (Math.random() - 0.5) * width * 0.4,
      y: height / 2 + (Math.random() - 0.5) * height * 0.4,
      vx: 0,
      vy: 0,
      r: minR + Math.sqrt(c.entityCount / maxCount) * (maxR - minR),
    }))

    // Run 120 ticks of force simulation synchronously
    for (let tick = 0; tick < 120; tick++) {
      const damping = 0.85

      // 1. Centering force — pull toward center
      for (const n of nodes) {
        const dx = width / 2 - n.x
        const dy = height / 2 - n.y
        n.vx += dx * 0.005
        n.vy += dy * 0.005
      }

      // 2. Repulsion between clusters
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!
          const b = nodes[j]!
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const minDist = a.r + b.r + 30 // 30px gap between bubbles
          if (dist < minDist) {
            const force = (minDist - dist) * 0.05
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx -= fx
            a.vy -= fy
            b.vx += fx
            b.vy += fy
          }
        }
      }

      // 3. Apply velocities with damping
      for (const n of nodes) {
        n.vx *= damping
        n.vy *= damping
        n.x += n.vx
        n.y += n.vy
      }
    }

    // Boundary clamping
    for (const n of nodes) {
      const pad = n.r + 20
      n.x = Math.max(pad, Math.min(width - pad, n.x))
      n.y = Math.max(pad, Math.min(height - pad, n.y))
    }

    return nodes.map(n => ({
      ...n,
      position: { cx: n.x, cy: n.y, r: n.r },
    }))
  }, [clusters, width, height])
}
