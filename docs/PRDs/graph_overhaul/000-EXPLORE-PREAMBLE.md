# Explore Page Redesign — PRDs 4A through 4E

**Replaces:** PRD 4 (Browse Tab) and PRD 5 (Graph Tab)
**Phase:** 2 — Data Surfaces
**Total Estimated Complexity:** 5–6 sessions

---

## Preamble: Shared Architectural Decisions

These decisions apply across all five PRDs. Read before starting ANY of them.

### Design Philosophy

The Explore page is a **graph-first surface**. The knowledge graph is the primary interface, not a secondary tab. A table/list view exists as a fallback mode accessible via a toolbar toggle. The original two-tab model (Browse + Graph) is replaced by a unified view with semantic zoom (cluster → entity detail), spotlight filtering (highlight without removing), and progressive metadata disclosure (ambient → hover → selection).

### Shared Type Definitions

Create `src/types/explore.ts` in PRD 4A. All PRDs share it.

```typescript
// src/types/explore.ts

export type ExploreViewMode = 'entities' | 'sources';
export type ExploreDisplayMode = 'graph' | 'list';
export type ZoomLevel = 'landscape' | 'neighborhood' | 'detail';

export interface ClusterData {
  anchor: AnchorNode;
  entityCount: number;
  typeDistribution: TypeDistributionEntry[];
  position: { cx: number; cy: number; r: number };
  crossClusterEdges: CrossClusterEdge[];
}

export interface TypeDistributionEntry {
  entityType: string;
  count: number;
  percentage: number; // 0–1
}

export interface CrossClusterEdge {
  targetClusterId: string;
  sharedEntityCount: number;
  crossEdgeCount: number;
  totalWeight: number;
}

export interface AnchorNode {
  id: string;
  label: string;
  entityType: string;
  description: string | null;
  entityCount: number;
}

export interface EntityNode {
  id: string;
  label: string;
  entityType: string;
  description: string | null;
  confidence: number | null;
  connectionCount: number;
  clusters: string[];        // anchor IDs this entity belongs to
  sourceId: string | null;
  sourceName: string | null;
  sourceType: string | null;
  tags: string[];
  createdAt: string;
  isBridge: boolean;         // belongs to 2+ clusters
  isUnclustered: boolean;    // belongs to 0 clusters
}

export interface SourceNode {
  id: string;
  title: string;
  sourceType: string;
  entityIds: string[];
  entityCount: number;
  createdAt: string;
}

export interface SourceEdge {
  fromSourceId: string;
  toSourceId: string;
  sharedEntityCount: number;
  sharedEntityIds: string[];
}

export interface ExploreFilters {
  searchQuery: string;
  activeAnchorId: string | null;
  spotlightEntityType: string | null;
  recency: '7d' | '30d' | 'all';
}

export interface ContextBasketItem {
  nodeId: string;
  label: string;
  entityType: string;
}

export type ExploreRightPanelContent =
  | { type: 'node'; data: EntityNode }
  | { type: 'source'; data: SourceNode }
  | { type: 'cluster'; data: ClusterData }
  | null;
```

### Component Architecture

```
src/views/ExploreView.tsx              ← 4A: shell, toolbar, mode routing
src/views/explore/
  ├── ExploreToolbar.tsx               ← 4A: search, mode toggle, anchors, spotlight, recency
  ├── LandscapeView.tsx                ← 4A: cluster bubbles, cross-cluster edges
  ├── NeighborhoodView.tsx             ← 4B: entity nodes within a cluster
  ├── SourceGraphView.tsx              ← 4D: source-level graph
  ├── ExploreRightPanel.tsx            ← 4C: panel router
  ├── ContextBasket.tsx                ← 4E: floating basket UI
  └── ListFallback.tsx                 ← 4E: simplified browse table
src/components/explore/
  ├── ClusterBubble.tsx                ← 4A: cluster with type ring
  ├── TypeDistributionRing.tsx         ← 4A: SVG donut ring
  ├── EntityDot.tsx                    ← 4B: individual entity node
  ├── SourceCard.tsx                   ← 4D: source node rectangle
  ├── NodeTooltip.tsx                  ← 4A/4B: hover tooltip
  ├── NodeDetailPanel.tsx              ← 4C: entity detail
  ├── SourceDetailPanel.tsx            ← 4D: source detail
  └── ClusterDetailPanel.tsx           ← 4C: cluster summary
src/hooks/
  ├── useExploreData.ts                ← 4A: fetches + caches all explore data
  ├── useClusterLayout.ts              ← 4A: cluster positions via force sim
  ├── useEntityLayout.ts               ← 4B: entity positions within cluster
  ├── useSourceLayout.ts               ← 4D: source node positions
  ├── useExploreFilters.ts             ← 4A: filter state, visibility
  └── useContextBasket.ts              ← 4E: basket state
src/services/
  └── exploreQueries.ts                ← 4A+: all Supabase queries
```

### Canvas vs SVG

Use **SVG** for graph rendering. The landscape view shows 5–15 clusters and the neighborhood view caps at ~80 entities. SVG provides natural hit-testing, CSS transitions, and React composition. Canvas can be swapped in later via the hook architecture if needed at 500+ nodes.

### URL State

Sync explore state to URL params for deep-linking: `?mode=entities|sources`, `?anchor=<id>`, `?node=<id>`, `?zoom=landscape|neighborhood`. Hydrate on mount, update on change via `useSearchParams`.

---
---
---

## Cross-PRD Dependencies Summary

```
PRD 4A (Shell + Landscape)
  ├── PRD 4B (Neighborhood + Entities) ── depends on 4A
  │     └── PRD 4C (Right Panel) ── depends on 4B
  │           └── PRD 4E (Context Basket) ── depends on 4C
  └── PRD 4D (Source Graph) ── depends on 4A only
```

PRDs 4D and 4E can be built in parallel once their dependencies are met. The critical path is: **4A → 4B → 4C → 4E**, with 4D branching off after 4A.

## Impact on Other PRDs

- **PRD 6 (Home):** Can link to Explore with `?anchor=<id>`, which 4A hydrates.
- **PRD 8 (Ask):** Needs to accept `?context=<nodeIds>` for basket integration (small addition).
- **PRDs 9-14:** No impact.
- **Original PRD 4 (Browse):** Preserved as ListFallback in 4E. No code discarded.
- **Original PRD 5 (Graph):** Replaced. Hook architecture carries over.
