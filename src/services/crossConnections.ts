import { supabase } from './supabase'
import { fetchWithRetry } from './gemini'
import type { DiscoveredEdge } from '../types/extraction'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MAX_GEMINI_CALLS = 3
const CANDIDATES_PER_NODE = 20
const BATCH_SIZE = 20

interface NodeWithEmbedding {
  id: string
  label: string
  entity_type: string
  description: string | null
  embedding: number[] | null
}

/**
 * Discovers cross-connections between newly extracted entities and the existing graph.
 * Uses semantic similarity to find candidates, then Gemini for relationship inference.
 *
 * This function never throws — failures return an empty array.
 */
export async function discoverCrossConnections(
  newNodeIds: string[],
  userId: string
): Promise<DiscoveredEdge[]> {
  if (newNodeIds.length === 0) return []

  try {
    // Step 1: Fetch new nodes with embeddings
    const { data: newNodes, error: fetchError } = await supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type, description, embedding')
      .in('id', newNodeIds)

    if (fetchError || !newNodes?.length) {
      console.warn('[crossConnections] Failed to fetch new nodes:', fetchError?.message)
      return []
    }

    // Step 2: Find similar existing nodes for each new node
    const candidates = await findCandidates(
      newNodes as NodeWithEmbedding[],
      newNodeIds,
      userId
    )

    if (candidates.length === 0) return []

    // Step 3: Send candidates to Gemini for relationship inference
    const discoveredEdges = await inferRelationships(
      newNodes as NodeWithEmbedding[],
      candidates
    )

    return discoveredEdges
  } catch (err) {
    console.warn('[crossConnections] Discovery failed:', err)
    return []
  }
}

interface CandidatePair {
  newNode: NodeWithEmbedding
  existingNode: NodeWithEmbedding
}

async function findCandidates(
  newNodes: NodeWithEmbedding[],
  newNodeIds: string[],
  _userId: string
): Promise<CandidatePair[]> {
  const allCandidates: CandidatePair[] = []

  for (const newNode of newNodes) {
    if (!newNode.embedding) continue

    try {
      // Try RPC-based vector similarity search first
      const { data: similarNodes, error: rpcError } = await supabase.rpc(
        'match_knowledge_nodes',
        {
          query_embedding: newNode.embedding,
          match_threshold: 0.7,
          match_count: CANDIDATES_PER_NODE,
          exclude_ids: newNodeIds,
        }
      )

      if (!rpcError && similarNodes?.length) {
        for (const similar of similarNodes) {
          allCandidates.push({
            newNode,
            existingNode: {
              id: similar.id,
              label: similar.label,
              entity_type: similar.entity_type,
              description: similar.description,
              embedding: null, // not needed for inference
            },
          })
        }
        continue
      }
    } catch {
      // RPC may not exist — fall back to recent nodes
    }

    // Fallback: fetch recent existing nodes (non-semantic but functional)
    const { data: recentNodes } = await supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type, description')
      .not('id', 'in', `(${newNodeIds.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(CANDIDATES_PER_NODE)

    if (recentNodes?.length) {
      for (const existing of recentNodes) {
        allCandidates.push({
          newNode,
          existingNode: existing as NodeWithEmbedding,
        })
      }
    }
  }

  return allCandidates
}

async function inferRelationships(
  newNodes: NodeWithEmbedding[],
  candidates: CandidatePair[]
): Promise<DiscoveredEdge[]> {
  if (!GEMINI_API_KEY) return []

  // Deduplicate candidates by unique pair
  const seen = new Set<string>()
  const uniqueCandidates = candidates.filter(c => {
    const key = `${c.newNode.id}:${c.existingNode.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Batch into groups for Gemini calls
  const batches: CandidatePair[][] = []
  for (let i = 0; i < uniqueCandidates.length; i += BATCH_SIZE) {
    batches.push(uniqueCandidates.slice(i, i + BATCH_SIZE))
  }

  // Cap Gemini calls
  const batchesToProcess = batches.slice(0, MAX_GEMINI_CALLS)
  const allEdges: DiscoveredEdge[] = []

  // Build lookup maps
  const newNodeMap = new Map(newNodes.map(n => [n.label.toLowerCase(), n.id]))
  const existingNodeMap = new Map(
    uniqueCandidates.map(c => [c.existingNode.label.toLowerCase(), c.existingNode.id])
  )

  for (const batch of batchesToProcess) {
    try {
      const edges = await inferBatch(batch, newNodeMap, existingNodeMap)
      allEdges.push(...edges)
    } catch (err) {
      console.warn('[crossConnections] Batch inference failed:', err)
      // Continue with remaining batches
    }
  }

  return allEdges
}

async function inferBatch(
  batch: CandidatePair[],
  newNodeMap: Map<string, string>,
  existingNodeMap: Map<string, string>
): Promise<DiscoveredEdge[]> {
  const newEntitiesList = [...new Set(batch.map(c => c.newNode))].map(
    n => `- ${n.label} (${n.entity_type}): ${n.description || 'No description'}`
  )

  const existingEntitiesList = [...new Set(batch.map(c => c.existingNode))].map(
    n => `- ${n.label} (${n.entity_type}): ${n.description || 'No description'}`
  )

  const prompt = `Given these pairs of entities from different sources, identify which pairs have meaningful relationships. Only return relationships where a genuine connection exists — do not force connections.

New entities (from the just-ingested source):
${newEntitiesList.join('\n')}

Existing entities (from the user's knowledge graph):
${existingEntitiesList.join('\n')}

Return JSON:
{
  "connections": [
    {
      "new_entity": "exact label of the new entity",
      "existing_entity": "exact label of the existing entity",
      "relation_type": "one of: leads_to, supports, enables, blocks, contradicts, part_of, relates_to, mentions, connected_to, associated_with",
      "evidence": "brief justification for this connection"
    }
  ]
}

Return an empty connections array if no genuine connections exist.`

  const response = await fetchWithRetry(
    `${GEMINI_BASE_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You are a knowledge graph relationship expert. Identify genuine connections between entities.' }],
        },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) return []

  let parsed: { connections?: Array<{ new_entity: string; existing_entity: string; relation_type: string; evidence: string }> }
  try {
    parsed = JSON.parse(rawText)
  } catch {
    console.warn('[crossConnections] Failed to parse Gemini response')
    return []
  }

  if (!Array.isArray(parsed.connections)) return []

  const edges: DiscoveredEdge[] = []
  for (const conn of parsed.connections) {
    const newId = newNodeMap.get(conn.new_entity?.toLowerCase())
    const existingId = existingNodeMap.get(conn.existing_entity?.toLowerCase())

    if (newId && existingId && conn.relation_type) {
      edges.push({
        sourceNodeId: newId,
        targetNodeId: existingId,
        relationType: conn.relation_type,
        evidence: conn.evidence || '',
        weight: 0.8,
      })
    }
  }

  return edges
}

/**
 * Saves discovered cross-connection edges to the database.
 */
export async function saveCrossConnectionEdges(
  userId: string,
  edges: DiscoveredEdge[]
): Promise<string[]> {
  if (edges.length === 0) return []

  const toInsert = edges.map(e => ({
    user_id: userId,
    source_node_id: e.sourceNodeId,
    target_node_id: e.targetNodeId,
    relation_type: e.relationType,
    evidence: e.evidence || null,
    weight: e.weight,
  }))

  const { data, error } = await supabase
    .from('knowledge_edges')
    .insert(toInsert)
    .select('id')

  if (error) {
    console.warn('[crossConnections] Failed to save cross-connection edges:', error.message)
    return []
  }

  return (data ?? []).map(d => d.id)
}
