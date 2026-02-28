import { supabase } from './supabase'
import { getEntityColor } from '../config/entityTypes'
import { getSourceConfig } from '../config/sourceTypes'
import type { GraphData, SourceGraphNode, AnchorGraphNode, GraphEdge, EntityDot } from '../types/graph'

// ─── fetchGraphData ───────────────────────────────────────────────────────────

export async function fetchGraphData(userId: string): Promise<GraphData> {
  // Step 1 — Fetch sources with entity counts
  const { data: sourcesRaw, error: srcErr } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_type, source_url, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (srcErr) throw new Error(srcErr.message)

  // Step 2 — Fetch anchors
  const { data: anchorsRaw, error: ancErr } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, confidence')
    .eq('user_id', userId)
    .eq('is_anchor', true)

  if (ancErr) throw new Error(ancErr.message)

  const anchorIds = (anchorsRaw ?? []).map((a: { id: string }) => a.id)

  // Step 3 — Fetch ALL nodes with source_id (anchors + non-anchors) for counting + edge computation
  // NOTE: We must NOT filter by is_anchor here, or anchor-typed entities won't be counted
  const { data: allSourcedNodes, error: nanErr } = await supabase
    .from('knowledge_nodes')
    .select('id, source_id, entity_type, is_anchor')
    .eq('user_id', userId)
    .not('source_id', 'is', null)

  if (nanErr) throw new Error(nanErr.message)

  // Step 4 — Fetch edges connected to anchors
  let edgesRaw: Array<{ source_node_id: string; target_node_id: string }> = []
  if (anchorIds.length > 0) {
    const orFilter = anchorIds
      .map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`)
      .join(',')
    const { data: edgesData, error: edgeErr } = await supabase
      .from('knowledge_edges')
      .select('source_node_id, target_node_id')
      .or(orFilter)
    if (edgeErr) throw new Error(edgeErr.message)
    edgesRaw = edgesData ?? []
  }

  // Step 5 — Compute entity counts per source (ALL nodes, including anchors)
  const entityCountBySource: Record<string, number> = {}
  for (const node of allSourcedNodes ?? []) {
    const n = node as { id: string; source_id: string | null; entity_type: string; is_anchor: boolean }
    if (n.source_id) {
      entityCountBySource[n.source_id] = (entityCountBySource[n.source_id] ?? 0) + 1
    }
  }

  // Only non-anchor nodes are used for source→anchor edge tracing
  const nonAnchorNodes = (allSourcedNodes ?? []).filter(
    (n: { is_anchor: boolean }) => !n.is_anchor
  ) as Array<{ id: string; source_id: string | null; entity_type: string; is_anchor: boolean }>

  // Step 6 — Compute connection counts per anchor
  const connectionCountByAnchor: Record<string, number> = {}
  for (const edge of edgesRaw) {
    if (anchorIds.includes(edge.source_node_id)) {
      connectionCountByAnchor[edge.source_node_id] = (connectionCountByAnchor[edge.source_node_id] ?? 0) + 1
    }
    if (anchorIds.includes(edge.target_node_id)) {
      connectionCountByAnchor[edge.target_node_id] = (connectionCountByAnchor[edge.target_node_id] ?? 0) + 1
    }
  }

  // Step 7 — Compute source-to-anchor edges via JS
  // Build: nonAnchorNode.id -> source_id mapping (only non-anchors trace source→anchor links)
  const nodeToSource: Record<string, string> = {}
  for (const node of nonAnchorNodes) {
    if (node.source_id) nodeToSource[node.id] = node.source_id
  }

  const anchorSet = new Set(anchorIds)
  // key: `${sourceId}::${anchorId}` -> weight
  const sourceAnchorWeights: Record<string, number> = {}

  for (const edge of edgesRaw) {
    const { source_node_id, target_node_id } = edge
    // Case A: source_node_id is anchor, target_node_id is non-anchor entity
    if (anchorSet.has(source_node_id) && nodeToSource[target_node_id]) {
      const key = `${nodeToSource[target_node_id]}::${source_node_id}`
      sourceAnchorWeights[key] = (sourceAnchorWeights[key] ?? 0) + 1
    }
    // Case B: target_node_id is anchor, source_node_id is non-anchor entity
    if (anchorSet.has(target_node_id) && nodeToSource[source_node_id]) {
      const key = `${nodeToSource[source_node_id]}::${target_node_id}`
      sourceAnchorWeights[key] = (sourceAnchorWeights[key] ?? 0) + 1
    }
  }

  // Step 8 — Build typed graph nodes
  const sources: SourceGraphNode[] = (sourcesRaw ?? []).map(s => {
    const src = s as {
      id: string; title: string | null; source_type: string | null
      source_url: string | null; metadata: Record<string, unknown> | null; created_at: string
    }
    const cfg = getSourceConfig(src.source_type)
    return {
      id: src.id,
      kind: 'source' as const,
      label: src.title ?? 'Untitled',
      sourceType: src.source_type ?? 'Document',
      color: cfg.color,
      icon: cfg.icon,
      entityCount: entityCountBySource[src.id] ?? 0,
      metadata: src.metadata ?? {},
      createdAt: src.created_at,
    }
  })

  const anchors: AnchorGraphNode[] = (anchorsRaw ?? []).map(a => {
    const anc = a as {
      id: string; label: string; entity_type: string
      description: string | null; confidence: number | null
    }
    return {
      id: anc.id,
      kind: 'anchor' as const,
      label: anc.label,
      entityType: anc.entity_type,
      color: getEntityColor(anc.entity_type),
      connectionCount: connectionCountByAnchor[anc.id] ?? 0,
      description: anc.description,
      confidence: anc.confidence,
    }
  })

  const edges: GraphEdge[] = Object.entries(sourceAnchorWeights).flatMap(([key, weight]) => {
    const parts = key.split('::')
    const sourceId = parts[0]
    const anchorId = parts[1]
    if (!sourceId || !anchorId) return []
    return [{ sourceId, anchorId, weight }]
  })

  return {
    sources,
    anchors,
    edges,
    stats: {
      sourceCount: sources.length,
      anchorCount: anchors.length,
      edgeCount: edges.length,
    },
  }
}

// ─── fetchEntityCluster ───────────────────────────────────────────────────────

export async function fetchEntityCluster(
  nodeId: string,
  nodeKind: 'source' | 'anchor',
  userId: string
): Promise<EntityDot[]> {
  if (nodeKind === 'source') {
    const { data, error } = await supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type, confidence')
      .eq('source_id', nodeId)
      .eq('user_id', userId)
      .order('confidence', { ascending: false })
      .limit(12)

    if (error) {
      console.warn('fetchEntityCluster source error:', error)
      return []
    }

    return (data ?? []).map(n => {
      const node = n as { id: string; label: string; entity_type: string; confidence: number | null }
      return {
        id: node.id,
        label: node.label,
        entityType: node.entity_type,
        color: getEntityColor(node.entity_type),
        confidence: node.confidence,
      }
    })
  }

  // Anchor: fetch connected nodes via edges
  const { data: edges, error: edgeErr } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)

  if (edgeErr) {
    console.warn('fetchEntityCluster anchor edge error:', edgeErr)
    return []
  }

  const connectedIds = new Set<string>()
  for (const edge of edges ?? []) {
    const e = edge as { source_node_id: string; target_node_id: string }
    if (e.source_node_id !== nodeId) connectedIds.add(e.source_node_id)
    if (e.target_node_id !== nodeId) connectedIds.add(e.target_node_id)
  }

  if (connectedIds.size === 0) return []

  const { data: nodes, error: nodeErr } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, confidence')
    .in('id', Array.from(connectedIds))
    .eq('user_id', userId)
    .order('confidence', { ascending: false })
    .limit(12)

  if (nodeErr) {
    console.warn('fetchEntityCluster anchor node error:', nodeErr)
    return []
  }

  return (nodes ?? []).map(n => {
    const node = n as { id: string; label: string; entity_type: string; confidence: number | null }
    return {
      id: node.id,
      label: node.label,
      entityType: node.entity_type,
      color: getEntityColor(node.entity_type),
      confidence: node.confidence,
    }
  })
}
