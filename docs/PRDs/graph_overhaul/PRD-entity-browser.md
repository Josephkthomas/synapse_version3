```markdown
## Feature Name: Entity Browser — Explore View Third Tab

### Overview
Add an "Entities" tab to the Explore view alongside the existing Anchors and Sources tabs. The Entity Browser provides a filterable, sortable card/list grid of every entity in the knowledge graph with a detail panel showing local graph neighborhood, connections, and entity metadata. This is the view where users discover cross-connections between entities that the aggregated Anchor view abstracts away.

### User Value
- **Who benefits**: Power users with 50+ entities who want to browse, filter, and discover connections across their entire knowledge graph
- **Problem solved**: The Anchors view aggregates entities into high-level clusters, hiding the granular cross-connections that make knowledge graphs valuable. There is currently no way to browse all entities with their individual relationship context.
- **Expected outcome**: Users can find any entity by type, source, or tag; discover unexpected connections between entities from different sources; and drill into any entity's local graph neighborhood without loading the full graph visualization.

### Context for AI Coding Agent

**Existing Codebase Patterns:**
- Relevant files: `src/views/ExploreView.tsx`, `src/services/supabase.ts`, `src/components/layout/RightPanel.tsx`, `src/config/entityTypes.ts`, `src/types/database.ts`
- Follow the existing `fetchNodes()` and `fetchEdges()` patterns in `services/supabase.ts` for data fetching
- Follow the `FilterDrop` component pattern already defined in PRD 4 (Browse tab) — this PRD extends it
- Follow the `NodeDetail` right panel component pattern from PRD 4 for entity detail rendering
- The three-pane layout (56px nav + flex center + 310px right panel) is already established in `src/components/layout/`
- Design tokens are in `src/styles/tokens.css` and mapped to Tailwind theme via `@theme` block
- Entity type colors are in `src/config/entityTypes.ts`
- Use Lucide React icons throughout (already installed)
- Dependencies already available: D3.js v7, Lucide React, Tailwind CSS 4, react-router-dom v6

**Relationship to Existing PRDs:**
- This extends PRD 4 (Explore: Browse Tab). PRD 4 defined a Graph tab and a Browse tab. This PRD restructures the Explore view into three tabs: **Anchors** (the existing graph/source-anchor abstraction), **Entities** (this new feature), and **Sources** (existing source list view).
- The existing Browse tab's table/card view is being replaced and upgraded by this Entity Browser. The Entity Browser has richer card design, a local graph visualization in the detail panel, and a type distribution bar.
- Reuse the `FilterDrop` component, `useNodes` hook, `NodeDetail` right panel component, and `getNodeNeighbors()` utility from PRD 4. This PRD adds new components alongside those existing ones.

**Files to Create:**
- [ ] `src/views/explore/EntityBrowserTab.tsx` — Main Entity Browser tab content (filters, grid, list)
- [ ] `src/components/explore/EntityCard.tsx` — Individual entity card component
- [ ] `src/components/explore/EntityListRow.tsx` — Compact list view row component
- [ ] `src/components/explore/EntityDetailPanel.tsx` — Right panel content for entity detail with local graph
- [ ] `src/components/explore/LocalGraph.tsx` — Small canvas-based graph showing entity neighborhood
- [ ] `src/components/explore/TypeDistributionBar.tsx` — Horizontal bar showing entity type composition
- [ ] `src/components/explore/SortSelector.tsx` — Sort dropdown component
- [ ] `src/hooks/useEntityBrowser.ts` — Hook encapsulating filter, sort, search, and pagination state

**Files to Modify:**
- [ ] `src/views/ExploreView.tsx` — Restructure tab system from 2 tabs (Graph/Browse) to 3 tabs (Anchors/Entities/Sources), wire up EntityBrowserTab
- [ ] `src/services/supabase.ts` — Add `fetchEntitiesWithConnections()` query function and `fetchEntityNeighborhood()` for the local graph
- [ ] `src/types/database.ts` — Add `EntityWithConnections` and `EntityNeighborhood` type interfaces
- [ ] `src/components/layout/RightPanel.tsx` — Add `'entity-detail'` to the `RightPanelContent` discriminated union

### Technical Scope

**Affected Components:**
- [x] Graph database schema (`knowledge_nodes`, `knowledge_edges`) — read-only queries, no schema changes
- [x] Visualization (D3.js Canvas for LocalGraph component)
- [x] UI/UX — new tab, new components, right panel content type

**Dependencies:**
- PRD 2 (App Shell) — three-pane layout, nav rail, right panel
- PRD 4 (Browse Tab) — FilterDrop, useNodes hook, NodeDetail component, getNodeNeighbors utility
- `src/config/entityTypes.ts` — entity type color map
- `src/styles/tokens.css` — all design system tokens
- D3.js v7 for LocalGraph canvas rendering

### Functional Requirements

**1. Tab Restructuring**
- FR-1.1: The Explore view tab bar displays three tabs: "Anchors", "Entities", "Sources" — rendered as horizontal text buttons with a 2px bottom border indicator in `--accent-500` on the active tab.
- FR-1.2: The "Anchors" tab contains the existing source-anchor graph visualization (previously "Graph" tab). No changes to its internals.
- FR-1.3: The "Entities" tab renders the new EntityBrowserTab component (this PRD).
- FR-1.4: The "Sources" tab contains the existing source list view. No changes to its internals.
- FR-1.5: A view mode toggle (grid/list icons) appears in the tab bar right-aligned area, visible only when the "Entities" tab is active.

**2. Search and Filtering**
- FR-2.1: A search input with magnifying glass icon and clear (×) button filters entities by matching against `label`, `description`, and `tags` (case-insensitive substring match).
- FR-2.2: An "Entity Type" dropdown filter allows multi-select of entity types. Each option displays a colored dot matching the entity type color from `entityTypes.ts`. Shows a count badge when filters are active. Uses the `FilterDrop` component pattern.
- FR-2.3: A "Source" dropdown filter allows multi-select of source types (Meeting, YouTube, Research, Note, Document).
- FR-2.4: A "Tags" dropdown filter allows multi-select of tags, prefixed with `#`.
- FR-2.5: A "Clear all (N)" button appears when any filters are active, resetting all filters on click.
- FR-2.6: A result count label (e.g., "23 results") displays at the right end of the toolbar.

**3. Sorting**
- FR-3.1: A sort selector dropdown offers four options: "Most Connected" (default, descending `connCount`), "Most Recent" (descending `created_at`), "Highest Confidence" (descending `confidence`), "Alphabetical" (ascending `label`).
- FR-3.2: The sort selector displays the current sort label with a sort icon and chevron.

**4. Type Distribution Bar**
- FR-4.1: Below the toolbar, a horizontal bar visualization shows the proportional distribution of entity types in the current filtered result set. Each segment is colored by entity type color.
- FR-4.2: To the right of the bar, the top 4 entity types are listed with colored dots and counts (e.g., "Technology (5)"). If more than 4 types exist, show "+N types".

**5. Card View (Default)**
- FR-5.1: Entities render in a responsive CSS Grid with `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))` and 8px gap.
- FR-5.2: Each EntityCard displays:
  - Entity type colored dot (9px) + label (Cabinet Grotesk, 14px, weight 700, `--text-primary`)
  - Connection count badge (top-right): link icon + count in `--bg-inset` pill
  - Entity type badge (styled per design system badge specification: 6% bg opacity, 16% border opacity of entity color)
  - Description text (DM Sans, 12px, `--text-body`, 2-line clamp)
  - Top 3 connected entity names as small inline pills (entity dot + truncated label)
  - Footer (above a `--border-subtle` divider): source emoji + source name (left), confidence bar + percentage (right)
- FR-5.3: Card hover state: border darkens to `--border-default`, 1px translateY lift, `0 2px 8px rgba(0,0,0,0.04)` shadow. Transition: 0.18s ease.
- FR-5.4: Cards use staggered `fadeUp` animation on load (0.4s ease, 0.03s delay per card, capped at 0.2s max delay).
- FR-5.5: The selected card (matching right panel entity) has `--accent-50` background and `rgba(214,58,0,0.15)` border.

**6. List View**
- FR-6.1: Entities render as compact rows in a vertical stack with 2px gap.
- FR-6.2: Each EntityListRow displays in a single horizontal line: entity dot (8px) → label (Cabinet Grotesk, 13px, weight 700) → entity type badge (small) → top 2 connected entity pills → connection count (link icon + number) → timestamp.
- FR-6.3: Row hover state: background shifts to `--bg-hover`. Selected row uses `--accent-50` background.
- FR-6.4: Rows use staggered `fadeUp` animation (0.3s ease, 0.02s delay per row, capped at 0.15s).

**7. Entity Detail Panel (Right Panel)**
- FR-7.1: Clicking any entity card or list row sets it as the selected entity and renders EntityDetailPanel in the right panel.
- FR-7.2: EntityDetailPanel header: entity label (Cabinet Grotesk, 18px, weight 800), entity type badge, close (×) button. Below: full description text.
- FR-7.3: Stats row: two cards in a 2-column grid showing "Connections" (count) and "Confidence" (percentage), each with uppercase section label and large metric (Cabinet Grotesk, 22px, weight 800).
- FR-7.4: **Local Graph**: A `LocalGraph` canvas component (262×200px) rendered in a `--bg-inset` container. Shows the selected entity as a center node with its direct connections fanned radially around it. Animated with gentle drift. Center node: 14px outer circle (entity color at 20% opacity, 50% stroke), 5px inner dot (full entity color). Satellite nodes: 6px outer circle (30% opacity), 3px inner dot (full color), DM Sans 9px labels truncated at 14 chars.
- FR-7.5: **Connections list**: Each connection rendered as a clickable row with entity dot, label, type, and a relationship tag (`--bg-inset` background, 9px font, `--text-secondary`). Hover: background shifts to `--bg-hover`, border to `--border-default`.
- FR-7.6: **Source section**: Source emoji in a tinted container + source title + source type and timestamp.
- FR-7.7: **Tags section**: All tags as small pills with `#` prefix, `--bg-inset` background, `--border-subtle` border.
- FR-7.8: **Actions**: "Explore with AI" primary AI action button (`--accent-50` bg, `--accent-600` text, sparkle icon). "Re-link" and "Find Similar" secondary buttons side-by-side below. These are placeholder buttons — they set right panel content for PRD 8 (Ask) integration later.
- FR-7.9: Empty state (no entity selected): centered compass icon in `--bg-inset` container, "Select an entity" heading, "Click any entity card to explore its connections and details" subtext in `--text-placeholder`.

**8. Data Fetching**
- FR-8.1: `fetchEntitiesWithConnections()` in `services/supabase.ts` queries `knowledge_nodes` joined with a count of edges (both `source_node_id` and `target_node_id`) and the top 5 connected nodes via a lateral join or post-processing. Returns `EntityWithConnections[]`.
- FR-8.2: `fetchEntityNeighborhood(nodeId)` queries `knowledge_edges` where the node is either source or target, joins the other end's `knowledge_nodes` record, and returns the direct neighbors with relationship types. Used by LocalGraph and the connections list.
- FR-8.3: Both queries filter by `user_id` via RLS (automatic with Supabase client using authenticated session).
- FR-8.4: The `useEntityBrowser` hook manages: `entities` (loaded data), `loading` state, `searchQuery`, `typeFilter`, `srcFilter`, `tagFilter`, `sortBy`, and `selectedEntity`. It exposes filter toggle functions and the filtered/sorted result set as a computed value.

### Implementation Guide for AI Agent

**Step 1: Add Types**

In `src/types/database.ts`, add:

```typescript
export interface EntityWithConnections {
  id: string;
  label: string;
  entity_type: string;
  description: string | null;
  confidence: number | null;
  source: string | null;
  source_type: string | null;
  tags: string[] | null;
  created_at: string;
  connection_count: number;
  top_connections: Array<{
    id: string;
    label: string;
    entity_type: string;
    relation_type: string;
  }>;
}

export interface EntityNeighbor {
  id: string;
  label: string;
  entity_type: string;
  relation_type: string;
  direction: 'outgoing' | 'incoming';
}
```

**Step 2: Add Supabase Query Functions**

In `src/services/supabase.ts`, add:

```typescript
export async function fetchEntitiesWithConnectionCount(): Promise<EntityWithConnections[]> {
  // Step 1: Fetch all nodes for the user
  const { data: nodes, error: nodeError } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, confidence, source, source_type, tags, created_at')
    .order('created_at', { ascending: false });

  if (nodeError) throw new Error(`Failed to fetch nodes: ${nodeError.message}`);
  if (!nodes) return [];

  // Step 2: Fetch all edges for the user to compute connection counts
  const { data: edges, error: edgeError } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id, relation_type');

  if (edgeError) throw new Error(`Failed to fetch edges: ${edgeError.message}`);

  // Step 3: Build connection count map and top connections
  const connectionCounts: Record<string, number> = {};
  const connectionMap: Record<string, Array<{ nodeId: string; relation: string }>> = {};

  (edges || []).forEach(edge => {
    // Count for source node
    connectionCounts[edge.source_node_id] = (connectionCounts[edge.source_node_id] || 0) + 1;
    if (!connectionMap[edge.source_node_id]) connectionMap[edge.source_node_id] = [];
    connectionMap[edge.source_node_id].push({ nodeId: edge.target_node_id, relation: edge.relation_type || 'relates_to' });

    // Count for target node
    connectionCounts[edge.target_node_id] = (connectionCounts[edge.target_node_id] || 0) + 1;
    if (!connectionMap[edge.target_node_id]) connectionMap[edge.target_node_id] = [];
    connectionMap[edge.target_node_id].push({ nodeId: edge.source_node_id, relation: edge.relation_type || 'relates_to' });
  });

  // Step 4: Build node lookup for connection labels
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Step 5: Assemble results
  return nodes.map(node => ({
    ...node,
    connection_count: connectionCounts[node.id] || 0,
    top_connections: (connectionMap[node.id] || [])
      .slice(0, 5)
      .map(c => {
        const target = nodeMap.get(c.nodeId);
        return target ? {
          id: target.id,
          label: target.label,
          entity_type: target.entity_type,
          relation_type: c.relation,
        } : null;
      })
      .filter(Boolean) as EntityWithConnections['top_connections'],
  }));
}

export async function fetchEntityNeighborhood(nodeId: string): Promise<EntityNeighbor[]> {
  // Fetch edges where this node is source
  const { data: outgoing, error: outErr } = await supabase
    .from('knowledge_edges')
    .select('target_node_id, relation_type, knowledge_nodes!knowledge_edges_target_node_id_fkey(id, label, entity_type)')
    .eq('source_node_id', nodeId);

  // Fetch edges where this node is target
  const { data: incoming, error: inErr } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, relation_type, knowledge_nodes!knowledge_edges_source_node_id_fkey(id, label, entity_type)')
    .eq('target_node_id', nodeId);

  if (outErr) throw new Error(`Failed to fetch outgoing edges: ${outErr.message}`);
  if (inErr) throw new Error(`Failed to fetch incoming edges: ${inErr.message}`);

  const neighbors: EntityNeighbor[] = [];

  (outgoing || []).forEach(edge => {
    const node = edge.knowledge_nodes as any;
    if (node) {
      neighbors.push({
        id: node.id,
        label: node.label,
        entity_type: node.entity_type,
        relation_type: edge.relation_type || 'relates_to',
        direction: 'outgoing',
      });
    }
  });

  (incoming || []).forEach(edge => {
    const node = edge.knowledge_nodes as any;
    if (node) {
      neighbors.push({
        id: node.id,
        label: node.label,
        entity_type: node.entity_type,
        relation_type: edge.relation_type || 'relates_to',
        direction: 'incoming',
      });
    }
  });

  // Deduplicate by node ID (keep first occurrence)
  const seen = new Set<string>();
  return neighbors.filter(n => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}
```

**Note on the join syntax**: The Supabase foreign key join syntax (`knowledge_nodes!knowledge_edges_target_node_id_fkey`) depends on the actual FK constraint names in the database. The agent should check the actual constraint names and adjust accordingly. If the join syntax doesn't work, fall back to a two-query approach: fetch edges, then fetch the connected nodes by IDs.

**Step 3: Create the useEntityBrowser Hook**

In `src/hooks/useEntityBrowser.ts`:

```typescript
import { useState, useEffect, useMemo } from 'react';
import { fetchEntitiesWithConnectionCount } from '../services/supabase';
import type { EntityWithConnections } from '../types/database';

type SortOption = 'connections' | 'recent' | 'confidence' | 'alpha';

export function useEntityBrowser() {
  const [entities, setEntities] = useState<EntityWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [srcFilter, setSrcFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('connections');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEntitiesWithConnectionCount()
      .then(data => { if (!cancelled) setEntities(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleFilter = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const clearAllFilters = () => {
    setTypeFilter([]);
    setSrcFilter([]);
    setTagFilter([]);
    setSearchQuery('');
  };

  const filtered = useMemo(() => {
    let results = [...entities];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e =>
        e.label.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    if (typeFilter.length) results = results.filter(e => typeFilter.includes(e.entity_type));
    if (srcFilter.length) results = results.filter(e => srcFilter.includes(e.source_type || ''));
    if (tagFilter.length) results = results.filter(e => (e.tags || []).some(t => tagFilter.includes(t)));

    switch (sortBy) {
      case 'connections': results.sort((a, b) => b.connection_count - a.connection_count); break;
      case 'recent': results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case 'confidence': results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)); break;
      case 'alpha': results.sort((a, b) => a.label.localeCompare(b.label)); break;
    }

    return results;
  }, [entities, searchQuery, typeFilter, srcFilter, tagFilter, sortBy]);

  const selectedEntity = useMemo(
    () => entities.find(e => e.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  const activeFilterCount = typeFilter.length + srcFilter.length + tagFilter.length;

  // Compute all available tags from loaded data
  const allTags = useMemo(
    () => [...new Set(entities.flatMap(e => e.tags || []))].sort(),
    [entities]
  );

  // Compute type distribution of current filtered results
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach(e => { counts[e.entity_type] = (counts[e.entity_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return {
    entities: filtered,
    allEntities: entities,
    loading,
    error,
    searchQuery, setSearchQuery,
    typeFilter, setTypeFilter: (v: string) => toggleFilter(setTypeFilter, v),
    srcFilter, setSrcFilter: (v: string) => toggleFilter(setSrcFilter, v),
    tagFilter, setTagFilter: (v: string) => toggleFilter(setTagFilter, v),
    sortBy, setSortBy,
    selectedEntity,
    selectedEntityId, setSelectedEntityId,
    activeFilterCount,
    clearAllFilters,
    allTags,
    typeDistribution,
  };
}
```

**Step 4: Create the LocalGraph Component**

In `src/components/explore/LocalGraph.tsx`:

This is a Canvas-based component using D3.js-style force simulation (or simpler manual positioning). It renders:
- The selected entity as a center node (14px radius outer circle, 5px inner dot)
- Direct connections as satellite nodes (6px radius outer, 3px inner) positioned radially
- Curved edges connecting center to satellites
- Gentle animation with drift (requestAnimationFrame loop)
- Labels: center label (DM Sans 10px/600, `#1a1a1a`), satellite labels (DM Sans 9px/500, `#808080`, truncated at 14 chars)

The component accepts `entity: EntityWithConnections` and `neighbors: EntityNeighbor[]` and renders on a Canvas element. Width and height are props (default 262×200). Colors come from the entity type color map in `config/entityTypes.ts`.

See the mockup HTML file (`entity-browser-mockup.html`) for the exact Canvas rendering implementation — the `LocalGraph` component in the mockup provides a working reference implementation that should be translated to TypeScript and use the project's entity type color config.

**Step 5: Create EntityCard Component**

In `src/components/explore/EntityCard.tsx`:

Translate the mockup's EntityCard to Tailwind classes. Key mappings:
- Card container: `bg-bg-card border border-[--border-subtle] rounded-md p-4 cursor-pointer transition-all duration-[180ms] ease-out hover:border-[--border-default] hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]`
- Selected state: `bg-accent-50 border-[rgba(214,58,0,0.15)]`
- Label: `font-display text-sm font-bold text-text-primary tracking-tight`
- Description: `font-body text-xs text-text-body leading-relaxed line-clamp-2`
- Connection count pill: `bg-bg-inset rounded-xl px-2 py-0.5 text-[10px] font-semibold text-text-secondary`

**Step 6: Create EntityListRow Component**

Compact single-line row for list view mode. Translate from mockup list view.

**Step 7: Create TypeDistributionBar Component**

Horizontal flex bar where each segment width is `(count / total) * 100%`, colored by entity type color at 60% opacity. Right side shows top 4 type labels.

**Step 8: Create SortSelector Component**

Dropdown component with four sort options. Follows the FilterDrop pattern but renders as a single-select.

**Step 9: Create EntityDetailPanel Component**

Right panel content. Accepts the selected `EntityWithConnections` and fetches neighbors via `fetchEntityNeighborhood()`. Renders the full detail view including LocalGraph, connections list, source info, tags, and action buttons.

**Step 10: Create EntityBrowserTab Component**

Main composition component. Uses `useEntityBrowser` hook. Renders:
1. Toolbar (search + filters + sort + result count)
2. TypeDistributionBar
3. Card grid or list depending on view mode

**Step 11: Restructure ExploreView Tabs**

Modify `src/views/ExploreView.tsx`:
- Replace the existing 2-tab system (Graph/Browse) with 3 tabs (Anchors/Entities/Sources)
- "Anchors" tab renders the existing graph content (source-anchor visualization)
- "Entities" tab renders `EntityBrowserTab`
- "Sources" tab renders the existing source list
- View mode toggle (grid/list) only visible when Entities tab is active

### UI/UX Specifications

**Color references** (all from `src/styles/tokens.css`):
- Card background: `var(--color-bg-card)` / `#ffffff`
- Content background: `var(--color-bg-content)` / `#f7f7f7`
- Inset/recessed: `var(--color-bg-inset)` / `#f0f0f0`
- Hover background: `var(--color-bg-hover)` / `#fafafa`
- Active filter: `var(--color-accent-50)` / `#fff5f0` background, `var(--color-accent-500)` / `#d63a00` text
- Selected card: `var(--color-accent-50)` background, `rgba(214,58,0,0.15)` border
- Entity type colors: from `entityTypes.ts` config

**Typography:**
- Card title: Cabinet Grotesk, 14px, weight 700, letter-spacing -0.01em
- Detail panel heading: Cabinet Grotesk, 18px, weight 800, letter-spacing -0.02em
- Section labels: Cabinet Grotesk, 10px, weight 700, uppercase, letter-spacing 0.08em, `--text-secondary`
- Body text: DM Sans, 12-13px, weight 400, `--text-body`
- Metadata: DM Sans, 11px, weight 500, `--text-secondary`
- Badge text: DM Sans, 11px, weight 600
- Large metrics in detail panel: Cabinet Grotesk, 22px, weight 800, letter-spacing -0.03em

**Spacing:**
- Card internal padding: 16px 20px
- Card grid gap: 8px
- Content area padding: 16px 24px
- Toolbar padding: 12px 24px
- Detail panel padding: 24px
- Section gap within detail panel: 20px

**Interaction:**
- Card hover: border darkens, 1px lift, subtle shadow (0.18s ease)
- List row hover: background to `--bg-hover` (0.15s ease)
- Filter dropdown: 0.15s chevron rotation, shadow `0 8px 24px rgba(0,0,0,0.08)`
- Load animation: staggered fadeUp (translateY 8px → 0, opacity 0 → 1, 0.4s ease)

**Responsive behavior:**
- Card grid adapts via `auto-fill, minmax(300px, 1fr)` — 3 columns at 1440px, 2 at 1280px
- At 1280px viewport, the right panel may collapse to an overlay or reduce to 280px (follow existing right panel responsive behavior)

### Success Metrics
- Entity Browser loads and renders 500+ entities within 2 seconds
- Filtering and sorting respond within 100ms (client-side after initial load)
- LocalGraph canvas renders smoothly at 60fps with up to 20 satellite nodes
- All entity types display correct colors from the entity type config
- Clicking an entity immediately populates the right panel detail view
- No regression to existing Anchors or Sources tab functionality

### Edge Cases & Considerations
- **Empty graph (new user)**: Show a centered empty state: "No entities yet — ingest your first source to start building your knowledge graph" with an ingest icon and a ghost button linking to `/ingest`
- **Entity with 0 connections**: Card shows "0" connection count, detail panel shows empty connections list with "No connections discovered yet" message, LocalGraph shows only the center node
- **Entity with null description**: Card hides the description area gracefully, detail panel shows "No description available"
- **Entity with null confidence**: Confidence bar and percentage hidden, detail stat card shows "—"
- **Entity with 50+ connections**: LocalGraph caps visible satellites at 12-15 for readability, connections list in detail panel shows all connections with scrollable overflow
- **Search with no results**: Show "No entities found — try adjusting your filters or search query" empty state
- **Very long entity labels**: Truncated with ellipsis in cards (single line), full display in detail panel header (wraps naturally)
- **Missing tags field**: Some entities may have null tags — treat as empty array for filtering

### Performance Considerations
- **Initial data load**: Fetch all entities + edge counts in a single request cycle, not per-entity. The two-query approach (nodes + edges with client-side count computation) is intentional — it avoids N+1 queries and works with Supabase's API patterns.
- **Filtering and sorting**: All done client-side after initial load. No additional Supabase calls on filter change.
- **LocalGraph rendering**: Uses `requestAnimationFrame` loop. Must clean up (cancel animation frame) on component unmount and when selected entity changes.
- **Memory**: For 1000+ entities, the full entity list is held in React state. This is acceptable — each entity object is small (~500 bytes). Monitor if this becomes an issue above 5000 entities.
- **Future optimization**: If entity count exceeds 2000, consider server-side pagination with `useNodes` hook's `.range(from, to)` pattern and virtual scrolling for the grid/list.

### Testing Guidance for AI Agent
- [ ] Test with empty graph (no entities in database) — verify empty state renders
- [ ] Test with 3-5 entities — verify cards render correctly with real data
- [ ] Test with 100+ entities — verify scroll performance and filter responsiveness
- [ ] Test filtering by entity type — verify only matching entities shown
- [ ] Test combined filters (type + source + search) — verify AND logic
- [ ] Test "Clear all" — verify all filters reset and full list restores
- [ ] Test sort switching — verify order changes correctly for all 4 sort options
- [ ] Test card view ↔ list view toggle — verify both render correctly with same data
- [ ] Test entity selection — verify right panel populates with correct detail
- [ ] Test LocalGraph — verify canvas renders, animates, and cleans up on entity change
- [ ] Test entity with 0 connections — verify graceful handling
- [ ] Test responsive layout at 1280px, 1440px, 1920px — verify grid column adaptation
- [ ] Verify no regression: switch to Anchors tab, verify graph still works; switch to Sources tab, verify source list still works
- [ ] Verify all colors match design system — especially entity type colors, accent colors, and neutral backgrounds

### Out of Scope
- **Inline entity editing** (edit label, description, tags from the Entity Browser) — deferred to a follow-up PRD
- **Entity deletion** from the browser view
- **Full-graph visualization** rendering all entities simultaneously (this PRD solves the browse/discover problem through structured browsing, not graph rendering)
- **Pagination / infinite scroll** — all entities loaded client-side for now. Add if entity count exceeds 2000.
- **"Explore with AI" action** — button is present but is a placeholder. Integration with Ask view (PRD 8) comes later.
- **"Re-link" and "Find Similar" actions** — placeholder buttons, no functionality yet
- **Connection detail view** (clicking a connection in the detail panel to navigate to that entity) — nice-to-have for a follow-up
- **Mobile responsive layout** — tablet and desktop only for now

### Reference Mockup
The interactive HTML mockup at `entity-browser-mockup.html` in the project outputs provides the visual reference for this PRD. It demonstrates the exact card design, filter behavior, sort options, type distribution bar, list view, and detail panel layout. The mockup uses inline styles and React via CDN — translate all styling to Tailwind utility classes in the actual implementation.
```
