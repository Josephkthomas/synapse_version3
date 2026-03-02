## PRD 4E — Context Basket + Interactive Features

**Dependencies:** PRD 4C (Right Panel + Selection)
**Estimated Complexity:** Medium (1 session)

### 1. Objective

Add the interaction layer that makes Explore a **thinking tool** rather than just a browser. The context basket lets users collect entities during exploration and bridge to conversational AI. Spotlight filtering, path finding, and the list fallback complete the feature set.

### 2. New Files

| File | Purpose |
|---|---|
| `src/views/explore/ContextBasket.tsx` | Floating bar: pinned entity badges, actions ("Ask about these", "Show paths"). |
| `src/views/explore/ListFallback.tsx` | Simplified entity table: sortable columns, entity type filters. Wraps existing Browse components if available. |
| `src/hooks/useContextBasket.ts` | Basket state: items array, add/remove/clear. Persists in session (not across page loads). |

**Extended:** `NeighborhoodView.tsx` (double-click → basket), `ExploreView.tsx` (render basket + list), `NodeDetailPanel.tsx` (basket action wired).

### 3. Context Basket

#### State

```typescript
// hooks/useContextBasket.ts
export function useContextBasket() {
  const [items, setItems] = useState<ContextBasketItem[]>([]);

  const addItem = (item: ContextBasketItem) => {
    setItems(prev => prev.some(i => i.nodeId === item.nodeId) ? prev : [...prev, item]);
  };
  const removeItem = (nodeId: string) => {
    setItems(prev => prev.filter(i => i.nodeId !== nodeId));
  };
  const clear = () => setItems([]);
  const hasItem = (nodeId: string) => items.some(i => i.nodeId === nodeId);

  return { items, addItem, removeItem, clear, hasItem };
}
```

#### Trigger

- **Double-click** an entity node in neighborhood view → add to basket (or remove if already present).
- **"Add to context"** button in NodeDetailPanel → add to basket.
- **Shift+click** an entity node → add to basket (alternative to double-click).

Visual indicator on graph: entity nodes in the basket get a subtle ring in `--accent-500` (`0 0 0 2px white, 0 0 0 3.5px var(--accent-500)`).

#### UI Component

`ContextBasket.tsx` renders as a floating bar when `items.length > 0`:
- **Position:** Absolute, bottom 20px, centered horizontally.
- **Styling:** `--bg-card`, `--border-default` border, 14px radius, subtle shadow. Animates in with `translateY(12px) → 0` on first item added.
- **Contents (left to right):**
  - Label: "CONTEXT ({count})" — section label styling.
  - Items row: horizontal scroll of entity badges. Each badge: 5px dot + label + × remove button. Background: entity type color at 10%, border at 25%.
  - Divider: 1px × 28px.
  - Actions:
    - **"Ask about these"** (primary): `--accent-500` bg, white text. Navigates to Ask view with basket items as pre-seeded context.
    - **"Show paths"** (secondary): `--bg-inset` bg. Highlights edges between basket items and the connecting subgraph on the graph canvas.
    - **"Clear"** (ghost): text button to empty basket.

#### "Ask about these" Flow

When clicked:
1. Collect all basket item node IDs.
2. Navigate to `/ask?context={comma-separated nodeIds}`.
3. Ask view (PRD 8) reads these IDs, fetches the node labels and descriptions, and prepends them to the system context for the RAG query. This creates a targeted question context.
4. If Ask view isn't built yet: show a toast "Ask view coming soon" and no-op.

#### "Show paths" Flow

When clicked with 2+ items in the basket:
1. For each pair of basket items, compute the shortest path through the edge graph (BFS, max 3 hops).
2. Highlight all nodes and edges along the discovered paths on the canvas. Use accent color at 35% for path edges, 60% for path nodes.
3. Show a floating indicator at the top: "Paths between {N} entities · {M} connections found" with a × to dismiss.
4. Nodes/edges NOT on the paths dim to 15% opacity.
5. If no path exists between a pair, show a subtle indicator: "No path found between {A} and {B}."

Path computation utility:

```typescript
// utils/graphPaths.ts
export function findShortestPath(
  edges: Array<{ sourceNodeId: string; targetNodeId: string }>,
  fromId: string,
  toId: string,
  maxHops: number = 3
): string[] | null {
  // BFS
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.sourceNodeId)) adj.set(e.sourceNodeId, []);
    if (!adj.has(e.targetNodeId)) adj.set(e.targetNodeId, []);
    adj.get(e.sourceNodeId)!.push(e.targetNodeId);
    adj.get(e.targetNodeId)!.push(e.sourceNodeId);
  }

  const queue: Array<{ node: string; path: string[] }> = [{ node: fromId, path: [fromId] }];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    if (path.length > maxHops + 1) continue;
    if (node === toId) return path;

    for (const neighbor of (adj.get(node) || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, path: [...path, neighbor] });
      }
    }
  }
  return null;
}
```

### 4. Spotlight Filtering Enhancement

The spotlight filter from PRD 4A works at the cluster level. In 4E, extend it to work at the entity level within the neighborhood view:

- When a spotlight type is active in neighborhood view: matching entities stay at full opacity, non-matching entities dim to 0.08 opacity, edges to/from dimmed nodes also dim.
- When search query is active: entities whose label includes the query stay visible, others dim.
- **Key principle: spotlight highlights, it never hides.** All entities remain spatially positioned. The user can still hover dimmed entities to see their tooltip, but they can't click them. This preserves the graph structure while directing attention.

### 5. List Fallback

The "List" display toggle switches from the graph to a simplified entity table.

If the `BrowseTab` component from the original PRD 4 already exists, wrap it directly:
```typescript
// views/explore/ListFallback.tsx
import BrowseTab from '../explore/BrowseTab'; // if exists
export default function ListFallback() {
  return <BrowseTab />;
}
```

If it doesn't exist yet, build a minimal version:
- Sortable table: Entity (dot + label), Type (badge), Connections (count), Confidence (bar), Source, Time.
- Active filters from `ExploreFilters` apply (anchor, spotlight type, recency, search).
- Click a row → select that entity and switch to graph view zoomed to its cluster.
- Uses the cached data from `useExploreData` — no additional fetching.

### 6. Keyboard Shortcuts

| Key | Action |
|---|---|
| `Escape` | Deselect node / close panel / clear search (cascading) |
| `Backspace` (in graph, not in search) | Back to landscape from neighborhood |
| `/` | Focus search input |
| `Shift+Click` | Add/remove entity from basket |

### 7. Acceptance Criteria

- [ ] Double-click or shift-click an entity → adds to context basket (floating bar appears).
- [ ] Basket shows entity badges with type colors and × remove buttons.
- [ ] "Add to context" button in NodeDetailPanel adds to basket.
- [ ] "Ask about these" navigates to Ask with context param (or toast if Ask not built).
- [ ] "Show paths" with 2+ items highlights connecting paths, dims unrelated nodes.
- [ ] Path indicator shows at top with dismiss button.
- [ ] "Clear" empties the basket.
- [ ] Basket animates in/out smoothly.
- [ ] Entity nodes in basket have accent ring on the graph.
- [ ] Spotlight filtering works at entity level in neighborhood view (dim, not hide).
- [ ] Search highlights matching entities in neighborhood.
- [ ] "List" toggle shows entity table with active filters applied.
- [ ] Click table row → switches to graph, zooms to entity's cluster, selects entity.
- [ ] Keyboard shortcuts work (Escape, Backspace, /, Shift+Click).

### 8. Testing Guidance

- [ ] Test basket with 1 item (no paths to show)
- [ ] Test basket with 2 items in same cluster (short path)
- [ ] Test basket with 2 items in different clusters (longer path or no path)
- [ ] Test basket with 5+ items (horizontal scroll)
- [ ] Test "Ask about these" navigation and context passing
- [ ] Test spotlight + search combination
- [ ] Test list view with various filter combinations
- [ ] Test table row click → graph navigation
- [ ] Test keyboard shortcuts in various states

