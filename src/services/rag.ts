import { embedQuery, generateRAGResponse } from './gemini'
import {
  semanticSearchChunks,
  keywordSearchNodes,
  keywordSearchSources,
  traverseGraphFromNodes,
  fetchSourcesByIds,
  fetchNodesByIds,
} from './supabase'
import type {
  RAGPipelineStep,
  RAGContext,
  RAGResponseContext,
  EnrichedChunk,
  NodeSummary,
  RelationshipPath,
  Citation,
  SemanticChunkResult,
  KeywordNodeResult,
  KeywordSourceResult,
} from '../types/rag'
import type { KnowledgeNode, KnowledgeEdge } from '../types/database'

// ─── Merge & Rerank ───────────────────────────────────────────────────────────

interface MergedResult {
  topChunks: SemanticChunkResult[]
  allSourceIds: Set<string>
}

function mergeAndRerank(
  semanticChunks: SemanticChunkResult[],
  keywordNodes: KeywordNodeResult[],
  keywordSources: KeywordSourceResult[]
): MergedResult {
  const allSourceIds = new Set<string>()

  for (const node of keywordNodes) {
    if (node.source_id) allSourceIds.add(node.source_id)
  }
  for (const source of keywordSources) {
    allSourceIds.add(source.id)
  }
  for (const chunk of semanticChunks) {
    allSourceIds.add(chunk.source_id)
  }

  // Boost chunks from keyword-matched sources (cross-signal reinforcement)
  const boostedChunks = semanticChunks.map(chunk => ({
    ...chunk,
    similarity: allSourceIds.has(chunk.source_id)
      ? Math.min(chunk.similarity * 1.15, 1.0)
      : chunk.similarity,
  }))

  boostedChunks.sort((a, b) => b.similarity - a.similarity)

  return { topChunks: boostedChunks, allSourceIds }
}

// ─── Seed Node Extraction ─────────────────────────────────────────────────────

function extractSeedNodeIds(
  _mergedResult: MergedResult,
  keywordNodes: KeywordNodeResult[]
): string[] {
  const ids = new Set<string>()
  for (const node of keywordNodes) {
    ids.add(node.id)
  }
  return Array.from(ids)
}

// ─── Enrich Chunks with Source Metadata ───────────────────────────────────────

async function enrichChunksWithSourceMetadata(
  chunks: SemanticChunkResult[]
): Promise<EnrichedChunk[]> {
  if (chunks.length === 0) return []

  const sourceIds = chunks.map(c => c.source_id)
  const sourceMap = await fetchSourcesByIds(sourceIds)

  return chunks.map(chunk => {
    const source = sourceMap.get(chunk.source_id)
    return {
      id: chunk.id,
      source_id: chunk.source_id,
      content: chunk.content,
      similarity: chunk.similarity,
      sourceTitle: source?.title ?? 'Unknown Source',
      sourceType: source?.source_type ?? 'Document',
      sourceCreatedAt: source?.created_at ?? new Date().toISOString(),
    }
  })
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateNodes(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const seen = new Set<string>()
  return nodes.filter(n => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

function deduplicateKeywordNodes(nodes: KeywordNodeResult[]): KeywordNodeResult[] {
  const seen = new Set<string>()
  return nodes.filter(n => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}

// ─── Relationship Path Builder ────────────────────────────────────────────────

function buildRelationshipPaths(
  nodes: KnowledgeNode[],
  edges: KnowledgeEdge[]
): RelationshipPath[] {
  const nodeMap = new Map<string, string>()
  for (const node of nodes) {
    nodeMap.set(node.id, node.label)
  }

  const paths: RelationshipPath[] = []
  for (const edge of edges) {
    const from = nodeMap.get(edge.source_node_id)
    const to = nodeMap.get(edge.target_node_id)
    if (!from || !to) continue

    paths.push({
      from,
      relation: edge.relation_type ?? 'relates_to',
      to,
      evidence: edge.evidence ?? undefined,
    })
  }
  return paths
}

// ─── Citation Resolution ──────────────────────────────────────────────────────

async function resolveCitations(
  rawCitations: Citation[],
  _userId: string
): Promise<Citation[]> {
  const nodeIds = rawCitations
    .map(c => c.node_id)
    .filter((id): id is string => id !== null && id.length > 0)

  if (nodeIds.length === 0) return rawCitations

  const nodes = await fetchNodesByIds(nodeIds)
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  return rawCitations.map(citation => {
    if (!citation.node_id) return citation
    const node = nodeMap.get(citation.node_id)
    if (!node) return citation
    return {
      ...citation,
      label: node.label,
      entity_type: node.entity_type,
    }
  })
}

// ─── Main RAG Pipeline ────────────────────────────────────────────────────────

export interface RAGResponse {
  answer: string
  citations: Citation[]
  sourceChunks: EnrichedChunk[]
  relatedNodes: KnowledgeNode[]
  relatedEdges: KnowledgeEdge[]
}

export async function queryGraph(
  question: string,
  userId: string,
  conversationHistory: { role: string; content: string }[],
  onStepChange?: (step: RAGPipelineStep) => void,
  signal?: AbortSignal
): Promise<RAGResponse> {
  const checkAbort = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  }

  // ─── Step 1: Embed the query ───
  onStepChange?.('embedding')
  const queryEmbedding = await embedQuery(question)
  checkAbort()

  // ─── Step 2: Parallel hybrid search ───
  onStepChange?.('semantic_search')
  const [semanticResults, keywordNodeResults, keywordSourceResults] = await Promise.all([
    semanticSearchChunks(queryEmbedding, userId, { matchThreshold: 0.5, matchCount: 15 }),
    keywordSearchNodes(question, userId, { limit: 10 }),
    keywordSearchSources(question, userId, { limit: 5 }),
  ])
  checkAbort()

  onStepChange?.('keyword_search')

  // ─── Step 3: Merge and rerank ───
  const mergedResults = mergeAndRerank(semanticResults, keywordNodeResults, keywordSourceResults)

  // ─── Step 4: Graph traversal ───
  onStepChange?.('graph_traversal')
  const seedNodeIds = extractSeedNodeIds(mergedResults, keywordNodeResults)
  const { nodes: graphNodes, edges: graphEdges } = seedNodeIds.length > 0
    ? await traverseGraphFromNodes(seedNodeIds.slice(0, 10), userId, 2)
    : { nodes: [] as KnowledgeNode[], edges: [] as KnowledgeEdge[] }
  checkAbort()

  // ─── Step 5: Context assembly ───
  onStepChange?.('context_assembly')

  const enrichedChunks = await enrichChunksWithSourceMetadata(mergedResults.topChunks)
  checkAbort()

  // Build keyword node summaries
  const kwNodeSummaries: NodeSummary[] = deduplicateKeywordNodes(keywordNodeResults)
    .slice(0, 10)
    .map(n => ({
      id: n.id,
      label: n.label,
      entity_type: n.entity_type,
      description: n.description,
    }))

  // Build graph node summaries
  const graphNodeSummaries: NodeSummary[] = deduplicateNodes(graphNodes)
    .slice(0, 15)
    .map(n => ({
      id: n.id,
      label: n.label,
      entity_type: n.entity_type,
      description: n.description ?? null,
    }))

  const allNodeSummaries = deduplicateKeywordNodes([
    ...kwNodeSummaries,
    ...graphNodeSummaries,
  ] as unknown as KeywordNodeResult[])
    .slice(0, 20) as unknown as NodeSummary[]

  const context: RAGContext = {
    sourceChunks: enrichedChunks.slice(0, 8),
    nodeSummaries: allNodeSummaries,
    relationshipPaths: buildRelationshipPaths(graphNodes, graphEdges).slice(0, 15),
  }

  // If no context at all, return a "no results" response without calling Gemini
  if (enrichedChunks.length === 0 && kwNodeSummaries.length === 0) {
    return {
      answer: "I couldn't find any content in your knowledge graph related to that question. Try rephrasing, or check if the relevant content has been ingested and processed.",
      citations: [],
      sourceChunks: [],
      relatedNodes: [],
      relatedEdges: [],
    }
  }

  // ─── Step 6: Generate response ───
  onStepChange?.('generating')
  const generationResult = await generateRAGResponse(
    context,
    question,
    conversationHistory.slice(-6)
  )
  checkAbort()

  // ─── Step 7: Resolve citations ───
  const resolvedCitations = await resolveCitations(generationResult.citations, userId)

  return {
    answer: generationResult.answer,
    citations: resolvedCitations,
    sourceChunks: enrichedChunks,
    relatedNodes: graphNodes,
    relatedEdges: graphEdges,
  }
}

// ─── Build RAGResponseContext from RAGResponse ────────────────────────────────

export function buildRAGResponseContext(response: RAGResponse): RAGResponseContext {
  return {
    sourceChunks: response.sourceChunks,
    relatedNodes: response.relatedNodes,
    relatedEdges: response.relatedEdges,
    citations: response.citations,
  }
}
