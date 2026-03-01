# PRD 8 — Ask View: Graph RAG Chat

**Phase:** 3 — Intelligence
**Dependencies:** PRD 2 (Shell + Navigation), PRD 4 (Browse Tab — provides Badge, NodeDetail components), PRD 5 (Graph Tab — provides MiniGraph component), PRD 7 (Ingest — provides `services/gemini.ts` embedding function, `services/supabase.ts` query patterns)
**Estimated Complexity:** Very High (3–4 sessions)

---

## 1. Objective

Build the Ask view — Synapse's Graph RAG chat interface — which lets users query their entire knowledge graph through natural language and receive grounded, cited answers. This is the primary intelligence surface: the user asks a question, the system embeds the query, runs parallel hybrid search (semantic on source chunks + keyword on node labels), traverses the graph to pull in transitively relevant context, assembles everything into a rich prompt, and generates a response via Gemini with explicit source citations.

This is the feature that makes the knowledge graph useful beyond browsing. Every piece of content the user has ever ingested becomes queryable. The RAG pipeline is the core of Synapse's value proposition — it must feel fast, the answers must be grounded and traceable, and the citations must connect back to the entity graph so the user can verify and explore further.

---

## 2. What Gets Built

### Views & Components

| File | Type | Description |
|---|---|---|
| `src/views/AskView.tsx` | View | Top-level Ask view with status bar, chat area, and input bar |
| `src/components/ask/ChatMessageList.tsx` | Component | Scrollable message list with auto-scroll behavior |
| `src/components/ask/ChatMessage.tsx` | Component | Individual message bubble (user or assistant variant) |
| `src/components/ask/CitationBadges.tsx` | Component | SOURCES section below assistant messages with clickable entity badges |
| `src/components/ask/ChatInput.tsx` | Component | Bottom input bar with textarea, send button, and helper text |
| `src/components/ask/StatusBar.tsx` | Component | Top bar showing RAG pipeline status, node/chunk counts |
| `src/components/ask/RAGProgressIndicator.tsx` | Component | Inline step progress shown during pipeline execution |
| `src/components/ask/AskRightPanel.tsx` | Component | Right panel content for Ask: context subgraph + source chunks |
| `src/components/ask/SourceChunkCard.tsx` | Component | Individual source chunk display in right panel |
| `src/components/ask/EmptyAskState.tsx` | Component | Empty state when no messages exist yet |

### Services & Hooks

| File | Type | Description |
|---|---|---|
| `src/services/rag.ts` | Service | Complete RAG pipeline orchestrator |
| `src/hooks/useRAGQuery.ts` | Hook | Manages RAG pipeline execution state, messages, loading |
| `src/hooks/useGraphTraversal.ts` | Hook | Graph edge traversal for context enrichment |
| `src/hooks/useChatScroll.ts` | Hook | Auto-scroll behavior for chat message list |

### Service Functions Added to Existing Files

| File | Function | Description |
|---|---|---|
| `src/services/gemini.ts` | `embedQuery(text)` | Embed a query string via Gemini text-embedding-004 |
| `src/services/gemini.ts` | `generateRAGResponse(context, question, history)` | Generate a response given assembled context |
| `src/services/supabase.ts` | `semanticSearchChunks(embedding, userId, options)` | pgvector cosine similarity search on `source_chunks` |
| `src/services/supabase.ts` | `keywordSearchNodes(query, userId, options)` | Full-text search on `knowledge_nodes` label + description |
| `src/services/supabase.ts` | `keywordSearchSources(query, userId, options)` | Full-text search on `knowledge_sources` title + content |
| `src/services/supabase.ts` | `getNodeNeighbors(nodeId, userId, depth)` | Recursive edge traversal returning connected nodes |
| `src/services/supabase.ts` | `getGraphStats(userId)` | Counts for nodes, chunks, edges, sources |
| `src/services/supabase.ts` | `getChunksBySourceId(sourceId)` | Fetch all chunks for a given source |

### Types

| File | Type | Description |
|---|---|---|
| `src/types/rag.ts` | Types | `ChatMessage`, `Citation`, `SourceChunkResult`, `RAGResponse`, `RAGPipelineStep`, `RAGContext`, `HybridSearchResult`, `SearchResultItem` |

---

## 3. Design Requirements

### 3.1 Overall Layout

The Ask view fills the center stage area. It is a vertically stacked layout with three zones: status bar (fixed top), chat message area (flex-1, scrollable), and input bar (fixed bottom). Content within the chat area is constrained to `max-width: 840px; margin: 0 auto`.

```
┌─────────────────────────────────────────────┐
│ ● Graph RAG Active · 847 nodes · 934 chunks │  ← StatusBar (fixed)
├─────────────────────────────────────────────┤
│                                             │
│  [User message bubble, right-aligned]       │
│                                             │
│  [Assistant message bubble, left-aligned]   │
│  SOURCES: [Badge] [Badge] [Badge]           │
│                                             │
│  [User message bubble]                      │
│                                             │
│  ⠿ Searching source chunks...              │  ← RAGProgressIndicator (inline)
│                                             │
├─────────────────────────────────────────────┤
│ [Ask your knowledge graph anything...]  [▶] │  ← ChatInput (fixed)
│   Retrieves from source chunks, entities,   │
│   and graph traversal                       │
└─────────────────────────────────────────────┘
```

### 3.2 Status Bar

Position: fixed at top of center stage content area, below the topbar.
Height: `44px`.
Background: `--bg-card` (`#ffffff`).
Border: `border-bottom: 1px solid var(--border-subtle)`.
Padding: `12px 24px`.
Layout: horizontal flex, `align-items: center`, `gap: 10px`.

Contents:
- Green status dot: `7px × 7px` circle, `background: #10b981` (semantic green-500), `border-radius: 50%`. Includes a subtle pulse animation (`@keyframes pulse { 0% { opacity: 1 } 50% { opacity: 0.6 } 100% { opacity: 1 } }`, `2s ease infinite`) to communicate liveness.
- "Graph RAG Active" label: DM Sans, `12px`, weight `600`, `--text-primary`.
- Stats: DM Sans, `11px`, weight `400`, `--text-secondary`. Format: `· {nodeCount} nodes · {chunkCount} chunks`. Separated from label by `·` with thin space. Counts loaded on mount via `getGraphStats()`.

**Error state**: When Supabase or Gemini is unreachable (detected on first failed query), the dot turns amber (`--semantic-amber-500`), the label changes to "RAG Degraded — Check connection", and the pulse accelerates to `1s`.

**Empty graph state**: When node count is 0, dot is gray (`--text-secondary`), label reads "No knowledge yet — ingest content to start querying", no stats shown.

### 3.3 Chat Messages

#### User Messages

- Alignment: `align-self: flex-end` within the message list.
- Max width: `85%` of the chat area width.
- Background: `--accent-50` (`#fff5f0`).
- Border: `1px solid` with `--accent-500` at `15%` opacity (`rgba(214, 58, 0, 0.15)`).
- Border radius: `14px 14px 4px 14px` (sharp bottom-right corner indicates sender).
- Padding: `12px 16px`.
- Role label row: DM Sans, `10px`, weight `700`, `--text-secondary`, `text-transform: uppercase`, `letter-spacing: 0.06em`. Text: "YOU". Separated from content by `padding-bottom: 5px; border-bottom: 1px solid var(--border-subtle)`. Margin below: `6px`.
- Content: DM Sans, `13px`, weight `400`, `line-height: 1.6`, `--text-body` (`#3d3d3d`), `white-space: pre-wrap`.

#### Assistant Messages

- Alignment: `align-self: flex-start` within the message list.
- Max width: `85%` of the chat area width.
- Background: `--bg-card` (`#ffffff`). Note: The mockup uses `--bg-raised` but on the `--bg-content` background, white cards provide better contrast and match the Card component spec.
- Border: `1px solid var(--border-subtle)`.
- Border radius: `14px 14px 14px 4px` (sharp bottom-left corner indicates assistant).
- Padding: `12px 16px`.
- Role label row: Same spec as user messages, but text reads "SYNAPSE" preceded by a sparkle icon (Lucide `Sparkles`, `11px`, `--accent-500`). Icon and text separated by `gap: 6px`.
- Content: DM Sans, `13px`, weight `400`, `line-height: 1.6`, `--text-body`. Bold text (wrapped in `**`) renders with `color: --text-primary; font-weight: 600`.

#### Markdown-like Rendering in Messages

Assistant message content supports lightweight formatting parsed from the Gemini response:
- `**bold text**` → `<strong>` with `--text-primary`, weight `600`
- `\n\n` → paragraph breaks
- `\n` → `<br/>`
- Backtick-wrapped inline code → DM Sans at `12px`, `--bg-inset` background, `2px 6px` padding, `4px` border-radius
- No full markdown parsing needed — just bold, line breaks, and inline code.

#### Citation Badges Section

Appears below assistant message content when `citations` are present.
- Separator: `margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-subtle)`.
- Layout: horizontal flex wrap, `gap: 5px`.
- Label: "SOURCES:" in DM Sans, `10px`, weight `600`, `--text-secondary`, `align-self: center`, `margin-right: 2px`.
- Each citation renders as an entity `Badge` component (from PRD 4) with `small` size variant. Badges are clickable — on click, set right panel to `{ type: 'node', data: citedNode }`.

### 3.4 RAG Progress Indicator

When the pipeline is executing, an inline indicator appears at the bottom of the message list (before the response arrives). This is intentionally more subtle than the Ingest view's progress UI — it should feel like the system is thinking, not running a batch job.

**Layout:** Left-aligned block in the chat area, same max-width as assistant messages.

**Structure:** A single line showing the current step with a subtle animation.

```
⠿ Embedding query...
⠿ Searching 934 source chunks...
⠿ Searching knowledge nodes...
⠿ Traversing graph connections...
⠿ Assembling context...
⠿ Generating response...
```

- The `⠿` is a three-dot animated loader (CSS animation cycling through ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ braille patterns, or a simpler three-dot fade animation).
- Text: DM Sans, `12px`, weight `500`, `--text-secondary`.
- Step text updates as each pipeline phase completes.
- The entire indicator fades out (`opacity 1 → 0` over `0.3s`) when the response arrives.

**Pipeline steps (7 total):**

| Step | Label | Trigger |
|---|---|---|
| 1 | "Embedding query..." | Pipeline starts |
| 2 | "Searching {chunkCount} source chunks..." | Embedding complete |
| 3 | "Searching knowledge nodes..." | Semantic search started |
| 4 | "Traversing graph connections..." | Both searches complete |
| 5 | "Assembling context..." | Graph traversal complete |
| 6 | "Generating response..." | Context assembled |
| 7 | *(indicator removed)* | Response received |

### 3.5 Chat Input Bar

Position: fixed at bottom of the Ask view.
Background: `--bg-card` (`#ffffff`).
Border: `border-top: 1px solid var(--border-subtle)`.
Padding: `14px 24px`.

**Input container:** A rounded container holding the textarea and send button.
- Background: `--bg-inset` (`#f0f0f0`).
- Border: `1px solid var(--border-default)`.
- Border radius: `12px`.
- Padding: `10px 14px`.
- Layout: horizontal flex, `align-items: center`, `gap: 10px`.

**Textarea:** Auto-expanding textarea (not a regular input — supports multi-line).
- `flex: 1`.
- Background: `transparent`.
- Border: `none`.
- Font: DM Sans, `13px`, weight `400`, `--text-primary`.
- Placeholder: "Ask your knowledge graph anything...", `--text-placeholder` (`#aaaaaa`).
- Max height: `120px` (approximately 5 lines), then scrolls internally.
- Resize: `none`.
- On Enter (without Shift): submit. On Shift+Enter: newline.

**Send button:**
- Size: `32px × 32px`.
- Background: `--accent-500` (`#d63a00`).
- Border radius: `8px`.
- Icon: Lucide `Send` (`ArrowUp` preferred for chat convention), `13px`, white (`#ffffff`).
- Cursor: `pointer`.
- **Disabled state** (when input is empty or pipeline is running): `opacity: 0.3`, `cursor: default`, `pointer-events: none`.
- **Hover state** (when enabled): `background: --accent-600` (`#b83300`), transition `0.15s ease`.

**Helper text:** Below the input container.
- Text: "Retrieves from source chunks, entities, and graph traversal".
- DM Sans, `10px`, weight `400`, `--text-secondary`.
- `text-align: center`, `margin-top: 6px`.

**Focus behavior:** When the input container receives focus (via the textarea):
- Border transitions to `1px solid var(--accent-300)`.
- A subtle outer ring appears: `box-shadow: 0 0 0 3px var(--accent-50)`.
- Transition: `0.15s ease`.

### 3.6 Empty State

When the user opens Ask for the first time (no messages in session), the chat area shows a centered empty state.

- Icon: Lucide `MessageSquareText`, `48px`, `--text-placeholder`.
- Heading: "Ask your knowledge graph" — Cabinet Grotesk, `18px`, weight `700`, `--text-primary`.
- Subtext: "Ask questions and get answers grounded in your ingested content, with source citations and graph context." — DM Sans, `13px`, weight `400`, `--text-secondary`, max-width `400px`, `text-align: center`.
- Suggested queries section (below, with `24px` gap):
  - Section label: "TRY ASKING" — Cabinet Grotesk, `10px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`, uppercase.
  - Three clickable suggestion chips arranged vertically with `8px` gap:
    - "What connections exist between my recent meeting notes?"
    - "Summarize everything I know about [most-connected anchor label]"
    - "What are the key risks across my active projects?"
  - Chip style: `--bg-card` background, `1px solid var(--border-subtle)`, `10px` border-radius, `10px 16px` padding, DM Sans `12px` weight `500` `--text-body`. On hover: border darkens to `--border-default`, `0.15s ease`. On click: populate the input and auto-submit.
  - The second suggestion is dynamic — it reads the user's top anchor (highest connection count) and inserts its label. If no anchors exist, replace with "What are the most important themes in my knowledge?"

### 3.7 Right Panel — Ask Context

When an assistant message is selected (clicked or the most recent response), the right panel shows a contextual view with two sections.

**Panel header:** "CONTEXT" — Cabinet Grotesk, `10px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`, uppercase. Padding: `0 0 12px 0`, `border-bottom: 1px solid var(--border-subtle)`.

#### Section 1: Related Subgraph

- Section label: "RELATED SUBGRAPH" — same section label style.
- `MiniGraph` component (from PRD 5): renders a `290px × 160px` non-interactive graph visualization showing only the nodes and edges referenced in the current response.
- Props: `nodes: KnowledgeNode[]`, `edges: KnowledgeEdge[]`, `interactive: false`.
- The MiniGraph uses the same entity type colors as the full graph but at a smaller scale — node dots are `5px` radius, no labels, edges at `0.5px` stroke.
- Container: `--bg-content` background (`#f7f7f7`), `8px` border-radius, `1px solid var(--border-subtle)`.
- Below the graph, a small count: DM Sans, `10px`, `--text-secondary`: "{N} nodes · {M} relationships".
- If MiniGraph component is not yet available (PRD 5 not complete), render a placeholder with a dotted border and "Graph visualization" text.

#### Section 2: Source Chunks Used

- Section label: "SOURCE CHUNKS" — same section label style. Includes count: "(N used)".
- Margin-top: `20px`.
- List of `SourceChunkCard` components, each representing a chunk that was used in context assembly. Max `5` shown by default, with a "Show all N chunks" ghost button if more exist.
- Gap between cards: `8px`.

**SourceChunkCard design:**
- Container: `--bg-card` background, `1px solid var(--border-subtle)`, `8px` border-radius, `12px` padding.
- Source title: DM Sans, `11px`, weight `600`, `--accent-500`. Clickable — clicking navigates the right panel to show the full source detail.
- Source type + timestamp: DM Sans, `10px`, weight `400`, `--text-secondary`. Format: "Meeting · 3 hours ago".
- Chunk text: DM Sans, `11px`, weight `400`, `--text-body`, `line-height: 1.5`. Clamped to 4 lines with `...` overflow. On click: expands to show full chunk text (with smooth height animation, `0.2s ease`).
- Relevance indicator: thin left border in `--accent-200` with width proportional to the chunk's relevance score (2px at score < 0.7, 3px at 0.7-0.85, 4px at 0.85+).
- Hover: border darkens to `--border-default`, `cursor: pointer`, `0.15s ease`.

### 3.8 Animation & Transitions

- **Message entry:** New messages animate in with `opacity: 0 → 1`, `translateY(8px) → 0`, `0.3s ease`. User messages slide from right, assistant messages from left.
- **Auto-scroll:** When a new message arrives (user or assistant), the chat area scrolls to bottom smoothly (`scroll-behavior: smooth` on the container, or `scrollIntoView({ behavior: 'smooth' })` on a bottom sentinel element).
- **Progress indicator:** Steps crossfade between each other (`opacity` transition, `0.2s ease`).
- **Page load:** Empty state fades in with the standard staggered animation (`0.4s ease`, `0.05s` delay per element).

---

## 4. Data & Service Layer

### 4.1 Supabase RPC: Semantic Search on Source Chunks

This requires a PostgreSQL function (RPC) that performs cosine similarity search using pgvector. This function should already exist from V1, but if it doesn't, it must be created.

**Required Supabase RPC function (if not present):**

```sql
CREATE OR REPLACE FUNCTION match_source_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  chunk_index INT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.source_id,
    sc.chunk_index,
    sc.content,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM source_chunks sc
  WHERE sc.user_id = p_user_id
    AND sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Calling from client:**

```typescript
// services/supabase.ts
export async function semanticSearchChunks(
  embedding: number[],
  userId: string,
  options: { matchThreshold?: number; matchCount?: number } = {}
): Promise<SemanticChunkResult[]> {
  const { matchThreshold = 0.5, matchCount = 10 } = options;

  const { data, error } = await supabase.rpc('match_source_chunks', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    p_user_id: userId,
  });

  if (error) throw new Error(`Semantic search failed: ${error.message}`);
  return data ?? [];
}
```

**Note on threshold:** Start with `0.5` (not `0.7`) to ensure we get results even for loosely related queries. The reranking step will handle precision. Users with small graphs need broader recall.

### 4.2 Keyword Search on Nodes

```typescript
// services/supabase.ts
export async function keywordSearchNodes(
  query: string,
  userId: string,
  options: { limit?: number } = {}
): Promise<KeywordNodeResult[]> {
  const { limit = 10 } = options;

  // Convert query to tsquery format — split on spaces, join with &
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(term => `${term}:*`) // prefix matching
    .join(' & ');

  if (!tsQuery) return [];

  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, source, source_type, source_id, confidence, is_anchor, tags, created_at')
    .eq('user_id', userId)
    .or(`label.fts.${tsQuery},description.fts.${tsQuery}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Keyword search failed: ${error.message}`);
  return data ?? [];
}
```

**Fallback for `fts` not configured:** If full-text search is not enabled on these columns, fall back to `ilike` pattern matching:

```typescript
// Fallback using ilike
const { data, error } = await supabase
  .from('knowledge_nodes')
  .select('id, label, entity_type, description, source, source_type, source_id, confidence, is_anchor, tags, created_at')
  .eq('user_id', userId)
  .or(`label.ilike.%${query}%,description.ilike.%${query}%`)
  .order('created_at', { ascending: false })
  .limit(limit);
```

### 4.3 Keyword Search on Sources

```typescript
// services/supabase.ts
export async function keywordSearchSources(
  query: string,
  userId: string,
  options: { limit?: number } = {}
): Promise<KeywordSourceResult[]> {
  const { limit = 5 } = options;

  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_type, source_url, created_at')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Source search failed: ${error.message}`);
  return data ?? [];
}
```

### 4.4 Graph Traversal

```typescript
// services/supabase.ts
export async function getNodeNeighbors(
  nodeIds: string[],
  userId: string,
  depth: number = 2
): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
  const visitedNodeIds = new Set<string>(nodeIds);
  const allEdges: KnowledgeEdge[] = [];
  let currentFrontier = [...nodeIds];

  for (let hop = 0; hop < depth; hop++) {
    if (currentFrontier.length === 0) break;

    // Fetch edges connected to current frontier
    const { data: edges, error } = await supabase
      .from('knowledge_edges')
      .select('id, source_node_id, target_node_id, relation_type, evidence, weight')
      .eq('user_id', userId)
      .or(
        currentFrontier
          .map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`)
          .join(',')
      );

    if (error) throw new Error(`Graph traversal failed: ${error.message}`);
    if (!edges || edges.length === 0) break;

    allEdges.push(...edges);

    // Collect new neighbor IDs for the next hop
    const nextFrontier: string[] = [];
    for (const edge of edges) {
      for (const neighborId of [edge.source_node_id, edge.target_node_id]) {
        if (!visitedNodeIds.has(neighborId)) {
          visitedNodeIds.add(neighborId);
          nextFrontier.push(neighborId);
        }
      }
    }
    currentFrontier = nextFrontier;
  }

  // Fetch all discovered nodes
  const allNodeIds = Array.from(visitedNodeIds);
  const { data: nodes, error: nodeError } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, source, source_type, source_id, confidence, is_anchor, tags, created_at')
    .in('id', allNodeIds);

  if (nodeError) throw new Error(`Node fetch failed: ${nodeError.message}`);

  return {
    nodes: nodes ?? [],
    edges: allEdges,
  };
}
```

**Performance constraint:** The `or()` filter for graph traversal can become expensive with many frontier nodes. Cap the frontier at 20 nodes per hop. If more than 20 results from a hop, sort by edge weight descending and take top 20.

### 4.5 Embedding Generation

```typescript
// services/gemini.ts
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const EMBEDDING_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

export async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.embedding.values; // number[] of 768 dimensions
}
```

### 4.6 RAG Response Generation

```typescript
// services/gemini.ts
const GENERATION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateRAGResponse(
  context: RAGContext,
  question: string,
  conversationHistory: { role: string; content: string }[]
): Promise<RAGGenerationResult> {
  const systemPrompt = buildRAGSystemPrompt(context);

  const contents = [
    ...conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: question }] },
  ];

  const response = await fetch(`${GENERATION_URL}?key=${GEMINI_API_KEY}`, {
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
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Generation failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) throw new Error('Empty response from Gemini');

  return parseRAGResponse(responseText);
}
```

### 4.7 RAG System Prompt Builder

```typescript
// services/rag.ts (internal helper)
function buildRAGSystemPrompt(context: RAGContext): string {
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
${context.sourceChunks.map((c, i) => `[Chunk ${i + 1} from "${c.sourceTitle}" (${c.sourceType})]:
${c.content}`).join('\n\n')}

CONTEXT — ENTITY SUMMARIES:
${context.nodeSummaries.map(n => `- **${n.label}** (${n.entity_type}): ${n.description}`).join('\n')}

CONTEXT — RELATIONSHIP PATHS:
${context.relationshipPaths.map(p => `${p.from} —[${p.relation}]→ ${p.to}${p.evidence ? ` (${p.evidence})` : ''}`).join('\n')}

Remember: Source chunks are your primary evidence. Entity summaries provide structure. Relationship paths show connections. Prioritize source chunks when forming your answer.`;
}
```

### 4.8 Full RAG Pipeline Orchestrator

```typescript
// services/rag.ts
export interface RAGResponse {
  answer: string;
  citations: Citation[];
  sourceChunks: SourceChunkResult[];
  relatedNodes: KnowledgeNode[];
  relatedEdges: KnowledgeEdge[];
}

export async function queryGraph(
  question: string,
  userId: string,
  conversationHistory: { role: string; content: string }[],
  onStepChange?: (step: RAGPipelineStep) => void
): Promise<RAGResponse> {

  // ─── Step 1: Embed the query ───
  onStepChange?.('embedding');
  const queryEmbedding = await embedQuery(question);

  // ─── Step 2: Parallel hybrid search ───
  onStepChange?.('semantic_search');
  const [semanticResults, keywordNodeResults, keywordSourceResults] = await Promise.all([
    semanticSearchChunks(queryEmbedding, userId, {
      matchThreshold: 0.5,
      matchCount: 15,
    }),
    keywordSearchNodes(question, userId, { limit: 10 }),
    keywordSearchSources(question, userId, { limit: 5 }),
  ]);
  onStepChange?.('keyword_search');

  // ─── Step 3: Merge and rerank ───
  const mergedResults = mergeAndRerank(semanticResults, keywordNodeResults, keywordSourceResults);

  // ─── Step 4: Graph traversal ───
  onStepChange?.('graph_traversal');
  const seedNodeIds = extractSeedNodeIds(mergedResults, keywordNodeResults);
  const { nodes: graphNodes, edges: graphEdges } = seedNodeIds.length > 0
    ? await getNodeNeighbors(seedNodeIds.slice(0, 10), userId, 2)
    : { nodes: [], edges: [] };

  // ─── Step 5: Context assembly ───
  onStepChange?.('context_assembly');

  // Enrich source chunks with source metadata
  const enrichedChunks = await enrichChunksWithSourceMetadata(
    mergedResults.topChunks,
    userId
  );

  const context: RAGContext = {
    sourceChunks: enrichedChunks.slice(0, 8), // Cap at 8 chunks to stay within token limits
    nodeSummaries: deduplicateNodes([
      ...keywordNodeResults.slice(0, 10),
      ...graphNodes.slice(0, 15),
    ]).slice(0, 20),
    relationshipPaths: buildRelationshipPaths(graphNodes, graphEdges).slice(0, 15),
  };

  // ─── Step 6: Generate response ───
  onStepChange?.('generating');
  const generationResult = await generateRAGResponse(
    context,
    question,
    conversationHistory.slice(-6) // Last 3 exchanges for conversation context
  );

  // ─── Step 7: Resolve citations to full node objects ───
  const resolvedCitations = await resolveCitations(generationResult.citations, userId);

  return {
    answer: generationResult.answer,
    citations: resolvedCitations,
    sourceChunks: enrichedChunks,
    relatedNodes: graphNodes,
    relatedEdges: graphEdges,
  };
}
```

### 4.9 Merge and Rerank Strategy

```typescript
// services/rag.ts (internal helper)
interface MergedResult {
  topChunks: SemanticChunkResult[];
  allSourceIds: Set<string>;
}

function mergeAndRerank(
  semanticChunks: SemanticChunkResult[],
  keywordNodes: KeywordNodeResult[],
  keywordSources: KeywordSourceResult[]
): MergedResult {
  // Semantic chunks are the primary results (per V1 lesson: chunks > entity summaries)
  // Keyword results help us identify additional relevant sources
  const allSourceIds = new Set<string>();

  // Collect source IDs from keyword-matched nodes
  for (const node of keywordNodes) {
    if (node.source_id) allSourceIds.add(node.source_id);
  }

  // Collect source IDs from keyword-matched sources
  for (const source of keywordSources) {
    allSourceIds.add(source.id);
  }

  // Collect source IDs from semantic chunks
  for (const chunk of semanticChunks) {
    allSourceIds.add(chunk.source_id);
  }

  // Boost chunks that come from keyword-matched sources
  const boostedChunks = semanticChunks.map(chunk => ({
    ...chunk,
    similarity: allSourceIds.has(chunk.source_id)
      ? Math.min(chunk.similarity * 1.15, 1.0) // 15% boost for cross-signal reinforcement
      : chunk.similarity,
  }));

  // Sort by boosted similarity
  boostedChunks.sort((a, b) => b.similarity - a.similarity);

  return {
    topChunks: boostedChunks,
    allSourceIds,
  };
}
```

### 4.10 Graph Stats

```typescript
// services/supabase.ts
export async function getGraphStats(userId: string): Promise<{
  nodeCount: number;
  chunkCount: number;
  edgeCount: number;
  sourceCount: number;
}> {
  const [nodes, chunks, edges, sources] = await Promise.all([
    supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('source_chunks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_edges').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  return {
    nodeCount: nodes.count ?? 0,
    chunkCount: chunks.count ?? 0,
    edgeCount: edges.count ?? 0,
    sourceCount: sources.count ?? 0,
  };
}
```

---

## 5. Interaction & State

### 5.1 `useRAGQuery` Hook

This is the primary state manager for the Ask view.

```typescript
// hooks/useRAGQuery.ts
interface UseRAGQueryReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  currentStep: RAGPipelineStep | null;
  error: string | null;
  lastResponseContext: RAGResponseContext | null; // For right panel
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}
```

**State management:**
- `messages: ChatMessage[]` — in React state (`useState`). Session-only, clears on page refresh. Not persisted to Supabase.
- `isLoading: boolean` — true while the RAG pipeline is executing.
- `currentStep: RAGPipelineStep | null` — which pipeline step is active (for progress indicator).
- `error: string | null` — error message if the pipeline fails. Displayed as a system message in the chat.
- `lastResponseContext: RAGResponseContext | null` — the source chunks, related nodes, and edges from the most recent response. Drives the right panel content.

**`sendMessage` flow:**
1. Create a user `ChatMessage` and append to `messages`.
2. Set `isLoading = true`.
3. Call `queryGraph()` with the question, user ID, and conversation history (previous messages mapped to `{ role, content }`).
4. On success: create an assistant `ChatMessage` with the response and citations, append to `messages`. Update `lastResponseContext`.
5. On error: create a system error message: "I couldn't process that query. Please try again." with the technical error in a collapsed detail. Set `error`.
6. Set `isLoading = false`, `currentStep = null`.

### 5.2 Right Panel Integration

The Ask view controls the right panel through the `RightPanelContext` (from PRD 2).

**Default state** (no messages or on page load): Right panel shows Quick Access (from PRD 2).

**After a response arrives:** Right panel switches to `AskRightPanel`, showing the context subgraph and source chunks for the most recent response.

**On citation click:** Right panel switches to `{ type: 'node', data: clickedNode }`, showing `NodeDetail` (from PRD 4). A "← Back to Context" ghost button at the top allows returning to the Ask context view.

**On source chunk title click:** Right panel switches to `{ type: 'source', data: clickedSource }`, showing `SourceDetail` (from PRD 6). Same back navigation.

### 5.3 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message (when input has text and pipeline is not running) |
| `Shift + Enter` | Insert newline in input |
| `Escape` | Clear input text if focused; otherwise no-op |
| `/clear` | Typed as a message: clears the chat history (local session only) |

### 5.4 Scroll Behavior

The `useChatScroll` hook manages auto-scrolling:
- On new user message: immediately scroll to bottom.
- On new assistant message: smoothly scroll to bottom.
- On progress step change: gently scroll to keep the progress indicator visible.
- If the user has manually scrolled up (more than 100px from bottom): do NOT auto-scroll. Show a "↓ New message" pill that, when clicked, scrolls to bottom.
- The "↓ New message" pill: fixed position at the bottom of the chat area, centered. `--bg-card` background, `--border-default`, `8px` radius, DM Sans `11px` weight `600`, `--accent-500` text. Fades in with `0.2s ease`.

---

## 6. Types

```typescript
// types/rag.ts

export type RAGPipelineStep =
  | 'embedding'
  | 'semantic_search'
  | 'keyword_search'
  | 'graph_traversal'
  | 'context_assembly'
  | 'generating';

export interface ChatMessage {
  id: string;                          // UUID generated client-side
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: Date;
  pipelineDurationMs?: number;         // For assistant messages
}

export interface Citation {
  label: string;
  entity_type: string;
  node_id: string | null;
  source_id: string | null;
}

export interface SourceChunkResult {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  sourceTitle?: string;                // Enriched after join
  sourceType?: string;                 // Enriched after join
  sourceCreatedAt?: string;            // Enriched after join
}

export interface RAGContext {
  sourceChunks: EnrichedChunk[];
  nodeSummaries: NodeSummary[];
  relationshipPaths: RelationshipPath[];
}

export interface EnrichedChunk {
  id: string;
  source_id: string;
  content: string;
  similarity: number;
  sourceTitle: string;
  sourceType: string;
  sourceCreatedAt: string;
}

export interface NodeSummary {
  id: string;
  label: string;
  entity_type: string;
  description: string | null;
}

export interface RelationshipPath {
  from: string;                        // Label of source node
  relation: string;                    // Relation type
  to: string;                          // Label of target node
  evidence?: string;
}

export interface RAGResponseContext {
  sourceChunks: EnrichedChunk[];
  relatedNodes: KnowledgeNode[];
  relatedEdges: KnowledgeEdge[];
  citations: Citation[];
}

export interface RAGGenerationResult {
  answer: string;
  citations: Citation[];
}

export interface SemanticChunkResult {
  id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface KeywordNodeResult extends KnowledgeNode {}

export interface KeywordSourceResult {
  id: string;
  title: string | null;
  source_type: string | null;
  source_url: string | null;
  created_at: string;
}
```

---

## 7. Forward-Compatible Decisions

### 7.1 Reusable RAG Pipeline (→ PRD 13: Orientation Engine)

The `queryGraph()` function in `services/rag.ts` is designed as a standalone service function — it accepts a question string and returns a structured `RAGResponse`. It does not depend on React state or any UI component. This allows PRD 13's Orientation Engine to call `queryGraph()` programmatically for each digest module without rendering any UI.

The function signature `queryGraph(question, userId, conversationHistory, onStepChange?)` allows callers to ignore the step callback when used outside the Ask view.

### 7.2 Serializable Chat Messages (→ Future: Persistent Chat History)

`ChatMessage` includes `id` (UUID), `timestamp` (Date), and all fields needed to reconstruct the message. Future work may persist chat history to a `chat_messages` table in Supabase. The type is designed to be directly serializable: `timestamp` is a `Date` (serializes to ISO string), `citations` is a flat array, no circular references. Do not add non-serializable fields (refs, callbacks, DOM nodes) to `ChatMessage`.

### 7.3 MiniGraph Compatibility (→ PRD 5)

The `AskRightPanel` accepts `relatedNodes: KnowledgeNode[]` and `relatedEdges: KnowledgeEdge[]` and passes them to the `MiniGraph` component from PRD 5. If PRD 5 is not yet complete when implementing PRD 8, the MiniGraph slot should render a placeholder:

```tsx
// Fallback if MiniGraph not available
<div style={{ width: '100%', height: '160px', borderRadius: '8px', border: '1px dashed var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
    Graph visualization ({nodes.length} nodes)
  </span>
</div>
```

### 7.4 Conversation History for Multi-Turn (→ PRD 13)

The `conversationHistory` passed to Gemini includes the last 3 exchanges (6 messages). This allows follow-up questions like "Tell me more about that" or "What about the risks?" to work naturally. The history window is deliberately limited to avoid overwhelming the context window — source chunks and graph context should dominate, not conversation history.

### 7.5 Search Functions Reusability (→ PRD 12: Command Palette)

`keywordSearchNodes()` in `services/supabase.ts` is also used by PRD 12's command palette for real-time node search. The function accepts a generic query string and returns typed results, making it reusable across contexts.

---

## 8. Edge Cases & Error Handling

### 8.1 Empty Knowledge Graph

When `getGraphStats()` returns `nodeCount: 0` and `chunkCount: 0`:
- Status bar shows gray dot, "No knowledge yet — ingest content to start querying".
- Empty state is modified: suggested queries are hidden, subtext changes to "Start by ingesting content in the Ingest view. Once you have entities and source chunks, you can query them here."
- If the user submits a query anyway, immediately return a system message: "Your knowledge graph is empty. Head to the **Ingest** view to add your first source, then come back here to query it."

### 8.2 No Relevant Results

When the hybrid search returns zero semantic chunks and zero keyword matches:
- Skip graph traversal and context assembly.
- Generate a message without calling Gemini: "I couldn't find any content in your knowledge graph related to that question. Try rephrasing, or check if the relevant content has been ingested and processed."
- Show the message as an assistant message (not a system error).

### 8.3 Gemini API Failures

**Embedding failure:** Show system message: "Failed to process your query — the embedding service is temporarily unavailable. Please try again in a moment."

**Generation failure:** Show system message: "I found relevant context but couldn't generate a response. Please try again." Include a "Retry" button in the message that re-runs step 6 with the same assembled context.

**Rate limiting (429):** Detect the status code. Show system message: "The AI service is rate-limited. Please wait a moment before your next query." Disable the send button for 10 seconds with a countdown.

**Malformed JSON response:** If `parseRAGResponse` fails to parse the Gemini output as JSON:
- Attempt to extract the answer as raw text (strip any markdown fences).
- Set `citations: []`.
- Log the parse error to console for debugging.
- Display the raw text answer with a note: "Some source citations may be missing for this response."

### 8.4 Large Graphs (500+ Nodes)

- `semanticSearchChunks` is already bounded by `matchCount` (returns at most 15 results).
- `keywordSearchNodes` is bounded by `limit` (10).
- Graph traversal is capped at 2 hops with a 20-node frontier limit per hop.
- Context assembly caps source chunks at 8 and node summaries at 20.
- Total context size should stay under ~6,000 tokens, well within Gemini's context window.

### 8.5 Network Failures

- Wrap all service calls in try/catch within the `queryGraph` pipeline.
- If Supabase is unreachable, show: "Can't connect to the database. Check your internet connection."
- If Gemini is unreachable, show: "Can't reach the AI service. Check your internet connection."
- All error messages appear as assistant-style messages (not alerts or toasts) to maintain chat flow.

### 8.6 Auth Expiry Mid-Conversation

If a Supabase query returns a 401/403 during the pipeline:
- Show system message: "Your session has expired. Please refresh the page to sign in again."
- Disable the input bar.
- The `AuthProvider` (from PRD 1) should handle the global redirect.

### 8.7 Source Chunks Missing Embeddings

Some chunks in the database may have `embedding: null` (from incomplete V1 processing). These are naturally excluded by the `sc.embedding IS NOT NULL` filter in the RPC function. No special handling needed, but the status bar's chunk count should reflect only chunks with embeddings:

```typescript
// Modified count query for accurate chunk count
const { count } = await supabase
  .from('source_chunks')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .not('embedding', 'is', null);
```

### 8.8 Very Long Queries

If the user submits a query longer than 500 characters:
- Still process it (Gemini can handle long inputs).
- Truncate the display in the user message bubble to 500 chars with "..." and a "Show more" toggle.
- Pass the full text to the pipeline.

### 8.9 Rapid Successive Queries

If the user submits a new query while the previous pipeline is still running:
- Cancel the in-flight pipeline (using an `AbortController`).
- Remove the in-progress indicator.
- Start the new query immediately.
- The previous incomplete response is not added to messages.

---

## 9. Supabase RPC Function Check

Before implementing the semantic search, verify whether `match_source_chunks` already exists as an RPC function in the Supabase project. If it does not exist, it must be created via the Supabase SQL Editor. The function signature is defined in Section 4.1.

Additionally, consider whether a second RPC function for node embedding search would be useful for future features (searching nodes by semantic similarity rather than just keyword). If so, define it now as `match_knowledge_nodes`:

```sql
CREATE OR REPLACE FUNCTION match_knowledge_nodes(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  label TEXT,
  entity_type TEXT,
  description TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kn.id,
    kn.label,
    kn.entity_type,
    kn.description,
    1 - (kn.embedding <=> query_embedding) AS similarity
  FROM knowledge_nodes kn
  WHERE kn.user_id = p_user_id
    AND kn.embedding IS NOT NULL
    AND 1 - (kn.embedding <=> query_embedding) > match_threshold
  ORDER BY kn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

This is not strictly required for PRD 8 but provides a foundation for PRD 12 (command palette semantic search) and PRD 13 (digest generation).

---

## 10. Performance Considerations

### 10.1 Pipeline Latency Budget

| Step | Expected Duration | Notes |
|---|---|---|
| Query embedding | 200–500ms | Single Gemini API call |
| Semantic search | 100–300ms | pgvector index, bounded by match_count |
| Keyword search | 50–200ms | Runs in parallel with semantic |
| Graph traversal | 200–600ms | 2 hops, max 20 frontier per hop |
| Context assembly | <50ms | Local data manipulation |
| Gemini generation | 1,000–3,000ms | Largest single step |
| Citation resolution | 100–200ms | Batch node fetch by IDs |
| **Total** | **~2–5 seconds** | Acceptable for a RAG interface |

### 10.2 Optimization Strategies

- **Parallel search:** Semantic search, keyword node search, and keyword source search all run via `Promise.all()`. This saves 200–500ms compared to sequential.
- **Frontier capping:** Graph traversal never expands more than 20 nodes per hop, preventing exponential blowup.
- **Context capping:** Source chunks capped at 8, node summaries at 20, relationship paths at 15. This keeps the Gemini prompt under ~6,000 tokens.
- **Conversation history window:** Limited to last 6 messages (3 exchanges). Older history is dropped.
- **Debounced stats:** `getGraphStats` is called once on mount and cached in component state. Not re-fetched per query.

### 10.3 AbortController Pattern

```typescript
// In useRAGQuery hook
const abortControllerRef = useRef<AbortController | null>(null);

async function sendMessage(text: string) {
  // Cancel any in-flight request
  abortControllerRef.current?.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    // ... pipeline execution
    // Check for abort between steps
    if (controller.signal.aborted) return;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    // Handle real errors
  }
}
```

---

## 11. Acceptance Criteria

After this PRD is complete, a user can:

- [ ] Open the Ask view and see the status bar showing real node/chunk counts from their database
- [ ] See a helpful empty state with suggested queries when no messages have been sent
- [ ] Click a suggested query chip and have it auto-populate and submit
- [ ] Type a question in the input bar and press Enter (or click Send) to submit
- [ ] See the RAG progress indicator cycle through pipeline steps while the query is processing
- [ ] Receive a substantive answer grounded in their actual knowledge graph data
- [ ] See entity citation badges below assistant messages with correct entity type colors
- [ ] Click a citation badge to open the cited node's detail in the right panel
- [ ] See the right panel update to show the "Context" view with related subgraph and source chunks
- [ ] Click a source chunk's title to navigate to the full source detail in the right panel
- [ ] Expand a truncated source chunk in the right panel to see its full text
- [ ] Ask follow-up questions that maintain conversational context (e.g., "Tell me more about that")
- [ ] See appropriate error messages in the chat flow when the pipeline fails (not browser alerts)
- [ ] See a graceful empty graph state that directs them to the Ingest view
- [ ] Use Shift+Enter for multiline input without submitting
- [ ] Type `/clear` to reset the chat session
- [ ] Scroll up in a long conversation without being forcibly scrolled down by new messages
- [ ] See the "↓ New message" pill when a new response arrives while scrolled up
- [ ] Submit a new query while a previous one is processing (cancels the old one)
- [ ] Experience the full pipeline completing in under 5 seconds for a typical query against a graph with 500+ nodes
