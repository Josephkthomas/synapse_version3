## PRD 4C — Right Panel + Node Detail + Selection

**Dependencies:** PRD 4B
**Estimated Complexity:** Medium (1 session)

### 1. Objective

Build the Explore right panel. When a user selects an entity, source, or cluster, the panel opens with full detail, structural analysis, and actions.

### 2. New Files

| File | Purpose |
|---|---|
| `src/views/explore/ExploreRightPanel.tsx` | Router: renders NodeDetailPanel, SourceDetailPanel, or ClusterDetailPanel. |
| `src/components/explore/NodeDetailPanel.tsx` | Full entity detail (8 sections). |
| `src/components/explore/ClusterDetailPanel.tsx` | Cluster summary on right-click/long-press. |

**Extended:** `exploreQueries.ts` (+`fetchEntityNeighbors`), `ExploreView.tsx` (wire panel), `NeighborhoodView.tsx` (emit selection).

### 3. NodeDetailPanel Sections

Panel: 320px, `--bg-card`, `--border-subtle` left border, 24px padding, internal scroll.

**1. Header** — 12px dot + label (Cabinet Grotesk 16px w700) + entity type badge (standard styling).

**2. Description** — DM Sans 13px, `--text-body`, line-height 1.6.

**3. Stats** — Three blocks: Connections (count), Confidence (%), Clusters (count). Values: Cabinet Grotesk 20px w800. Labels: 10px secondary. Confidence bar: 4px, `--bg-inset` track, `--accent-500` fill.

**4. Structural Position** — Section label "STRUCTURAL POSITION". `--bg-inset` card, 12px text. Content by topology:
- **Hub** (conn ≥ 7): "**Hub node** in {cluster}. Central to this knowledge domain with {N} connections."
- **Bridge** (2+ clusters): "**Bridge node** connecting {A} and {B}. High cross-cluster value — links separate domains."
- **Connected** (conn 4–6): "Connected node in **{cluster}**. {N} cross-cluster connections."
- **Peripheral** (conn 1–3): "Peripheral in **{cluster}**. May benefit from enrichment."
- **Unclustered**: "**Unclustered.** Not connected to any anchor. Consider linking or ingesting related content."

**5. Source** — Section label "SOURCE". Card: type icon (28px tinted) + title + "Type · Timestamp".

**6. Connections** — Section label "CONNECTIONS ({count})". List: 7px dot + label + relationship tag. Clickable → navigate to that entity. First 6 shown, then "Show all N →" link.

**7. Tags** — Section label "TAGS". Flex-wrap pills: `#tag` in `--bg-inset`, `--border-subtle`.

**8. Actions** — Section label "ACTIONS".
- Primary: "Explore with AI" (accent-50 bg, accent text) → opens Ask with entity context.
- Secondary (neutral): "Add to context basket", "Find paths from here", "Edit entity", "Promote to anchor" / "Demote anchor".

### 4. fetchEntityNeighbors

```typescript
export async function fetchEntityNeighbors(nodeId: string) {
  const { data: edges } = await supabase
    .from('knowledge_edges')
    .select('source_node_id, target_node_id, relation_type')
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);
  if (!edges?.length) return [];

  const neighborIds = new Set<string>();
  for (const e of edges) {
    if (e.source_node_id !== nodeId) neighborIds.add(e.source_node_id);
    if (e.target_node_id !== nodeId) neighborIds.add(e.target_node_id);
  }
  const { data: neighbors } = await supabase
    .from('knowledge_nodes').select('id, label, entity_type')
    .in('id', Array.from(neighborIds));
  const map = new Map((neighbors || []).map(n => [n.id, n]));

  return edges.map(e => {
    const out = e.source_node_id === nodeId;
    const other = map.get(out ? e.target_node_id : e.source_node_id);
    if (!other) return null;
    return { node: other, relationType: e.relation_type, direction: out ? 'outgoing' : 'incoming' };
  }).filter(Boolean);
}
```

### 5. Panel Behavior

- Opens on node select (slide in, 0.3s ease).
- Closes on Escape, click empty canvas, or × button.
- Width: 320px collapsed to 0 with overflow hidden.
- Graph canvas resizes (layout hooks receive updated width).
- Selected node's edges remain highlighted while panel is open.

### 6. Acceptance Criteria

- [ ] Click entity → right panel opens with all 8 sections.
- [ ] Structural position correctly identifies hub/bridge/connected/peripheral/unclustered.
- [ ] Click connection → navigates to that entity (selects on graph, panel updates).
- [ ] "Explore with AI" navigates to Ask (or toast if not built).
- [ ] "Edit entity" enables inline edit of label, description, user_tags.
- [ ] "Promote/Demote anchor" updates DB and refreshes graph.
- [ ] Panel closes on Escape / empty canvas click.
- [ ] Canvas resizes when panel opens/closes.
- [ ] Panel scrolls for entities with many connections.
