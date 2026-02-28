# PRD 6 — Home View

**Phase:** 2 — Data Surfaces
**Dependencies:** PRD 2 (App Shell + Navigation), PRD 4 (Explore Browse Tab — provides NodeDetail right panel component, entity badge component, and `useNodes` patterns)
**Estimated Complexity:** Medium (1–2 sessions)
**Key Risks:** Cross-connection query performance, user profile name resolution, `digest_profiles` table may not exist yet (requires defensive querying), relative timestamp formatting consistency

---

## 1. Objective

Build the Home view — the default landing experience when a user opens Synapse. It provides an at-a-glance sense of what has happened in the user's knowledge graph: a personalized, time-aware greeting, daily activity stats, a conditional connection-discovery insight card, and two tabs — an Activity Feed showing recently processed sources with their extracted entities and cross-connections, and a Briefings tab showing configured intelligence digests. The Home view answers the question "What's new in my graph?" and rewards the user for every ingestion by making the growing richness of their knowledge visible.

---

## 2. What Gets Built

### New Files Created

| File | Purpose |
|---|---|
| `src/components/home/HomeView.tsx` | Top-level Home view component. Contains the greeting, summary stats, connection discovery card, toggle group, and conditionally renders FeedTab or BriefingsTab. |
| `src/components/home/FeedTab.tsx` | Activity feed tab — fetches and renders a list of FeedCard components ordered by most recent source. |
| `src/components/home/FeedCard.tsx` | Individual feed card component. Shows source metadata, summary, entity badges, and cross-connections. Reusable — designed for use in Home and any future Sources panel. |
| `src/components/home/BriefingsTab.tsx` | Briefings tab — fetches digest profiles and renders briefing cards. Handles empty state. |
| `src/components/home/BriefingCard.tsx` | Individual briefing card. Shows title, schedule, status, frequency badge, module tags, and preview text. |
| `src/components/home/ConnectionDiscoveryCard.tsx` | Conditional insight card showing recently discovered cross-connections. Dismissible. |
| `src/components/home/GreetingHeader.tsx` | Greeting heading + summary stats line. Encapsulates time-of-day logic and stats computation. |
| `src/components/shared/SourceDetail.tsx` | Right panel component for source detail view. If not already built in PRD 5, build it here. Shows source title, type, timestamp, extracted entities, cross-connections, summary, and "Re-extract" placeholder button. |
| `src/hooks/useActivityFeed.ts` | Custom hook that fetches feed data: sources with entity counts, entity badges, and cross-connections. Returns typed `FeedItem[]`. |
| `src/hooks/useDailyStats.ts` | Custom hook that computes 24-hour activity stats (sources processed, entities created, relationships discovered). |
| `src/hooks/useCrossConnections.ts` | Custom hook for fetching cross-connection edges for a given source. Also used by `ConnectionDiscoveryCard` to find the most recent meaningful cross-connection. |
| `src/hooks/useDigestProfiles.ts` | Custom hook that safely fetches digest profiles. Handles the case where the `digest_profiles` table may not exist. |
| `src/services/feedQueries.ts` | Supabase query functions for feed data: `fetchRecentSources()`, `fetchSourceEntityBadges()`, `fetchSourceCrossConnections()`, `fetchDailyStats()`. |
| `src/types/feed.ts` | Type definitions: `FeedItem`, `FeedEntityBadge`, `CrossConnection`, `DailyStats`, `DigestProfile`, `DigestModule`. |

### Modified Files

| File | Change |
|---|---|
| `src/components/home/` (directory) | Create the directory if it doesn't exist. PRD 2 placed a placeholder here. |
| `src/components/RightPanel.tsx` | Ensure the `{ type: 'source' }` content path renders `SourceDetail`. If PRD 5 already added this, no change needed — just verify. Also ensure `{ type: 'node' }` path works for entity badge clicks (should already work via PRD 4). |
| `src/contexts/GraphContext.tsx` | No changes needed — `setRightPanelContent` and `setSelectedNode` already exist from PRD 2. Verify that the `{ type: 'feed' }` discriminated union variant from PRD 2's type definition is handled or mapped to `{ type: 'source' }`. |
| `src/services/supabase.ts` | Add `fetchCrossConnectionsForSource()` utility function. This is the non-trivial query identified in the build plan — edges where `source_node_id` belongs to one source and `target_node_id` belongs to a different source. |

---

## 3. Design Requirements

### Overall Layout

The Home view renders within the center stage area. Content is constrained to `max-width: 840px`, centered horizontally with `margin: 0 auto`. Padding: `28px 32px` (matching the mockup). The entire center stage scrolls vertically if content exceeds the viewport.

### Greeting Header

- **Heading:** Cabinet Grotesk, 26px, weight-800, `--text-primary` (#1a1a1a). Letter-spacing: -0.02em (tight at this display size).
  - Format: "Good [morning/afternoon/evening], [Name]"
  - Time-of-day logic (user's local timezone, **not** UTC):
    - 5:00 AM – 11:59 AM → "Good morning"
    - 12:00 PM – 5:59 PM → "Good afternoon"
    - 6:00 PM – 4:59 AM → "Good evening"
  - Name source: `SettingsContext` → user profile. The name is stored in `user_profiles.professional_context` JSONB as a `name` key, or check for a top-level `name` / `display_name` column if PRD 3 added one. Fallback chain: profile name → Supabase auth user `user_metadata.full_name` → auth user email (before the @) → "there" (last resort).
- **Summary line:** DM Sans, 13px, weight-400, `--text-secondary` (#808080). Margin-top: 4px.
  - Format: "[N] sources processed today · [N] new entities · [N] relationships discovered"
  - The "·" separators use the literal middle dot character (U+00B7).
  - Numbers are computed from the `useDailyStats` hook (counts from the last 24 hours).
  - If all counts are 0: "No activity yet today — ready when you are."
- **Bottom margin:** 24px below the greeting block before the next element.

### Connection Discovery Card

A conditional, dismissible insight card that surfaces recently discovered cross-connections. Only renders when meaningful cross-connections exist.

- **Visibility logic:** Show the card if there is at least one cross-connection edge created in the last 48 hours (edges where the two connected nodes belong to different sources). If none exist, do not render the card at all — no empty state, just absent.
- **Container:** Card component with modified styling:
  - Background: entity type color for "Insight" (`--e-insight`, `#7c3aed`) at 5% opacity (approximately `#7c3aed0D`).
  - Border: `--e-insight` at 16% opacity.
  - Border-radius: 12px.
  - Padding: `14px 18px`.
  - Margin-bottom: 20px.
- **Layout:** Flex row with 10px gap.
  - Left: Zap icon (Lucide `Zap`) at 15px, colored `--e-insight` (#7c3aed). Flex-shrink: 0. Margin-top: 2px (visual alignment with text).
  - Right: Content column.
    - Label: "Connection Discovered" — DM Sans, 11px, weight-600, `--e-insight` color. Margin-bottom: 3px.
    - Body: DM Sans, 13px, weight-400, `--text-body` (#3d3d3d), line-height: 1.5. Describes the cross-connection in natural language. Format: "Your [source title] mentions '[entity A label]' — connecting to [N] entities in your [other source title] [source type]."
    - If multiple cross-connections were discovered, pick the one involving the most connected nodes or the highest-weight edge.
- **Dismiss:** Small × button in the top-right corner (Ghost button style, `--text-secondary`, 10px). On click: hides the card for this session (stored in local component state — it reappears on next page load if cross-connections still exist). No persistent dismiss tracking.

### Feed / Briefings Toggle Group

A toggle group component that switches between two tabs.

- **Container:** `--bg-inset` (#f0f0f0) background, `--border-subtle` border, border-radius: 10px, padding: 3px. Display: flex, gap: 2px.
- **Items:** Each item fills equal width (`flex: 1`). Padding: `9px 0`. Border-radius: 8px. DM Sans, 12px, weight-600. Centered text.
  - **Active item:** `--bg-card` (#ffffff) background, `--text-primary` color, subtle shadow (`0 1px 3px rgba(0,0,0,0.05)`).
  - **Inactive item:** Transparent background, `--text-secondary` color.
  - Transition: background 0.15s ease, color 0.15s ease.
- **Briefings badge:** When there is at least one digest with status "ready", show a count badge inline after the "Briefings" label. Badge: `--e-goal` (#e11d48) color, `--e-goal` at 13% opacity background, 10px border-radius, DM Sans 10px weight-700, padding: `1px 6px`, margin-left: 6px.
- **Margin-bottom:** 20px below the toggle before feed/briefing content.

### Activity Feed Cards (FeedCard)

Each feed card represents a processed `knowledge_source` with its extraction results.

- **Container:** Standard Card component — `--bg-card` (#ffffff) background, `--border-subtle` border, 12px border-radius, `16px 20px` padding. Hover: border darkens to `--border-default`, 1px upward translate, `0 2px 8px rgba(0,0,0,0.04)` shadow. Transition: 0.18s ease. Cursor: pointer.
- **Card gap:** 8px between feed cards (the design system spec for feed card gap).
- **Staggered fade-up animation:** Each card animates in on initial load using the fade-up keyframe. Duration: 0.4s ease. Delay: `index * 0.05s` (first card: 0s, second: 0.05s, third: 0.1s, etc.). Max stagger depth: 7 cards. Cards beyond the 7th load immediately with no animation.

**Card internal layout:**

**Row 1 — Header (flex, space-between, align-center, margin-bottom: 8px):**

Left side (flex, align-center, gap: 10px):
- Source type icon container: 26×26px, border-radius 6px, background using source type color at 10% opacity. Source type emoji centered at 12px font size. Colors from `config/sourceTypes.ts` (Meeting: `#3b82f6`, YouTube: `#ef4444`, Research: `#8b5cf6`, Note: `#10b981`, Document: `#f59e0b`).
- Title block:
  - Source title: DM Sans, 13px, weight-600, `--text-primary`. Single line, truncate with ellipsis if >60 characters.
  - Timestamp: DM Sans, 11px, weight-400, `--text-secondary`. Relative format: "2h ago", "1d ago", "3d ago", "1w ago". Use the user's local timezone for "today" calculations.

Right side (flex, gap: 12px):
- Entity count: DM Sans, 11px, weight-400, `--text-secondary`. Format: "[N] entities".
- Relation count: DM Sans, 11px, weight-400, `--text-secondary`. Format: "[N] relations".

**Row 2 — Summary (margin-bottom: 10px):**
- DM Sans, 13px, weight-400, `--text-body`, line-height: 1.5.
- Source of the summary text: `knowledge_sources.metadata.summary` if it exists (some extraction sessions store a summary in the metadata JSONB). If no summary exists, use the first 200 characters of `knowledge_sources.content` with "..." appended.
- Max 3 lines with CSS line-clamp (`display: -webkit-box`, `-webkit-line-clamp: 3`, `overflow: hidden`).

**Row 3 — Entity badges (margin-bottom: 0, or margin-bottom: 10px if cross-connections exist):**
- Flex row, flex-wrap, gap: 5px.
- Each badge uses the entity badge component from the design system (and from PRD 4): entity-colored dot (5px) + label text. Background: entity color at 6% opacity. Border: entity color at 16% opacity. Color: entity type color. DM Sans, 10px, weight-600, padding: `2px 8px`, border-radius: 6px.
- Badges are **clickable**. On click (with `stopPropagation` to prevent the card click): set `rightPanelContent` to `{ type: 'node', data: node }` to show NodeDetail in the right panel. This requires the badge to carry a reference to the full node data (or at minimum the node ID, with the right panel fetching the rest).
- Show up to 6 badges. If more entities exist, show a "+N more" indicator in `--text-secondary` at 10px after the badges.

**Row 4 — Cross-connections (conditional, only if cross-connections exist for this source):**
- Separated from badges by a subtle divider: `border-top: 1px solid` `--border-subtle`, margin-top: 10px, padding-top: 8px.
- Section label: "CROSS-CONNECTIONS" — uppercase, Cabinet Grotesk, 10px, weight-700, letter-spacing: 0.08em, `--text-secondary`. Margin-bottom: 4px.
- Each cross-connection rendered as a single line:
  - Format: `[Entity A label] → [relation_type] → [Entity B label]`
  - Entity labels: DM Sans, 11px, weight-500, `--accent-500` color. Clickable (opens node detail).
  - Arrow and relation type: DM Sans, 10px, weight-400, `--text-secondary`. The "→" uses the literal arrow character.
  - Margin-bottom: 2px between lines.
- Show up to 3 cross-connections per card. If more exist, show a "View all N" ghost-style link in `--accent-500`, 10px, weight-600.

**Card click behavior:**
- Clicking the card body (not a badge or cross-connection link) opens `SourceDetail` in the right panel by calling `setRightPanelContent({ type: 'source', data: sourceData })`.

### Briefings Tab

**Briefing cards:**

Each card represents a `digest_profile`.

- **Container:** Standard Card component. Padding: `14px 18px`. Margin-bottom: 8px. Hover: standard card hover.
- **Header row (flex, space-between, align-start, margin-bottom: 8px):**
  - Left side (flex, align-center, gap: 10px):
    - Status icon container: 32×32px, border-radius: 8px.
      - "ready" status: background `--e-goal` (#e11d48) at 10% opacity. Bot icon (Lucide `Bot`, 16px) in `--e-goal` color.
      - "scheduled" status: background `--bg-inset` (#f0f0f0). Bot icon in `--text-secondary`.
    - Title block:
      - Title: DM Sans, 14px, weight-600, `--text-primary`.
      - Metadata: DM Sans, 11px, weight-400, `--text-secondary`. Format: "[next scheduled time] · [frequency]".
  - Right side:
    - Status badge: DM Sans, 10px, weight-700, uppercase, padding: `3px 10px`, border-radius: 20px.
      - "ready": background `--e-goal` at 10% opacity, border `--e-goal` at 20% opacity, text `--e-goal`.
      - "scheduled": background `--bg-inset`, border `--border-subtle`, text `--text-secondary`.

**Module tags row:**
- Flex row, flex-wrap, gap: 4px.
- Each module tag: DM Sans, 10px, weight-400, `--text-secondary`. Background: `--bg-inset`. Padding: `2px 7px`, border-radius: 4px.
- Module names come from `digest_modules` joined to the profile, ordered by `sort_order`.

**Preview text (only for "ready" status):**
- DM Sans, 12px, weight-400, `--text-body`, line-height: 1.4. Margin-top: 8px.
- This would come from a pre-generated preview stored in the digest profile metadata. For now, this is placeholder text — the Orientation Engine (PRD 13) will generate real previews.

**"Configure New Digest" button:**
- Below all briefing cards.
- Styled as a dashed-border container: `border: 2px dashed` `--border-default`, border-radius: 12px, padding: `16px 24px`, text-align: center. Cursor: pointer.
- Plus icon (Lucide `Plus`, 20px, `--text-secondary`) centered above text.
- Text: "Configure New Digest" — DM Sans, 13px, weight-500, `--text-secondary`.
- On click: opens the Settings modal to the Digests tab. (This wiring exists via `SettingsContext` or a global modal state from PRD 2.)

**Briefings empty state (no digest profiles exist):**
- Centered within the briefings tab area.
- Icon: Lucide `Calendar` at 32px, `--text-placeholder` (#aaaaaa). Margin-bottom: 12px.
- Heading: "Intelligence Briefings" — DM Sans, 14px, weight-600, `--text-body`. Margin-bottom: 4px.
- Body: "Set up automated digests that synthesize your knowledge graph into actionable briefings." — DM Sans, 13px, weight-400, `--text-secondary`. Max-width: 320px centered.
- "Configure" button below: tertiary style (`--bg-inset` background, `--text-body` text, `--border-default` border, 8px radius). Margin-top: 16px. On click: opens Settings → Digests tab.

### Feed Empty State (No Sources Exist)

- Centered within the feed tab area.
- Icon: Lucide `Inbox` at 32px, `--text-placeholder`. Margin-bottom: 12px.
- Heading: "Your activity feed will appear here" — DM Sans, 14px, weight-600, `--text-body`. Margin-bottom: 4px.
- Body: "Sources you ingest will show up as cards with their extracted entities and relationships." — DM Sans, 13px, weight-400, `--text-secondary`. Max-width: 360px centered.
- "Go to Ingest" button: tertiary style. On click: navigate to `/ingest`.

### SourceDetail Right Panel Component

If not already built in PRD 5, this component renders in the right panel when a feed card or source graph node is clicked.

- **Header section:**
  - Source type icon container: 28×28px, border-radius: 7px, source type color at 7% opacity background. Source type emoji at 12px.
  - Source title: Cabinet Grotesk, 14px, weight-700, `--text-primary`. Adjacent to the icon, not below.
  - Metadata row: DM Sans, 11px, weight-400, `--text-secondary`. Format: "[Source type] · [relative timestamp]".

- **Summary section:**
  - If the source has content or a metadata summary, show a preview. DM Sans, 13px, weight-400, `--text-body`, line-height: 1.5. Max 6 lines with line-clamp.

- **Extracted Entities section:**
  - Section label: "EXTRACTED ENTITIES" — uppercase, Cabinet Grotesk, 10px, weight-700, letter-spacing: 0.08em, `--text-secondary`. Margin-top: 16px. Margin-bottom: 8px.
  - Entity badges in flex-wrap layout, gap: 5px. Same badge styling as feed cards. Each badge clickable — switches the right panel to NodeDetail for that entity.
  - Show count: "(N entities)" after the section label in `--text-secondary`, 10px, weight-400.

- **Cross-Connections section (conditional):**
  - Same styling as on feed cards — section label, individual connection lines with clickable entity names in accent color.

- **"Re-extract" button:**
  - Tertiary button style. Full width. Margin-top: 20px.
  - Label: "Re-extract" with a Refresh icon (Lucide `RefreshCw`, 12px) inline.
  - This button is a **placeholder** — it does nothing in PRD 6. It becomes functional in PRD 7 when the extraction pipeline is built. Disabled state at 50% opacity with a tooltip: "Available after extraction pipeline is built".

---

## 4. Data & Service Layer

### Daily Stats Hook (`hooks/useDailyStats.ts`)

```typescript
function useDailyStats(): {
  stats: DailyStats | null;
  loading: boolean;
}
```

**`DailyStats` type:**
```typescript
interface DailyStats {
  sourcesProcessed: number;
  newEntities: number;
  relationshipsDiscovered: number;
}
```

**Queries (all scoped to `auth.uid()` via RLS):**

Sources processed today:
```sql
SELECT COUNT(*) FROM knowledge_sources
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

New entities today:
```sql
SELECT COUNT(*) FROM knowledge_nodes
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

Relationships discovered today:
```sql
SELECT COUNT(*) FROM knowledge_edges
WHERE created_at >= NOW() - INTERVAL '24 hours'
```

These three queries run in parallel via `Promise.all`. The "24 hours" window is relative to the current moment, not midnight — this avoids timezone complexity and ensures the user always sees a meaningful count.

### Activity Feed Hook (`hooks/useActivityFeed.ts`)

```typescript
function useActivityFeed(limit?: number): {
  items: FeedItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
}
```

Default limit: 10. `loadMore` fetches the next page using cursor-based pagination (offset by the last item's `created_at`).

**`FeedItem` type:**
```typescript
interface FeedItem {
  id: string;                    // knowledge_sources.id
  title: string;
  sourceType: string;            // Meeting, YouTube, etc.
  sourceUrl: string | null;
  summary: string | null;        // metadata.summary or content preview
  entityCount: number;
  relationCount: number;
  createdAt: string;
  entities: FeedEntityBadge[];   // top entities extracted from this source
  crossConnections: CrossConnection[];
}

interface FeedEntityBadge {
  id: string;                    // knowledge_nodes.id
  label: string;
  entityType: string;
}

interface CrossConnection {
  id: string;                    // knowledge_edges.id
  fromNodeId: string;
  fromLabel: string;
  fromEntityType: string;
  toNodeId: string;
  toLabel: string;
  toEntityType: string;
  relationType: string;
}
```

**Data assembly (in `services/feedQueries.ts`):**

**Step 1 — Fetch recent sources with entity counts:**
```typescript
const { data: sources } = await supabase
  .from('knowledge_sources')
  .select('id, title, source_type, source_url, content, metadata, created_at')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

**Step 2 — For each source, fetch its entity badges:**
```typescript
// Fetch top entities for this source, ordered by confidence
const { data: entities } = await supabase
  .from('knowledge_nodes')
  .select('id, label, entity_type, confidence')
  .eq('source_id', sourceId)
  .order('confidence', { ascending: false, nullsFirst: false })
  .limit(6);
```

**Optimization:** Batch this for all sources in the current page. Fetch all nodes where `source_id IN (sourceIds)`, then group client-side.

```typescript
const sourceIds = sources.map(s => s.id);
const { data: allEntities } = await supabase
  .from('knowledge_nodes')
  .select('id, label, entity_type, confidence, source_id')
  .in('source_id', sourceIds)
  .order('confidence', { ascending: false, nullsFirst: false });

// Group by source_id, take top 6 per source
const entitiesBySource = groupBy(allEntities, 'source_id');
```

**Step 3 — For each source, fetch cross-connections:**

This is the non-trivial query. A cross-connection is an edge where:
- `source_node_id` belongs to this source (node has `source_id = thisSourceId`), AND
- `target_node_id` belongs to a **different** source (node has `source_id != thisSourceId` or `source_id IS NULL`)
- OR the reverse direction.

```typescript
async function fetchCrossConnectionsForSource(
  sourceId: string,
  userId: string,
  limit: number = 3
): Promise<CrossConnection[]> {
  // 1. Get node IDs that belong to this source
  const { data: sourceNodes } = await supabase
    .from('knowledge_nodes')
    .select('id')
    .eq('source_id', sourceId);

  if (!sourceNodes?.length) return [];

  const sourceNodeIds = sourceNodes.map(n => n.id);

  // 2. Find edges where one side is in sourceNodeIds
  const { data: edges } = await supabase
    .from('knowledge_edges')
    .select(`
      id,
      source_node_id,
      target_node_id,
      relation_type
    `)
    .or(
      `source_node_id.in.(${sourceNodeIds.join(',')}),target_node_id.in.(${sourceNodeIds.join(',')})`
    )
    .limit(50); // Fetch more than needed, then filter

  if (!edges?.length) return [];

  // 3. For each edge, check if the OTHER node belongs to a different source
  const otherNodeIds = edges.map(e =>
    sourceNodeIds.includes(e.source_node_id) ? e.target_node_id : e.source_node_id
  ).filter(id => !sourceNodeIds.includes(id));

  if (!otherNodeIds.length) return [];

  const { data: otherNodes } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, source_id')
    .in('id', [...new Set(otherNodeIds)]);

  // 4. Cross-connections = edges where the other node has a different source_id
  const otherNodeMap = new Map(otherNodes?.map(n => [n.id, n]) || []);
  const sourceNodeMap = new Map(
    (await supabase
      .from('knowledge_nodes')
      .select('id, label, entity_type')
      .in('id', sourceNodeIds)
    ).data?.map(n => [n.id, n]) || []
  );

  const crossConns: CrossConnection[] = [];

  for (const edge of edges) {
    const fromId = edge.source_node_id;
    const toId = edge.target_node_id;
    const isFromInSource = sourceNodeIds.includes(fromId);
    const localId = isFromInSource ? fromId : toId;
    const otherId = isFromInSource ? toId : fromId;
    const otherNode = otherNodeMap.get(otherId);
    const localNode = sourceNodeMap.get(localId);

    if (otherNode && otherNode.source_id && otherNode.source_id !== sourceId && localNode) {
      crossConns.push({
        id: edge.id,
        fromNodeId: localId,
        fromLabel: localNode.label,
        fromEntityType: localNode.entity_type,
        toNodeId: otherId,
        toLabel: otherNode.label,
        toEntityType: otherNode.entity_type,
        relationType: edge.relation_type || 'relates_to',
      });
    }
    if (crossConns.length >= limit) break;
  }

  return crossConns;
}
```

**Batch optimization for the feed:** Rather than calling `fetchCrossConnectionsForSource` per source (which would create N*3 queries for N feed items), pre-fetch all node-to-source mappings for the current page's sources and compute cross-connections in memory.

The recommended approach for the initial implementation:

1. Fetch all sources (Step 1).
2. Batch fetch all entities for those sources (Step 2, already batched).
3. Batch fetch edges where any of those entities are involved.
4. Compute cross-connections client-side by checking `source_id` mismatches.

This results in 3 Supabase queries total regardless of feed page size. For a feed with 10 sources and ~100 entities, this is well within performance bounds.

**Summary text resolution:**
- First check `source.metadata?.summary` (JSONB field).
- If null, use `source.content?.substring(0, 200) + '...'`.
- If both null, return `null` (the feed card will simply not render a summary row).

### Connection Discovery Hook (`hooks/useCrossConnections.ts`)

Used by the `ConnectionDiscoveryCard` to find the most recent meaningful cross-connection.

```typescript
function useRecentCrossConnection(): {
  connection: {
    fromSourceTitle: string;
    toSourceTitle: string;
    entityLabel: string;
    connectedEntityCount: number;
  } | null;
  loading: boolean;
}
```

**Query strategy:** Fetch edges created in the last 48 hours, join to their source nodes to check for `source_id` mismatches, return the one with the highest weight or most connected context. This is essentially the same cross-connection logic as the feed query, but looking at the most recent edge globally rather than per-source.

Simpler approach: if the activity feed is already loaded, derive the connection discovery data from the feed's cross-connections by picking the most recent one. This avoids a separate query.

### Digest Profiles Hook (`hooks/useDigestProfiles.ts`)

```typescript
function useDigestProfiles(): {
  profiles: DigestProfile[];
  loading: boolean;
  error: Error | null;
  tableExists: boolean;
}
```

**Critical: The `digest_profiles` table may not exist yet.** The data model notes: "These tables may not yet exist in the database. The Orientation Engine was spec'd but may need migration. Check before querying."

**Defensive query pattern:**
```typescript
const { data, error } = await supabase
  .from('digest_profiles')
  .select(`
    id, title, frequency, is_active, schedule_time, schedule_timezone, density, created_at,
    digest_modules ( id, template_id, sort_order, is_active )
  `)
  .order('created_at', { ascending: false });

if (error) {
  // Check if the error is a "relation does not exist" PostgreSQL error
  if (error.message?.includes('does not exist') || error.code === '42P01') {
    // Table hasn't been created yet — return empty, no error shown to user
    return { profiles: [], loading: false, error: null, tableExists: false };
  }
  // Genuine error
  return { profiles: [], loading: false, error, tableExists: true };
}
```

**`DigestProfile` type:**
```typescript
interface DigestProfile {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  scheduleTime: string;      // TIME format, e.g., "07:00:00"
  scheduleTimezone: string;
  density: 'brief' | 'standard' | 'comprehensive';
  createdAt: string;
  modules: DigestModule[];
  status: 'ready' | 'scheduled'; // Derived: 'ready' if is_active and schedule time has passed today
}

interface DigestModule {
  id: string;
  templateId: string;
  sortOrder: number;
  isActive: boolean;
}
```

**Deriving "ready" vs. "scheduled" status:** In the absence of a dedicated status column, derive it:
- If the profile is active and the current time is past `schedule_time` in the user's timezone for the appropriate frequency cycle → "ready".
- Otherwise → "scheduled".
- For the initial implementation (before PRD 13 builds the actual generation engine), all active profiles can be shown as "scheduled" unless the build plan specifies otherwise. The "ready" state will become meaningful once digests are actually generated.

---

## 5. Interaction & State

### State Management

| State | Location | Persistence |
|---|---|---|
| `activeTab` ('feed' \| 'briefings') | Local to HomeView | Resets to 'feed' on every mount (Home is the landing page — always start with activity) |
| `discoveryDismissed` | Local to ConnectionDiscoveryCard | Resets on page reload (no persistent tracking) |
| Feed data (`FeedItem[]`) | `useActivityFeed` hook | Refetched on mount. No caching across navigation. |
| Daily stats | `useDailyStats` hook | Refetched on mount. |
| Digest profiles | `useDigestProfiles` hook | Refetched on mount. |
| Right panel content | GraphContext (`rightPanelContent`) | Persists across tab switches within Home. Clears when navigating away from Home. |

### Interaction Flows

**Page load:**
1. `useDailyStats`, `useActivityFeed`, `useRecentCrossConnection` all fire in parallel.
2. Greeting header renders immediately (name from SettingsContext, which loaded on auth).
3. Summary line shows a loading skeleton (two short gray bars) until stats resolve.
4. Feed cards render with staggered fade-up animation once data loads. Each card animates in sequence.
5. Connection discovery card appears (or not) once cross-connection data resolves.
6. If the user navigates back to Home from another view, all data refetches (providing fresh stats).

**Click a feed card body:**
1. `setRightPanelContent({ type: 'source', data: fullSourceData })`.
2. Right panel switches to `SourceDetail`, showing the source's entities, cross-connections, summary, and re-extract button.
3. The clicked card does NOT get a persistent "selected" visual indicator (unlike Browse/Graph where selection is a core interaction). The card's hover state is sufficient feedback.

**Click an entity badge on a feed card:**
1. `event.stopPropagation()` prevents the card body click.
2. Fetch the full node data (or use the data already available if the badge carries it).
3. `setRightPanelContent({ type: 'node', data: nodeData })`.
4. Right panel switches to `NodeDetail` (built in PRD 4).

**Click a cross-connection entity name:**
1. Same as badge click — opens NodeDetail for that entity in the right panel.

**Toggle to Briefings tab:**
1. `setActiveTab('briefings')`.
2. `useDigestProfiles` data is already loaded (fetched on mount, not on tab switch). If still loading, show a minimal skeleton.
3. Briefing cards render. No staggered animation on briefings (they're likely 1–3 items, animation would feel precious).

**Click "Configure New Digest" or the empty state "Configure" button:**
1. Open the Settings modal, pre-navigated to the Digests tab.
2. Implementation: call a function from SettingsContext (e.g., `openSettings('digests')`) or dispatch to the settings modal's state.

**Scroll behavior:**
- The feed is rendered within the center stage's scrollable area. Scroll position resets to top on navigation back to Home.
- No infinite scroll in the initial implementation. Show up to 20 feed items. If more exist, show a "View older sources" ghost button at the bottom that navigates to Explore Browse with a "sort by date" preset.

---

## 6. Forward-Compatible Decisions

| Decision | Rationale | Future PRD |
|---|---|---|
| `FeedCard` is a standalone reusable component | It appears on the Home view and will appear on any future Sources panel or search results. The same component, same data shape. | Future Sources panel, PRD 12 (command palette may show source results) |
| `SourceDetail` right panel component is built here (or verified from PRD 5) | Needed by Home feed cards, the Graph tab's source node clicks, and the Automate queue item detail. | PRD 5 (Graph), PRD 10 (Automate), PRD 7 (Ingest History) |
| `fetchCrossConnectionsForSource()` is a utility in `services/supabase.ts` | Cross-connection computation is non-trivial and needed by feed cards, source detail, and the graph's edge computation. Single implementation prevents drift. | PRD 5 (Graph edge computation), PRD 7 (extraction summary), PRD 8 (RAG context) |
| Activity feed uses cursor-based pagination (not offset) | Cursor pagination remains stable when new sources are added (offset would shift). Uses `created_at` of the last item as the cursor. | Infinite scroll in future polish pass |
| `useDailyStats` uses 24-hour rolling window, not calendar day | Avoids timezone edge cases where "today" could mean different things depending on server vs. client timezone. The stat line says "today" but the query is "last 24h" — close enough to be meaningful, simple enough to be correct. | No dependency — this is the final pattern |
| Digest profiles are queried defensively with table-existence check | The `digest_profiles` table may not be migrated yet. The Home view must not crash if it's absent. The hook returns `tableExists: false` so the Briefings tab can show the empty state rather than an error. | PRD 13 (Orientation Engine migrates and populates digest tables) |
| Connection discovery card uses Insight entity color, not accent | Keeping it in the entity type color family (`--e-insight` = `#7c3aed`) distinguishes it from primary actions (which use accent/blood orange). The card is informational, not actionable. | Consistent with design system's color hierarchy |

---

## 7. Edge Cases & Error Handling

### Empty Database (New User)

- Greeting shows the user's name (or "there" fallback). Summary line: "No activity yet today — ready when you are."
- Connection discovery card: not rendered (no cross-connections exist).
- Toggle group still renders. Feed tab selected by default.
- Feed tab shows the empty state with the "Go to Ingest" button.
- Briefings tab shows the briefings empty state.

### Sources Exist But No Entities Extracted

This can happen if sources were saved but extraction hasn't run yet (e.g., from a YouTube queue with pending status).

- Feed cards render with source title and timestamp, but entity count shows "0 entities" and no badges appear.
- Cross-connections section does not render (no entities = no edges = no cross-connections).
- Summary text may still be available from the source content.
- This is a valid state, not an error.

### User Profile Has No Name

- The greeting falls back through the chain: profile name → auth metadata → email prefix → "there".
- The mockup shows "Good evening, Joseph" — the most common case for existing users with profiles.
- For new users who haven't filled out their profile: "Good evening, there" (grammatically fine and non-jarring).

### Network Failure

- `useActivityFeed` returns `{ items: [], error: Error }`.
- Show a centered error message in the feed area: "Failed to load activity feed" in DM Sans, 13px, `--text-body`. Below: a tertiary "Retry" button that calls the hook's refetch.
- Stats line shows "—" placeholders instead of numbers.
- Connection discovery card does not render on error.
- Briefings tab shows its own error state independently (the two tabs fail independently).

### Digest Table Doesn't Exist

- `useDigestProfiles` returns `{ profiles: [], tableExists: false }`.
- Briefings tab shows the empty state, not an error. The user has no way to know the table doesn't exist — they just see "Set up automated digests."
- No console error logged (this is an expected state, not a failure).

### Very Long Source Titles

- Feed card title is single-line with `text-overflow: ellipsis`, `overflow: hidden`, `white-space: nowrap`. The title cell has a max-width constrained by the card width minus the icon and metadata.
- SourceDetail title in the right panel can wrap to 2 lines (the right panel is 310px wide — titles longer than ~35 characters will wrap).

### Many Feed Items (50+ Sources)

- Initial load fetches 20 items. No pagination controls shown unless there are more.
- The "View older sources" button appears at the bottom if `hasMore` is true.
- Feed items are rendered as a flat list (no virtualization needed at 20 items). If future requirements increase the feed to 100+ visible items, add `react-window` or similar virtualization.

### Timezone Edge Cases

- The greeting uses `new Date().getHours()` from the user's browser, which automatically uses their local timezone. No server-side timezone conversion needed.
- The "24 hours" stat window uses PostgreSQL's `NOW() - INTERVAL '24 hours'`, which is UTC-based on the server. This means a user in UTC-8 might see slightly different counts than expected around midnight. This discrepancy is acceptable — the stat is approximate ("today" is a fuzzy concept) and the rolling window avoids the hard cutoff problem entirely.

### Stale Data After Ingestion

- If the user ingests a new source (PRD 7) and navigates back to Home, the feed refetches on mount and the new source appears at the top.
- The daily stats also refetch, so the counts update.
- There is no real-time subscription in PRD 6. If the user leaves Home open and ingests via another tab, they won't see the update until they navigate away and back. Real-time updates (via Supabase channels) are a future enhancement.

---

## 8. Acceptance Criteria

After this PRD is complete, the following must be true:

- [ ] **Personalized greeting renders correctly.** The greeting shows "Good [morning/afternoon/evening], [Name]" with the correct time-of-day based on the user's local timezone and the name from their profile. Fallback to email prefix or "there" works when no name is set.
- [ ] **Summary stats are accurate.** The line below the greeting shows correct counts of sources, entities, and relationships created in the last 24 hours. Zero counts show "No activity yet today — ready when you are."
- [ ] **Connection discovery card appears when relevant.** If cross-connections were created in the last 48 hours, an insight card appears with a natural language description. The card can be dismissed via the × button and stays dismissed for the session.
- [ ] **Activity feed shows real processed sources.** Feed cards display with source type icon, title, timestamp, entity/relation counts, summary text, entity badges, and cross-connections. Cards are ordered by most recent first.
- [ ] **Feed cards have staggered fade-up animation.** Cards animate in sequentially on page load (0.05s delay increment, 0.4s duration). Animation is smooth and measured.
- [ ] **Entity badges are clickable.** Clicking a badge on a feed card opens NodeDetail in the right panel for that entity. The card body click is not triggered (stopPropagation works).
- [ ] **Feed card body click opens SourceDetail.** Clicking the card body (not a badge) opens SourceDetail in the right panel showing source metadata, extracted entities, cross-connections, and the "Re-extract" placeholder button.
- [ ] **Cross-connection entity names are clickable.** Clicking an entity name in the cross-connections section opens NodeDetail for that entity.
- [ ] **Toggle between Feed and Briefings works.** The toggle group switches tabs. Active tab has white background with shadow, inactive is transparent.
- [ ] **Briefings tab shows digest profiles if they exist.** Each profile card shows status, title, schedule, frequency, and module tags.
- [ ] **Briefings tab handles missing table gracefully.** If `digest_profiles` doesn't exist, the briefings tab shows the empty state, not an error.
- [ ] **Briefings empty state is helpful.** Shows the Calendar icon, explains what briefings are, and has a "Configure" button that opens Settings → Digests.
- [ ] **Feed empty state is helpful.** New user with no sources sees the Inbox icon, an explanation, and a "Go to Ingest" button.
- [ ] **Design system compliance.** All typography, colors, spacing, borders, and interactions match the design system tokens exactly. No inline colors, no arbitrary values.
- [ ] **Content max-width is 840px, centered.** The Home view content doesn't stretch beyond this width on wide screens.
- [ ] **Responsive at 1280px, 1440px, and 1920px.** The layout looks correct at all three target widths. Content remains centered, cards fill the available width within the 840px constraint, and the right panel doesn't overlap.
