import type { ExtractionResult, ExtractedEntity, ExtractedRelationship } from '../types/extraction'
import type { RAGContext, RAGGenerationResult, Citation } from '../types/rag'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const MAX_CONTENT_LENGTH = 100_000

// --- Custom Error ---

export class ExtractionError extends Error {
  rawData: unknown
  constructor(message: string, rawData?: unknown) {
    super(message)
    this.name = 'ExtractionError'
    this.rawData = rawData
  }
}

// --- Retry Logic ---

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) return response

      // Don't retry client errors (except rate limits)
      if (response.status === 400 || response.status === 401) {
        const errorBody = await response.text()
        throw new ExtractionError(
          `Gemini API error ${response.status}: ${errorBody}`,
          errorBody
        )
      }

      // Retry on rate limit and server errors
      if (response.status === 429 || response.status >= 500) {
        lastError = new ExtractionError(
          `Gemini API returned ${response.status}`,
          await response.text()
        )
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }

      const errorBody = await response.text()
      throw new ExtractionError(
        `Gemini API error ${response.status}: ${errorBody}`,
        errorBody
      )
    } catch (err) {
      if (err instanceof ExtractionError) throw err
      lastError = err as Error
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError ?? new ExtractionError('Gemini API request failed after retries')
}

// --- Validation Helpers ---

function validateEntity(raw: Record<string, unknown>): ExtractedEntity | null {
  if (!raw.label || typeof raw.label !== 'string') {
    console.warn('[gemini] Dropping entity: missing label', raw)
    return null
  }
  if (!raw.entity_type || typeof raw.entity_type !== 'string') {
    console.warn('[gemini] Dropping entity: missing entity_type', raw)
    return null
  }
  const confidence = typeof raw.confidence === 'number' ? raw.confidence : 0.5
  if (confidence < 0.1) {
    console.warn('[gemini] Dropping entity: very low confidence', raw.label, confidence)
    return null
  }

  return {
    label: String(raw.label).trim(),
    entity_type: String(raw.entity_type),
    description: typeof raw.description === 'string' ? raw.description : '',
    confidence: Math.min(1, Math.max(0, confidence)),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string')
      : [],
  }
}

function validateRelationship(raw: Record<string, unknown>): ExtractedRelationship | null {
  if (!raw.source || typeof raw.source !== 'string') {
    console.warn('[gemini] Dropping relationship: missing source', raw)
    return null
  }
  if (!raw.target || typeof raw.target !== 'string') {
    console.warn('[gemini] Dropping relationship: missing target', raw)
    return null
  }
  if (!raw.relation_type || typeof raw.relation_type !== 'string') {
    console.warn('[gemini] Dropping relationship: missing relation_type', raw)
    return null
  }

  return {
    source: String(raw.source).trim(),
    target: String(raw.target).trim(),
    relation_type: String(raw.relation_type),
    evidence: typeof raw.evidence === 'string' ? raw.evidence : '',
  }
}

// --- Entity Extraction ---

export async function extractEntities(
  content: string,
  systemPrompt: string
): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    throw new ExtractionError('VITE_GEMINI_API_KEY is not configured')
  }

  // Truncate very long content
  let processedContent = content
  if (content.length > MAX_CONTENT_LENGTH) {
    processedContent =
      content.substring(0, MAX_CONTENT_LENGTH) +
      '\n\n[Content truncated at 100,000 characters. The above is a partial text.]'
  }

  const response = await fetchWithRetry(
    `${GEMINI_BASE_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: processedContent }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json()

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new ExtractionError('No content in Gemini response', data)
  }

  const rawText = data.candidates[0].content.parts[0].text

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(rawText)
  } catch {
    console.error('[gemini] Failed to parse JSON response:', rawText.substring(0, 500))
    throw new ExtractionError(
      'Gemini returned an invalid response. This is usually temporary — try re-extracting.',
      rawText
    )
  }

  if (!Array.isArray(parsed.entities)) {
    throw new ExtractionError('Response missing entities array', parsed)
  }

  const entities = (parsed.entities as Record<string, unknown>[])
    .map(validateEntity)
    .filter((e): e is ExtractedEntity => e !== null)

  const relationships = Array.isArray(parsed.relationships)
    ? (parsed.relationships as Record<string, unknown>[])
        .map(validateRelationship)
        .filter((r): r is ExtractedRelationship => r !== null)
    : []

  return {
    entities,
    relationships,
    rawResponse: rawText,
  }
}

// --- Embedding Generation ---

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new ExtractionError('VITE_GEMINI_API_KEY is not configured')
  }

  const response = await fetchWithRetry(
    `${GEMINI_BASE_URL}/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
      }),
    }
  )

  const data = await response.json()

  if (!data.embedding?.values) {
    throw new ExtractionError('No embedding in Gemini response', data)
  }

  return data.embedding.values as number[]
}

export async function generateEmbeddings(
  texts: string[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = new Array(texts.length).fill(null)
  let completed = 0

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(text => generateEmbedding(text))
    )

    batchResults.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        results[i + j] = result.value
      } else {
        console.warn(
          `[gemini] Embedding failed for text ${i + j}:`,
          result.reason?.message ?? result.reason
        )
        results[i + j] = null
      }
    })

    completed += batch.length
    onProgress?.(completed, texts.length)
  }

  return results
}

// ─── RAG: Query Embedding ─────────────────────────────────────────────────────

/** Alias of generateEmbedding for use in the RAG pipeline */
export async function embedQuery(text: string): Promise<number[]> {
  return generateEmbedding(text)
}

// ─── RAG: Response Generation ─────────────────────────────────────────────────

function buildRAGSystemPrompt(context: RAGContext): string {
  const chunksText = context.sourceChunks
    .map((c, i) => `[Chunk ${i + 1} from "${c.sourceTitle}" (${c.sourceType})]:\n${c.content}`)
    .join('\n\n')

  const nodesText = context.nodeSummaries
    .map(n => `- **${n.label}** (${n.entity_type}): ${n.description ?? 'No description'}`)
    .join('\n')

  const pathsText = context.relationshipPaths
    .map(p => `${p.from} —[${p.relation}]→ ${p.to}${p.evidence ? ` (${p.evidence})` : ''}`)
    .join('\n')

  return `You are Synapse, an AI assistant that answers questions using a personal knowledge graph. You have access to the user's ingested content, extracted entities, and relationship data.

INSTRUCTIONS:
- Answer the user's question using ONLY the context provided below. Do not use general knowledge.
- If the context does not contain enough information to answer fully, say so explicitly.
- Reference specific sources and entities when making claims.
- Use **bold** for key terms and entity names.
- Be precise and substantive. The user values depth over simplicity.

RESPONSE FORMAT:
Respond with a JSON object containing:
{
  "answer": "Your full answer text with **bold** formatting for key entities",
  "citations": [
    {
      "label": "Entity or source name",
      "entity_type": "The entity type (Person, Topic, etc.)",
      "node_id": "UUID of the cited node, or null if citing a source chunk",
      "source_id": "UUID of the source, if relevant"
    }
  ]
}

CONTEXT — SOURCE CHUNKS (highest priority, these are direct quotes from ingested content):
${chunksText}

CONTEXT — ENTITY SUMMARIES:
${nodesText}

CONTEXT — RELATIONSHIP PATHS:
${pathsText}

Remember: Source chunks are your primary evidence. Entity summaries provide structure. Relationship paths show connections. Prioritize source chunks when forming your answer.`
}

function parseRAGResponse(responseText: string): RAGGenerationResult {
  const cleaned = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned) as { answer?: unknown; citations?: unknown[] }
    const answer = typeof parsed.answer === 'string' ? parsed.answer : cleaned
    const citations: Citation[] = Array.isArray(parsed.citations)
      ? (parsed.citations as Record<string, unknown>[])
          .filter(c => typeof c === 'object' && c !== null)
          .map(c => ({
            label: typeof c['label'] === 'string' ? c['label'] : '',
            entity_type: typeof c['entity_type'] === 'string' ? c['entity_type'] : 'Topic',
            node_id: typeof c['node_id'] === 'string' ? c['node_id'] : null,
            source_id: typeof c['source_id'] === 'string' ? c['source_id'] : null,
          }))
      : []
    return { answer, citations }
  } catch {
    console.warn('[gemini] Failed to parse RAG JSON, using raw text')
    return { answer: cleaned, citations: [] }
  }
}

export async function generateRAGResponse(
  context: RAGContext,
  question: string,
  conversationHistory: { role: string; content: string }[]
): Promise<RAGGenerationResult> {
  if (!GEMINI_API_KEY) {
    throw new ExtractionError('VITE_GEMINI_API_KEY is not configured')
  }

  const systemPrompt = buildRAGSystemPrompt(context)

  const contents = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ]

  const response = await fetchWithRetry(
    `${GEMINI_BASE_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) throw new ExtractionError('Empty response from Gemini', data)

  return parseRAGResponse(responseText)
}
