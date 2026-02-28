import { supabase } from './supabase'
import type { KnowledgeSource } from '../types/database'
import type { FeedItem, FeedEntityBadge, CrossConnection, DailyStats } from '../types/feed'

type PartialNode = {
  id: string
  source_id: string | null
  label: string
  entity_type: string
  confidence: number | null
}

type PartialEdge = {
  id: string
  source_node_id: string
  target_node_id: string
  relation_type: string | null
}

type OtherNode = {
  id: string
  label: string
  entity_type: string
  source_id: string | null
}

type SourceMeta = {
  id: string
  title: string | null
  source_type: string | null
}

export async function fetchDailyStats(): Promise<DailyStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [sourcesRes, entitiesRes, relationsRes] = await Promise.all([
    supabase
      .from('knowledge_sources')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase
      .from('knowledge_nodes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since),
    supabase
      .from('knowledge_edges')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since),
  ])

  return {
    sourcesProcessed: sourcesRes.count ?? 0,
    newEntities: entitiesRes.count ?? 0,
    relationshipsDiscovered: relationsRes.count ?? 0,
  }
}

export async function fetchActivityFeed(
  limit = 20,
  offset = 0
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  // Step 1: Fetch sources (limit+1 to detect hasMore)
  const { data: rawSources, error: sourcesError } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_type, source_url, content, metadata, created_at, user_id')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit)

  if (sourcesError || !rawSources?.length) {
    return { items: [], hasMore: false }
  }

  const hasMore = rawSources.length > limit
  const pageSources = rawSources.slice(0, limit) as KnowledgeSource[]
  const sourceIds = pageSources.map(s => s.id)

  // Step 2: Batch fetch all nodes for these sources
  const { data: rawNodes } = await supabase
    .from('knowledge_nodes')
    .select('id, source_id, label, entity_type, confidence')
    .in('source_id', sourceIds)
    .order('confidence', { ascending: false, nullsFirst: false })

  const allNodes: PartialNode[] = (rawNodes ?? []) as PartialNode[]

  // Group nodes by source_id and build node-to-source map
  const nodesBySource = new Map<string, PartialNode[]>()
  const nodeSourceMap = new Map<string, string>()
  const allNodeIds: string[] = []

  for (const n of allNodes) {
    if (!n.source_id) continue
    const list = nodesBySource.get(n.source_id) ?? []
    list.push(n)
    nodesBySource.set(n.source_id, list)
    nodeSourceMap.set(n.id, n.source_id)
    allNodeIds.push(n.id)
  }

  // Step 3: Batch fetch edges involving any of these nodes
  let rawEdges: PartialEdge[] = []

  if (allNodeIds.length > 0) {
    const batchSize = 50
    for (let i = 0; i < allNodeIds.length; i += batchSize) {
      const batch = allNodeIds.slice(i, i + batchSize)
      const orFilter = batch
        .map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`)
        .join(',')
      const { data: batchEdges } = await supabase
        .from('knowledge_edges')
        .select('id, source_node_id, target_node_id, relation_type')
        .or(orFilter)
      if (batchEdges) {
        rawEdges = [...rawEdges, ...(batchEdges as PartialEdge[])]
      }
    }
  }

  // Deduplicate edges
  const edgeMap = new Map<string, PartialEdge>()
  for (const edge of rawEdges) {
    edgeMap.set(edge.id, edge)
  }
  const uniqueEdges = Array.from(edgeMap.values())

  // Identify "other" nodes outside our source set
  const otherNodeIdSet = new Set<string>()
  for (const edge of uniqueEdges) {
    const fromIn = nodeSourceMap.has(edge.source_node_id)
    const toIn = nodeSourceMap.has(edge.target_node_id)
    if (fromIn && !toIn) otherNodeIdSet.add(edge.target_node_id)
    if (!fromIn && toIn) otherNodeIdSet.add(edge.source_node_id)
  }

  // Fetch other nodes with their source ids
  const otherNodeMap = new Map<string, OtherNode>()
  if (otherNodeIdSet.size > 0) {
    const { data: otherNodes } = await supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type, source_id')
      .in('id', Array.from(otherNodeIdSet))
    ;(otherNodes as OtherNode[] | null)?.forEach(n => otherNodeMap.set(n.id, n))
  }

  // Step 4: Fetch source titles for cross-connected sources
  const otherSourceIds = new Set<string>()
  otherNodeMap.forEach(n => { if (n.source_id) otherSourceIds.add(n.source_id) })

  const otherSourceMap = new Map<string, SourceMeta>()
  if (otherSourceIds.size > 0) {
    const { data: otherSrcs } = await supabase
      .from('knowledge_sources')
      .select('id, title, source_type')
      .in('id', Array.from(otherSourceIds))
    ;(otherSrcs as SourceMeta[] | null)?.forEach(s => otherSourceMap.set(s.id, s))
  }

  // Assemble FeedItems
  const items: FeedItem[] = pageSources.map(source => {
    const sourceNodes = nodesBySource.get(source.id) ?? []
    const sourceNodeIdSet = new Set(sourceNodes.map(n => n.id))

    const entityCount = sourceNodes.length
    const entities: FeedEntityBadge[] = sourceNodes.slice(0, 6).map(n => ({
      id: n.id,
      label: n.label,
      entityType: n.entity_type,
    }))

    let relationCount = 0
    const crossConnections: CrossConnection[] = []

    for (const edge of uniqueEdges) {
      const fromIn = sourceNodeIdSet.has(edge.source_node_id)
      const toIn = sourceNodeIdSet.has(edge.target_node_id)

      if (fromIn && toIn) {
        relationCount++
      } else if (fromIn && !toIn) {
        const otherNode = otherNodeMap.get(edge.target_node_id)
        if (otherNode?.source_id && otherNode.source_id !== source.id) {
          const fromNode = sourceNodes.find(n => n.id === edge.source_node_id)
          const otherSrc = otherSourceMap.get(otherNode.source_id)
          if (fromNode && crossConnections.length < 3) {
            crossConnections.push({
              id: edge.id,
              fromNodeId: edge.source_node_id,
              fromLabel: fromNode.label,
              fromEntityType: fromNode.entity_type,
              toNodeId: edge.target_node_id,
              toLabel: otherNode.label,
              toEntityType: otherNode.entity_type,
              relationType: edge.relation_type ?? 'relates_to',
              toSourceId: otherNode.source_id,
              toSourceTitle: otherSrc?.title ?? null,
              toSourceType: otherSrc?.source_type ?? null,
            })
          }
        }
      } else if (!fromIn && toIn) {
        const otherNode = otherNodeMap.get(edge.source_node_id)
        if (otherNode?.source_id && otherNode.source_id !== source.id) {
          const toNode = sourceNodes.find(n => n.id === edge.target_node_id)
          const otherSrc = otherSourceMap.get(otherNode.source_id)
          if (toNode && crossConnections.length < 3) {
            crossConnections.push({
              id: edge.id,
              fromNodeId: edge.source_node_id,
              fromLabel: otherNode.label,
              fromEntityType: otherNode.entity_type,
              toNodeId: edge.target_node_id,
              toLabel: toNode.label,
              toEntityType: toNode.entity_type,
              relationType: edge.relation_type ?? 'relates_to',
              toSourceId: otherNode.source_id,
              toSourceTitle: otherSrc?.title ?? null,
              toSourceType: otherSrc?.source_type ?? null,
            })
          }
        }
      }
    }

    const metadata = source.metadata as Record<string, unknown> | null
    const summary =
      (metadata?.summary as string | null) ??
      (source.content ? source.content.slice(0, 200) + '...' : null)

    return { source, entityCount, relationCount, entities, crossConnections, summary }
  })

  return { items, hasMore }
}
