import { createClient } from '@supabase/supabase-js'
import type { UserProfile, ExtractionSettings, KnowledgeNode, KnowledgeEdge } from '../types/database'
import type { NodeFilters, PaginationOptions, NodeWithMeta, NodeNeighbor } from '../types/nodes'
import type { CrossConnection } from '../types/feed'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Profile ────────────────────────────────────────────────────────────────

export async function fetchOrCreateProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data) return data as UserProfile

  if (error?.code === 'PGRST116' || !data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        professional_context: {},
        personal_interests: {},
        processing_preferences: {},
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create user profile:', insertError)
      return null
    }
    return newProfile as UserProfile
  }

  return null
}

export async function updateProfile(
  updates: Partial<{
    professional_context: Record<string, string>
    personal_interests: Record<string, string>
    processing_preferences: Record<string, string>
  }>
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not authenticated') }

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return { error: error ? new Error(error.message) : null }
}

// ─── Anchors ─────────────────────────────────────────────────────────────────

export async function getNodeConnectionCount(nodeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('knowledge_edges')
    .select('*', { count: 'exact', head: true })
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)

  if (error) return 0
  return count ?? 0
}

export async function promoteToAnchor(nodeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('knowledge_nodes')
    .update({ is_anchor: true })
    .eq('id', nodeId)

  return { error: error ? new Error(error.message) : null }
}

export async function demoteAnchor(nodeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('knowledge_nodes')
    .update({ is_anchor: false })
    .eq('id', nodeId)

  return { error: error ? new Error(error.message) : null }
}

export async function searchNodes(query: string, limit: number = 20): Promise<KnowledgeNode[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, is_anchor, created_at')
    .ilike('label', `%${query}%`)
    .order('label')
    .limit(limit)

  if (error) {
    console.error('Node search failed:', error)
    return []
  }
  return (data ?? []) as KnowledgeNode[]
}

// ─── Node Fetching ────────────────────────────────────────────────────────────

export async function fetchNodes(
  filters: NodeFilters,
  pagination: PaginationOptions
): Promise<{ data: NodeWithMeta[]; totalCount: number }> {
  // If anchor filter is active, pre-fetch connected node IDs
  let anchorNodeIds: string[] | null = null
  if (filters.anchorIds && filters.anchorIds.length > 0) {
    const { data: edgeData } = await supabase
      .from('knowledge_edges')
      .select('source_node_id, target_node_id')
      .or(
        filters.anchorIds.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(',')
      )
    if (edgeData) {
      const connected = new Set<string>()
      edgeData.forEach(edge => {
        connected.add(edge.source_node_id)
        connected.add(edge.target_node_id)
      })
      // Remove the anchor IDs themselves
      filters.anchorIds.forEach(id => connected.delete(id))
      anchorNodeIds = Array.from(connected)
    } else {
      anchorNodeIds = []
    }
  }

  let query = supabase
    .from('knowledge_nodes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.search) {
    query = query.or(`label.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  if (filters.entityTypes?.length) {
    query = query.in('entity_type', filters.entityTypes)
  }

  if (filters.sourceTypes?.length) {
    query = query.in('source_type', filters.sourceTypes)
  }

  if (filters.minConfidence != null && filters.minConfidence > 0) {
    query = query.gte('confidence', filters.minConfidence)
  }

  if (filters.tags?.length) {
    query = query.overlaps('tags', filters.tags)
  }

  if (anchorNodeIds !== null) {
    if (anchorNodeIds.length === 0) {
      return { data: [], totalCount: 0 }
    }
    query = query.in('id', anchorNodeIds)
  }

  const from = pagination.page * pagination.pageSize
  const to = from + pagination.pageSize - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const nodes = (data ?? []) as KnowledgeNode[]
  const nodeIds = nodes.map(n => n.id)

  // Batch connection count
  const connectionCounts = await batchGetConnectionCounts(nodeIds)
  // Batch anchor labels
  const anchorLabelsMap = await getNodeAnchorConnections(nodeIds)

  const result: NodeWithMeta[] = nodes.map(node => ({
    ...node,
    connectionCount: connectionCounts[node.id] ?? 0,
    anchorLabels: anchorLabelsMap[node.id] ?? [],
  }))

  return { data: result, totalCount: count ?? 0 }
}

async function batchGetConnectionCounts(nodeIds: string[]): Promise<Record<string, number>> {
  if (nodeIds.length === 0) return {}

  const countMap: Record<string, number> = {}

  // Split into batches of 50 to avoid URL length limits
  const batchSize = 50
  for (let i = 0; i < nodeIds.length; i += batchSize) {
    const batch = nodeIds.slice(i, i + batchSize)
    const orFilter = batch.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(',')
    const { data: edgeCounts } = await supabase
      .from('knowledge_edges')
      .select('source_node_id, target_node_id')
      .or(orFilter)

    edgeCounts?.forEach(edge => {
      countMap[edge.source_node_id] = (countMap[edge.source_node_id] ?? 0) + 1
      countMap[edge.target_node_id] = (countMap[edge.target_node_id] ?? 0) + 1
    })
  }

  return countMap
}

export async function fetchNodeById(nodeId: string): Promise<KnowledgeNode | null> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('id', nodeId)
    .maybeSingle()

  if (error) {
    console.error('fetchNodeById error:', error)
    return null
  }
  return data as KnowledgeNode | null
}

export async function updateNode(
  nodeId: string,
  updates: Partial<Pick<KnowledgeNode, 'label' | 'description' | 'user_tags'>>
): Promise<KnowledgeNode> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as KnowledgeNode
}

// ─── Edge / Connection Fetching ───────────────────────────────────────────────

export async function getNodeNeighbors(
  nodeId: string,
  limit: number = 20
): Promise<NodeNeighbor[]> {
  // Step 1: fetch all edges connected to this node
  const { data: edges, error } = await supabase
    .from('knowledge_edges')
    .select('*')
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
    .order('weight', { ascending: false })
    .limit(limit)

  if (error || !edges) return []

  // Step 2: collect unique neighbor IDs
  const neighborIds = new Set<string>()
  edges.forEach((edge: KnowledgeEdge) => {
    if (edge.source_node_id !== nodeId) neighborIds.add(edge.source_node_id)
    if (edge.target_node_id !== nodeId) neighborIds.add(edge.target_node_id)
  })

  if (neighborIds.size === 0) return []

  // Step 3: fetch neighbor node details
  const { data: neighborNodes, error: nodeError } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description')
    .in('id', Array.from(neighborIds))

  if (nodeError || !neighborNodes) return []

  const nodeMap = new Map<string, Pick<KnowledgeNode, 'id' | 'label' | 'entity_type' | 'description'>>()
  neighborNodes.forEach((n: Pick<KnowledgeNode, 'id' | 'label' | 'entity_type' | 'description'>) => nodeMap.set(n.id, n))

  // Step 4: combine into NodeNeighbor[]
  const results: NodeNeighbor[] = []
  for (const edge of edges as KnowledgeEdge[]) {
    const neighborId = edge.source_node_id === nodeId ? edge.target_node_id : edge.source_node_id
    const neighborNode = nodeMap.get(neighborId)
    if (!neighborNode) continue

    results.push({
      node: neighborNode,
      edge: {
        id: edge.id,
        relation_type: edge.relation_type,
        evidence: edge.evidence,
        weight: edge.weight,
      },
      direction: edge.source_node_id === nodeId ? 'outgoing' : 'incoming',
    })
  }

  return results
}

// ─── Filter Options ───────────────────────────────────────────────────────────

export async function getDistinctSourceTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('source_type')
    .not('source_type', 'is', null)
    .order('source_type')

  if (error || !data) return []

  const types = new Set<string>()
  data.forEach((row: { source_type: string | null }) => {
    if (row.source_type) types.add(row.source_type)
  })
  return Array.from(types)
}

export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('tags, user_tags')

  if (error || !data) return []

  const tags = new Set<string>()
  data.forEach((row: { tags: string[] | null; user_tags: string[] | null }) => {
    row.tags?.forEach(t => tags.add(t))
    row.user_tags?.forEach(t => tags.add(t))
  })
  return Array.from(tags).sort()
}

export async function getNodeAnchorConnections(nodeIds: string[]): Promise<Record<string, string[]>> {
  if (nodeIds.length === 0) return {}

  const result: Record<string, string[]> = {}
  nodeIds.forEach(id => { result[id] = [] })

  // Fetch edges connecting our nodes to anchors
  const orFilter = nodeIds.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(',')
  const { data: edges } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .or(orFilter)

  if (!edges || edges.length === 0) return result

  // Collect all connected node IDs
  const connectedIds = new Set<string>()
  edges.forEach((edge: { source_node_id: string; target_node_id: string }) => {
    connectedIds.add(edge.source_node_id)
    connectedIds.add(edge.target_node_id)
  })

  // Fetch which of the connected nodes are anchors
  const { data: anchors } = await supabase
    .from('knowledge_nodes')
    .select('id, label')
    .in('id', Array.from(connectedIds))
    .eq('is_anchor', true)

  if (!anchors || anchors.length === 0) return result

  const anchorMap = new Map<string, string>()
  anchors.forEach((a: { id: string; label: string }) => anchorMap.set(a.id, a.label))

  // Map back to our nodeIds
  edges.forEach((edge: { source_node_id: string; target_node_id: string }) => {
    const { source_node_id, target_node_id } = edge
    if (nodeIds.includes(source_node_id) && anchorMap.has(target_node_id) && result[source_node_id]) {
      result[source_node_id].push(anchorMap.get(target_node_id) as string)
    }
    if (nodeIds.includes(target_node_id) && anchorMap.has(source_node_id) && result[target_node_id]) {
      result[target_node_id].push(anchorMap.get(source_node_id) as string)
    }
  })

  // Deduplicate
  Object.keys(result).forEach(id => {
    result[id] = Array.from(new Set(result[id]))
  })

  return result
}

// ─── Extraction Settings ──────────────────────────────────────────────────────

export async function fetchOrCreateExtractionSettings(): Promise<ExtractionSettings | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('extraction_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (data) return data as ExtractionSettings

  const { data: newSettings, error } = await supabase
    .from('extraction_settings')
    .insert({
      user_id: user.id,
      default_mode: 'comprehensive',
      default_anchor_emphasis: 'standard',
      settings: {},
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create extraction settings:', error)
    return null
  }
  return newSettings as ExtractionSettings
}

export async function updateExtractionSettings(
  updates: Partial<{ default_mode: string; default_anchor_emphasis: string }>
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not authenticated') }

  const { error } = await supabase
    .from('extraction_settings')
    .update(updates)
    .eq('user_id', user.id)

  return { error: error ? new Error(error.message) : null }
}

// ─── Cross-Connection Queries ─────────────────────────────────────────────────

export async function fetchCrossConnectionsForSource(
  sourceId: string,
  limit: number = 3
): Promise<CrossConnection[]> {
  // 1. Get all node IDs that belong to this source
  const { data: sourceNodes } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type')
    .eq('source_id', sourceId)

  if (!sourceNodes?.length) return []

  const sourceNodeIds = sourceNodes.map(n => n.id)
  const sourceNodeMap = new Map(
    sourceNodes.map(n => [n.id, n as { id: string; label: string; entity_type: string }])
  )

  // 2. Find edges where one side is in sourceNodeIds
  const orFilter = sourceNodeIds
    .slice(0, 50) // guard against huge node lists
    .map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`)
    .join(',')

  const { data: edges } = await supabase
    .from('knowledge_edges')
    .select('id, source_node_id, target_node_id, relation_type')
    .or(orFilter)
    .limit(50)

  if (!edges?.length) return []

  // 3. Collect the "other side" node IDs (not in sourceNodeIds)
  const otherNodeIds = edges
    .map(e =>
      sourceNodeIds.includes(e.source_node_id) ? e.target_node_id : e.source_node_id
    )
    .filter(id => !sourceNodeIds.includes(id))

  if (!otherNodeIds.length) return []

  const { data: otherNodes } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, source_id')
    .in('id', [...new Set(otherNodeIds)])

  if (!otherNodes?.length) return []

  type OtherNodeRow = { id: string; label: string; entity_type: string; source_id: string | null }
  const otherNodeMap = new Map(
    (otherNodes as OtherNodeRow[]).map(n => [n.id, n])
  )

  // 4. Build CrossConnection[] — only edges where the other node belongs to a different source
  const results: CrossConnection[] = []

  for (const edge of edges) {
    if (results.length >= limit) break

    const fromId = edge.source_node_id
    const toId = edge.target_node_id
    const isFromInSource = sourceNodeIds.includes(fromId)
    const localId = isFromInSource ? fromId : toId
    const otherId = isFromInSource ? toId : fromId

    const otherNode = otherNodeMap.get(otherId)
    const localNode = sourceNodeMap.get(localId)

    if (otherNode && otherNode.source_id && otherNode.source_id !== sourceId && localNode) {
      results.push({
        id: edge.id,
        fromNodeId: localId,
        fromLabel: localNode.label,
        fromEntityType: localNode.entity_type,
        toNodeId: otherId,
        toLabel: otherNode.label,
        toEntityType: otherNode.entity_type,
        relationType: edge.relation_type ?? 'relates_to',
        toSourceId: otherNode.source_id,
        toSourceTitle: null,  // Not fetched here — use feedQueries.ts for enriched version
        toSourceType: null,
      })
    }
  }

  return results
}
