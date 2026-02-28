import { useEffect, useRef, type RefObject } from 'react'
import type { SimulationNode } from '../types/graph'
import type { Camera } from './useGraphRenderer'

function hitTestNode(node: SimulationNode, wx: number, wy: number): boolean {
  if (node.kind === 'source') {
    return (
      Math.abs(wx - node.x) < node.radius * 1.4 &&
      Math.abs(wy - node.y) < node.radius * 0.8
    )
  }
  const dx = wx - node.x
  const dy = wy - node.y
  return Math.sqrt(dx * dx + dy * dy) < node.radius + 4
}

export function useGraphInteraction(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  nodesRef: React.MutableRefObject<SimulationNode[]>,
  hoveredNodeIdRef: React.MutableRefObject<string | null>,
  cameraRef: React.MutableRefObject<Camera>,
  onHover: (nodeId: string | null) => void,
  onClick: (nodeId: string) => void,
  onDoubleClick: (nodeId: string) => void,
  onClickEmpty: () => void
): void {
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingClickIdRef = useRef<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Convert screen (CSS px) → world coords accounting for camera
    const toWorld = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const { zoom, panX, panY } = cameraRef.current
      return { wx: (sx - panX) / zoom, wy: (sy - panY) / zoom }
    }

    const findNodeAt = (wx: number, wy: number): SimulationNode | null => {
      const nodes = nodesRef.current
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i]
        if (node && hitTestNode(node, wx, wy)) return node
      }
      return null
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { wx, wy } = toWorld(e)
      const hit = findNodeAt(wx, wy)
      const newId = hit?.id ?? null
      if (newId !== hoveredNodeIdRef.current) {
        hoveredNodeIdRef.current = newId
        canvas.style.cursor = newId ? 'pointer' : 'default'
        onHover(newId)
      }
    }

    const handleClick = (e: MouseEvent) => {
      const { wx, wy } = toWorld(e)
      const hit = findNodeAt(wx, wy)

      if (!hit) {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current)
          clickTimerRef.current = null
          pendingClickIdRef.current = null
        }
        onClickEmpty()
        return
      }

      if (clickTimerRef.current && pendingClickIdRef.current === hit.id) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
        pendingClickIdRef.current = null
        onDoubleClick(hit.id)
      } else {
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
        pendingClickIdRef.current = hit.id
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null
          const nodeId = pendingClickIdRef.current
          pendingClickIdRef.current = null
          if (nodeId) onClick(nodeId)
        }, 250)
      }
    }

    const handleMouseLeave = () => {
      hoveredNodeIdRef.current = null
      canvas.style.cursor = 'default'
      onHover(null)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef.current])
}
