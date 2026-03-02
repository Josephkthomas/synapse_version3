import { supabase } from './supabase'
import type { ClusterData, CrossClusterEdge, TypeDistributionEntry, EntityNode } from '../types/explore'

// ─── fetchClusterData ─────────────────────────────────────────────────────────

export interface ClusterDataResult {
  clusters: ClusterData[]
  clusteredNodeIds: Set<string>
}

export async function fetchClusterData(userId: string): Promise<ClusterDataResult> {
  // 1. Fetch anchors
  const { data: anchors, error: ancErr } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description')
    .eq('user_id', userId)
    .eq('is_anchor', true)
    .order('label')

  if (ancErr) throw new Error(ancErr.message)
  if (!anchors?.length) return { clusters: [], clusteredNodeIds: new Set() }

  // 2. Fetch all non-anchor nodes
  const { data: allNodes, error: nodeErr } = await supabase
    .from('knowledge_nodes')
    .select('id, entity_type, source_id')
    .eq('user_id', userId)
    .eq('is_anchor', false)

  if (nodeErr) throw new Error(nodeErr.message)

  // 3. Fetch all edges
  const { data: allEdges, error: edgeErr } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .eq('user_id', userId)

  if (edgeErr) throw new Error(edgeErr.message)

  // Compute cluster membership: node belongs to anchor's cluster
  // if it has a direct edge to/from that anchor
  const anchorIds = new Set(anchors.map(a => a.id))
  const nodeClusterMap = new Map<string, Set<string>>()

  for (const edge of allEdges ?? []) {
    const src = edge.source_node_id as string
    const tgt = edge.target_node_id as string
    if (anchorIds.has(src) && !anchorIds.has(tgt)) {
      if (!nodeClusterMap.has(tgt)) nodeClusterMap.set(tgt, new Set())
      nodeClusterMap.get(tgt)!.add(src)
    }
    if (anchorIds.has(tgt) && !anchorIds.has(src)) {
      if (!nodeClusterMap.has(src)) nodeClusterMap.set(src, new Set())
      nodeClusterMap.get(src)!.add(tgt)
    }
  }

  // Collect all clustered node IDs
  const allClusteredNodeIds = new Set<string>()
  for (const [nid] of nodeClusterMap) {
    allClusteredNodeIds.add(nid)
  }

  const clusters = anchors.map(anchor => {
    const a = anchor as { id: string; label: string; entity_type: string; description: string | null }
    const clusterNodeIds = [...nodeClusterMap.entries()]
      .filter(([, set]) => set.has(a.id))
      .map(([nid]) => nid)
    const clusterNodes = (allNodes ?? []).filter(n => clusterNodeIds.includes((n as { id: string }).id))

    // Type distribution
    const typeCounts: Record<string, number> = {}
    for (const n of clusterNodes) {
      const entityType = (n as { entity_type: string }).entity_type
      typeCounts[entityType] = (typeCounts[entityType] || 0) + 1
    }
    const total = clusterNodes.length || 1
    const typeDistribution: TypeDistributionEntry[] = Object.entries(typeCounts)
      .map(([entityType, count]) => ({ entityType, count, percentage: count / total }))
      .sort((a, b) => b.count - a.count)

    // Cross-cluster edges
    const crossClusterEdges: CrossClusterEdge[] = []
    for (const other of anchors) {
      const o = other as { id: string }
      if (o.id === a.id) continue
      const otherIds = new Set(
        [...nodeClusterMap.entries()]
          .filter(([, s]) => s.has(o.id))
          .map(([nid]) => nid)
      )
      const shared = clusterNodeIds.filter(id => otherIds.has(id))
      const crossEdges = (allEdges ?? []).filter(e => {
        const src = e.source_node_id as string
        const tgt = e.target_node_id as string
        return (
          (clusterNodeIds.includes(src) && otherIds.has(tgt)) ||
          (clusterNodeIds.includes(tgt) && otherIds.has(src))
        )
      })
      const weight = shared.length + crossEdges.length
      if (weight > 0) {
        crossClusterEdges.push({
          targetClusterId: o.id,
          sharedEntityCount: shared.length,
          crossEdgeCount: crossEdges.length,
          totalWeight: weight,
        })
      }
    }

    return {
      anchor: {
        id: a.id,
        label: a.label,
        entityType: a.entity_type,
        description: a.description,
        entityCount: clusterNodes.length,
      },
      entityCount: clusterNodes.length,
      typeDistribution,
      position: { cx: 0, cy: 0, r: 0 }, // Computed by useClusterLayout
      crossClusterEdges,
    }
  })

  return { clusters, clusteredNodeIds: allClusteredNodeIds }
}

// ─── fetchGraphStats ──────────────────────────────────────────────────────────

export interface GraphStats {
  nodeCount: number
  edgeCount: number
  sourceCount: number
  anchorCount: number
}

export async function fetchGraphStats(userId: string): Promise<GraphStats> {
  const [nodes, edges, sources, anchors] = await Promise.all([
    supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_edges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_anchor', true),
  ])
  return {
    nodeCount: nodes.count ?? 0,
    edgeCount: edges.count ?? 0,
    sourceCount: sources.count ?? 0,
    anchorCount: anchors.count ?? 0,
  }
}

// ─── fetchUnclusteredNodes ────────────────────────────────────────────────────

export interface UnclusteredEntity {
  id: string
  label: string
  entityType: string
}

export async function fetchUnclusteredNodes(
  userId: string,
  clusteredNodeIds: Set<string>
): Promise<UnclusteredEntity[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type')
    .eq('user_id', userId)
    .eq('is_anchor', false)
    .limit(500)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter(n => !clusteredNodeIds.has((n as { id: string }).id))
    .slice(0, 30) // Cap unclustered display
    .map(n => {
      const node = n as { id: string; label: string; entity_type: string }
      return { id: node.id, label: node.label, entityType: node.entity_type }
    })
}

// ─── fetchClusterEntities ─────────────────────────────────────────────────────

export async function fetchClusterEntities(
  userId: string,
  anchorId: string,
  clusterData?: ClusterData[]
): Promise<EntityNode[]> {
  // Get edges involving this anchor
  const { data: anchorEdges, error: edgeErr } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .eq('user_id', userId)
    .or(`source_node_id.eq.${anchorId},target_node_id.eq.${anchorId}`)

  if (edgeErr) throw new Error(edgeErr.message)

  const nodeIds = new Set<string>()
  for (const e of anchorEdges ?? []) {
    const src = e.source_node_id as string
    const tgt = e.target_node_id as string
    if (src !== anchorId) nodeIds.add(src)
    if (tgt !== anchorId) nodeIds.add(tgt)
  }
  if (nodeIds.size === 0) return []

  // Fetch full node details
  const { data: nodes, error: nodeErr } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, confidence, source, source_type, source_id, tags, created_at')
    .in('id', Array.from(nodeIds))
    .eq('user_id', userId)
    .eq('is_anchor', false)

  if (nodeErr) throw new Error(nodeErr.message)

  // Connection counts — fetch all edges for these nodes
  const { data: allEdges } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .eq('user_id', userId)

  const counts: Record<string, number> = {}
  for (const e of allEdges ?? []) {
    const src = e.source_node_id as string
    const tgt = e.target_node_id as string
    counts[src] = (counts[src] || 0) + 1
    counts[tgt] = (counts[tgt] || 0) + 1
  }

  // Determine cluster membership for bridge/unclustered detection
  // Build a quick lookup: nodeId → set of anchor IDs it belongs to
  const anchorIds = new Set<string>()
  if (clusterData) {
    for (const c of clusterData) anchorIds.add(c.anchor.id)
  }
  const nodeClusterMembership = new Map<string, string[]>()
  if (clusterData && allEdges) {
    for (const e of allEdges) {
      const src = e.source_node_id as string
      const tgt = e.target_node_id as string
      if (anchorIds.has(src) && !anchorIds.has(tgt)) {
        const existing = nodeClusterMembership.get(tgt) ?? []
        if (!existing.includes(src)) existing.push(src)
        nodeClusterMembership.set(tgt, existing)
      }
      if (anchorIds.has(tgt) && !anchorIds.has(src)) {
        const existing = nodeClusterMembership.get(src) ?? []
        if (!existing.includes(tgt)) existing.push(tgt)
        nodeClusterMembership.set(src, existing)
      }
    }
  }

  return (nodes ?? []).map(n => {
    const node = n as {
      id: string; label: string; entity_type: string; description: string | null
      confidence: number | null; source: string | null; source_type: string | null
      source_id: string | null; tags: string[] | null; created_at: string
    }
    const clusters = nodeClusterMembership.get(node.id) ?? []
    return {
      id: node.id,
      label: node.label,
      entityType: node.entity_type,
      description: node.description,
      confidence: node.confidence,
      connectionCount: counts[node.id] || 0,
      clusters,
      sourceId: node.source_id,
      sourceName: node.source,
      sourceType: node.source_type,
      tags: node.tags ?? [],
      createdAt: node.created_at,
      isBridge: clusters.length >= 2,
      isUnclustered: clusters.length === 0,
    }
  })
}

// ─── fetchEntityEdges ─────────────────────────────────────────────────────────

export interface EntityEdge {
  sourceNodeId: string
  targetNodeId: string
  relationType: string | null
  weight: number
}

export async function fetchEntityEdges(
  userId: string,
  nodeIds: string[]
): Promise<EntityEdge[]> {
  if (nodeIds.length === 0) return []

  const orFilter = nodeIds
    .map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`)
    .join(',')

  const { data, error } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id, relation_type, weight')
    .eq('user_id', userId)
    .or(orFilter)

  if (error) throw new Error(error.message)

  const idSet = new Set(nodeIds)
  return (data ?? [])
    .filter(e => {
      const src = e.source_node_id as string
      const tgt = e.target_node_id as string
      return idSet.has(src) && idSet.has(tgt)
    })
    .map(e => ({
      sourceNodeId: e.source_node_id as string,
      targetNodeId: e.target_node_id as string,
      relationType: (e.relation_type as string | null) ?? null,
      weight: (e.weight as number) || 1,
    }))
}

// ─── fetchSourceGraph ────────────────────────────────────────────────────────

export interface SourceGraphResult {
  sources: import('../types/explore').SourceNode[]
  edges: import('../types/explore').SourceEdge[]
}

export async function fetchSourceGraph(userId: string): Promise<SourceGraphResult> {
  // 1. Fetch all sources
  const { data: sources, error: srcErr } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (srcErr) throw new Error(srcErr.message)

  // 2. Fetch nodes with source_id for membership
  const { data: nodes, error: nodeErr } = await supabase
    .from('knowledge_nodes')
    .select('id, source_id')
    .eq('user_id', userId)
    .not('source_id', 'is', null)

  if (nodeErr) throw new Error(nodeErr.message)

  // Build source → entityIds map
  const sourceEntities = new Map<string, string[]>()
  for (const n of nodes ?? []) {
    const sourceId = (n as { source_id: string }).source_id
    if (!sourceId) continue
    if (!sourceEntities.has(sourceId)) sourceEntities.set(sourceId, [])
    sourceEntities.get(sourceId)!.push((n as { id: string }).id)
  }

  const sourceNodes: import('../types/explore').SourceNode[] = (sources ?? []).map(s => {
    const src = s as { id: string; title: string | null; source_type: string | null; created_at: string }
    const entityIds = sourceEntities.get(src.id) ?? []
    return {
      id: src.id,
      title: src.title || 'Untitled',
      sourceType: src.source_type || 'Note',
      entityIds,
      entityCount: entityIds.length,
      createdAt: src.created_at,
    }
  })

  // 3. Compute source-source edges (shared entities)
  const sourceEdges: import('../types/explore').SourceEdge[] = []
  for (let i = 0; i < sourceNodes.length; i++) {
    const aIds = new Set(sourceNodes[i]!.entityIds)
    for (let j = i + 1; j < sourceNodes.length; j++) {
      const shared = sourceNodes[j]!.entityIds.filter(id => aIds.has(id))
      if (shared.length > 0) {
        sourceEdges.push({
          fromSourceId: sourceNodes[i]!.id,
          toSourceId: sourceNodes[j]!.id,
          sharedEntityCount: shared.length,
          sharedEntityIds: shared,
        })
      }
    }
  }

  return { sources: sourceNodes, edges: sourceEdges }
}

// ─── fetchSourceEntities ─────────────────────────────────────────────────────

export interface SourceEntityBadge {
  id: string
  label: string
  entityType: string
}

export async function fetchSourceEntities(
  userId: string,
  entityIds: string[]
): Promise<SourceEntityBadge[]> {
  if (entityIds.length === 0) return []

  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type')
    .eq('user_id', userId)
    .in('id', entityIds)

  if (error) throw new Error(error.message)

  return (data ?? []).map(n => {
    const node = n as { id: string; label: string; entity_type: string }
    return { id: node.id, label: node.label, entityType: node.entity_type }
  })
}

// ─── fetchEntityNeighbors ─────────────────────────────────────────────────────

export interface EntityNeighbor {
  node: { id: string; label: string; entityType: string }
  relationType: string | null
  direction: 'outgoing' | 'incoming'
}

export async function fetchEntityNeighbors(
  userId: string,
  nodeId: string
): Promise<EntityNeighbor[]> {
  const { data: edges, error } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id, relation_type')
    .eq('user_id', userId)
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)

  if (error) throw new Error(error.message)
  if (!edges?.length) return []

  const neighborIds = new Set<string>()
  for (const e of edges) {
    const src = e.source_node_id as string
    const tgt = e.target_node_id as string
    if (src !== nodeId) neighborIds.add(src)
    if (tgt !== nodeId) neighborIds.add(tgt)
  }

  const { data: neighbors, error: nodeErr } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type')
    .in('id', Array.from(neighborIds))

  if (nodeErr) throw new Error(nodeErr.message)

  const map = new Map(
    (neighbors ?? []).map(n => {
      const node = n as { id: string; label: string; entity_type: string }
      return [node.id, { id: node.id, label: node.label, entityType: node.entity_type }]
    })
  )

  return edges
    .map(e => {
      const src = e.source_node_id as string
      const tgt = e.target_node_id as string
      const outgoing = src === nodeId
      const otherId = outgoing ? tgt : src
      const other = map.get(otherId)
      if (!other) return null
      return {
        node: other,
        relationType: (e.relation_type as string | null) ?? null,
        direction: outgoing ? 'outgoing' as const : 'incoming' as const,
      }
    })
    .filter((x): x is EntityNeighbor => x !== null)
}
