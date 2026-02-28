import { useEffect, useRef, type RefObject } from 'react'
import type { SimulationNode, SimulationEdge, EntityDot } from '../types/graph'

const BG_COLOR = '#f7f7f7'
const EDGE_DEFAULT = 'rgba(0,0,0,0.08)'
const EDGE_HOVER = 'rgba(214,58,0,0.3)'
const EDGE_LABEL_COLOR = 'rgba(214,58,0,0.7)'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export interface Camera {
  zoom: number
  panX: number
  panY: number
}

export function useGraphRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  nodesRef: React.MutableRefObject<SimulationNode[]>,
  edgesRef: React.MutableRefObject<SimulationEdge[]>,
  hoveredNodeIdRef: React.MutableRefObject<string | null>,
  selectedNodeId: string | null,
  expandedNodeId: string | null,
  expandedEntities: EntityDot[] | null,
  canvasWidth: number,
  canvasHeight: number,
  tick: () => void,
  cameraRef: React.MutableRefObject<Camera>
): void {
  const rafRef = useRef<number | null>(null)
  const fontReadyRef = useRef(false)

  // Wait for font to be ready
  useEffect(() => {
    document.fonts.ready.then(() => {
      fontReadyRef.current = true
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasWidth === 0 || canvasHeight === 0) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      tick()

      const { zoom, panX, panY } = cameraRef.current

      // Clear in physical pixel space (ignore camera)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Apply camera: world → screen (with DPR)
      ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, panX * dpr, panY * dpr)

      const nodes = nodesRef.current
      const edges = edgesRef.current
      const hoveredId = hoveredNodeIdRef.current

      // Build node lookup
      const nodeById = new Map<string, SimulationNode>()
      for (const node of nodes) nodeById.set(node.id, node)

      // Determine which edges are hovered
      const hoveredEdgeSet = new Set<number>()
      if (hoveredId) {
        edges.forEach((edge, idx) => {
          if (edge.sourceId === hoveredId || edge.anchorId === hoveredId) {
            hoveredEdgeSet.add(idx)
          }
        })
      }

      // Draw edges
      edges.forEach((edge, idx) => {
        const from = nodeById.get(edge.sourceId)
        const to = nodeById.get(edge.anchorId)
        if (!from || !to) return

        const isHovered = hoveredEdgeSet.has(idx)
        const strokeWidth = isHovered
          ? Math.min(edge.weight * 1.0, 5) * 1.5
          : Math.min(edge.weight * 1.0, 5)

        // Bezier control point
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2 - 30

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.quadraticCurveTo(mx, my, to.x, to.y)
        ctx.strokeStyle = isHovered ? EDGE_HOVER : EDGE_DEFAULT
        ctx.lineWidth = strokeWidth
        ctx.stroke()

        // Edge label on hover
        if (isHovered) {
          const font = fontReadyRef.current ? '"DM Sans", sans-serif' : 'sans-serif'
          ctx.font = `600 9px ${font}`
          ctx.fillStyle = EDGE_LABEL_COLOR
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${edge.weight} entities`, mx, my)
        }
      })

      // Draw nodes
      for (const node of nodes) {
        const isHovered = node.id === hoveredId
        const isSelected = node.id === selectedNodeId
        const isExpanded = node.id === expandedNodeId

        const font = fontReadyRef.current ? '"DM Sans", sans-serif' : 'sans-serif'

        if (node.kind === 'source') {
          const w = node.radius * 2.8
          const h = node.radius * 1.6
          const x = node.x - w / 2
          const y = node.y - h / 2

          const fillAlpha = isHovered || isExpanded ? 0.2 : (isSelected ? 0.15 : 0.1)
          const strokeAlpha = isHovered ? 0.5 : 0.25
          const strokeW = isHovered || isSelected ? 2 : 1

          ctx.save()
          drawRoundedRect(ctx, x, y, w, h, 10)
          ctx.fillStyle = hexToRgba(node.color, fillAlpha)
          ctx.fill()
          ctx.strokeStyle = hexToRgba(node.color, isSelected ? 0.7 : strokeAlpha)
          ctx.lineWidth = isSelected ? 2.5 : strokeW
          ctx.stroke()

          // Selected accent tint
          if (isSelected) {
            drawRoundedRect(ctx, x, y, w, h, 10)
            ctx.fillStyle = 'rgba(214,58,0,0.06)'
            ctx.fill()
          }

          ctx.restore()

          // Emoji icon
          ctx.font = `14px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(node.icon ?? '📄', node.x, node.y)

          // Label
          const labelAlpha = isHovered || isSelected ? 0.9 : 0.55
          ctx.font = `500 10px ${font}`
          ctx.fillStyle = `rgba(30,30,30,${labelAlpha})`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText(truncate(node.label, 22), node.x, node.y + node.radius + 14)

          // Entity count badge
          ctx.font = `700 8px ${font}`
          ctx.fillStyle = hexToRgba(node.color, 0.8)
          ctx.fillText(`${node.entityCount ?? 0} entities`, node.x, node.y + node.radius + 24)
        } else {
          // Anchor node (circle)
          const fillAlpha = isHovered || isExpanded ? 0.25 : (isSelected ? 0.2 : 0.12)
          const strokeAlpha = isHovered ? 0.6 : 0.35
          const strokeW = isHovered || isSelected ? 2 : 1.5

          ctx.beginPath()
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(node.color, fillAlpha)
          ctx.fill()
          ctx.strokeStyle = hexToRgba(node.color, isSelected ? 0.7 : strokeAlpha)
          ctx.lineWidth = isSelected ? 2.5 : strokeW
          ctx.stroke()

          if (isSelected) {
            ctx.beginPath()
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(214,58,0,0.06)'
            ctx.fill()
          }

          // Anchor symbol
          ctx.font = `bold 11px ${font}`
          ctx.fillStyle = node.color
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('⚓', node.x, node.y)

          // Label
          const labelAlpha = isHovered || isSelected ? 0.9 : 0.6
          ctx.font = `500 10px ${font}`
          ctx.fillStyle = `rgba(30,30,30,${labelAlpha})`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillText(truncate(node.label, 20), node.x, node.y + node.radius + 14)

          // Connection count badge
          ctx.font = `700 8px ${font}`
          ctx.fillStyle = hexToRgba(node.color, 0.8)
          ctx.fillText(`${node.connectionCount ?? 0} connections`, node.x, node.y + node.radius + 24)
        }
      }

      // Draw expanded entity cluster
      if (expandedNodeId && expandedEntities && expandedEntities.length > 0) {
        const parentNode = nodeById.get(expandedNodeId)
        if (parentNode) {
          const total = expandedEntities.length
          const orbitRadius = 65

          for (let i = 0; i < total; i++) {
            const entity = expandedEntities[i]
            if (!entity) continue
            const angle = (i / total) * Math.PI * 2 - Math.PI / 2
            const ex = parentNode.x + Math.cos(angle) * orbitRadius
            const ey = parentNode.y + Math.sin(angle) * orbitRadius

            // Connecting line
            ctx.beginPath()
            ctx.moveTo(parentNode.x, parentNode.y)
            ctx.lineTo(ex, ey)
            ctx.strokeStyle = 'rgba(0,0,0,0.06)'
            ctx.lineWidth = 1
            ctx.stroke()

            // Dot
            ctx.beginPath()
            ctx.arc(ex, ey, 6, 0, Math.PI * 2)
            ctx.fillStyle = entity.color + '88'
            ctx.fill()
            ctx.strokeStyle = entity.color + '44'
            ctx.lineWidth = 1
            ctx.stroke()

            // Label
            const font = fontReadyRef.current ? '"DM Sans", sans-serif' : 'sans-serif'
            ctx.font = `500 8px ${font}`
            ctx.fillStyle = 'rgba(30,30,30,0.65)'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(truncate(entity.label, 16), ex, ey + 10)
          }
        }
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  // We intentionally depend on canvasWidth/canvasHeight to re-setup the canvas
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight, selectedNodeId, expandedNodeId, expandedEntities])
}
