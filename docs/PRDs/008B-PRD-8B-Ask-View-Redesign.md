# PRD 8-B — Ask View Redesign: Intelligence Workstation

**Phase:** 3 — Intelligence (revision of PRD 8)
**Dependencies:** PRD 2 (Shell + Navigation), PRD 4 (Browse Tab — Badge, NodeDetail), PRD 5 (Graph Tab — MiniGraph, filter state), PRD 7 (Ingest — `services/gemini.ts`, `services/supabase.ts`), PRD 8 (original Ask View implementation)
**Estimated Complexity:** Very High (4–5 sessions)

---

## 1. Objective

Redesign the Ask view from a basic RAG chatbot into an **intelligence workstation** — a query composition surface that gives users explicit control over *how* they search their knowledge graph, not just *what* they search for. The redesign introduces four new systems layered onto the existing RAG pipeline: **Query Mindsets** (prompt-layer personalities that shape response style), **Scope Filters** (anchor-based retrieval scoping), **Tool Modes** (retrieval strategy selectors), and **Model Selection** (speed vs depth toggle). It also overhauls how responses are presented: inline numbered citations, a redesigned right panel as a "Sources & Context" surface, and a cross-page bridge to the Explore Graph tab.

### Design Philosophy

This PRD follows the same principle as the extraction modes in PRD 7: **the user's intent shapes the AI's behavior through modular prompt composition**. Extraction modes control how knowledge goes *into* the graph. Query Mindsets control how knowledge comes *out* of the graph. The prompt builder pattern (`utils/promptBuilder.ts`) is extended to support both directions.

The Ask view should feel like Perplexity meets a research workstation — clean, focused, configurable, with every response traceable back to its sources and explorable in the graph.

---

## 2. What Gets Built (Delta from PRD 8)

This PRD does **not** rewrite PRD 8. It modifies and extends the existing implementation. Components marked "MODIFY" already exist; components marked "NEW" are additions.

### New & Modified Components

| File | Status | Description |
|---|---|---|
| `src/views/AskView.tsx` | MODIFY | Add QueryComposer above ChatInput, wire mindset/scope/tool/model state into RAG pipeline |
| `src/components/ask/QueryComposer.tsx` | NEW | Expandable toolbar above input with mindset, scope, tool, and model selectors |
| `src/components/ask/MindsetSelector.tsx` | NEW | Horizontal toggle for query mindsets (Factual, Analytical, Comparative, Exploratory) |
| `src/components/ask/ScopeFilter.tsx` | NEW | Anchor-based pill selector for retrieval scoping |
| `src/components/ask/ToolModeSelector.tsx` | NEW | Toggle for retrieval strategy (Quick, Deep, Timeline) |
| `src/components/ask/ModelSelector.tsx` | NEW | Speed vs depth model toggle |
| `src/components/ask/ChatMessage.tsx` | MODIFY | Add inline numbered citations with hover tooltips |
| `src/components/ask/CitationTooltip.tsx` | NEW | Hover tooltip showing source title + snippet for inline citation numbers |
| `src/components/ask/AskRightPanel.tsx` | MODIFY | Redesign as "Sources & Context" panel with structured sections |
| `src/components/ask/SourceCard.tsx` | NEW | Individual source card in right panel with similarity bar |
| `src/components/ask/EntityChain.tsx` | NEW | Relationship path visualization (`A → relation → B`) in right panel |
| `src/components/ask/ExploreButton.tsx` | NEW | "Explore in Graph" bridge button with filtered navigation |
| `src/components/ask/EmptyAskState.tsx` | MODIFY | Dynamic suggestions based on user's graph, mindset showcase |
| `src/components/ask/ChatInput.tsx` | MODIFY | Visual integration with QueryComposer (shared container styling) |

### Service & Config Changes

| File | Status | Description |
|---|---|---|
| `src/config/queryMindsets.ts` | NEW | Mindset definitions with prompt templates |
| `src/config/toolModes.ts` | NEW | Tool mode definitions with pipeline parameter overrides |
| `src/services/rag.ts` | MODIFY | Accept `QueryConfig` parameter, apply mindset prompt + scope filter + tool mode parameters |
| `src/services/gemini.ts` | MODIFY | `generateRAGResponse` accepts optional `mindsetPrompt` and `temperature` override |
| `src/utils/promptBuilder.ts` | MODIFY | Add `buildRAGMindsetPrompt()` function following extraction mode pattern |
| `src/hooks/useRAGQuery.ts` | MODIFY | Accept `QueryConfig` state, pass through to pipeline |
| `src/hooks/useQueryComposer.ts` | NEW | Manages composer state (mindset, scope, tool, model) with persistence |

### Types

| File | Status | Description |
|---|---|---|
| `src/types/rag.ts` | MODIFY | Add `QueryMindset`, `ToolMode`, `ModelTier`, `QueryConfig`, `InlineCitation` types |

---

## 3. Query Mindsets

### 3.1 Concept

Query Mindsets are prompt-layer personalities that shape *how* the RAG pipeline interprets the user's question and *how* it formats the response. They do not change what content is retrieved — that's the Scope Filter's job. Mindsets change the Gemini generation behavior: what to emphasize, how to structure the answer, and what level of synthesis to apply.

This mirrors the extraction modes pattern: just as `config/extractionModes.ts` provides per-mode prompt additions for ingestion, `config/queryMindsets.ts` provides per-mindset prompt additions for querying.

### 3.2 Mindset Definitions

```typescript
// config/queryMindsets.ts

export interface QueryMindset {
  id: string;
  label: string;
  description: string;          // Shown in UI tooltip
  icon: string;                 // Lucide icon name
  color: string;                // CSS variable for active state
  promptAddition: string;       // Injected into RAG system prompt
  temperatureOverride?: number; // Optional Gemini temperature adjustment
}

export const QUERY_MINDSETS: QueryMindset[] = [
  {
    id: 'factual',
    label: 'Factual',
    description: 'Direct answers with precise citations. Best for "what", "when", "who" questions.',
    icon: 'Target',
    color: '--e-action',         // #2563eb (blue)
    promptAddition: `## Response Mindset: Factual

Provide direct, precise answers. Lead with the specific fact or data point the user is asking about. Keep the response concise — avoid unnecessary elaboration or synthesis. Every claim must cite a specific source. If the answer is a single entity, date, decision, or fact, state it immediately in the first sentence. If the knowledge graph does not contain a clear answer, say so explicitly rather than speculating.

Format: Short paragraphs. No headers unless the answer genuinely has multiple distinct parts. Prioritize source chunk citations over entity citations.`,
    temperatureOverride: 0.1,
  },
  {
    id: 'analytical',
    label: 'Analytical',
    description: 'Structured analysis with patterns and implications. Best for "why", "how", "what does this mean" questions.',
    icon: 'TrendingUp',
    color: '--e-insight',        // #7c3aed (purple)
    promptAddition: `## Response Mindset: Analytical

Analyze the topic by identifying patterns, causes, and implications across the user's knowledge graph. Structure your response with clear reasoning: state the finding, explain the evidence, then draw the implication. Look for non-obvious connections between entities — this is where the knowledge graph adds unique value.

If you find contradictory evidence across different sources, highlight the contradiction rather than resolving it arbitrarily. Distinguish between what the sources explicitly state and what you are inferring from the graph structure.

Format: Use a logical progression. Start with the core analysis, then supporting evidence, then implications or open questions. Cite both source chunks and entity relationships.`,
    temperatureOverride: 0.3,
  },
  {
    id: 'comparative',
    label: 'Comparative',
    description: 'Side-by-side analysis of entities, concepts, or approaches. Best for "how does X compare to Y" questions.',
    icon: 'GitCompareArrows',
    color: '--e-decision',       // #db2777 (pink)
    promptAddition: `## Response Mindset: Comparative

Structure your response as a comparison. Identify the key entities or concepts being compared and evaluate them along consistent dimensions. For each dimension, cite the specific source that supports each side.

If the user's question implies a comparison (e.g., mentions two projects, two people, two approaches), organize the response to make the comparison explicit even if the user didn't frame it that way. If only one side has evidence in the knowledge graph, state what is known and what is missing.

Format: Use parallel structure. For 2-3 comparison dimensions, use inline comparison. For 4+ dimensions, use a structured format with clear labels for each entity being compared. Always end with a synthesis noting the most significant differences or similarities.`,
    temperatureOverride: 0.2,
  },
  {
    id: 'exploratory',
    label: 'Exploratory',
    description: 'Discovers connections, surfaces related topics, and maps knowledge terrain. Best for open-ended exploration.',
    icon: 'Compass',
    color: '--e-topic',          // #0891b2 (cyan)
    promptAddition: `## Response Mindset: Exploratory

Cast a wide net across the knowledge graph. The user is exploring, not seeking a specific answer. Surface surprising connections, related topics the user may not have considered, and patterns that emerge from the graph structure.

Organize your response as a knowledge map: start with the most directly relevant entities, then branch outward to connected topics, then highlight the most unexpected or non-obvious connections. For each connection you surface, briefly explain why it's relevant.

If the graph traversal reveals clusters of related knowledge, name those clusters. If there are gaps — topics where the user has limited knowledge that seem relevant — mention those as potential areas to explore further.

Format: Use a flowing narrative that moves from the center of the topic outward. Cite entities and relationships heavily — the user wants to see the graph structure reflected in the response. End with 2-3 follow-up questions the user could ask to go deeper.`,
    temperatureOverride: 0.5,
  },
];

export const DEFAULT_MINDSET = 'analytical';
```

### 3.3 Prompt Integration

The mindset prompt is injected into the RAG system prompt between the base instructions and the context sections. Modify `buildRAGSystemPrompt` in `services/rag.ts`:

```typescript
// services/rag.ts — modified buildRAGSystemPrompt signature
function buildRAGSystemPrompt(
  context: RAGContext,
  queryConfig?: QueryConfig  // NEW parameter
): string {
  const mindset = queryConfig?.mindset
    ? QUERY_MINDSETS.find(m => m.id === queryConfig.mindset)
    : QUERY_MINDSETS.find(m => m.id === DEFAULT_MINDSET);

  return `You are Synapse, an AI assistant that answers questions using a personal knowledge graph. You have access to the user's ingested content, extracted entities, and relationship data.

INSTRUCTIONS:
- Answer the user's question using ONLY the context provided below. Do not use general knowledge.
- Cite your sources using numbered references [1], [2], [3] that correspond to the source chunks listed below.
- If the context doesn't contain enough information, say so honestly.

${mindset?.promptAddition ?? ''}

## CONTEXT

### Source Chunks (cite these with [1], [2], etc.)
${context.sourceChunks.map((chunk, i) =>
  `[${i + 1}] "${chunk.sourceTitle}" (${chunk.sourceType}, ${chunk.sourceCreatedAt})\n${chunk.content}`
).join('\n\n')}

### Related Entities
${context.nodeSummaries.map(n =>
  `- ${n.label} (${n.entity_type}): ${n.description || 'No description'}`
).join('\n')}

### Relationship Paths
${context.relationshipPaths.map(r =>
  `- ${r.from} —[${r.relation}]→ ${r.to}${r.evidence ? ` (${r.evidence})` : ''}`
).join('\n')}

Respond in JSON format:
{
  "answer": "Your response text with [1], [2] inline citations",
  "citations": [
    {
      "index": 1,
      "label": "Source title or entity label",
      "entity_type": "Topic",
      "node_id": "uuid or null",
      "source_id": "uuid or null",
      "chunk_index": 0
    }
  ]
}

Ensure every [N] reference in your answer text has a corresponding entry in the citations array.
Entity summaries provide structure. Relationship paths show connections. Prioritize source chunks when forming your answer.`;
}
```

### 3.4 UI Design — MindsetSelector

**Position:** First element in the QueryComposer toolbar.

**Layout:** Horizontal row of 4 pill-shaped toggle buttons, `4px` gap.

**Each pill:**
- Default: `--bg-inset` background, `1px solid var(--border-subtle)`, `6px 12px` padding, `6px` border-radius.
- Text: DM Sans, `11px`, weight `600`, `--text-secondary`.
- Icon: Lucide icon, `12px`, same color as text. Positioned left of label with `4px` gap.
- **Selected:** Background becomes `rgba([mindset-color], 0.08)`, border becomes `rgba([mindset-color], 0.25)`, text and icon become the mindset color variable.
- Hover (unselected): `--bg-hover` background, border darkens to `--border-default`. Transition `0.15s ease`.
- Cursor: `pointer`.

**Tooltip on hover:** Show the mindset's `description` field. Use a simple tooltip: `--bg-card` background, `1px solid var(--border-default)`, `8px` border-radius, `8px 12px` padding, DM Sans `11px` weight `400` `--text-body`, max-width `220px`. Position: above the pill, centered, with `6px` gap. Fade in `0.15s ease`, `300ms` delay.

**Section label:** "MINDSET" — Cabinet Grotesk, `9px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`, uppercase. Positioned above the pill row with `4px` margin-bottom.

---

## 4. Scope Filters (Anchor Scoping)

### 4.1 Concept

Scope Filters allow the user to constrain RAG retrieval to knowledge connected to specific anchors. When a scope is active, the semantic search and keyword search both add a filter condition: only return chunks/nodes that are connected (via edges) to the selected anchor nodes.

This uses the same anchor data already available via `SettingsContext` (PRD 3). No new database queries are needed for the filter UI — only the RAG pipeline search functions need modification.

### 4.2 Pipeline Modification

When scope anchors are selected, modify the search step in `services/rag.ts`:

```typescript
// services/rag.ts — queryGraph modification
export async function queryGraph(
  question: string,
  userId: string,
  conversationHistory: { role: string; content: string }[],
  queryConfig?: QueryConfig,            // NEW
  onStepChange?: (step: RAGPipelineStep) => void
): Promise<RAGResponse> {
  // ... existing embedding step ...

  // Scope-filtered search
  const scopeAnchorIds = queryConfig?.scopeAnchors ?? [];

  const [semanticResults, keywordNodeResults, keywordSourceResults] = await Promise.all([
    semanticSearchChunks(queryEmbedding, userId, {
      matchCount: toolModeConfig.chunkCount,
      scopeAnchorIds,                    // NEW: pass scope filter
    }),
    keywordSearchNodes(question, userId, {
      limit: toolModeConfig.nodeCount,
      scopeAnchorIds,                    // NEW: pass scope filter
    }),
    keywordSearchSources(question, userId, {
      limit: 5,
      scopeAnchorIds,                    // NEW: pass scope filter
    }),
  ]);

  // ... rest of pipeline unchanged ...
}
```

**Database query modification for scoped search:**

When `scopeAnchorIds` is non-empty, the semantic search query becomes a two-step process:

```typescript
// services/supabase.ts — modified semanticSearchChunks
export async function semanticSearchChunks(
  embedding: number[],
  userId: string,
  options: {
    matchCount?: number;
    scopeAnchorIds?: string[];          // NEW
  }
): Promise<SemanticChunkResult[]> {
  const { matchCount = 10, scopeAnchorIds = [] } = options;

  if (scopeAnchorIds.length === 0) {
    // Existing unscoped query — no change
    const { data, error } = await supabase.rpc('match_source_chunks', {
      query_embedding: embedding,
      match_count: matchCount,
      filter_user_id: userId,
    });
    if (error) throw error;
    return data;
  }

  // Scoped query: first get source IDs connected to anchor nodes,
  // then search only within those sources
  const { data: connectedSources, error: scopeError } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .eq('user_id', userId)
    .or(
      scopeAnchorIds.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(',')
    );

  if (scopeError) throw scopeError;

  // Get all node IDs connected to anchors
  const connectedNodeIds = new Set<string>();
  connectedSources?.forEach(edge => {
    connectedNodeIds.add(edge.source_node_id);
    connectedNodeIds.add(edge.target_node_id);
  });

  // Get source_ids for those nodes
  const { data: nodeSources, error: nsError } = await supabase
    .from('knowledge_nodes')
    .select('source_id')
    .eq('user_id', userId)
    .in('id', Array.from(connectedNodeIds))
    .not('source_id', 'is', null);

  if (nsError) throw nsError;

  const scopedSourceIds = [...new Set(nodeSources?.map(n => n.source_id).filter(Boolean))];

  if (scopedSourceIds.length === 0) {
    return []; // No sources connected to selected anchors
  }

  // Run semantic search scoped to these sources
  const { data, error } = await supabase.rpc('match_source_chunks_scoped', {
    query_embedding: embedding,
    match_count: matchCount,
    filter_user_id: userId,
    filter_source_ids: scopedSourceIds,
  });

  if (error) throw error;
  return data;
}
```

**New Supabase RPC function needed:**

```sql
-- Migration: add match_source_chunks_scoped function
CREATE OR REPLACE FUNCTION match_source_chunks_scoped(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL,
  filter_source_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index int,
  content text,
  similarity float
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
  WHERE sc.user_id = filter_user_id
    AND sc.source_id = ANY(filter_source_ids)
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 4.3 UI Design — ScopeFilter

**Position:** Second element in the QueryComposer toolbar, after MindsetSelector.

**Section label:** "SCOPE" — same styling as MindsetSelector label.

**Layout:** Horizontal scrollable row of anchor pills. If the user has more anchors than fit in the visible width, the row scrolls horizontally with a subtle fade-out gradient on the right edge.

**Each anchor pill:**
- Default: `--bg-inset` background, `1px solid var(--border-subtle)`, `5px 10px` padding, `5px` border-radius.
- Content: Colored dot (`5px` circle, anchor's entity type color) + anchor label (DM Sans, `11px`, weight `500`, `--text-body`).
- **Selected:** Background becomes `rgba(var(--e-anchor), 0.08)`, border becomes `rgba(var(--e-anchor), 0.25)`, label becomes `--e-anchor` color (`#b45309`).
- Hover (unselected): `--bg-hover`, border to `--border-default`. Transition `0.15s ease`.
- Multi-select: clicking toggles selection. Multiple anchors can be selected simultaneously (OR logic: retrieve from any selected anchor's subgraph).

**"All" pill:** First pill in the row, always present. Styled differently: DM Sans `11px` weight `600`. Selected by default (meaning no scope filtering). Selecting "All" deselects all specific anchors. Selecting any specific anchor deselects "All".

**Empty state:** If the user has no anchors, show: "No anchors configured" in `--text-placeholder`, `11px`. No pills rendered. The ScopeFilter section is visually present but clearly inactive.

**Active state indicator:** When specific anchors are selected (not "All"), show a small count badge on the "SCOPE" label: `1`, `2`, `3` in a `14px` circle, `--e-anchor` background, white text, `9px` font, weight `700`.

---

## 5. Tool Modes

### 5.1 Concept

Tool Modes control the retrieval strategy — how many sources are retrieved, how deep graph traversal goes, and how much context is assembled. They adjust the RAG pipeline parameters, not the generation prompt.

### 5.2 Tool Mode Definitions

```typescript
// config/toolModes.ts

export interface ToolMode {
  id: string;
  label: string;
  description: string;
  icon: string;              // Lucide icon name
  pipelineOverrides: {
    chunkCount: number;      // Number of source chunks to retrieve
    nodeCount: number;       // Number of keyword-matched nodes
    traversalHops: number;   // Graph traversal depth
    maxFrontier: number;     // Max nodes per traversal hop
    maxContextChunks: number; // Cap on chunks sent to Gemini
    maxNodeSummaries: number; // Cap on node summaries in context
    maxRelPaths: number;     // Cap on relationship paths in context
  };
}

export const TOOL_MODES: ToolMode[] = [
  {
    id: 'quick',
    label: 'Quick',
    description: 'Fast answer from top sources. Best for simple questions with clear answers.',
    icon: 'Zap',
    pipelineOverrides: {
      chunkCount: 5,
      nodeCount: 5,
      traversalHops: 1,
      maxFrontier: 10,
      maxContextChunks: 4,
      maxNodeSummaries: 8,
      maxRelPaths: 5,
    },
  },
  {
    id: 'deep',
    label: 'Deep',
    description: 'Thorough search with extended graph traversal. Best for complex or multi-faceted questions.',
    icon: 'Layers',
    pipelineOverrides: {
      chunkCount: 15,
      nodeCount: 15,
      traversalHops: 3,
      maxFrontier: 25,
      maxContextChunks: 10,
      maxNodeSummaries: 25,
      maxRelPaths: 20,
    },
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Chronological ordering of sources. Best for "what happened", "evolution of", temporal questions.',
    icon: 'Clock',
    pipelineOverrides: {
      chunkCount: 12,
      nodeCount: 10,
      traversalHops: 2,
      maxFrontier: 15,
      maxContextChunks: 8,
      maxNodeSummaries: 15,
      maxRelPaths: 10,
    },
  },
];

export const DEFAULT_TOOL_MODE = 'deep';
```

**Timeline mode special behavior:** When `toolMode === 'timeline'`, the context assembly step sorts source chunks by `sourceCreatedAt` ascending (oldest first) rather than by similarity descending. This causes the Gemini response to naturally follow a chronological narrative. Add this to the `assembleContext` function:

```typescript
// services/rag.ts — inside assembleContext
if (queryConfig?.toolMode === 'timeline') {
  enrichedChunks.sort((a, b) =>
    new Date(a.sourceCreatedAt).getTime() - new Date(b.sourceCreatedAt).getTime()
  );
} else {
  enrichedChunks.sort((a, b) => b.similarity - a.similarity);
}
```

### 5.3 UI Design — ToolModeSelector

**Position:** Third element in the QueryComposer toolbar, after ScopeFilter.

**Section label:** "RETRIEVAL" — same styling pattern.

**Layout:** 3 pill-shaped toggle buttons (identical styling to MindsetSelector pills), single-select.

**Each pill:**
- Default: `--bg-inset`, `1px solid var(--border-subtle)`, `6px 12px` padding.
- Icon: Lucide icon, `12px`, left of label, `4px` gap.
- Text: DM Sans `11px`, weight `600`.
- **Selected:** `--accent-50` background (`#fff5f0`), `1px solid rgba(214, 58, 0, 0.2)`, `--accent-500` text and icon.
- Hover: `--bg-hover`, `--border-default`. Transition `0.15s ease`.

**No tooltip needed** — descriptions are short enough for the label + icon to be self-explanatory.

---

## 6. Model Selector

### 6.1 Concept

The Model Selector lets users toggle between speed and depth. For now, both options use Gemini 2.0 Flash but with different generation parameters. This creates a meaningful UX distinction that can be upgraded to different models later without changing the interface contract.

### 6.2 Model Tier Definitions

```typescript
// config/queryMindsets.ts (add to same file, or create config/modelTiers.ts)

export interface ModelTier {
  id: string;
  label: string;
  description: string;
  icon: string;
  generationConfig: {
    model: string;
    maxOutputTokens: number;
    temperature?: number;     // Only used if mindset doesn't override
  };
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: 'fast',
    label: 'Fast',
    description: 'Quick responses, shorter context window',
    icon: 'Rabbit',
    generationConfig: {
      model: 'gemini-2.0-flash',
      maxOutputTokens: 1024,
      temperature: 0.2,
    },
  },
  {
    id: 'thorough',
    label: 'Thorough',
    description: 'Deeper analysis, larger context window',
    icon: 'Brain',
    generationConfig: {
      model: 'gemini-2.0-flash',
      maxOutputTokens: 4096,
      temperature: 0.3,
    },
  },
];

export const DEFAULT_MODEL_TIER = 'thorough';
```

### 6.3 UI Design — ModelSelector

**Position:** Rightmost element in the QueryComposer toolbar, visually separated from the other selectors by a `1px solid var(--border-subtle)` vertical divider with `12px` horizontal margin.

**Layout:** Two-state toggle, compact.

**Toggle:** A small segmented control, `28px` height.
- Container: `--bg-inset` background, `1px solid var(--border-subtle)`, `6px` border-radius, `2px` internal padding.
- Each segment: `24px 8px` padding, `4px` border-radius.
- Labels: Lucide icon only (no text), `13px`. `Rabbit` for Fast, `Brain` for Thorough.
- **Selected segment:** `--bg-card` background (white), `box-shadow: 0 1px 2px rgba(0,0,0,0.06)`, icon color `--text-primary`.
- **Unselected segment:** transparent background, icon color `--text-placeholder`.
- Transition: `0.15s ease` on background and shadow.

**Tooltip on hover (each segment):** Show tier label + description. Same tooltip styling as MindsetSelector.

---

## 7. QueryComposer Component

### 7.1 Layout & Positioning

The QueryComposer sits directly above the ChatInput bar, creating a unified "composition zone" at the bottom of the Ask view. Both the QueryComposer and ChatInput share a single visual container.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ● Graph RAG Active · 847 nodes · 934 chunks                           │  ← StatusBar
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Chat messages area - scrollable]                                      │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ MINDSET  ○ Factual  ● Analytical  ○ Comparative  ○ Exploratory         │
│ SCOPE    ● All  ○ InfoCert  ○ Synapse  ○ EU AI Act                     │  ← QueryComposer
│ RETRIEVAL ○ Quick  ● Deep  ○ Timeline          │ [🐇|🧠]              │
├─────────────────────────────────────────────────────────────────────────┤
│ [Ask your knowledge graph anything...]                            [▶]  │  ← ChatInput
│   Analytical · Deep · All sources                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Container Styling

The QueryComposer + ChatInput share a single container:
- Background: `--bg-card` (`#ffffff`).
- Border: `1px solid var(--border-subtle)`.
- Border-radius: `14px`.
- Box-shadow: `0 2px 8px rgba(0, 0, 0, 0.04)`.
- Margin: `0 auto`, max-width `840px`, `16px` side padding from center stage edges.
- Position: fixed at bottom of center stage, `16px` from bottom edge.

The QueryComposer is the top section of this container; ChatInput is the bottom section. They're separated by a `1px solid var(--border-subtle)` horizontal line.

### 7.3 Collapse/Expand Behavior

**Default state:** QueryComposer is **collapsed** — only a single summary line is visible showing the current configuration as a compact string:

```
⚙ Analytical · Deep · All sources                          [Customize ▾]
```

- Summary text: DM Sans, `11px`, weight `500`, `--text-secondary`.
- "Customize" button: DM Sans, `11px`, weight `600`, `--accent-500`, with a chevron icon (`ChevronDown`, `10px`). On click: expand.
- Height (collapsed): `36px`.

**Expanded state:** Full toolbar with all four selector rows visible.
- Height: auto (approximately `140px` depending on anchor count).
- Padding: `12px 16px`.
- Rows separated by `8px` vertical gap.
- Each row: flex with label on left (`60px` fixed width) and selectors filling remaining space.
- Close: clicking "Customize" again (chevron rotates to `ChevronUp`) or pressing `Escape`.
- Transition: `height 0.2s ease`, `opacity 0.15s ease`.

### 7.4 Helper Text Update

The ChatInput helper text (currently "Retrieves from source chunks, entities, and graph traversal") becomes dynamic, reflecting the current composer state:

```typescript
function getHelperText(config: QueryConfig, anchors: Anchor[]): string {
  const mindsetLabel = QUERY_MINDSETS.find(m => m.id === config.mindset)?.label ?? 'Analytical';
  const toolLabel = TOOL_MODES.find(t => t.id === config.toolMode)?.label ?? 'Deep';

  const scopeLabel = config.scopeAnchors.length === 0
    ? 'All sources'
    : config.scopeAnchors
        .map(id => anchors.find(a => a.id === id)?.label)
        .filter(Boolean)
        .join(', ');

  return `${mindsetLabel} · ${toolLabel} · ${scopeLabel}`;
}
```

Display: DM Sans, `10px`, weight `400`, `--text-secondary`, `text-align: center`, `margin-top: 6px`.

---

## 8. Inline Citations & Response Redesign

### 8.1 Citation Format Change

**PRD 8 format (current):** Citations appear as entity badges below the assistant message in a "SOURCES" section.

**PRD 8-B format (new):** Citations appear as **inline numbered references** within the response text itself, like `[1]`, `[2]`, `[3]`. The SOURCES badge section is removed. Source details move to the right panel.

### 8.2 Inline Citation Rendering

Within the assistant message text, each `[N]` reference is rendered as an interactive element:

**Visual:** A superscript-styled number in a small rounded container.
- Background: `rgba(var(--accent-500-rgb), 0.08)`.
- Border: `1px solid rgba(var(--accent-500-rgb), 0.15)`.
- Border-radius: `4px`.
- Padding: `1px 5px`.
- Font: DM Sans, `10px`, weight `700`, `--accent-500`.
- Cursor: `pointer`.
- Vertical-align: `super`.
- Hover: background intensifies to `rgba(var(--accent-500-rgb), 0.15)`, border to `rgba(var(--accent-500-rgb), 0.3)`. Transition `0.15s ease`.

**Hover tooltip (CitationTooltip):**
- Appears after `200ms` hover delay, positioned above the citation number.
- Container: `--bg-card`, `1px solid var(--border-default)`, `8px` border-radius, `10px 14px` padding, `box-shadow: 0 4px 12px rgba(0,0,0,0.08)`, max-width `300px`.
- Content:
  - Source title: DM Sans, `12px`, weight `600`, `--text-primary`. Truncate with ellipsis if longer than 1 line.
  - Source type badge: entity badge styling (from design system), `margin-top: 4px`.
  - Snippet: first 120 characters of the chunk content, DM Sans, `11px`, weight `400`, `--text-secondary`, `margin-top: 6px`.
- Fade in: `0.15s ease`.

**Click behavior:** Clicking a citation number scrolls the right panel to the corresponding source card and highlights it with a brief `--accent-50` flash animation (`0.3s ease`).

### 8.3 Parsing Inline Citations

Modify `ChatMessage.tsx` to parse the response text and replace `[N]` patterns with interactive elements:

```typescript
// components/ask/ChatMessage.tsx — citation parsing helper
function renderContentWithCitations(
  content: string,
  citations: InlineCitation[],
  onCitationClick: (index: number) => void,
  onCitationHover: (index: number, rect: DOMRect) => void,
  onCitationLeave: () => void
): React.ReactNode[] {
  const parts = content.split(/(\[\d+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const citIndex = parseInt(match[1], 10);
      const citation = citations.find(c => c.index === citIndex);
      if (!citation) return <span key={i}>{part}</span>;

      return (
        <span
          key={i}
          className="citation-ref"
          onClick={() => onCitationClick(citIndex)}
          onMouseEnter={(e) => onCitationHover(citIndex, e.currentTarget.getBoundingClientRect())}
          onMouseLeave={onCitationLeave}
          style={{
            background: 'rgba(214, 58, 0, 0.08)',
            border: '1px solid rgba(214, 58, 0, 0.15)',
            borderRadius: '4px',
            padding: '1px 5px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--accent-500)',
            cursor: 'pointer',
            verticalAlign: 'super',
            lineHeight: 1,
          }}
        >
          {citIndex}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
```

### 8.4 Updated InlineCitation Type

```typescript
// types/rag.ts — add to existing types
export interface InlineCitation {
  index: number;               // The [N] number in the response text
  label: string;               // Source title or entity label
  entity_type: string;         // Entity type for badge styling
  node_id: string | null;      // Link to knowledge_nodes
  source_id: string | null;    // Link to knowledge_sources
  chunk_index: number | null;  // Which chunk within the source
  snippet?: string;            // First ~120 chars of chunk content (for tooltip)
}
```

---

## 9. Right Panel — Sources & Context

### 9.1 Panel Redesign

The right panel for the Ask view is redesigned from the current "Context" panel (which showed a MiniGraph + source chunks) to a structured **Sources & Context** panel with three distinct sections.

**Panel header:** "Sources & Context" — Cabinet Grotesk, `13px`, weight `700`, `--text-primary`. Below it: DM Sans, `10px`, weight `400`, `--text-secondary`, showing pipeline timing: "Retrieved in 2.3s · 8 sources · 12 entities".

### 9.2 Section 1: Source Chunks

**Section label:** "SOURCES" — Cabinet Grotesk, `10px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`, uppercase. `16px` margin-top from header.

Each source chunk is a `SourceCard`:

**SourceCard layout:**
- Container: `--bg-card` background, `1px solid var(--border-subtle)`, `8px` border-radius, `10px 12px` padding. `6px` gap between cards.
- Hover: border to `--border-default`, `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`. Transition `0.15s ease`.
- Click: opens full source detail (via `RightPanelContext` switching to `{ type: 'source', data: source }`).

**Card content:**
- **Top row:** Citation number badge (e.g., `[1]`) using same inline citation styling but at `9px` size + Source title (DM Sans, `12px`, weight `600`, `--text-primary`, truncate at 1 line) + Source type badge (entity badge styling, `10px`).
- **Snippet:** First 150 characters of chunk content. DM Sans, `11px`, weight `400`, `--text-body`, line-height `1.5`. 2-line clamp with ellipsis.
- **Similarity bar:** Thin horizontal bar (`3px` height, `100%` width, `--bg-inset` background). Filled portion uses `--accent-300` color. Width = `similarity * 100%`. Positioned at bottom of card with `8px` margin-top. No label needed — the visual width communicates relevance ranking.
- **Timestamp:** DM Sans, `10px`, weight `400`, `--text-secondary`. Right-aligned on the top row. Format: relative ("3 days ago") or absolute ("12 Jan 2025") depending on recency.

**Highlight behavior:** When a user clicks an inline citation `[N]` in the chat, the corresponding SourceCard receives a brief highlight: `background: var(--accent-50)` fading back to `--bg-card` over `0.5s ease`.

### 9.3 Section 2: Referenced Entities

**Section label:** "ENTITIES" — same label styling. `16px` margin-top from Sources section.

A compact list of entity badges for all nodes referenced in the response. Uses the standard entity badge component from PRD 4 (colored dot + label + type).

**Layout:** Flex wrap, `4px` gap.

**Badge behavior:** Click navigates to NodeDetail view in the right panel (same pattern as Browse tab). A "← Back to Sources" ghost button appears at the top of NodeDetail to return.

### 9.4 Section 3: Relationship Paths

**Section label:** "CONNECTIONS" — same label styling. `16px` margin-top from Entities section.

Displays the graph traversal paths used during context assembly. Each path is an `EntityChain` component:

**EntityChain layout:**
- Single line: `[Entity A] → relation_type → [Entity B]`
- Entity names: DM Sans, `11px`, weight `600`, `--text-primary`, clickable (same as entity badges).
- Arrow: `→` character, DM Sans, `11px`, `--text-placeholder`.
- Relation label: DM Sans, `10px`, weight `400`, `--text-secondary`, `background: var(--bg-inset)`, `4px 6px` padding, `4px` border-radius. Formatted: replace underscores with spaces, lowercase.
- Gap between chains: `4px`.

### 9.5 Section 4: Explore Bridge

**Position:** Fixed at the bottom of the right panel, always visible (sticky).

**ExploreButton:**
- Full-width button within the right panel.
- Background: `--bg-card`.
- Border: `1px solid var(--border-default)`.
- Border-radius: `8px`.
- Padding: `10px 14px`.
- Layout: flex, center-aligned.
- Icon: Lucide `Network` (or `GitFork`), `14px`, `--accent-500`.
- Label: "Explore in Graph →" — DM Sans, `12px`, weight `600`, `--accent-500`.
- Hover: `background: var(--accent-50)`, border to `rgba(214, 58, 0, 0.2)`. Transition `0.15s ease`.

**Click behavior:**

```typescript
// components/ask/ExploreButton.tsx
function handleExploreClick() {
  // Collect node IDs and edge IDs from the current response context
  const nodeIds = lastResponseContext.relatedNodes.map(n => n.id);
  const edgeIds = lastResponseContext.relatedEdges.map(e => e.id);

  // Navigate to Explore Graph tab with filter state
  navigate('/explore/graph', {
    state: {
      filterNodeIds: nodeIds,
      filterEdgeIds: edgeIds,
      fromAsk: true,             // Enables "← Back to Ask" breadcrumb in Graph tab
      queryText: lastQuery,       // For display in Graph tab header
    },
  });
}
```

**Graph Tab integration (PRD 5 modification):** When the Graph tab receives `filterNodeIds` in navigation state, it:
1. Filters the D3 force simulation to only include those nodes and their connecting edges.
2. Shows a header banner: "Showing graph context for: [queryText]" with a "Clear filter" button and a "← Back to Ask" link.
3. The "Clear filter" button restores the full graph view.

---

## 10. Dynamic Empty State

### 10.1 Redesign

The empty state (shown when no messages exist) is redesigned to teach the query composer and provide graph-aware suggestions.

**Layout:** Centered vertically in the chat area, max-width `520px`.

**Content structure:**

1. **Icon:** Lucide `MessageSquareText`, `40px`, `--text-placeholder`.
2. **Heading:** "Ask your knowledge graph" — Cabinet Grotesk, `18px`, weight `700`, `--text-primary`.
3. **Subtext:** "Get answers grounded in your ingested content, with source citations and graph context." — DM Sans, `13px`, weight `400`, `--text-secondary`, max-width `400px`, centered.

4. **Mindset showcase strip** — `24px` margin-top:
   - 4 small cards in a horizontal row, `6px` gap.
   - Each card: `--bg-card`, `1px solid var(--border-subtle)`, `8px` border-radius, `8px 10px` padding, `flex: 1`.
   - Icon: mindset icon, `14px`, mindset color.
   - Label: mindset label, DM Sans, `10px`, weight `600`, mindset color.
   - Click: sets the mindset in QueryComposer (pre-selects before the user types).

5. **Suggested queries** — `20px` margin-top:
   - Section label: "TRY ASKING" — Cabinet Grotesk, `10px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`.
   - **Dynamic suggestions** based on user's graph content:

```typescript
// components/ask/EmptyAskState.tsx
function generateSuggestions(
  anchors: Anchor[],
  nodeCount: number,
  topTypes: string[]
): SuggestedQuery[] {
  const suggestions: SuggestedQuery[] = [];

  // Anchor-based suggestions
  if (anchors.length > 0) {
    const topAnchor = anchors[0]; // Highest connection count
    suggestions.push({
      text: `What are the key insights related to ${topAnchor.label}?`,
      mindset: 'analytical',
      scope: [topAnchor.id],
    });
  }

  if (anchors.length >= 2) {
    suggestions.push({
      text: `How does ${anchors[0].label} connect to ${anchors[1].label}?`,
      mindset: 'exploratory',
      scope: [anchors[0].id, anchors[1].id],
    });
  }

  // Type-based suggestions
  if (topTypes.includes('Risk')) {
    suggestions.push({
      text: 'What are the key risks across my active projects?',
      mindset: 'analytical',
      scope: [],
    });
  }

  if (topTypes.includes('Decision')) {
    suggestions.push({
      text: 'What decisions have been made recently and what are their implications?',
      mindset: 'comparative',
      scope: [],
    });
  }

  // Fallback if no good anchors/types
  if (suggestions.length < 3) {
    suggestions.push({
      text: 'What are the most important themes in my knowledge?',
      mindset: 'exploratory',
      scope: [],
    });
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}
```

   - **Suggestion chip styling:** `--bg-card` background, `1px solid var(--border-subtle)`, `8px` border-radius, `10px 14px` padding, DM Sans `12px` weight `500` `--text-body`. Flex row with a small mindset icon (matching the pre-set mindset) on the left, `8px` gap. Hover: border to `--border-default`, `background: var(--bg-hover)`. Transition `0.15s ease`.
   - **Click behavior:** Populate the ChatInput with the suggestion text, set the QueryComposer to the suggestion's pre-set mindset and scope, then auto-submit.

---

## 11. QueryConfig Type & State Management

### 11.1 Type Definition

```typescript
// types/rag.ts — add to existing types

export type QueryMindsetId = 'factual' | 'analytical' | 'comparative' | 'exploratory';
export type ToolModeId = 'quick' | 'deep' | 'timeline';
export type ModelTierId = 'fast' | 'thorough';

export interface QueryConfig {
  mindset: QueryMindsetId;
  scopeAnchors: string[];     // Array of anchor node IDs (empty = all)
  toolMode: ToolModeId;
  modelTier: ModelTierId;
}

export const DEFAULT_QUERY_CONFIG: QueryConfig = {
  mindset: 'analytical',
  scopeAnchors: [],
  toolMode: 'deep',
  modelTier: 'thorough',
};
```

### 11.2 useQueryComposer Hook

```typescript
// hooks/useQueryComposer.ts

export function useQueryComposer() {
  const [config, setConfig] = useState<QueryConfig>(DEFAULT_QUERY_CONFIG);
  const [isExpanded, setIsExpanded] = useState(false);

  const setMindset = (mindset: QueryMindsetId) =>
    setConfig(prev => ({ ...prev, mindset }));

  const toggleScopeAnchor = (anchorId: string) =>
    setConfig(prev => ({
      ...prev,
      scopeAnchors: prev.scopeAnchors.includes(anchorId)
        ? prev.scopeAnchors.filter(id => id !== anchorId)
        : [...prev.scopeAnchors, anchorId],
    }));

  const clearScope = () =>
    setConfig(prev => ({ ...prev, scopeAnchors: [] }));

  const setToolMode = (toolMode: ToolModeId) =>
    setConfig(prev => ({ ...prev, toolMode }));

  const setModelTier = (modelTier: ModelTierId) =>
    setConfig(prev => ({ ...prev, modelTier }));

  const toggleExpanded = () => setIsExpanded(prev => !prev);

  return {
    config,
    isExpanded,
    setMindset,
    toggleScopeAnchor,
    clearScope,
    setToolMode,
    setModelTier,
    toggleExpanded,
  };
}
```

### 11.3 Integration with useRAGQuery

Modify `useRAGQuery` to accept and pass through the query config:

```typescript
// hooks/useRAGQuery.ts — modified sendMessage
async function sendMessage(text: string, queryConfig: QueryConfig) {
  // ... existing message creation ...

  const response = await queryGraph(
    text,
    userId,
    conversationHistory,
    queryConfig,        // NEW: pass config to pipeline
    setCurrentStep
  );

  // ... existing response handling ...
}
```

The `queryGraph` function in `services/rag.ts` uses the config to:
1. Select the mindset prompt addition → inject into system prompt.
2. Apply scope anchor IDs → filter search queries.
3. Apply tool mode pipeline overrides → adjust chunk counts, traversal depth.
4. Apply model tier generation config → set token limits, temperature.

---

## 12. Files to Modify/Create Summary

### New Files
- [ ] `src/config/queryMindsets.ts` — Mindset definitions with prompt templates
- [ ] `src/config/toolModes.ts` — Tool mode definitions with pipeline overrides
- [ ] `src/components/ask/QueryComposer.tsx` — Expandable composer toolbar
- [ ] `src/components/ask/MindsetSelector.tsx` — Mindset pill toggles
- [ ] `src/components/ask/ScopeFilter.tsx` — Anchor scope pill selector
- [ ] `src/components/ask/ToolModeSelector.tsx` — Retrieval strategy toggles
- [ ] `src/components/ask/ModelSelector.tsx` — Speed/depth toggle
- [ ] `src/components/ask/CitationTooltip.tsx` — Hover tooltip for inline citations
- [ ] `src/components/ask/SourceCard.tsx` — Source chunk card for right panel
- [ ] `src/components/ask/EntityChain.tsx` — Relationship path display
- [ ] `src/components/ask/ExploreButton.tsx` — Bridge to Graph tab
- [ ] `src/hooks/useQueryComposer.ts` — Composer state management
- [ ] `supabase/migrations/xxx_match_source_chunks_scoped.sql` — Scoped search RPC function

### Modified Files
- [ ] `src/views/AskView.tsx` — Integrate QueryComposer, pass config to pipeline
- [ ] `src/components/ask/ChatMessage.tsx` — Inline citation rendering
- [ ] `src/components/ask/ChatInput.tsx` — Dynamic helper text, shared container with composer
- [ ] `src/components/ask/AskRightPanel.tsx` — Redesign as Sources & Context panel
- [ ] `src/components/ask/EmptyAskState.tsx` — Dynamic suggestions, mindset showcase
- [ ] `src/services/rag.ts` — Accept QueryConfig, apply mindset/scope/tool/model
- [ ] `src/services/gemini.ts` — Accept mindset prompt and temperature override
- [ ] `src/services/supabase.ts` — Add scoped search function with anchor filtering
- [ ] `src/utils/promptBuilder.ts` — Add `buildRAGMindsetPrompt()` function
- [ ] `src/hooks/useRAGQuery.ts` — Accept and pass QueryConfig
- [ ] `src/types/rag.ts` — Add QueryConfig, InlineCitation, mindset/tool/model types
- [ ] `src/views/explore/GraphTab.tsx` — Handle navigation state for filtered subgraph view

---

## 13. Implementation Sequence

### Step 1: Types & Config (no UI changes)
1. Add new types to `src/types/rag.ts`.
2. Create `src/config/queryMindsets.ts` with all 4 mindset definitions.
3. Create `src/config/toolModes.ts` with all 3 tool mode definitions.
4. Add `ModelTier` definitions (in queryMindsets.ts or separate file).

### Step 2: Pipeline Modifications (backend, no UI changes)
1. Modify `buildRAGSystemPrompt` in `services/rag.ts` to accept `QueryConfig` and inject mindset prompt.
2. Modify `queryGraph` in `services/rag.ts` to accept `QueryConfig`, apply tool mode overrides.
3. Add scoped search to `services/supabase.ts` (the `semanticSearchChunks` modification).
4. Create the `match_source_chunks_scoped` Supabase RPC migration.
5. Modify `generateRAGResponse` in `services/gemini.ts` to accept temperature override.
6. Add timeline sorting logic to context assembly.
7. **Test:** Verify pipeline works with all config combinations using existing chat UI. Responses should change based on mindset. Scoped searches should return fewer, more relevant results.

### Step 3: QueryComposer UI
1. Create `useQueryComposer` hook.
2. Create `MindsetSelector` component.
3. Create `ScopeFilter` component (reads anchors from `SettingsContext`).
4. Create `ToolModeSelector` component.
5. Create `ModelSelector` component.
6. Create `QueryComposer` container with collapse/expand.
7. Integrate into `AskView.tsx` — position above ChatInput, wire state.
8. Update ChatInput helper text to be dynamic.
9. **Test:** Composer expands/collapses, selections persist, helper text updates.

### Step 4: Inline Citations
1. Modify `ChatMessage.tsx` to parse `[N]` references and render as interactive elements.
2. Create `CitationTooltip` component.
3. Update `parseRAGResponse` to extract `InlineCitation[]` from Gemini response.
4. Remove the old "SOURCES" badge section from assistant messages.
5. **Test:** Citations appear inline, tooltips show on hover, numbers match sources.

### Step 5: Right Panel Redesign
1. Redesign `AskRightPanel.tsx` with three sections (Sources, Entities, Connections).
2. Create `SourceCard` component with similarity bar.
3. Create `EntityChain` component for relationship paths.
4. Wire citation click → right panel scroll + highlight.
5. **Test:** Right panel populates after each response, citation clicks scroll correctly.

### Step 6: Explore Bridge
1. Create `ExploreButton` component.
2. Add it as a sticky element at the bottom of the right panel.
3. Modify `GraphTab.tsx` to read navigation state and apply node/edge filter.
4. Add "Back to Ask" breadcrumb and "Clear filter" button in Graph tab.
5. **Test:** Click Explore → Graph tab shows filtered subgraph → Clear restores full graph → Back link returns to Ask.

### Step 7: Dynamic Empty State
1. Modify `EmptyAskState.tsx` with mindset showcase and dynamic suggestions.
2. Implement `generateSuggestions()` logic.
3. Wire suggestion click to populate input + set composer config + auto-submit.
4. **Test:** Empty state shows relevant suggestions based on user's anchors and entity types.

---

## 14. Testing Guidance

### Functional Tests
- [ ] Each mindset produces visibly different response styles for the same question
- [ ] Scope filter with 1 anchor returns only sources connected to that anchor
- [ ] Scope filter with 2+ anchors returns sources connected to either (OR logic)
- [ ] "All" scope returns same results as unfiltered (no regression)
- [ ] Quick tool mode returns faster than Deep mode
- [ ] Timeline tool mode produces chronologically ordered responses
- [ ] Fast model tier returns shorter responses than Thorough
- [ ] Inline citations `[1]`, `[2]` render as interactive elements
- [ ] Citation tooltip shows correct source title and snippet
- [ ] Citation click scrolls right panel to corresponding source card
- [ ] Explore button navigates to Graph tab with correct node/edge filter
- [ ] Graph tab "Clear filter" restores full graph
- [ ] Graph tab "Back to Ask" returns to Ask view preserving chat history
- [ ] Empty state suggestions are based on actual user anchors
- [ ] Clicking a suggestion pre-sets mindset, scope, and submits

### Edge Cases
- [ ] User with 0 anchors: ScopeFilter shows "No anchors configured", empty state uses fallback suggestions
- [ ] User with 10+ anchors: ScopeFilter scrolls horizontally without breaking layout
- [ ] Response with 0 citations: no inline references rendered, right panel shows "No sources used"
- [ ] Scoped search returns 0 results: assistant message says "No relevant content found within the selected scope. Try broadening your scope filter."
- [ ] Very long query (500+ chars): ChatInput scrolls internally, QueryComposer stays visible
- [ ] Rapid mindset switching while loading: AbortController cancels in-flight request, new config takes effect

### Performance
- [ ] QueryComposer expand/collapse: <200ms animation, no layout shift in chat messages
- [ ] Scoped search adds <300ms to pipeline vs unscoped (for up to 3 anchors)
- [ ] Right panel renders all source cards within 100ms of response arrival
- [ ] Citation tooltip appears within 200ms of hover start

### Design System Compliance
- [ ] All backgrounds are neutral white/gray — no warm tinting
- [ ] Accent color only on interactive elements (citation badges, Explore button, selected model segment)
- [ ] Mindset colors use entity type color palette, not arbitrary colors
- [ ] Only one primary-accent button per view (the Send button remains the sole `--accent-500` filled button)
- [ ] All text uses Cabinet Grotesk (labels) or DM Sans (body/UI)
- [ ] No decorative shadows, glows, or gradients

---

## 15. Out of Scope

- **Persistent chat history** — Messages remain session-only. Future PRD will add Supabase persistence.
- **Conversation threading/forking** — Interesting idea, deferred to Phase 5+.
- **Custom user-created mindsets** — Only the 4 built-in mindsets for now.
- **Multiple model providers** — Both tiers use Gemini for now. Architecture supports swapping later.
- **Pinned Insights (write-back to graph)** — Tier 2 feature, separate PRD.
- **Voice input** — Not in scope.
- **Streaming responses** — Gemini response arrives as complete JSON. Streaming would require a different response format and is deferred.

---

## 16. Forward-Compatible Decisions

1. **`QueryConfig` is serializable.** All fields are primitives or string arrays. This allows future persistence to localStorage or a `user_preferences` table without type changes.

2. **Mindset prompt additions are isolated strings.** They can be A/B tested by swapping the `promptAddition` field. Analytics can track which mindset produces the highest user satisfaction (via a future response rating feature).

3. **Scope filtering uses anchor IDs, not labels.** Labels can change; IDs are stable. The `scopeAnchorIds` parameter in the pipeline is an array of UUIDs.

4. **Tool mode pipeline overrides are a flat config object.** Future tool modes (e.g., "Citations Only" that skips generation and just returns sources) can be added by adding a new entry to the `TOOL_MODES` array with different override values.

5. **The `match_source_chunks_scoped` RPC function** accepts a generic `filter_source_ids` array. It's not anchor-specific — any future filtering mechanism that produces a list of source IDs can use the same function.

6. **The Explore bridge uses React Router navigation state.** This is ephemeral (does not persist in URL) which is correct for a temporary filter. If deep-linking to filtered graph views becomes valuable, the state can be serialized to URL params without changing the bridge logic.

7. **Inline citation parsing uses a simple regex (`/(\[\d+\])/g`).** This is robust as long as the Gemini prompt instructs numbered references. If a future response format uses different citation markers, only the regex and rendering function need to change.
