# PRD 5 — Explore: Graph Tab

**Phase:** 2 — Data Surfaces
**Dependencies:** PRD 2 (App Shell + Navigation), PRD 4 (Explore Browse Tab)
**Estimated Complexity:** High (2–3 sessions)
**Key Risks:** D3 Canvas rendering performance at scale, hit-testing accuracy on Canvas, force simulation tuning, double-click entity expansion animation smoothness

---

## 1. Objective

Build the Graph tab within the Explore view — an interactive, force-directed visualization of the user's knowledge graph rendered via D3.js on HTML5 Canvas. The graph operates at a **source-anchor abstraction level** by default (sources as rounded rectangles, anchors as circles, edges showing how sources connect to anchors through shared entities), with on-demand entity expansion via double-click. This view gives the user a spatial, intuitive sense of how their knowledge interconnects — making patterns, clusters, and gaps visible at a glance. It is the signature visual experience of Synapse.

---

## 2. What Gets Built

### New Files Created

| File | Purpose |
|---|---|
| `src/components/explore/GraphTab.tsx` | Container for the graph tab — scope selector bar, help text, stats/legend overlays, and the GraphCanvas component |
| `src/components/explore/GraphCanvas.tsx` | The core D3 Canvas rendering component. Accepts `data`, `scope`, `expandedNodeId`, `selectedNodeId`, `onClickNode`, `onExpandNode` as props. Owns the `<canvas>` element and the render loop. |
| `src/components/explore/MiniGraph.tsx` | Smaller, non-interactive variant (290×160px) for the right panel. Shows a subset of the graph relevant to a selected context. No labels, no interaction — purely ambient. |
| `src/hooks/useGraphSimulation.ts` | Custom hook managing the D3 force simulation — node positions, velocities, forces (repulsion, spring, drift, boundary constraints). Returns mutable node/edge arrays and a `tick` function. |
| `src/hooks/useGraphRenderer.ts` | Custom hook managing the Canvas draw loop via `requestAnimationFrame`. Reads from the simulation's node/edge arrays and draws every frame. Handles DPR scaling. |
| `src/hooks/useGraphInteraction.ts` | Custom hook for mouse/touch event handling on the Canvas — hit-testing, hover detection, click/double-click discrimination, cursor management. |
| `src/hooks/useGraphData.ts` | Custom hook that fetches and computes graph data from Supabase — loads sources, anchors, computes source-to-anchor edges by tracing through `knowledge_nodes` and `knowledge_edges`. Returns typed `GraphData`. |
| `src/services/graphQueries.ts` | Supabase query functions specific to graph data: `fetchSourceAnchorEdges()`, `fetchEntityCluster()`, `fetchGraphStats()`. These are non-trivial queries that should not live inside components. |
| `src/types/graph.ts` | Type definitions: `GraphNode`, `GraphEdge`, `GraphData`, `SourceGraphNode`, `AnchorGraphNode`, `EntityDot`, `GraphScope`, `SimulationNode`, `SimulationEdge`. |
| `src/config/sourceTypes.ts` | Source type configuration — color hex and emoji icon per source type (Meeting, YouTube, Research, Note, Document). Referenced by the graph renderer and other views. |

### Modified Files

| File | Change |
|---|---|
| `src/components/explore/ExploreView.tsx` | Replace Graph tab placeholder content with `<GraphTab />`. Pass the active tab state to conditionally render GraphTab or BrowseTab. |
| `src/components/RightPanel.tsx` | Add support for `{ type: 'source'; data: KnowledgeSource }` content type to render a `SourceDetail` component when a source node is clicked in the graph. The `{ type: 'node' }` path already works via PRD 4's `NodeDetail`. |
| `src/components/RightPanel.tsx` | Add `MiniGraph` rendering for a future `{ type: 'graph-context' }` content type (structure only — not wired until PRD 8). |
| `src/contexts/GraphContext.tsx` | Add `expandedNodeId` and `setExpandedNodeId` to the context. Add `graphScope` and `setGraphScope` (persists the user's last-selected scope). |
| `src/services/supabase.ts` | Add `fetchSourcesWithEntityCounts()`, `fetchAnchorsWithConnectionCounts()`, and `computeSourceAnchorEdges()` functions. |

---

## 3. Design Requirements

### Canvas Background & Container

The graph canvas fills the entire available space within the Graph tab (below the scope selector bar). No scroll — the graph is viewport-bound.

- Canvas background: `--bg-content` (`#f7f7f7`) — the graph floats on the content layer, not on white. Fill the canvas with this color on each frame clear.
- No border or shadow on the canvas element itself.
- The canvas element must handle high-DPI displays: set `canvas.width = containerWidth * devicePixelRatio`, `canvas.height = containerHeight * devicePixelRatio`, then `ctx.scale(dpr, dpr)`. CSS dimensions remain at logical pixel size.

### Scope Selector Bar

Positioned directly below the Graph/Browse tab bar. Shares the same `--bg-card` (#ffffff) background and `--border-subtle` bottom border as the tab bar.

- Padding: `8px 16px`.
- Left side: Section label "SCOPE" in uppercase, Cabinet Grotesk, 10px, weight-700, letter-spacing 0.08em, `--text-secondary` color. Followed by 3 filter pills:
  - "Overview" — shows all sources and all anchors.
  - "Anchors Only" — shows only anchor nodes and edges between them (indirect, through shared sources).
  - "Sources Only" — shows only source nodes and edges between them (indirect, through shared anchors).
- Filter pill styling per design system: 20px border-radius, 11px font-size, weight-600, DM Sans. Active: `--accent-50` background, `--accent-500` border and text. Inactive: transparent background, `--border-subtle` border, `--text-secondary` text. Transition: 0.15s ease on all properties.
- Right side: Help text "Click to select · Double-click to expand" in DM Sans, 11px, `--text-secondary`. Separated from pills by `flex: 1` spacer.

### Source Nodes (Rounded Rectangles)

Source nodes represent `knowledge_sources` rows. They are wider than they are tall.

- **Shape:** Rounded rectangle. Width: `node.radius * 2.8`. Height: `node.radius * 1.6`. Corner radius: 10px.
- **Base radius:** 28px. Can scale slightly based on entity count (26px–32px range, mapped linearly from min to max entity count in the current dataset). Never smaller than 26px.
- **Fill:** Source type color at 10% opacity (default), 20% opacity (hovered or expanded).
- **Stroke:** Source type color at 25% opacity (default), 50% opacity (hovered). Stroke width: 1px default, 2px hovered.
- **Content — Source type emoji:** Centered within the rectangle. Rendered at 14px font size. Use platform native emoji rendering (just set font to `14px sans-serif` and `fillText` the emoji).
- **Content — Label:** Below the rectangle, centered. DM Sans, 10px, weight-500. Color: `--text-body` at 55% opacity (default), 90% opacity (hovered). Truncate with ellipsis at 22 characters. Vertical offset: `node.y + node.radius + 14px`.
- **Content — Entity count badge:** Below the label. DM Sans, 8px, weight-700. Color: source type color at 80% opacity. Format: "N entities". Vertical offset: `node.y + node.radius + 24px`.

Source type color map (from `config/sourceTypes.ts`):

| Source Type | Color | Emoji |
|---|---|---|
| Meeting | `#3b82f6` | 🎙 |
| YouTube | `#ef4444` | ▶ |
| Research | `#8b5cf6` | 🔬 |
| Note | `#10b981` | ✏️ |
| Document | `#f59e0b` | 📋 |

### Anchor Nodes (Circles)

Anchor nodes represent `knowledge_nodes` rows where `is_anchor = true`.

- **Shape:** Circle. Base radius: 22px. Can scale slightly based on connection count (20px–26px range).
- **Fill:** Entity type color at 12% opacity (default), 25% opacity (hovered or expanded).
- **Stroke:** Entity type color at 35% opacity (default), 60% opacity (hovered). Stroke width: 1.5px default, 2px hovered.
- **Content — Anchor symbol:** "⚓" centered within the circle. DM Sans, bold, 11px. Color: entity type color at full opacity (default), enhanced opacity on hover. Use `textAlign: 'center'` and `textBaseline: 'middle'`.
- **Content — Label:** Below the circle, centered. DM Sans, 10px, weight-500. Color: `--text-body` at 60% opacity (default), 90% opacity (hovered). Truncate with ellipsis at 20 characters. Vertical offset: `node.y + node.radius + 14px`.
- **Content — Connection count badge:** Below the label. DM Sans, 8px, weight-700. Color: entity type color at 80% opacity. Format: "N connections". Vertical offset: `node.y + node.radius + 24px`.

Entity type colors are pulled from `config/entityTypes.ts` (already exists from PRD 1). The anchor's entity_type determines which color to use.

### Edges (Curved Lines)

Edges connect source nodes to anchor nodes. An edge exists when at least one entity extracted from a source is connected (via `knowledge_edges`) to an anchor node.

- **Shape:** Quadratic bezier curves. Control point is offset perpendicular to the midpoint: `controlX = (fromX + toX) / 2`, `controlY = (fromY + toY) / 2 - 30`. The `-30` vertical offset creates a gentle upward bow.
- **Stroke width:** Maps to shared entity count between the source and anchor. Range: 1px (1 shared entity) to 5px (5+ shared entities). Linear interpolation with `Math.min(weight * 1.0, 5)`.
- **Default color:** `rgba(0, 0, 0, 0.08)` — barely visible, creating a subtle web.
- **Hovered color:** `rgba(214, 58, 0, 0.3)` — accent-tinted. Stroke width multiplied by 1.5×. An edge is "hovered" when either its source or target node is hovered.
- **Edge label (on hover only):** When an edge is highlighted, show the shared entity count at the bezier midpoint. DM Sans, 9px, weight-600. Color: `rgba(214, 58, 0, 0.7)`. Format: "N entities". Positioned at the control point.

### Expanded Entity Cluster

When a node is double-clicked, its constituent entities fan out radially around the parent node.

- **Entity dots:** 6px radius circles. Fill: entity type color at full saturation with 53% alpha (`color + "88"`). Stroke: entity type color at 27% alpha (`color + "44"`). Stroke width: 1px.
- **Connecting lines:** Thin lines from parent node center to each entity dot. Stroke: `rgba(0, 0, 0, 0.06)`. Width: 1px. Straight lines (not beziers).
- **Labels:** DM Sans, 8px, weight-500. Color: `--text-body` at 65% opacity. Centered below each dot. Truncate at 16 characters with ellipsis. Vertical offset: dot center + 14px.
- **Radial layout:** Entities distribute evenly around the parent. Angle per entity: `(index / totalEntities) * Math.PI * 2 - Math.PI / 2` (starting from top). Distance from parent center: 65px.
- **For source nodes:** Show the entities extracted from that source (query `knowledge_nodes` where `source_id = source.id`). Cap at 12 entities — show the highest-confidence ones if more exist.
- **For anchor nodes:** Show the entities connected to that anchor (query `knowledge_edges` where source_node_id or target_node_id is the anchor, then fetch the connected nodes). Cap at 12.
- **Collapse:** Double-clicking an expanded node collapses it. The `expandedNodeId` state returns to `null`.
- **Only one node can be expanded at a time.** Double-clicking a different node collapses the current expansion and expands the new one.

### Stats Overlay (Top-Right)

A small floating panel showing graph-level statistics.

- Position: top-right of the canvas area, offset `16px` from top and right edges.
- Background: `--bg-card` (#ffffff) at 95% opacity (add `0.95` alpha or use `rgba(255,255,255,0.95)`).
- Border: `--border-subtle` (`rgba(0,0,0,0.06)`).
- Border-radius: 10px.
- Padding: `10px 14px`.
- No shadow.
- Content: Three stat lines, each DM Sans 11px:
  - "**N** Sources" — weight-700 for the number, weight-400 for the label, `--text-body` color.
  - "**N** Anchors" — same treatment.
  - "**N** Connections" — same treatment.
- Stats are separated by `6px` vertical gap.

### Legend Overlay (Bottom-Left)

A small floating panel explaining the visual language.

- Position: bottom-left of the canvas area, offset `16px` from bottom and left edges.
- Same styling as stats overlay (white at 95%, subtle border, 10px radius, `10px 14px` padding).
- Content:
  - Row 1: Small rounded rectangle icon (12×8px, filled with `--text-secondary` at 20%) + "Source" label (DM Sans, 11px, `--text-body`).
  - Row 2: Small circle icon (8px diameter, filled with `--text-secondary` at 20%) + "Anchor" label.
  - Row 3: Two lines of increasing thickness (1px and 4px, colored `--text-secondary` at 30%) + "Edge weight = shared entities" label (DM Sans, 10px, `--text-secondary`).
- Rows separated by `6px` vertical gap.

### SourceDetail Right Panel Component

When a source node is clicked, the right panel shows source details. This is a new component `SourceDetail.tsx` (analogous to `NodeDetail` from PRD 4).

- **Header:** Source type emoji in a 28×28px tinted container (source type color at 7% bg, matching design system `.source-icon` spec), followed by source title in Cabinet Grotesk, 14px, weight-700, `--text-primary`.
- **Metadata row:** DM Sans, 11px, `--text-secondary`. Source type label + "·" + relative timestamp.
- **Extracted entities section:** Section label "EXTRACTED ENTITIES" (uppercase, 10px, Cabinet Grotesk, weight-700, letter-spacing 0.08em, `--text-secondary`). Below: entity badges in a flex-wrap layout with 6px gap. Each badge shows entity-colored dot + label, styled per the entity badge design system spec (6% bg, 16% border, entity color text, 11px, weight-600, 3px 9px padding, 5px radius).
- **Summary text:** If source has `metadata.summary` or extractable content preview, show it in DM Sans, 13px, `--text-body`, max 4 lines with overflow ellipsis.
- **"Re-extract" button:** Tertiary button style (`--bg-inset` background, `--text-body` text, `--border-default` border). DM Sans, 12px, weight-600. This button is a placeholder for now (wires to the extraction pipeline in PRD 7).

### MiniGraph Variant

A small, non-interactive ambient graph rendered in the right panel for contextual awareness.

- Dimensions: 290×160px (fits within the right panel's 310px width minus padding).
- Background: transparent (inherits from right panel's `--bg-card`).
- Renders a simplified version of the graph: nodes as small dots (anchor nodes 8px radius, other nodes 2.5–6px radius), edges as faint lines (`rgba(0,0,0,0.03)` stroke, 0.5px width).
- Gentle drift animation (same physics as full graph but dampened further).
- No labels, no hover, no click interaction.
- Anchor nodes show their label below in DM Sans 8px only if there are ≤5 anchors visible.
- Node colors match entity type colors from `config/entityTypes.ts`.
- The MiniGraph accepts a `contextNodeIds?: string[]` prop. When provided, those nodes render at full opacity and slightly larger, while all others render at 30% opacity. This enables PRD 8 (Ask view) to highlight the graph neighborhood relevant to a RAG query response.

---

## 4. Data & Service Layer

### Graph Data Computation (`services/graphQueries.ts`)

The graph's source-anchor abstraction requires computing which sources connect to which anchors. This is a multi-step query:

#### `fetchGraphData(userId: string): Promise<GraphData>`

This is the primary data function. It returns all the data needed to render the graph.

**Step 1 — Fetch sources:**
```sql
SELECT id, title, source_type, source_url, metadata, created_at,
  (SELECT COUNT(*) FROM knowledge_nodes WHERE source_id = knowledge_sources.id AND user_id = $userId) as entity_count
FROM knowledge_sources
WHERE user_id = $userId
ORDER BY created_at DESC
```

**Step 2 — Fetch anchors:**
```sql
SELECT kn.id, kn.label, kn.entity_type, kn.description, kn.confidence,
  (SELECT COUNT(*) FROM knowledge_edges WHERE (source_node_id = kn.id OR target_node_id = kn.id) AND user_id = $userId) as connection_count
FROM knowledge_nodes kn
WHERE kn.user_id = $userId AND kn.is_anchor = true
```

**Step 3 — Compute source-to-anchor edges:**

This is the non-trivial query. For each source, we need to find which anchors its extracted entities connect to, and how many entities form each connection.

```sql
-- For each source, find anchors connected to its entities
SELECT
  kn.source_id,
  ke.target_node_id as anchor_id,
  COUNT(DISTINCT kn.id) as shared_entity_count
FROM knowledge_nodes kn
JOIN knowledge_edges ke ON ke.source_node_id = kn.id
JOIN knowledge_nodes anchor ON ke.target_node_id = anchor.id AND anchor.is_anchor = true
WHERE kn.user_id = $userId AND kn.source_id IS NOT NULL
GROUP BY kn.source_id, ke.target_node_id

UNION

SELECT
  kn.source_id,
  ke.source_node_id as anchor_id,
  COUNT(DISTINCT kn.id) as shared_entity_count
FROM knowledge_nodes kn
JOIN knowledge_edges ke ON ke.target_node_id = kn.id
JOIN knowledge_nodes anchor ON ke.source_node_id = anchor.id AND anchor.is_anchor = true
WHERE kn.user_id = $userId AND kn.source_id IS NOT NULL
GROUP BY kn.source_id, ke.source_node_id
```

In Supabase client code, this may need to be executed as an RPC function or broken into multiple queries:

1. Fetch all non-anchor nodes with their `source_id`: `knowledge_nodes WHERE is_anchor = false AND source_id IS NOT NULL`.
2. Fetch all edges where one side is an anchor: `knowledge_edges WHERE source_node_id IN (anchor_ids) OR target_node_id IN (anchor_ids)`.
3. In JavaScript, compute the intersection: for each edge, if one side is an anchor and the other side has a `source_id`, create/increment a source→anchor weight.

This JavaScript-side computation is acceptable for graphs up to ~1000 nodes. For larger graphs, create a Supabase RPC function.

**Return type:**
```typescript
interface GraphData {
  sources: SourceGraphNode[];
  anchors: AnchorGraphNode[];
  edges: GraphEdge[];
  stats: { sourceCount: number; anchorCount: number; edgeCount: number };
}

interface SourceGraphNode {
  id: string;           // knowledge_sources.id
  kind: 'source';
  label: string;        // title
  sourceType: string;   // Meeting, YouTube, etc.
  color: string;        // from sourceTypes config
  icon: string;         // emoji from sourceTypes config
  entityCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AnchorGraphNode {
  id: string;           // knowledge_nodes.id
  kind: 'anchor';
  label: string;
  entityType: string;
  color: string;        // from entityTypes config
  connectionCount: number;
  description: string | null;
  confidence: number | null;
}

interface GraphEdge {
  sourceId: string;     // references a SourceGraphNode.id
  anchorId: string;     // references an AnchorGraphNode.id
  weight: number;       // shared entity count
}
```

#### `fetchEntityCluster(nodeId: string, nodeKind: 'source' | 'anchor', userId: string): Promise<EntityDot[]>`

Fetches entities for the expansion cluster when a node is double-clicked.

**For source nodes (`nodeKind === 'source'`):**
```sql
SELECT id, label, entity_type, confidence
FROM knowledge_nodes
WHERE source_id = $nodeId AND user_id = $userId
ORDER BY confidence DESC NULLS LAST
LIMIT 12
```

**For anchor nodes (`nodeKind === 'anchor'`):**
```sql
-- Get nodes connected to this anchor via edges
SELECT DISTINCT kn.id, kn.label, kn.entity_type, kn.confidence
FROM knowledge_nodes kn
JOIN knowledge_edges ke ON (ke.source_node_id = kn.id OR ke.target_node_id = kn.id)
WHERE (ke.source_node_id = $nodeId OR ke.target_node_id = $nodeId)
  AND kn.id != $nodeId
  AND kn.user_id = $userId
ORDER BY kn.confidence DESC NULLS LAST
LIMIT 12
```

**Return type:**
```typescript
interface EntityDot {
  id: string;
  label: string;
  entityType: string;
  color: string;        // from entityTypes config
  confidence: number | null;
}
```

### Graph Data Hook (`hooks/useGraphData.ts`)

```typescript
function useGraphData(scope: GraphScope): {
  data: GraphData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

- Fetches graph data on mount and when `scope` changes.
- Filters data client-side based on scope:
  - `'overview'` — returns all sources and anchors.
  - `'anchors'` — returns only anchors. Edges are re-computed as anchor-to-anchor (two anchors share an edge if they both connect to the same source, weight = number of shared sources).
  - `'sources'` — returns only sources. Edges are re-computed as source-to-source (two sources share an edge if they both connect to the same anchor, weight = number of shared anchors).
- Uses the authenticated user's ID from `AuthContext`.
- Caches the full dataset and derives scope-filtered views without re-fetching.

### Graph Simulation Hook (`hooks/useGraphSimulation.ts`)

```typescript
function useGraphSimulation(
  data: GraphData | null,
  canvasWidth: number,
  canvasHeight: number
): {
  nodes: SimulationNode[];
  edges: SimulationEdge[];
  tick: () => void;
  resetPositions: () => void;
}
```

**SimulationNode extends the graph node with physics properties:**
```typescript
interface SimulationNode {
  id: string;
  kind: 'source' | 'anchor';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;       // base radius scaled by entity/connection count
  // ... all other GraphNode fields
}
```

**Initial positioning:**
- Sources placed in the left ~40% of the canvas with radial scatter: `x = width * 0.3 + cos(i * goldenAngle) * width * 0.18`, `y = height * 0.5 + sin(i * goldenAngle) * height * 0.25`. Use golden angle (≈2.399 radians) for even distribution.
- Anchors placed in the right ~40%: `x = width * 0.7 + cos(i * goldenAngle) * width * 0.15`, `y = height * 0.4 + sin(i * goldenAngle) * height * 0.25`.
- When scope is `'anchors'` or `'sources'`, distribute evenly across the full canvas.

**Force model (applied each tick):**

1. **Velocity damping:** `vx *= 0.96`, `vy *= 0.96` — gradual deceleration for organic settling.
2. **Random drift:** `vx += (Math.random() - 0.5) * 0.08`, `vy += (Math.random() - 0.5) * 0.08` — very subtle jitter that keeps the graph alive without being distracting.
3. **Node-node repulsion:** For every pair of nodes within 120px of each other, apply repulsive force: `force = (120 - distance) * 0.003`. Direction: along the line between the two nodes, pushing apart. This prevents overlap.
4. **Edge spring force:** For every edge, apply a spring force pulling connected nodes toward an ideal distance of 180px: `force = (distance - 180) * 0.0008`. Both nodes are affected equally. This clusters connected nodes.
5. **Boundary constraints:** Soft bouncing at canvas edges. If `node.x < node.radius + 10`, `vx += 0.3` (and similarly for all four edges). This keeps nodes within the visible area.
6. **Position update:** `x += vx`, `y += vy` after all forces are applied.

**Performance:** The simulation runs on every `requestAnimationFrame` tick. For graphs with >100 nodes, consider reducing repulsion checks by spatial partitioning (quadtree) or limiting to a fixed number of pair comparisons per tick (e.g., 500).

### Graph Renderer Hook (`hooks/useGraphRenderer.ts`)

```typescript
function useGraphRenderer(
  canvasRef: RefObject<HTMLCanvasElement>,
  nodes: SimulationNode[],
  edges: SimulationEdge[],
  hoveredNodeId: string | null,
  selectedNodeId: string | null,
  expandedNodeId: string | null,
  expandedEntities: EntityDot[] | null,
  canvasWidth: number,
  canvasHeight: number
): void
```

- Runs a `requestAnimationFrame` loop.
- On each frame: calls `simulation.tick()`, then draws everything.
- **Draw order** (back to front):
  1. Clear canvas and fill with `#f7f7f7` (`--bg-content`).
  2. Draw all edges.
  3. Draw all nodes.
  4. Draw expanded entity cluster (if any) — connecting lines first, then dots, then labels.
- Canvas text rendering: Set `ctx.font` using the DM Sans font string. Ensure the font is loaded before first render (use `document.fonts.ready` or a brief delay).
- Labels are drawn with `ctx.textAlign = 'center'` for horizontal centering beneath nodes.

### Graph Interaction Hook (`hooks/useGraphInteraction.ts`)

```typescript
function useGraphInteraction(
  canvasRef: RefObject<HTMLCanvasElement>,
  nodes: SimulationNode[],
  onHover: (nodeId: string | null) => void,
  onClick: (nodeId: string) => void,
  onDoubleClick: (nodeId: string) => void
): void
```

**Hit-testing:**
- On `mousemove`: iterate through all nodes and check if the mouse position falls within the node's shape.
  - For source nodes (rectangles): `Math.abs(mx - node.x) < node.radius * 1.4 && Math.abs(my - node.y) < node.radius * 0.8`.
  - For anchor nodes (circles): `Math.sqrt((mx - node.x)² + (my - node.y)²) < node.radius + 4`.
- Set `cursor: 'pointer'` when hovering a node, `cursor: 'default'` otherwise.

**Click vs. double-click discrimination:**
- Use a timer-based approach: on `click`, start a 250ms timer. If a second `click` fires before the timer, cancel the timer and fire `onDoubleClick`. If the timer expires, fire `onClick`.
- This prevents a click from firing before a double-click is fully registered.

**Mouse event coordinate transformation:**
- Use `canvas.getBoundingClientRect()` to convert `clientX/clientY` to canvas-local coordinates. No DPR scaling needed on the mouse side — the Canvas CSS size matches logical pixels.

---

## 5. Interaction & State

### State Management

| State | Location | Persistence |
|---|---|---|
| `graphScope` | GraphContext | Persists across tab switches within a session. Resets to `'overview'` on app reload. |
| `expandedNodeId` | GraphContext | Resets to `null` on scope change or on navigating away from Graph tab. |
| `hoveredNodeId` | Local to GraphCanvas (via ref, not state — avoids re-renders on every mousemove) | Transient. |
| `selectedNodeId` | GraphContext (`selectedNode`) | Persists across tab switches. Drives right panel content. |
| `graphData` | `useGraphData` hook (cached in ref) | Refetched on mount. Cached during session. |
| `expandedEntities` | Local to GraphTab (loaded on demand) | Cleared when `expandedNodeId` changes or goes null. |

### Interaction Flows

**Hover a node:**
1. `useGraphInteraction` detects hover via hit-testing on `mousemove`.
2. Sets `hoveredNodeId` ref (not state — this avoids React re-renders on every mouse frame).
3. The renderer reads `hoveredNodeId` each frame and applies hover styling (border brightens, slight size increase via larger draw radius, connected edges highlight to accent color, cursor changes to pointer).
4. On mouse leave from a node, `hoveredNodeId` clears. Styling returns to default over the next frame.

**Click a node:**
1. After the 250ms double-click discrimination timer, `onClick` fires.
2. `GraphContext.setSelectedNode(node)` is called.
3. Right panel updates:
   - If clicked node is an anchor → `setRightPanelContent({ type: 'node', data: anchorKnowledgeNode })`. This renders `NodeDetail` (built in PRD 4).
   - If clicked node is a source → `setRightPanelContent({ type: 'source', data: sourceData })`. This renders the new `SourceDetail` component.
4. The selected node gets a persistent visual indicator (thicker border, accent-50 background tint) until another node is selected or the selection is cleared.

**Double-click a node:**
1. `onDoubleClick` fires.
2. If `expandedNodeId` is already this node → collapse (set `expandedNodeId` to `null`, clear `expandedEntities`).
3. If `expandedNodeId` is a different node or null → set `expandedNodeId` to this node, fetch entity cluster via `fetchEntityCluster()`, store in `expandedEntities`.
4. The renderer draws the radial entity cluster around the expanded node.
5. Expanded entities are decorative/informational in V2 — they are not individually clickable (reduces complexity). Future PRDs may add entity-level interaction.

**Change scope:**
1. User clicks a scope pill.
2. `GraphContext.setGraphScope(newScope)` is called.
3. `expandedNodeId` resets to `null`.
4. `useGraphData` recomputes filtered data from cache.
5. `useGraphSimulation` receives new data and re-initializes node positions with fresh layout.
6. The graph re-renders with the filtered dataset. Transition is immediate (no animation between scopes — the force simulation naturally settles nodes into new positions).

---

## 6. Forward-Compatible Decisions

| Decision | Rationale | Future PRD |
|---|---|---|
| `GraphCanvas` accepts props rather than reading from context directly | Enables reuse as `MiniGraph` in the right panel and in the Ask view. The same rendering engine powers both — just with different data and interaction handlers. | PRD 8 (Ask view — MiniGraph shows query-relevant subgraph in right panel) |
| `useGraphSimulation` is a standalone hook, not embedded in the component | Allows the simulation to be swapped or extended (e.g., adding a "focus mode" that applies attractive force toward a specific node). | PRD 8, PRD 12 (Command palette could highlight a node on the graph) |
| `MiniGraph` accepts `contextNodeIds` for highlighting | The Ask view will pass relevant node IDs from RAG results to visually show where in the graph the answer came from. | PRD 8 |
| `computeSourceAnchorEdges()` is a utility function in `services/graphQueries.ts` | The same computation is needed by the Home view's connection discovery feature and potentially by the Orientation Engine. | PRD 6 (Home — cross-connection insight card), PRD 13 (Digests) |
| `SourceDetail` right panel component is built here | Needed by the Home view's feed cards (clicking a feed card shows source detail) and the Automate view's queue items. | PRD 6 (Home), PRD 10 (Automate) |
| `config/sourceTypes.ts` created as a standalone config file | Source type colors and icons are referenced by the graph, the home feed, the browse filters, and the ingest view. Centralizing prevents drift. | PRD 4 (Browse may already reference this), PRD 6, PRD 7, PRD 9 |
| Entity expansion caps at 12 entities per node | Prevents visual clutter. At scale (50+ entities per source), showing all would overwhelm. Future: add a "Show all N entities" link that navigates to Browse with a source filter pre-applied. | PRD 12 (Command palette search as alternative entity access) |

---

## 7. Edge Cases & Error Handling

### Empty Graph (New User, No Data)

- The canvas renders with the `--bg-content` background.
- No nodes or edges are drawn.
- A centered empty state message appears on the canvas: "Your knowledge graph will appear here" in DM Sans, 14px, weight-500, `--text-secondary`. Below it: "Ingest your first source to get started" in DM Sans, 12px, `--text-secondary`. Below that: a tertiary-styled button "Go to Ingest →" that navigates to `/ingest`.
- Stats overlay shows "0 Sources · 0 Anchors · 0 Connections".
- Legend overlay is still visible (teaches the visual language before data appears).

### Sources Exist But No Anchors

- Source nodes render but float freely with no edges (since edges connect to anchors).
- The graph looks sparse — this is correct and communicates that anchors are needed.
- Consider showing a subtle hint in the stats overlay: "No anchors defined — create anchors in Settings to see connections."

### Anchors Exist But No Sources

- Anchor nodes render but float freely.
- Stats overlay shows the anchor count with 0 sources and 0 connections.

### Large Graph (200+ Nodes)

- The force simulation must remain performant. Cap the repulsion pairwise check at 200 nodes. Beyond that, use spatial partitioning:
  - Divide the canvas into a grid (e.g., 8×8 cells).
  - Only check repulsion between nodes in the same cell or adjacent cells.
- Label rendering: at >100 visible nodes, reduce label opacity to 35% for non-hovered nodes and skip rendering labels for nodes smaller than 4px apparent radius (if zoom is ever added).
- The current dataset (~40 sources, 5 anchors) is well within comfortable range. Performance optimization is precautionary.

### Network Failure During Data Fetch

- `useGraphData` returns `{ data: null, loading: false, error: Error }`.
- The canvas shows an error state: centered text "Failed to load graph data" in DM Sans, 14px, `--text-body`. Below: a tertiary button "Retry" that calls `refetch()`.
- Stats overlay is hidden.

### Entity Cluster Fetch Failure

- If `fetchEntityCluster` fails after a double-click, the expansion does not occur.
- `expandedNodeId` resets to `null`.
- No error toast — the node simply doesn't expand. A subtle console warning is logged.

### Canvas Resize

- When the browser window resizes, the canvas must re-measure its container and update `canvas.width`, `canvas.height`, and DPR scaling.
- Use a `ResizeObserver` on the canvas container element.
- On resize: update canvas dimensions, do NOT re-initialize node positions (let the simulation naturally adjust with boundary constraints).

### Font Loading Race Condition

- Canvas text rendering requires the font to be loaded. DM Sans is loaded via Google Fonts in the HTML head.
- Before starting the render loop, await `document.fonts.ready` or check `document.fonts.check('11px "DM Sans"')`.
- If the font is not loaded, use a fallback: `-apple-system, sans-serif`. The visual difference is minimal and self-corrects once the font loads.

### Click on Empty Canvas Area

- If a click lands on no node, clear the selection: `setSelectedNode(null)`, `setRightPanelContent(null)` (right panel returns to Quick Access default).
- Expanded entity cluster remains visible (it's tied to `expandedNodeId`, not selection).

---

## 8. Acceptance Criteria

After this PRD is complete, the following must be true:

- [ ] **Graph renders with real data.** Navigate to Explore → Graph tab. Sources from `knowledge_sources` appear as rounded rectangles with correct source type emoji and colors. Anchors from `knowledge_nodes` (where `is_anchor = true`) appear as circles with ⚓ symbol and correct entity type colors. Edges connect sources to their anchors with thickness proportional to shared entity count.
- [ ] **Force simulation runs smoothly.** Nodes drift gently, repel each other when close, and spring toward connected nodes. The graph settles into a stable but alive layout within ~3 seconds. No snapping, jerking, or oscillation.
- [ ] **Hover interaction works.** Hovering a node brightens its border, slightly increases its size, highlights all connected edges in accent color, shows entity count labels on highlighted edges, and changes cursor to pointer. Moving the mouse away smoothly reverts all hover effects.
- [ ] **Click selects a node.** Clicking a source node opens `SourceDetail` in the right panel. Clicking an anchor node opens `NodeDetail` in the right panel. The selected node has a persistent visual indicator. Clicking empty canvas clears the selection and returns the right panel to Quick Access.
- [ ] **Double-click expands entities.** Double-clicking a source node fans out its extracted entities in a radial pattern with colored dots, thin connecting lines, and truncated labels. Double-clicking an anchor node fans out connected entities. Double-clicking the expanded node collapses it. Only one node can be expanded at a time.
- [ ] **Scope selector filters the graph.** Switching to "Anchors Only" shows only anchors with inter-anchor edges. "Sources Only" shows only sources with inter-source edges. "Overview" shows both. Scope changes reset any expanded entity cluster.
- [ ] **Stats overlay is accurate.** The top-right overlay shows correct counts for sources, anchors, and connections matching the current scope filter.
- [ ] **Legend overlay is visible and correct.** The bottom-left overlay shows the visual key for sources, anchors, and edge weight.
- [ ] **Empty state is handled gracefully.** A new user with no data sees a centered message and a "Go to Ingest" button instead of a blank canvas.
- [ ] **Canvas handles resize.** Resizing the browser window adjusts the canvas dimensions and the simulation boundary constraints without resetting node positions.
- [ ] **Performance is acceptable.** The graph renders at 60fps with the user's current dataset. No frame drops during hover or click interactions.
- [ ] **MiniGraph variant exists.** The `MiniGraph` component renders a small, non-interactive, ambient graph at 290×160px. It accepts a `contextNodeIds` prop for future use by PRD 8.
- [ ] **High-DPI displays render crisply.** The canvas uses `devicePixelRatio` scaling so lines, text, and shapes are not blurry on Retina displays.
- [ ] **SourceDetail component works in the right panel.** Clicking a source in the graph shows title, type icon, timestamp, extracted entity badges, and summary text in the right panel.
