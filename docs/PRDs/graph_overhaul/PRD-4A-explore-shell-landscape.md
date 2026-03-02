## PRD 4A — Explore Shell + Landscape View

**Dependencies:** PRD 1, 2, 3
**Estimated Complexity:** High (1 session)

### 1. Objective

Build the Explore page shell with the unified toolbar and the **Landscape View** — the default zoomed-out view showing anchor-centered clusters as interactive bubbles with type distribution rings and cross-cluster connection lines.

### 2. New Files

| File | Purpose |
|---|---|
| `src/views/ExploreView.tsx` | Outer container: toolbar + graph area + right panel slot. Routes between views based on state. |
| `src/views/explore/ExploreToolbar.tsx` | Search, Entities/Sources toggle, anchor chips, spotlight dropdown, recency toggle, Graph/List toggle. |
| `src/views/explore/LandscapeView.tsx` | SVG landscape: cluster bubbles, cross-cluster edges, unclustered zone, stats overlay. |
| `src/components/explore/ClusterBubble.tsx` | Circular boundary, TypeDistributionRing, label, count. Hover/click handlers. |
| `src/components/explore/TypeDistributionRing.tsx` | Pure SVG donut ring. Accepts `TypeDistributionEntry[]` and `size`. Arc length = percentage, color = entity type. |
| `src/components/explore/NodeTooltip.tsx` | Fixed-position tooltip. Accepts cluster/entity/source data via discriminated union. |
| `src/hooks/useExploreData.ts` | Fetches anchors, computes clusters (entity count, type distribution, cross-cluster edges). Caches full dataset. |
| `src/hooks/useClusterLayout.ts` | D3 force sim for cluster positions: repulsion, collision, boundary constraints. Runs 120 ticks synchronously then freezes. |
| `src/hooks/useExploreFilters.ts` | Manages `ExploreFilters`, provides `isClusterVisible()` and `isNodeVisible()` functions, syncs to URL. |
| `src/services/exploreQueries.ts` | `fetchClusterData()`, `fetchGraphStats()`. |
| `src/types/explore.ts` | All shared types from the Preamble. |
| `src/config/entityTypes.ts` | Entity type color map, label map. Single source of truth. (If not already created by PRD 3.) |

**Modified:** `Router.tsx` (replace Explore placeholder), `GraphContext.tsx` (extend with explore state).

### 3. Data Layer: fetchClusterData

```typescript
// services/exploreQueries.ts
export async function fetchClusterData(userId: string): Promise<ClusterData[]> {
  // 1. Fetch anchors
  const { data: anchors } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description')
    .eq('is_anchor', true)
    .order('label');

  if (!anchors?.length) return [];

  // 2. Fetch all non-anchor nodes
  const { data: allNodes } = await supabase
    .from('knowledge_nodes')
    .select('id, entity_type, source_id')
    .eq('is_anchor', false);

  // 3. Fetch all edges
  const { data: allEdges } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id');

  // Compute cluster membership: node belongs to anchor's cluster
  // if it has a direct edge to/from that anchor
  const anchorIds = new Set(anchors.map(a => a.id));
  const nodeClusterMap = new Map<string, Set<string>>();

  for (const edge of (allEdges || [])) {
    if (anchorIds.has(edge.source_node_id) && !anchorIds.has(edge.target_node_id)) {
      if (!nodeClusterMap.has(edge.target_node_id)) nodeClusterMap.set(edge.target_node_id, new Set());
      nodeClusterMap.get(edge.target_node_id)!.add(edge.source_node_id);
    }
    if (anchorIds.has(edge.target_node_id) && !anchorIds.has(edge.source_node_id)) {
      if (!nodeClusterMap.has(edge.source_node_id)) nodeClusterMap.set(edge.source_node_id, new Set());
      nodeClusterMap.get(edge.source_node_id)!.add(edge.target_node_id);
    }
  }

  return anchors.map(anchor => {
    const clusterNodeIds = [...nodeClusterMap.entries()]
      .filter(([_, set]) => set.has(anchor.id))
      .map(([nid]) => nid);
    const clusterNodes = (allNodes || []).filter(n => clusterNodeIds.includes(n.id));

    // Type distribution
    const typeCounts: Record<string, number> = {};
    for (const n of clusterNodes) typeCounts[n.entity_type] = (typeCounts[n.entity_type] || 0) + 1;
    const total = clusterNodes.length || 1;
    const typeDistribution = Object.entries(typeCounts)
      .map(([entityType, count]) => ({ entityType, count, percentage: count / total }))
      .sort((a, b) => b.count - a.count);

    // Cross-cluster edges
    const crossClusterEdges: CrossClusterEdge[] = [];
    for (const other of anchors) {
      if (other.id === anchor.id) continue;
      const otherIds = new Set([...nodeClusterMap.entries()].filter(([_, s]) => s.has(other.id)).map(([nid]) => nid));
      const shared = clusterNodeIds.filter(id => otherIds.has(id));
      const crossEdges = (allEdges || []).filter(e =>
        (clusterNodeIds.includes(e.source_node_id) && otherIds.has(e.target_node_id)) ||
        (clusterNodeIds.includes(e.target_node_id) && otherIds.has(e.source_node_id))
      );
      const weight = shared.length + crossEdges.length;
      if (weight > 0) crossClusterEdges.push({
        targetClusterId: other.id, sharedEntityCount: shared.length,
        crossEdgeCount: crossEdges.length, totalWeight: weight,
      });
    }

    return {
      anchor: { id: anchor.id, label: anchor.label, entityType: anchor.entity_type,
        description: anchor.description, entityCount: clusterNodes.length },
      entityCount: clusterNodes.length, typeDistribution,
      position: { cx: 0, cy: 0, r: 0 }, // Computed by useClusterLayout
      crossClusterEdges,
    };
  });
}

export async function fetchGraphStats(userId: string) {
  const [nodes, edges, sources, anchors] = await Promise.all([
    supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_edges').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_sources').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_nodes').select('id', { count: 'exact', head: true }).eq('is_anchor', true),
  ]);
  return { nodeCount: nodes.count || 0, edgeCount: edges.count || 0,
    sourceCount: sources.count || 0, anchorCount: anchors.count || 0 };
}
```

### 4. Cluster Layout

```typescript
// hooks/useClusterLayout.ts
import * as d3 from 'd3';

export function useClusterLayout(clusters: ClusterData[], width: number, height: number): ClusterData[] {
  return useMemo(() => {
    if (!clusters.length) return [];
    const maxCount = Math.max(...clusters.map(c => c.entityCount), 1);
    const minR = 70, maxR = Math.min(width, height) * 0.22;

    const nodes = clusters.map(c => ({
      ...c, x: width/2 + (Math.random()-0.5)*width*0.4,
      y: height/2 + (Math.random()-0.5)*height*0.4,
      r: minR + Math.sqrt(c.entityCount / maxCount) * (maxR - minR),
    }));

    const sim = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width/2, height/2))
      .force('collision', d3.forceCollide().radius((d: any) => d.r + 30))
      .stop();
    for (let i = 0; i < 120; i++) sim.tick();
    // Boundary clamping
    for (const n of nodes) {
      const pad = n.r + 20;
      n.x = Math.max(pad, Math.min(width - pad, n.x));
      n.y = Math.max(pad, Math.min(height - pad, n.y));
    }
    return nodes.map(n => ({ ...n, position: { cx: n.x, cy: n.y, r: n.r } }));
  }, [clusters, width, height]);
}
```

### 5. ExploreToolbar Specification

Background: `--bg-card`. Border-bottom: `1px solid var(--border-subtle)`. Padding: `10px 24px`. Flex row.

**Contents (left to right):**
1. **Search input** — Standard search-box pattern. `min-width: 200px`. Debounce 300ms. Clear button.
2. **Divider** — `1px × 24px` in `--border-subtle`.
3. **Mode toggle** — "Entities" | "Sources". Standard toggle-group. Active = white bg.
4. **Divider**
5. **Anchor chips** (entities mode only) — Scrollable row. 6px dot + label. Active = accent-50 bg. One at a time.
6. **Divider**
7. **Spotlight dropdown** — "Type" default. Entity type list with dots. Mutually exclusive with anchor filter.
8. **Show edges toggle** (neighborhood only) — Eye icon. Blue tint when active.
9. **Right section:** Recency toggle ("7 days" | "30 days" | "All") + Display toggle ("Graph" | "List").

### 6. LandscapeView Rendering

SVG fills container. Renders in order:

1. **Cross-cluster edges** — `<line>` for each cluster pair with `totalWeight > 0`. Dashed (`6 4`). Width = `min(weight * 1.5, 6)`. Color = `rgba(0,0,0,0.06)`. Dimmed to 0.02 when filter active and neither cluster matches.
2. **Cluster bubbles** — Positioned `<g>` groups. Each contains: radial gradient circle, dashed border, TypeDistributionRing, label (Cabinet Grotesk 13px w700), count (10px secondary). Hover: scale 1.03. Dimmed: opacity 0.12, blur 0.5px. Click calls `onClusterClick`.
3. **Unclustered zone** — Bottom-right scatter of small entity dots + "UNCLUSTERED" label.
4. **Stats overlay** — Top-right card: cluster/entity/edge counts.
5. **Level indicator** — Top-left chip: "Clusters" with active accent styling.

### 7. Tooltip (Cluster Variant)

- Header: dot + anchor label
- Body: "{N} entities across {M} types. Click to expand."
- Type list: top 5 types with dot, name, count, mini percentage bar.

### 8. Empty & Loading States

- **Loading:** 3–5 pulsing circles.
- **Zero anchors:** Centered: icon + "No anchors yet" + "Promote nodes in Settings…" + ghost CTA.
- **Error:** Inline banner with retry.

### 9. Forward-Compatible Decisions

- `useExploreData` caches full dataset; 4B/4D derive filtered views from cache.
- `ExploreFilters` is standalone; adding filter dimensions later = add field + visibility condition.
- `NodeTooltip` accepts discriminated union for cluster/entity/source.
- URL syncing established here; 4B adds `?node=`, 4D adds source.
- `ClusterData.crossClusterEdges` used by 4B for peripheral nodes.
- Container sizing via ResizeObserver passed to all sub-views.

### 10. Acceptance Criteria

- [ ] Explore renders with toolbar: search, mode toggle, anchor chips, spotlight, recency, display toggle.
- [ ] Clusters appear as bubbles with type distribution rings showing correct entity type colors.
- [ ] Cross-cluster dashed edges connect clusters sharing entities, thickness proportional to weight.
- [ ] Hover cluster → tooltip with entity count, type breakdown, "Click to expand."
- [ ] Click anchor chip → spotlight that cluster (others dim). Click again → clear.
- [ ] Spotlight dropdown highlights clusters containing that type.
- [ ] Unclustered entities visible in bottom-right with label.
- [ ] Stats overlay shows cluster/entity/edge counts.
- [ ] Loading skeletons while fetching. Empty state if no anchors.
- [ ] URL params persist filter state across refresh.
- [ ] All visuals match the Synapse design system.

---
