## PRD 4B — Neighborhood View + Entity Nodes

**Dependencies:** PRD 4A
**Estimated Complexity:** High (1–2 sessions)

### 1. Objective

Build the **Neighborhood View** — clicking a cluster zooms in to show individual entity nodes within that cluster, positioned by a force simulation that reflects their relationships. Edges are hidden by default and revealed on interaction.

### 2. New Files

| File | Purpose |
|---|---|
| `src/views/explore/NeighborhoodView.tsx` | SVG entity rendering within a cluster. |
| `src/components/explore/EntityDot.tsx` | Entity circle: sized, colored, hover/select states. |
| `src/hooks/useEntityLayout.ts` | D3 force sim for entity positions: cluster gravity, edge attraction, repulsion. |

**Extended:** `exploreQueries.ts` (+`fetchClusterEntities`, `fetchEntityEdges`), `ExploreView.tsx` (wire zoom routing), `NodeTooltip.tsx` (entity variant).

### 3. Data Fetching

```typescript
// services/exploreQueries.ts — additions
export async function fetchClusterEntities(userId: string, anchorId: string): Promise<EntityNode[]> {
  // Get edges involving this anchor
  const { data: anchorEdges } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id')
    .or(`source_node_id.eq.${anchorId},target_node_id.eq.${anchorId}`);

  const nodeIds = new Set<string>();
  for (const e of (anchorEdges || [])) {
    if (e.source_node_id !== anchorId) nodeIds.add(e.source_node_id);
    if (e.target_node_id !== anchorId) nodeIds.add(e.target_node_id);
  }
  if (nodeIds.size === 0) return [];

  const { data: nodes } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, confidence, source, source_type, source_id, tags, created_at')
    .in('id', Array.from(nodeIds))
    .eq('is_anchor', false);

  // Connection counts
  const { data: allEdges } = await supabase
    .from('knowledge_edges').select('source_node_id, target_node_id');
  const counts: Record<string, number> = {};
  for (const e of (allEdges || [])) {
    counts[e.source_node_id] = (counts[e.source_node_id] || 0) + 1;
    counts[e.target_node_id] = (counts[e.target_node_id] || 0) + 1;
  }

  return (nodes || []).map(n => ({
    id: n.id, label: n.label, entityType: n.entity_type,
    description: n.description, confidence: n.confidence,
    connectionCount: counts[n.id] || 0,
    clusters: [], // Populated from cached cluster data
    sourceId: n.source_id, sourceName: n.source, sourceType: n.source_type,
    tags: n.tags || [], createdAt: n.created_at,
    isBridge: false, isUnclustered: false,
  }));
}

export async function fetchEntityEdges(userId: string, nodeIds: string[]) {
  const { data } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id, relation_type, weight')
    .or(nodeIds.map(id => `source_node_id.eq.${id},target_node_id.eq.${id}`).join(','));
  const idSet = new Set(nodeIds);
  return (data || [])
    .filter(e => idSet.has(e.source_node_id) && idSet.has(e.target_node_id))
    .map(e => ({ sourceNodeId: e.source_node_id, targetNodeId: e.target_node_id,
      relationType: e.relation_type, weight: e.weight || 1 }));
}
```

### 4. Entity Layout

```typescript
// hooks/useEntityLayout.ts
export function useEntityLayout(entities: EntityNode[], edges: any[], width: number, height: number) {
  return useMemo(() => {
    if (!entities.length) return new Map();
    const maxConn = Math.max(...entities.map(e => e.connectionCount), 1);
    const nodes = entities.map(e => ({
      id: e.id, x: width/2 + (Math.random()-0.5)*width*0.5,
      y: height/2 + (Math.random()-0.5)*height*0.5,
      radius: 5 + Math.min(e.connectionCount / maxConn, 1) * 9,
    }));
    const links = edges.map(e => ({ source: e.sourceNodeId, target: e.targetNodeId }));
    const sim = d3.forceSimulation(nodes)
      .force('center', d3.forceCenter(width/2, height/2).strength(0.05))
      .force('charge', d3.forceManyBody().strength(-40))
      .force('collision', d3.forceCollide().radius((d: any) => d.radius + 6))
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(0.3))
      .stop();
    for (let i = 0; i < 200; i++) sim.tick();
    // Boundary
    for (const n of nodes) {
      n.x = Math.max(30, Math.min(width-30, n.x));
      n.y = Math.max(30, Math.min(height-30, n.y));
    }
    const result = new Map();
    for (const n of nodes) result.set(n.id, { x: n.x, y: n.y, radius: n.radius });
    return result;
  }, [entities, edges, width, height]);
}
```

### 5. Rendering

1. **Cluster boundary ghost** — Faint dashed circle. Non-interactive.
2. **Entity edges** — SVG `<path>` bezier curves. Default: invisible. Shown on hover (node's edges at `rgba(0,0,0,0.2)`), on select (accent color, strokeWidth 2, relationship label at midpoint), or when "Show edges" toggle is on (all edges at `rgba(0,0,0,0.08)`).
3. **Entity nodes** — `EntityDot` components. Size = radius from layout. Fill = entity type color. Glow shadow. Hover: scale 1.5, tooltip. Selected: scale 1.6, ring (`0 0 0 3px white, 0 0 0 5px {color}`), pulse. Dimmed: opacity 0.08. Bridge: subtle second-color ring.
4. **Labels** — Hub nodes (conn ≥ 7): always visible, font-display 10px w700. Others: on hover/select only. 9px w600. Text-shadow for legibility.
5. **Peripheral nodes** — Entities from other clusters with edges to this cluster. 30% opacity, 0.9× size, labels at 8px.
6. **Breadcrumb** — "← All clusters" back button + "›" + cluster name chip.

### 6. Interactions

| Action | Result |
|---|---|
| Hover entity | Tooltip (120ms delay). Highlight that node's edges. |
| Click entity | Select (ring). Show edges in accent. Open right panel (4C). |
| Double-click entity | Toggle in context basket (4E). No-op until 4E built. |
| Click empty canvas | Deselect. Close panel. |
| Click back breadcrumb | Return to landscape. Clear selection. |
| "Show edges" toggle | Reveal/hide all cluster edges. |
| Search/spotlight | Highlight matching, dim non-matching. |

### 7. Acceptance Criteria

- [ ] Click cluster in landscape → zoom to neighborhood showing entity nodes.
- [ ] Nodes sized by connections, colored by type.
- [ ] Hub labels always visible. Others on hover.
- [ ] Hover → tooltip + edge highlight. Click → select + accent edges + relationship labels.
- [ ] Peripheral nodes from other clusters at 30% opacity.
- [ ] Bridge entities have visual indicator.
- [ ] Edges hidden by default. "Show edges" toggle reveals all.
- [ ] Back breadcrumb returns to landscape.
- [ ] Spotlight/search works within neighborhood.
- [ ] Smooth with 80+ nodes.

---
