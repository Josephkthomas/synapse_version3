## PRD 4D — Source Graph View

**Dependencies:** PRD 4A (Explore Shell — mode toggle and toolbar)
**Estimated Complexity:** Medium (1 session)

### 1. Objective

Build the **Source Graph** — the second graph mode accessible via the "Sources" toggle. Shows ingested content sources as nodes and their connections (shared entities) as weighted edges. Answers: "What content have I ingested and how is it connected?" A fundamentally different perspective from the entity graph — a web of inputs rather than a web of concepts.

### 2. New Files

| File | Purpose |
|---|---|
| `src/views/explore/SourceGraphView.tsx` | SVG source graph: source cards, shared-entity edges, hover/select. |
| `src/components/explore/SourceCard.tsx` | Rounded rectangle source node per design system spec. |
| `src/components/explore/SourceDetailPanel.tsx` | Right panel for sources: entities, connected sources, actions. |
| `src/hooks/useSourceLayout.ts` | D3 force sim for source positions. |

**Extended:** `exploreQueries.ts` (+`fetchSourceGraph`), `ExploreRightPanel.tsx` (+source case).

### 3. Data Fetching

```typescript
// services/exploreQueries.ts — addition
export async function fetchSourceGraph(userId: string): Promise<{
  sources: SourceNode[];
  edges: SourceEdge[];
}> {
  // 1. Fetch all sources
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('id, title, source_type, created_at')
    .order('created_at', { ascending: false });

  // 2. Fetch nodes with source_id for membership
  const { data: nodes } = await supabase
    .from('knowledge_nodes')
    .select('id, source_id')
    .not('source_id', 'is', null);

  // Build source → entityIds map
  const sourceEntities = new Map<string, string[]>();
  for (const n of (nodes || [])) {
    if (!n.source_id) continue;
    if (!sourceEntities.has(n.source_id)) sourceEntities.set(n.source_id, []);
    sourceEntities.get(n.source_id)!.push(n.id);
  }

  const sourceNodes: SourceNode[] = (sources || []).map(s => ({
    id: s.id,
    title: s.title || 'Untitled',
    sourceType: s.source_type || 'Note',
    entityIds: sourceEntities.get(s.id) || [],
    entityCount: (sourceEntities.get(s.id) || []).length,
    createdAt: s.created_at,
  }));

  // 3. Compute source-source edges (shared entities)
  const sourceEdges: SourceEdge[] = [];
  for (let i = 0; i < sourceNodes.length; i++) {
    const aIds = new Set(sourceNodes[i].entityIds);
    for (let j = i + 1; j < sourceNodes.length; j++) {
      const shared = sourceNodes[j].entityIds.filter(id => aIds.has(id));
      if (shared.length > 0) {
        sourceEdges.push({
          fromSourceId: sourceNodes[i].id,
          toSourceId: sourceNodes[j].id,
          sharedEntityCount: shared.length,
          sharedEntityIds: shared,
        });
      }
    }
  }

  return { sources: sourceNodes, edges: sourceEdges };
}
```

### 4. Source Layout

```typescript
// hooks/useSourceLayout.ts
export function useSourceLayout(
  sources: SourceNode[],
  edges: SourceEdge[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  return useMemo(() => {
    if (!sources.length) return new Map();

    const nodes = sources.map(s => ({
      id: s.id,
      x: width/2 + (Math.random() - 0.5) * width * 0.6,
      y: height/2 + (Math.random() - 0.5) * height * 0.6,
    }));

    const links = edges.map(e => ({
      source: e.fromSourceId,
      target: e.toSourceId,
      strength: Math.min(e.sharedEntityCount * 0.15, 0.6),
    }));

    const sim = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width/2, height/2).strength(0.04))
      .force('collision', d3.forceCollide().radius(100))
      .force('link', d3.forceLink(links).id((d: any) => d.id)
        .distance(160).strength((d: any) => d.strength))
      .stop();

    for (let i = 0; i < 150; i++) sim.tick();

    // Boundary
    for (const n of nodes) {
      n.x = Math.max(100, Math.min(width - 100, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    }

    const result = new Map();
    for (const n of nodes) result.set(n.id, { x: n.x, y: n.y });
    return result;
  }, [sources, edges, width, height]);
}
```

### 5. SourceCard Rendering

Per the design system's source node spec:
- **Shape:** Rounded rectangle, ~180px wide, ~52px tall, border-radius 10px.
- **Background:** Source type color at 8% opacity.
- **Border:** Source type color at 20% opacity.
- **Contents:** Source type icon (24px, tinted bg) + title (DM Sans 11px w600, truncated 140px) + meta (entity count + timestamp, 9px secondary).
- **Hover:** translateY(-2px), `box-shadow: 0 4px 12px rgba(0,0,0,0.06)`.
- **Selected:** Ring `0 0 0 2px white, 0 0 0 4px var(--accent-500)`.
- **Dimmed:** opacity 0.12.

### 6. Source Edge Rendering

Edges = shared entities between sources:
- **Default:** Very faint (`rgba(0,0,0,0.03)`), width scales with `sharedEntityCount` (1–5px).
- **On hover:** Hovered source's edges highlight at `rgba(0,0,0,0.15)`.
- **On select:** Accent color, full weight.
- **Edge count badge:** Appears at midpoint when edges visible. `--bg-card` bg, `--border-subtle` border, 10px radius, 9px bold font, shows shared count number.

### 7. SourceDetailPanel Sections

Shown in the right panel when a source is selected.

**1. Header** — Source icon (32px, tinted) + title (Cabinet Grotesk 16px w700) + "Type · Timestamp" (11px secondary).

**2. Stats** — Entity count + Connected sources count. Cabinet Grotesk 20px w800 / 10px secondary.

**3. Extracted Entities** — Section label "EXTRACTED ENTITIES". Flex-wrapped entity badges with type colors. Each is clickable → pivots to entity graph and selects that entity:
```
onClick → setViewMode('entities') → setSelectedNodeId(entityId) → zoom to that entity's cluster
```

**4. Connected Sources** — Section label "CONNECTED SOURCES ({count})". List: source icon (22px) + title + "{N} shared" relationship tag. Clickable → selects that source.

**5. Actions:**
- Primary: "View in entity graph" → switches to Entities mode and zooms to the most relevant cluster (the cluster containing the most entities from this source).
- Secondary: "View raw source" → navigates to source content (future), "Re-extract" → triggers re-extraction (future).

### 8. Switching Between Modes

When the user toggles Entities ↔ Sources:
- Clear selection (selectedNodeId and selectedSourceId).
- Close right panel.
- Render the appropriate graph view.
- Filters that apply to both modes (search, recency) persist. Mode-specific filters (anchor chips, spotlight) reset.

When pivoting from source to entity (via "View in entity graph" or clicking an entity badge):
- Determine which anchor cluster contains the most entities from this source.
- Set `viewMode = 'entities'`, `zoomLevel = 'neighborhood'`, `expandedClusterId = that cluster`.
- Select the target entity if one was clicked.
- This creates a fluid navigation pattern: browse sources → see entities → click through to entity graph.

### 9. Empty States

- **No sources:** Centered: upload icon + "No sources yet" + "Ingest content to see your source graph." + "Go to Ingest" ghost button.
- **No edges:** Sources appear but no connecting lines + subtle info banner: "Sources aren't connected yet. Ingest more content with overlapping topics to see connections emerge."

### 10. Acceptance Criteria

- [ ] Toggle "Sources" in toolbar to see source graph.
- [ ] Source nodes render as rounded rectangles with type icon, title, entity count, timestamp.
- [ ] Edges show on hover/select with shared entity count badges.
- [ ] Click source → right panel with source detail (entities, connected sources, actions).
- [ ] Entity badges in source detail are clickable → pivots to entity graph and selects that entity.
- [ ] "View in entity graph" switches mode and zooms to relevant cluster.
- [ ] Connected sources in panel are clickable → selects that source.
- [ ] Search filters sources by title.
- [ ] Recency filter applies to source creation date.
- [ ] Smooth layout with 30+ source nodes.
- [ ] Empty state shown when no sources exist.
- [ ] Mode switching clears selection and mode-specific filters.

### 11. Testing Guidance

- [ ] Test with 0 sources (empty state)
- [ ] Test with 5 sources that share no entities (no edges)
- [ ] Test with 20+ sources with overlapping entities (dense edges)
- [ ] Test pivot from source detail → entity graph and back
- [ ] Test search filtering in source mode
- [ ] Test with sources that have 0 extracted entities

---
