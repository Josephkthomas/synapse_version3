# PRD 4 — Explore: Browse Tab

**Phase:** 2 — Data Surfaces
**Dependencies:** PRD 1 (Scaffold + Auth), PRD 2 (App Shell + Navigation), PRD 3 (Settings — provides SettingsContext with anchors and extraction settings)
**Estimated Complexity:** High (2–3 sessions)

---

## 1. Objective

Build the Browse tab of the Explore view — a filterable, searchable entity browser that lets users navigate their entire knowledge graph through a structured data interface. The Browse tab is the user's primary tool for finding, inspecting, and understanding individual entities. It provides multi-dimensional filtering (entity type, source, anchor, tags, confidence), two display modes (table with expandable rows, card grid), and a full-featured NodeDetail right panel that becomes the canonical component for displaying entity detail across the entire application.

This is the first view where users interact with real knowledge graph data at scale. It must perform smoothly with 500+ nodes and feel precise, fast, and rewarding to explore.

---

## 2. What Gets Built

### 2.1 Explore View Shell

**New files:**
- `src/views/ExploreView.tsx` — Outer container with tab bar (Graph / Browse). Graph tab renders a placeholder for PRD 5.
- `src/views/explore/BrowseTab.tsx` — Main Browse tab content orchestrator.

**Modifications:**
- `src/app/Router.tsx` — Replace Explore placeholder with `<ExploreView />`.

The Explore view occupies the full center stage area. The tab bar sits at the top, below the topbar. Tab content fills the remaining vertical space and manages its own scroll.

### 2.2 Tab Bar

- Two tabs: "Graph" and "Browse".
- Underline indicator: 2px solid `--accent-500` on active tab, `transparent` on inactive.
- Tab labels: DM Sans, 12px, weight 600. Active: `--text-primary`. Inactive: `--text-secondary`.
- The view toggle (table/card) sits right-aligned within the tab bar area, visible only when Browse tab is active.
- Result count ("142 entities") sits between the tabs and the view toggle, DM Sans 11px, `--text-secondary`.

### 2.3 Filter System

**New files:**
- `src/components/shared/FilterDrop.tsx` — Generic dropdown filter component.
- `src/components/shared/ConfidenceSlider.tsx` — Range slider for confidence threshold.
- `src/components/shared/FilterChips.tsx` — Active filter chip display with dismiss and "Clear all".

**Filter bar** sits directly below the tab bar, separated by `border-bottom: 1px solid var(--border-subtle)`. Background: `--bg-card`. Padding: `10px 16px`. Contents are a flex row wrapping on narrow widths.

**Search input** — Flex-grow, min-width 200px. Inset background (`--bg-inset`), `--border-subtle` border, 8px radius. Contains a search icon (Lucide `Search`, 14px, `--text-secondary`), text input (DM Sans, 13px, `--text-primary`, placeholder "Search entities…" in `--text-placeholder`), and a clear button (Lucide `X`, 12px, `--text-secondary`) visible only when the input has value. Searches against `label` and `description` fields, debounced at 300ms.

**Dropdown filters** — Four instances of `FilterDrop`:

| Filter | Options Source | Visual Indicator |
|---|---|---|
| Entity Type | All 24 ontology types from `config/entityTypes.ts` | 8px colored dot per option using entity color |
| Source | Distinct `source_type` values from user's nodes | Emoji icon per source type (🎙 Meeting, ▶️ YouTube, 📖 Research, 📝 Note, 📄 Document) |
| Anchor | All anchor nodes from SettingsContext | No color indicator (text only) |
| Tags | Union of all `tags[]` and `user_tags[]` from user's nodes | `#` prefix on each label |

**Confidence slider** — Label "Conf ≥" (DM Sans, 10px, weight 600, `--text-secondary`), HTML range input styled with `--bg-inset` track and `--accent-500` thumb. Range 0–100, step 5. Default: 0 (shows all). Current value displayed as percentage next to the slider.

**Active filter chips** — Appear in a row below the filter bar when any filter is active. Each chip: 20px radius, DM Sans 11px weight 600, `--bg-inset` background, `--border-default` border, `--text-body` text. Dismiss button (Lucide `X`, 10px) on the right of each chip. Entity type chips include the colored dot. "Clear all" link (Ghost button style, DM Sans 11px) appears at the end when 2+ filters are active.

### 2.4 `FilterDrop<T>` Component

A fully reusable, generic filter dropdown. This component will be reused in future views (Sources panel, Automate view).

**Props:**
```typescript
interface FilterDropProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
  colorMap?: Record<string, string> | null;  // entity color map or null
  iconMap?: Record<string, string> | null;   // emoji map or null
}
```

**Trigger button:** DM Sans, 12px, weight 600, `--text-secondary`. Chevron-down icon (Lucide `ChevronDown`, 12px). When filters are active: count badge (accent-50 bg, accent-500 text, 4px radius, DM Sans 9px weight 700) appears next to the label.

**Dropdown panel:** Position absolute, z-index 50. Background `--bg-card`, `--border-strong` border, 10px radius, `box-shadow: 0 4px 16px rgba(0,0,0,0.08)`. Max-height 280px, overflow-y auto. Padding 8px.

**Option rows:** 32px height, 6px horizontal padding, 6px radius on hover (`--bg-hover`). Each row: checkbox (16×16, `--bg-inset` border, `--accent-500` fill when checked with white checkmark), optional color dot (8px) or emoji, label text (DM Sans 12px, `--text-body`). 

**Behavior:** Click trigger toggles open/close. Click outside or Escape closes. Clicking an option toggles its selection without closing the dropdown. A "Clear" link appears at the top of the dropdown when any options are selected. The dropdown closes automatically after 5 seconds of no interaction (optional UX polish).

### 2.5 Table View

**New file:** `src/views/explore/BrowseTable.tsx`

The default display mode. A scrollable table within the Browse tab content area. Max-width: 840px, centered.

**Sticky header row:** Background `--bg-card`, bottom border `--border-default`, z-index 10. Column headers: DM Sans, 10px, weight 700, uppercase, letter-spacing 0.08em, `--text-secondary`. Columns:

| Column | Width | Content |
|---|---|---|
| Entity | flex (min 200px) | Expand chevron (Lucide `ChevronRight`, 12px, rotates 90° when expanded) + entity dot (8px, entity color) + label (DM Sans, 13px, weight 600, `--text-primary`) |
| Type | 100px | Entity type badge (styled per design system: 6% bg opacity, 16% border opacity, entity color text, 11px, weight 600) |
| Anchors | 120px | Up to 2 small anchor badges (DM Sans, 10px, weight 600, amber-tinted). "+N" overflow indicator. Empty cell shows "—" in `--text-placeholder`. |
| Source | 140px | Source type emoji (in 22×22 tinted container) + source name (DM Sans, 11px, `--text-secondary`, truncated with ellipsis) |
| Tags | 120px | Up to 2 tag labels (DM Sans, 10px, `--text-secondary`, `#` prefix). "+N" overflow. |
| Confidence | 80px | Confidence bar (40×4px, `--bg-inset` track, `--accent-500` fill proportional to confidence) + percentage text (DM Sans, 10px, `--text-secondary`) |
| Connections | 90px | Connection bar (32×4px, `--bg-inset` track, `--accent-500` fill scaled to max connections in dataset) + count number (DM Sans, 10px, weight 600) |
| Time | 80px | Relative timestamp (DM Sans, 10px, `--text-secondary`): "2h ago", "3d ago", "Jan 15" for older |

**Data rows:** No horizontal borders — use `border-bottom: 1px solid var(--border-subtle)` only. Row height: 48px. Hover: background shifts to `--bg-hover`, transition 0.15s ease. Cursor: pointer. Clicking a row selects the entity and opens NodeDetail in the right panel. Clicking the expand chevron (or the row if already selected) toggles the expanded state.

**Expanded row:** Appears below the parent row. Background `rgba(var(--bg-active-rgb), 0.5)` — a very subtle darkening. Padding: 12px 16px 12px 44px (left-indented past the chevron column). Contains:

- **Section label:** "TOP CONNECTIONS" — Cabinet Grotesk, 10px, weight 700, uppercase, 0.08em tracking, `--text-secondary`.
- **Connection list:** Up to 5 connections. Each row: entity dot (6px) + neighbor label (DM Sans, 12px, weight 500, `--text-primary`) + relationship tag (relationship type in a pill: `--bg-inset` bg, DM Sans 9px weight 600, `--text-secondary`, 4px radius) + direction arrow (→ or ←, `--text-placeholder`). Clicking a connection row navigates to that entity.
- **Quick action buttons** row below connections (flex, gap 8px):
  - "Explore with AI" — AI action primary style (`--accent-50` bg, `--accent-600` text, accent border). Placeholder: shows a toast "Coming in PRD 8" on click.
  - "Re-link" — AI action secondary style (`--bg-card` bg, `--border-subtle` border, `--text-body`). Placeholder.
  - "Find Similar" — AI action secondary style. Placeholder.
  - All buttons: DM Sans, 11px, weight 600, 6px radius, padding 6px 12px.

### 2.6 Card View

**New file:** `src/views/explore/BrowseCards.tsx`

Grid layout: `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px`. Max-width: 840px, centered.

**Each card** follows the Card component spec:
- Background: `--bg-card`. Border: `--border-subtle`. Radius: 12px. Padding: 16px 22px.
- Hover: border darkens to `--border-default`, translateY(-1px), shadow `0 2px 8px rgba(0,0,0,0.04)`. Transition: 0.18s ease.
- Cursor: pointer. Clicking opens NodeDetail in right panel.

**Card content (top to bottom):**
1. **Header row** (flex, space-between): Entity dot (10px) + label (Cabinet Grotesk, 14px, weight 700, `--text-primary`) on left. Entity type badge on right.
2. **Description** (clamped to 2 lines): DM Sans, 13px, weight 400, `--text-body`. `line-clamp: 2` with ellipsis overflow. If no description, show `--text-placeholder` italic "No description".
3. **Anchors row** (conditional, only if node is connected to anchors): DM Sans, 10px, weight 600. Anchor badges with ⚓ prefix, amber-tinted bg.
4. **Tags row** (conditional): Tag labels with `#` prefix, DM Sans, 10px, `--text-secondary`.
5. **Footer row** (flex, space-between, top border `--border-subtle`, padding-top 10px, margin-top 10px): Connection count (Lucide `GitBranch`, 12px, `--text-secondary` + count, DM Sans 11px weight 500) on left. Confidence bar + percentage on right.

### 2.7 NodeDetail Right Panel

**New file:** `src/components/panels/NodeDetail.tsx`

This is a **canonical, polished component** — it is used across Browse, Graph (PRD 5), Home feed (PRD 6), Ask citations (PRD 8), and command palette (PRD 12). Build it complete and correct here.

**Trigger:** When a user clicks any entity in the Browse view (table row or card), `GraphContext.setRightPanelContent({ type: 'node', data: node })` is called. The RightPanel component renders NodeDetail when content type is `'node'`.

**Layout (top to bottom, padding: 24px, scrollable):**

1. **Entity header:**
   - Entity type dot (12px, entity color) + label (Cabinet Grotesk, 18px, weight 700, `--text-primary`, -0.02em tracking).
   - Entity type badge below label (styled per entity badge spec).
   - Anchor indicator: if `is_anchor === true`, show ⚓ + "Anchor" label (DM Sans 10px weight 600, amber-tinted badge) next to type badge.
   - Edit button (Lucide `Pencil`, 14px, `--text-secondary`, ghost style) in the top-right corner. Toggles edit mode.

2. **Description section:**
   - Section label: "DESCRIPTION" (standard section label style).
   - Description text: DM Sans, 13px, `--text-body`, line-height 1.6.
   - In edit mode: textarea with inset styling, auto-resize, replacing the static text.

3. **Confidence indicator:**
   - Full-width bar: 100% width, 6px height, `--bg-inset` track, `--accent-500` fill.
   - Label: "Confidence: 87%" (DM Sans, 11px, `--text-secondary`).

4. **Source provenance:**
   - Section label: "SOURCE".
   - Source type emoji (in tinted container) + source name (DM Sans, 13px, weight 500, `--text-body`).
   - Source URL as ghost link (truncated, DM Sans 11px, `--accent-500`, underline).
   - Timestamp (DM Sans, 11px, `--text-secondary`).
   - Clicking the source name sets right panel to `{ type: 'source', data: source }` — but SourceDetail is built in PRD 6. For now, clicking navigates to the source URL in a new tab if available.

5. **Quote (conditional):**
   - Section label: "QUOTE".
   - Left-border accent (3px, `--accent-200`), padding-left 12px.
   - Quote text: DM Sans, 13px, italic, `--text-body`.

6. **Tags:**
   - Section label: "TAGS".
   - Two sub-sections: AI Tags (`tags[]`) and User Tags (`user_tags[]`).
   - Each tag: pill style (DM Sans, 10px, weight 600, `--bg-inset` bg, `--border-subtle` border, `--text-secondary` text, 12px radius, padding 3px 10px).
   - In edit mode: tags are removable (× button) and an "Add tag" input appears (inline, inset style, Enter to add).

7. **Connections section:**
   - Section label: "CONNECTIONS" + count badge (DM Sans 10px, `--text-secondary`).
   - List of connected entities, sorted by edge weight descending. Each connection row:
     - Entity dot (6px) + neighbor label (DM Sans 12px, weight 500, `--text-primary`).
     - Relationship tag (relationship type pill).
     - Direction indicator: "→" for outgoing, "←" for incoming.
     - Edge evidence text on hover (tooltip, DM Sans 11px).
   - Max 10 visible initially. "Show all N connections" ghost link if more exist.
   - Clicking a connection row navigates to that node (sets it as the new right panel content and highlights it in the table/card view).

8. **Action buttons (bottom):**
   - "Explore with AI" — primary AI action style. Full width. Placeholder for PRD 8.
   - "Re-link" + "Find Similar" — secondary AI action style, side by side. Placeholders.
   - "Promote to Anchor" / "Demote from Anchor" — tertiary button style. Calls `promoteToAnchor(nodeId)` / `demoteAnchor(nodeId)` from `services/supabase.ts`. Updates SettingsContext.

9. **Edit mode controls (visible in edit mode only):**
   - "Save" (primary button) and "Cancel" (tertiary button) at the bottom.
   - Save writes updates to `knowledge_nodes` via Supabase. Fields editable: `label`, `description`, `user_tags`.
   - Success: brief green checkmark flash, exit edit mode.
   - Error: inline error message below save button, red semantic text.

### 2.8 View Toggle

A toggle group (per design system spec) with two options: Table (Lucide `List`, 14px) and Cards (Lucide `LayoutGrid`, 14px). Sits right-aligned in the tab bar. Active item: `--bg-card` popping out of `--bg-inset` container. Inactive: `--text-secondary`. The active view persists across filter changes but resets on navigation away.

### 2.9 Empty and Loading States

**Loading state:** Skeleton placeholders. For table: 8 rows of gray shimmer bars (animate: pulse). For cards: 6 card-shaped shimmer rectangles. Skeleton color: `--bg-inset` with a lighter pulse to `--bg-hover`.

**Empty state (no nodes in database):**
- Centered container, max-width 400px.
- Lucide `Database` icon, 48px, `--text-placeholder`.
- Heading: "No entities yet" — Cabinet Grotesk, 18px, weight 700, `--text-primary`.
- Body: "Add your first source in the Ingest view to start building your knowledge graph." — DM Sans, 13px, `--text-secondary`, centered.
- "Go to Ingest" ghost button linking to `/ingest`.

**Empty state (filters active, no results):**
- Centered container.
- Lucide `SearchX` icon, 40px, `--text-placeholder`.
- Heading: "No matching entities" — Cabinet Grotesk, 16px, weight 700.
- Body: "Try adjusting your filters or search query." — DM Sans, 13px, `--text-secondary`.
- "Clear all filters" ghost button that resets all filters.

**Error state:**
- Inline banner at top of content area.
- Background: `--semantic-red-50`. Border: 1px solid `rgba(239,68,68,0.2)`. Radius: 8px. Padding: 12px 16px.
- Lucide `AlertCircle` icon (16px, `--semantic-red-500`) + error message (DM Sans 13px, `--text-body`) + "Retry" tertiary button.

### 2.10 Staggered Load Animation

On initial render and when filters change, entities animate in using the fade-up pattern:
- `@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`
- Duration: 0.4s ease. Delay increment: 0.03s per item (faster than the standard 0.05s because there are many items). Max stagger depth: 12 items — items beyond 12 appear immediately.
- Animation triggers on: initial load, filter change, view toggle (table ↔ cards).

---

## 3. Data & Service Layer

### 3.1 New Service Functions in `services/supabase.ts`

```typescript
// ─── Node Fetching ───

interface NodeFilters {
  search?: string;
  entityTypes?: string[];
  sourceTypes?: string[];
  anchorIds?: string[];       // filter nodes connected to these anchors
  tags?: string[];
  minConfidence?: number;     // 0-1 range
}

interface PaginationOptions {
  page: number;
  pageSize: number;           // default: 50
}

interface NodeWithMeta extends KnowledgeNode {
  connectionCount: number;
  anchorLabels: string[];     // derived from joins
}

async function fetchNodes(
  filters: NodeFilters,
  pagination: PaginationOptions
): Promise<{ data: NodeWithMeta[]; totalCount: number }>;
// Implementation: builds a Supabase query with chained .or(), .in(), .gte() filters.
// Orders by created_at DESC.
// Uses .range(from, to) for pagination.
// Connection count: separate count query on knowledge_edges grouped by node.
// Anchor labels: join through edges to anchor nodes, or filter on source_id → nodes with is_anchor.

async function fetchNodeById(nodeId: string): Promise<KnowledgeNode | null>;
// Uses .eq('id', nodeId).maybeSingle()

async function updateNode(
  nodeId: string,
  updates: Partial<Pick<KnowledgeNode, 'label' | 'description' | 'user_tags'>>
): Promise<KnowledgeNode>;
// Uses .update(updates).eq('id', nodeId).select().single()

// ─── Edge/Connection Fetching ───

interface NodeNeighbor {
  node: Pick<KnowledgeNode, 'id' | 'label' | 'entity_type' | 'description'>;
  edge: Pick<KnowledgeEdge, 'id' | 'relation_type' | 'evidence' | 'weight'>;
  direction: 'outgoing' | 'incoming';
}

async function getNodeNeighbors(
  nodeId: string,
  limit?: number             // default: 20
): Promise<NodeNeighbor[]>;
// Step 1: fetch edges where source_node_id = nodeId OR target_node_id = nodeId
// Step 2: collect unique neighbor IDs
// Step 3: fetch neighbor node details
// Step 4: combine into NodeNeighbor[] with direction
// Sort by edge weight DESC

async function getNodeConnectionCount(nodeId: string): Promise<number>;
// Count edges where source_node_id = nodeId OR target_node_id = nodeId
// This function was specified in PRD 3 as reusable — ensure it's the same function.

// ─── Filter Options ───

async function getDistinctSourceTypes(): Promise<string[]>;
// SELECT DISTINCT source_type FROM knowledge_nodes WHERE user_id = auth.uid()

async function getAllTags(): Promise<string[]>;
// Fetches all nodes, extracts union of tags[] and user_tags[], deduplicates.
// Consider caching in the hook layer.

async function getNodeAnchorConnections(nodeIds: string[]): Promise<Record<string, string[]>>;
// For a batch of node IDs, find which anchors each node is connected to.
// Returns a map: nodeId → [anchor labels]
// Query: edges where target is an anchor (is_anchor = true) for source_node_ids in nodeIds, UNION
//         edges where source is an anchor for target_node_ids in nodeIds.
```

### 3.2 Supabase Query Details

**Primary node fetch query:**
```typescript
let query = supabase
  .from('knowledge_nodes')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false });

// Search: use ilike on label and description
if (filters.search) {
  query = query.or(
    `label.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
  );
}

// Entity type filter
if (filters.entityTypes?.length) {
  query = query.in('entity_type', filters.entityTypes);
}

// Source type filter
if (filters.sourceTypes?.length) {
  query = query.in('source_type', filters.sourceTypes);
}

// Confidence filter
if (filters.minConfidence != null && filters.minConfidence > 0) {
  query = query.gte('confidence', filters.minConfidence);
}

// Tag filter (uses PostgreSQL array overlap: &&)
if (filters.tags?.length) {
  query = query.overlaps('tags', filters.tags);
}

// Pagination
const from = pagination.page * pagination.pageSize;
const to = from + pagination.pageSize - 1;
query = query.range(from, to);
```

**Anchor filter** is more complex because it requires a join through edges. Implementation options:
- Option A (recommended): Fetch anchor-connected node IDs separately, then filter with `.in('id', anchorNodeIds)`. This is two queries but simpler.
- Option B: Use a Supabase RPC function. Avoid unless needed for performance.

**Connection count query:**
```typescript
// Batch approach: fetch edge counts for visible nodes
const { data: edgeCounts } = await supabase
  .from('knowledge_edges')
  .select('source_node_id, target_node_id')
  .or(
    nodeIds.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(',')
  );

// Aggregate in JS:
const countMap: Record<string, number> = {};
edgeCounts?.forEach(edge => {
  countMap[edge.source_node_id] = (countMap[edge.source_node_id] || 0) + 1;
  countMap[edge.target_node_id] = (countMap[edge.target_node_id] || 0) + 1;
});
```

**Note on the batch edge count query:** For large datasets (500+ nodes), the `.or()` clause with hundreds of conditions may hit URL length limits. In that case, split into batches of 50 node IDs and merge results. The hook layer should handle this transparently.

### 3.3 New Hooks

**New file:** `src/hooks/useNodes.ts`

```typescript
interface UseNodesOptions {
  filters: NodeFilters;
  pageSize?: number;    // default: 50
}

interface UseNodesReturn {
  nodes: NodeWithMeta[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  refetch: () => void;
  maxConnections: number;   // for scaling connection bars
}

function useNodes(options: UseNodesOptions): UseNodesReturn;
```

This hook:
1. Calls `fetchNodes()` with current filters and pagination.
2. After receiving nodes, calls `getNodeConnectionCount()` for each node in a batch.
3. Calls `getNodeAnchorConnections()` for the batch to populate anchor labels.
4. Combines results into `NodeWithMeta[]`.
5. Debounces refetch on filter changes (300ms for search, immediate for dropdowns).
6. Caches the `maxConnections` value for scaling the connection bars.
7. Handles loading, error, and empty states.
8. Refetches when filters change (via `useEffect` dependency on serialized filters).

**New file:** `src/hooks/useNodeNeighbors.ts`

```typescript
function useNodeNeighbors(nodeId: string | null): {
  neighbors: NodeNeighbor[];
  isLoading: boolean;
  error: string | null;
};
```

Calls `getNodeNeighbors()` when `nodeId` is non-null. Used by expanded table rows and NodeDetail panel. Caches results per node ID for the session (avoids re-fetching when collapsing/expanding the same row).

**New file:** `src/hooks/useFilterOptions.ts`

```typescript
function useFilterOptions(): {
  entityTypes: string[];        // from config/entityTypes.ts (static)
  sourceTypes: string[];        // from getDistinctSourceTypes()
  tags: string[];               // from getAllTags()
  anchors: AnchorNode[];        // from SettingsContext
  isLoading: boolean;
};
```

Loads dynamic filter options on mount. Entity types are static config. Anchors come from SettingsContext (already loaded). Source types and tags are fetched from the database.

### 3.4 Types

**New file:** `src/types/nodes.ts` (or add to existing `types/` files)

```typescript
interface KnowledgeNode {
  id: string;
  user_id: string;
  label: string;
  entity_type: string;
  description: string | null;
  confidence: number | null;
  is_anchor: boolean;
  source: string | null;
  source_type: string | null;
  source_url: string | null;
  source_id: string | null;
  tags: string[] | null;
  user_tags: string[] | null;
  quote: string | null;
  created_at: string;
}

interface KnowledgeEdge {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string | null;
  evidence: string | null;
  weight: number;
  created_at: string;
}

interface NodeWithMeta extends KnowledgeNode {
  connectionCount: number;
  anchorLabels: string[];
}

interface NodeNeighbor {
  node: Pick<KnowledgeNode, 'id' | 'label' | 'entity_type' | 'description'>;
  edge: Pick<KnowledgeEdge, 'id' | 'relation_type' | 'evidence' | 'weight'>;
  direction: 'outgoing' | 'incoming';
}
```

---

## 4. Design Requirements — Exact Specifications

### 4.1 Browse Tab Layout

```
┌──────────────────────────────────────────────────────────┐
│  Graph   Browse          142 entities       [≡] [⊞]     │  ← Tab bar
├──────────────────────────────────────────────────────────┤
│  [🔍 Search entities...]  [Entity Type ▾] [Source ▾]     │  ← Filter bar
│  [Anchor ▾] [Tags ▾]  Conf ≥ [━━━━━○━━━] 40%            │
├──────────────────────────────────────────────────────────┤
│  ⨉ Person  ⨉ Meeting  ⨉ Confidence ≥ 40%   Clear all   │  ← Filter chips (conditional)
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ENTITY              TYPE      SOURCE    CONF   CONN     │  ← Table header (sticky)
│  ───────────────────────────────────────────────         │
│  ▸ ● Graph RAG       Topic     📖 Res.   ━━ 87%  ━ 12  │  ← Table rows
│  ▸ ● Gemini Flash    Tech      ▶️ YT     ━━ 92%  ━ 8   │
│  ▾ ● Data Sovereignty Concept  🎙 Meet   ━━ 78%  ━ 15  │  ← Expanded
│    ┌─────────────────────────────────────────┐           │
│    │ TOP CONNECTIONS                          │           │
│    │ ● Privacy Framework  supports →          │           │
│    │ ● EU AI Act          relates_to →        │           │
│    │ [Explore with AI] [Re-link] [Find Sim.]  │           │
│    └─────────────────────────────────────────┘           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Color and Typography Reference

| Element | Font | Size | Weight | Color | Additional |
|---|---|---|---|---|---|
| Tab label (active) | DM Sans | 12px | 600 | `--text-primary` | 2px bottom border `--accent-500` |
| Tab label (inactive) | DM Sans | 12px | 600 | `--text-secondary` | 2px bottom border transparent |
| Result count | DM Sans | 11px | 400 | `--text-secondary` | — |
| Search placeholder | DM Sans | 13px | 400 | `--text-placeholder` | — |
| Filter trigger label | DM Sans | 12px | 600 | `--text-secondary` | Chevron icon 12px |
| Filter option label | DM Sans | 12px | 400 | `--text-body` | — |
| Filter chip label | DM Sans | 11px | 600 | `--text-body` | — |
| Table header | Cabinet Grotesk | 10px | 700 | `--text-secondary` | uppercase, 0.08em tracking |
| Table entity label | DM Sans | 13px | 600 | `--text-primary` | — |
| Table metadata | DM Sans | 11px | 400 | `--text-secondary` | — |
| Card title | Cabinet Grotesk | 14px | 700 | `--text-primary` | -0.01em tracking |
| Card description | DM Sans | 13px | 400 | `--text-body` | line-clamp: 2 |
| Section label | Cabinet Grotesk | 10px | 700 | `--text-secondary` | uppercase, 0.08em tracking |
| NodeDetail entity label | Cabinet Grotesk | 18px | 700 | `--text-primary` | -0.02em tracking |
| NodeDetail description | DM Sans | 13px | 400 | `--text-body` | line-height 1.6 |
| Connection neighbor label | DM Sans | 12px | 500 | `--text-primary` | — |
| Relationship tag | DM Sans | 9px | 600 | `--text-secondary` | `--bg-inset` bg, 4px radius |

### 4.3 Spacing Reference

| Element | Value |
|---|---|
| Tab bar height | 44px |
| Filter bar padding | 10px 16px |
| Filter chip row padding | 8px 16px |
| Table row height | 48px |
| Expanded row padding | 12px 16px 12px 44px |
| Card grid gap | 8px |
| Card padding | 16px 22px |
| Card border-radius | 12px |
| NodeDetail section gap | 20px |
| NodeDetail padding | 24px |
| Content area max-width | 840px |
| Connection row height | 32px |
| Filter dropdown max-height | 280px |

### 4.4 Transitions

| Element | Property | Duration | Timing |
|---|---|---|---|
| Table row hover bg | background-color | 0.15s | ease |
| Card hover lift + shadow | transform, box-shadow, border-color | 0.18s | ease |
| Expand chevron rotation | transform (rotate) | 0.2s | ease |
| Expanded row open/close | max-height, opacity | 0.25s | ease-out |
| Filter dropdown open | opacity, transform (translateY) | 0.15s | ease-out |
| Filter chip appear/remove | opacity, transform (scale) | 0.2s | ease |
| Fade-up stagger | opacity, transform | 0.4s | ease |

---

## 5. Interaction & State

### 5.1 State Architecture

**Local state (BrowseTab):**
- `viewMode: 'table' | 'cards'` — toggle between display modes.
- `searchQuery: string` — search input value.
- `entityTypeFilter: string[]` — selected entity types.
- `sourceTypeFilter: string[]` — selected source types.
- `anchorFilter: string[]` — selected anchor IDs.
- `tagFilter: string[]` — selected tags.
- `confidenceMin: number` — 0–100 integer.
- `expandedRowId: string | null` — which table row is expanded.
- `openDropdown: string | null` — which filter dropdown is currently open (mutually exclusive).

**GraphContext (global):**
- `selectedNodeId: string | null` — currently selected entity. Persists across tab switches within Explore.
- `rightPanelContent: RightPanelContent` — set to `{ type: 'node', data: node }` when an entity is selected.
- `clearSelection()` — resets selection and right panel.

**State persistence rules:**
- Filters reset when navigating away from Explore and back.
- Selected node persists when switching between Graph and Browse tabs within Explore.
- View mode (table/cards) does NOT persist across navigation — defaults to table.
- Filter state is NOT saved to URL or database. It is ephemeral.

### 5.2 Interaction Map

| User Action | Result |
|---|---|
| Type in search input | Debounce 300ms → update `searchQuery` → `useNodes` refetches → results update with fade-up animation |
| Toggle entity type in dropdown | Immediate filter update → refetch. Count badge updates on filter trigger. Chip appears. |
| Click a filter chip's ×  | Remove that filter value → refetch |
| Click "Clear all" | Reset all filters and search → refetch |
| Slide confidence slider | Debounce 200ms → update `confidenceMin` → refetch |
| Click table row | Set `selectedNodeId` in GraphContext → NodeDetail opens in right panel. If same row already selected, toggle expanded state. |
| Click expand chevron | Toggle `expandedRowId`. Fetch neighbors if not already cached. |
| Click card in card view | Set `selectedNodeId` in GraphContext → NodeDetail opens in right panel |
| Click connection in expanded row | Navigate to that node: set it as selected, scroll table to it, show its NodeDetail |
| Click "Promote to Anchor" in NodeDetail | Call `promoteToAnchor()` → update SettingsContext → refetch node → NodeDetail updates to show anchor status |
| Click "Save" in NodeDetail edit mode | Call `updateNode()` → refetch node → exit edit mode → success flash |
| Press ↑↓ keys when table is focused | Move selection up/down through visible rows |
| Press Enter when row is focused | Toggle expand on focused row |
| Press Escape when filter dropdown is open | Close the dropdown |
| Toggle table ↔ cards | Switch `viewMode`. Preserve selection and filters. |

### 5.3 Pagination

- Page size: 50 entities per page.
- Pagination controls appear below the table/cards when `totalCount > pageSize`.
- Controls: "← Previous" and "Next →" (tertiary buttons, DM Sans 12px weight 600) with page indicator "Page 2 of 17" (DM Sans 12px, `--text-secondary`) between them.
- Changing page scrolls content area to top and triggers fade-up animation on new results.
- Pagination resets to page 1 when any filter changes.

---

## 6. Forward-Compatible Decisions

1. **`FilterDrop<T>`** is generic and reusable. It accepts any typed options array, supports optional color/icon maps, and can be composed into any future filter bar. Will be reused if a Sources panel or advanced search is built.

2. **`useNodes` hook** encapsulates all fetch + filter + pagination logic. It will be consumed by the command palette search (PRD 12 — add a `searchOnly` mode that skips pagination and limits to 10 results) and potentially the Home feed for "recent entities" queries.

3. **`NodeDetail` right panel** is built as a self-contained component accepting a `KnowledgeNode` prop. It handles its own data fetching (neighbors, source details) and editing. It can be rendered by any view that selects a node — Browse, Graph, Home, Ask. No view-specific logic should leak into this component.

4. **`getNodeNeighbors()` service function** follows the pattern documented in `LEGACY-PATTERNS.md` for edge traversal. It returns typed `NodeNeighbor[]` with direction information. This function is the foundation for graph traversal in PRD 5 (expand entity cluster), PRD 8 (Graph RAG context assembly), and PRD 12 (command palette detail preview).

5. **Entity type config** (`config/entityTypes.ts`) established in PRD 1 is consumed here via import. The color map, label map, and type list are the single source of truth. If new entity types are added, only that config file changes.

6. **Anchor connections** are computed at fetch time, not stored on the node. This means anchor status changes (PRD 3) are immediately reflected without cache invalidation.

7. **Filter state is NOT URL-persisted**. This is deliberate — it keeps the implementation simple now. If deep-linking to filtered views becomes valuable (Phase 5+), filters can be serialized to URL search params without changing the component architecture. The `useNodes` hook already accepts a filters object that could be hydrated from URL params.

8. **Expanded row quick action buttons** are placeholders with toast notifications. Their `onClick` handlers accept the node as a parameter, making it trivial to wire up real functionality in PRD 8 (Explore with AI → trigger RAG query seeded with entity context).

---

## 7. Edge Cases & Error Handling

### 7.1 Data States

| State | What User Sees |
|---|---|
| **New user, zero nodes** | Empty state with CTA to Ingest view. Filters are hidden (no point filtering nothing). |
| **Filters active, zero matches** | "No matching entities" empty state with "Clear all filters" button. |
| **Node with no description** | Table: description cell empty. Card: italic placeholder "No description". NodeDetail: "No description yet. Click edit to add one." |
| **Node with no confidence** | Confidence bar shows 0% fill. Text shows "—" instead of percentage. |
| **Node with no tags** | Tags section hidden in NodeDetail. Tags column shows "—" in table. |
| **Node with no source** | Source column shows "—". Source section shows "Unknown source" in NodeDetail. |
| **Node with no connections** | Connection count shows "0". Expanded row shows "No connections found." NodeDetail connections section shows "No connections yet." |
| **Node with 100+ connections** | NodeDetail shows first 10, with "Show all 127 connections" link that expands the list (lazy-loads remaining). Table expanded row shows top 5 only. |
| **Tags overflow (>2 visible)** | Shows first 2 + "+N" badge that shows a tooltip listing all tags on hover. |
| **Very long entity label** | Truncated with ellipsis in table (CSS `text-overflow: ellipsis`). Full label shown in NodeDetail. Card wraps to 2 lines max. |
| **500+ nodes** | Pagination handles this. Table renders only the current page (50 rows max). Card grid renders only the current page. Performance remains smooth. |

### 7.2 Error States

| Error | Handling |
|---|---|
| **Supabase query failure** | Show error banner at top of content area. "Retry" button refetches. |
| **Node update failure (edit mode)** | Inline error below Save button. Do not exit edit mode. User data is preserved in form state. |
| **Neighbor fetch failure (expanded row)** | Show "Couldn't load connections" with retry link inside the expanded area. |
| **Auth expiry during session** | AuthContext detects expiry → redirect to login. Any unsaved edits are lost (acceptable for this use case). |
| **Network timeout** | After 10s, show "Request timed out" in error banner. Auto-retry once after 3s delay. |
| **Malformed node data (null entity_type)** | Default to a gray dot and "Unknown" type badge. Don't crash the entire list for one bad row. |

### 7.3 Browser Concerns

- **1280px width:** Content area narrows. Card grid shows 2 columns. Table columns compress — Source and Tags columns hide (responsive). Right panel overlaps if both open — use a slide-over behavior on narrow widths (right panel slides on top of content with a close button).
- **1440px width:** Standard experience. 3-column card grid. All table columns visible.
- **1920px width:** Extra space filled by content centering (max-width: 840px). Cards may show 3 columns. Table has comfortable spacing.
- **Keyboard navigation:** Tab through filter controls → table rows → pagination. Arrow keys move through table rows when focused. Enter expands/collapses. Escape closes dropdowns.

---

## 8. File Structure Summary

### New Files

```
src/
├── views/
│   ├── ExploreView.tsx                    # Tab container (Graph/Browse)
│   └── explore/
│       ├── BrowseTab.tsx                  # Main Browse orchestrator
│       ├── BrowseTable.tsx                # Table display mode
│       ├── BrowseCards.tsx                # Card grid display mode
│       └── BrowseExpandedRow.tsx          # Expanded row connections + actions
├── components/
│   ├── shared/
│   │   ├── FilterDrop.tsx                 # Generic dropdown filter (reusable)
│   │   ├── ConfidenceSlider.tsx           # Range slider with label
│   │   ├── FilterChips.tsx                # Active filter chips bar
│   │   ├── EntityBadge.tsx                # Entity type badge (reusable)
│   │   ├── EntityDot.tsx                  # Colored entity dot (reusable)
│   │   ├── SourceIcon.tsx                 # Source type emoji container (reusable)
│   │   ├── RelationshipTag.tsx            # Relationship type pill (reusable)
│   │   └── ConfidenceBar.tsx              # Confidence bar indicator (reusable)
│   └── panels/
│       └── NodeDetail.tsx                 # Full node detail panel (canonical)
├── hooks/
│   ├── useNodes.ts                        # Node fetching + filtering + pagination
│   ├── useNodeNeighbors.ts                # Edge traversal for connections
│   └── useFilterOptions.ts                # Dynamic filter option loading
└── types/
    └── nodes.ts                           # KnowledgeNode, KnowledgeEdge, etc.
```

### Modified Files

```
src/
├── app/Router.tsx                         # ExploreView replaces placeholder
├── services/supabase.ts                   # New query functions added
└── app/providers/GraphContext.tsx          # selectedNodeId, clearSelection
```

---

## 9. Acceptance Criteria

After this PRD is complete, a user can:

- [ ] Navigate to the Explore view and see two tabs: Graph (placeholder) and Browse (functional).
- [ ] See all their existing knowledge nodes in a table with sortable columns.
- [ ] Search entities by name or description with instant results.
- [ ] Filter by entity type, source type, anchor, and tags using dropdown multi-selectors.
- [ ] Filter by minimum confidence using a range slider.
- [ ] See active filters as dismissible chips, and clear all filters at once.
- [ ] See the total count of matching entities update as filters are applied.
- [ ] Switch between table view and card grid view.
- [ ] Expand a table row to see that entity's top connections and relationship types.
- [ ] Click any entity (in table or card) to see its full detail in the right panel.
- [ ] In the right panel, see the entity's description, confidence, source, quote, tags, and connections.
- [ ] Edit an entity's label, description, and user tags inline in the right panel, and save changes.
- [ ] Promote a node to anchor or demote an anchor from the right panel.
- [ ] Click a connection in the right panel to navigate to that entity.
- [ ] See appropriate loading skeletons while data loads.
- [ ] See helpful empty states when no nodes exist or no filters match.
- [ ] See graceful error handling with retry options for network failures.
- [ ] Experience smooth staggered animations on load and filter changes.
- [ ] Navigate at 1280px, 1440px, and 1920px widths without layout breaks.
- [ ] Use keyboard navigation to move through the table and interact with filters.
- [ ] All visual elements conform to the Synapse design system (colors, typography, spacing, components).
