# LEGACY-PATTERNS.md — Key Patterns from Synapse V1

## Purpose

This document captures the important implementation patterns, architectural decisions, and hard-won lessons from the Synapse v1 codebase. These patterns should inform v2 implementation — adopt what works, improve where possible, and avoid repeating past mistakes.

---

## 1. Prompt Composition System

### The Pattern

Extraction quality depends heavily on how the system prompt is constructed. V1 evolved a modular prompt builder (`utils/promptBuilder.ts`) that composes the final system prompt from independent context layers. This is one of the most important patterns to preserve.

### How It Works

```
Final System Prompt =
  Base Extraction Instructions
  + Extraction Mode Template
  + User Profile Context
  + Anchor Context (with emphasis level)
  + Custom User Guidance
```

**Base Instructions** define the entity ontology (all 24 entity types with descriptions), relationship types (positive, negative, neutral), output format (JSON schema), and core extraction rules (one entity per concept, no duplicate labels, minimum confidence thresholds).

**Extraction Mode Templates** (from `config/extractionModes.ts`) adjust what the AI prioritizes:
- **Comprehensive** — maximum entity capture, all relationship types, deepest analysis
- **Strategic** — high-level concepts, decisions, strategic insights. Skip minor details
- **Actionable** — actions, goals, blockers, decisions, ownership, deadlines
- **Relational** — emphasis on connections between concepts over individual entities

**User Profile Context** (from `utils/profileContext.ts`) injects the user's professional role, interests, and processing preferences. This causes the AI to frame extractions through the user's lens — a CTO gets different entities from the same transcript than a product manager.

**Anchor Context** (from `utils/anchorContext.ts`) lists the user's designated anchors and instructs the AI on how aggressively to seek connections to them:
- **Passive** — anchors listed as "areas of interest" for optional reference
- **Standard** — explicit instruction to find connections where they naturally exist
- **Aggressive** — directive to prioritize anchor-related extraction

### V2 Guidance

Preserve this modular composition pattern. Each context layer should be a separate utility function that can be independently tested and evolved. The prompt builder should accept a configuration object and return a single string.

```typescript
interface ExtractionConfig {
  mode: 'comprehensive' | 'strategic' | 'actionable' | 'relational';
  anchorEmphasis: 'passive' | 'standard' | 'aggressive';
  anchors: Array<{ label: string; entity_type: string; description: string }>;
  userProfile: UserProfile | null;
  customGuidance?: string;
}

function buildExtractionPrompt(config: ExtractionConfig): string {
  const parts: string[] = [
    getBaseInstructions(),
    getModeTemplate(config.mode),
  ];

  if (config.userProfile) {
    parts.push(buildProfileContext(config.userProfile));
  }

  if (config.anchors.length > 0) {
    parts.push(buildAnchorContext(config.anchors, config.anchorEmphasis));
  }

  if (config.customGuidance) {
    parts.push(`\n## Additional Guidance\n${config.customGuidance}`);
  }

  return parts.join('\n\n');
}
```

---

## 2. Gemini Extraction Flow

### The Pattern

V1 uses Google Gemini 2.0 Flash for all AI operations. The extraction call follows a specific structure that produces reliable structured JSON output.

### Key Implementation Details

**API call structure:**
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text: sourceContent }]
      }],
      generationConfig: {
        temperature: 0.1,          // Low temperature for consistent extraction
        responseMimeType: 'application/json',  // Forces JSON output
      }
    })
  }
);
```

**Response parsing:** Gemini returns `response.candidates[0].content.parts[0].text` which is a JSON string. Parse it and validate the structure:

```typescript
const result = JSON.parse(responseText);
// Expected shape:
{
  entities: [
    { label: string, entity_type: string, description: string, confidence: number, tags: string[] }
  ],
  relationships: [
    { source: string, target: string, relation_type: string, evidence: string }
  ]
}
```

**Entity deduplication:** Before saving, check for existing nodes with the same label (case-insensitive). If a match exists, consider merging rather than creating a duplicate.

**Embedding generation:** After extraction, each node gets an embedding:
```typescript
const embeddingResponse = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text: `${node.label}: ${node.description}` }] }
    })
  }
);
// Returns: response.embedding.values (768-dimensional float array)
```

### V2 Guidance

Keep the same API patterns. Consider adding:
- Retry logic with exponential backoff for rate limit errors
- Streaming support for long extractions (show progress)
- Batch embedding generation (multiple texts in one call if the API supports it)

---

## 3. Cross-Connection Discovery

### The Pattern

After extracting entities from a new source, V1 compares new nodes against existing graph nodes to discover connections that span sources. This is what makes the graph compound in value — the 100th ingestion creates connections to the previous 99.

### How It Works

1. After extraction, collect all new nodes
2. Fetch existing nodes from the database (same user)
3. Send both sets to Gemini with a prompt asking: "Which new entities have meaningful relationships with existing entities?"
4. Gemini returns potential cross-connections with relationship types and evidence
5. Save as new edges in `knowledge_edges`

### V2 Guidance

This is computationally expensive when the graph is large. V1 sent all existing nodes as context, which hits token limits. V2 should:
- Use semantic search to find the most relevant existing nodes (top 50–100 by embedding similarity) rather than sending all
- Batch cross-connection discovery if many new nodes are created
- Show cross-connections prominently in the UI (they're the highest-value output)

---

## 4. Hybrid Search for Graph RAG

### The Pattern

V1 implements hybrid search that runs keyword and semantic search in parallel, then merges and reranks results.

### Implementation

**Semantic search:** Uses pgvector cosine similarity on the `source_chunks` table embeddings. The query text is embedded via Gemini, then compared against stored chunk embeddings using a Supabase RPC function.

**Keyword search:** Uses PostgreSQL full-text search on `knowledge_nodes` (label + description) and `knowledge_sources` (title + content). The `to_tsvector`/`to_tsquery` pattern.

**Merge strategy:**
1. Run both searches in parallel
2. Normalize scores to 0–1 range
3. For results appearing in both, combine scores (e.g., `0.6 * semantic + 0.4 * keyword`)
4. For single-source results, use the score from whichever search found them
5. Sort by combined score, take top N

**Context assembly for RAG:**
- Top source chunks (the actual text passages, not summaries)
- Node summaries for entities related to the query
- Relationship paths connecting relevant entities (graph traversal)

### Key Lesson from V1

Source content chunks (the actual ~500-token text passages) are far more valuable for RAG than entity summaries. Entity extraction is lossy — it captures what the AI deemed important but loses nuance, context, and details. Chunked source content preserves everything. Always prioritize source chunks in RAG context.

### V2 Guidance

Preserve the hybrid approach. Improvements to consider:
- **Query decomposition** — break complex questions into sub-queries, run each separately, then synthesize
- **Enhanced reranking** — use Gemini to rerank the top candidates for relevance to the original question
- **Deep graph traversal** — follow edges 2–3 hops from top results to pull in transitively relevant context
- **Real-time progress UI** — V1 added a 7-step progress indicator showing users what the RAG pipeline is doing (embedding query → semantic search → keyword search → graph traversal → context assembly → generating → done). This builds trust.

---

## 5. YouTube Transcript Extraction

### The Pattern

YouTube transcript extraction uses a three-tier fallback system to maximize success rate while minimizing cost.

### Tiers

1. **Tier 1: `youtube-caption-extractor`** (npm package)
   - Free, fast (~15s timeout)
   - ~90% success rate on videos with captions
   - First choice for cost efficiency

2. **Tier 2: Innertube API**
   - Direct call to YouTube's internal API
   - Free, ~15s timeout
   - Medium success rate
   - Fallback when npm package fails

3. **Tier 3: Apify** (`pintostudio/youtube-transcript-scraper` actor)
   - Paid per-use
   - ~120s timeout
   - Very high success rate
   - Cloud-based scraper for edge cases

If all three tiers fail, the queue item is marked `failed` with a retry counter (max 3 retries).

### Channel Discovery

Channels are polled via RSS feed (`youtube.com/feeds/videos.xml?channel_id=...`), not the YouTube Data API. This is free and has no quota limits. The RSS feed returns the latest ~15 videos per channel.

Playlist discovery uses the YouTube Data API v3 (`/playlistItems` endpoint, 50 items per page, max 200).

### V2 Guidance

Preserve the tiered approach. Key improvements:
- Better error categorization (rate limit vs. no captions vs. network error)
- Progress tracking per tier (show which tier is being attempted)
- Consider caching successful tier for each channel (if Tier 1 works for a channel, try it first)

---

## 6. Source Content Chunking

### The Pattern

Raw source content is split into ~500-token passages stored in `source_chunks` with individual embeddings. This was identified as the single highest-impact improvement for RAG quality.

### Why It Matters

Before chunking, RAG used entity summaries as context. This was lossy — entity extraction captures themes but loses specific details, quotes, data points, and nuances. By chunking the raw source and embedding each chunk, semantic search can find the specific passage that answers a query, not just a related entity summary.

### Implementation

```
Source content (could be 10,000+ tokens)
  → Split at sentence boundaries, targeting ~500 tokens per chunk
  → Each chunk gets a Gemini embedding
  → Stored in source_chunks table with source_id foreign key
  → Semantic search queries against these chunks
```

### V2 Guidance

Preserve this pattern exactly. Consider:
- Overlapping chunks (50-token overlap) for better boundary handling
- Metadata per chunk (position in source, section headers if available)
- Complete embedding coverage check on app load (warn if chunks are missing embeddings)

---

## 7. Vercel Serverless Lessons

### The Critical Bug

V1 had persistent deployment failures caused by serverless functions importing files that didn't exist. Vercel bundles each `api/` file independently — local imports from `_utils/` or sibling files are not automatically included in the bundle.

### Symptoms
- `FUNCTION_INVOCATION_FAILED` in Vercel runtime logs
- Generic 500 errors in the frontend
- Functions work locally but fail in deployment
- The error message in the frontend may be misleading (it shows whatever error the partially-loaded function produces, not the actual import failure)

### Resolution Rules
1. **Every `api/` file must be 100% self-contained**
2. All helper functions defined inline (even if duplicated across files)
3. npm package imports are fine — only local file imports break
4. Always check Vercel **runtime logs** (not build logs, not frontend errors) for diagnosis
5. Test every serverless function after deployment by hitting the endpoint directly

### V2 Guidance

Follow the same rules strictly. No exceptions. The cost of duplicating a 20-line helper function across 3 files is trivial compared to the cost of debugging silent deployment failures.

---

## 8. UI Architecture Lessons

### Key Insight

Neither UI improvements nor backend enhancements ship well in isolation. Beautiful interfaces need substantive content behind them. Powerful retrieval behind a minimal chat interface goes unnoticed. The compound effect of simultaneous frontend and backend improvements transforms the platform.

### Specific Lessons

**Graph visualization at scale:** The force-directed graph becomes a "hairball" at 200+ nodes. V2's source-anchor level abstraction (showing sources and anchors instead of individual entities) was designed to solve this. Entities are revealed on demand via double-click expansion.

**Real-time feedback builds trust:** The 7-step RAG progress indicator (showing users what the pipeline is doing at each stage) significantly improved perceived quality. Users trusted the AI more when they could see it working.

**Serendipity vs. structure:** Over-optimizing extraction toward existing anchors reduces discovery of unexpected connections. The balance is important — anchors should guide but not constrain. This is why "Passive" anchor emphasis exists as an option.

**Three-pane architecture:** The nav rail + center stage + right panel layout works well. The right panel being contextual (showing different content based on what's selected) keeps the interface from feeling cramped while providing depth on demand.
