```markdown
## Feature Name: Command Palette — Full Search

### Overview
Upgrade the existing command palette (⌘K) from navigation-only to a full knowledge graph search interface with real-time debounced node search, categorized results (Anchors → Recent → Search Results → Navigation), entity type indicators, and node selection that navigates to Explore Browse with the node's detail panel open.

### User Value
- **Who benefits**: All users navigating a growing knowledge graph (847+ nodes)
- **Problem solved**: Finding a specific entity currently requires navigating to Explore Browse, typing in the search bar, and scanning results. The command palette provides instant, keyboard-driven access from anywhere in the app
- **Expected outcome**: Users find any node in under 3 seconds via ⌘K → type → ↵, without leaving their current context. Anchors are always one keystroke away. Recently viewed nodes surface without searching

### Context for AI Coding Agent

**Existing Codebase Patterns:**
- **Command palette component**: Built in PRD 2 as `components/shared/CommandPalette.tsx` (or inline in the App shell). Currently shows only navigation items (Go to Home, Go to Explore, etc.) with keyboard navigation (↑↓ ↵ Esc). The PRD 2 forward-compatible decision states: "The command palette should be built as a composable component that can accept different item sources."
- **Node search hook**: PRD 4 built `useNodes({ filters, search, pagination })` in `hooks/useNodes.ts` — this hook encapsulates Supabase query logic for searching `knowledge_nodes` by label. Reuse this hook or its underlying query function for the command palette search.
- **Anchor fetching**: `SettingsContext` loads anchors on mount from `knowledge_nodes WHERE is_anchor = true`. Use this context data — do not re-fetch.
- **Entity badge/dot component**: `components/shared/EntityBadge.tsx` or `components/ui/Badge.tsx` built in PRD 4 with colored dots per entity type. Reuse for search results.
- **Entity type colors**: `config/entityTypes.ts` maps entity types to hex colors. The design system defines CSS variables `--e-person`, `--e-topic`, etc.
- **GraphContext**: Manages `selectedNode` and `rightPanelContent`. Selecting a node in the command palette should update this context.
- **Router**: `react-router-dom` v6. Navigation to Explore Browse uses `useNavigate()` with the `/explore` path.
- **Mockup reference**: `docs/synapse-v2-mockup.html` contains the `CmdPalette` component showing the exact visual layout — categories as uppercase labels, items with entity dots, type badges, keyboard hints in footer.

**Files to Modify:**
- [ ] `components/shared/CommandPalette.tsx` — Major upgrade: add search input state, debounced Supabase query, result categorization, recent nodes tracking
- [ ] `hooks/useRecentNodes.ts` — NEW: Custom hook to track and persist recently viewed nodes (last 5)
- [ ] `services/supabase.ts` — Add `searchNodesByLabel(query, limit)` if not already present from PRD 4's `useNodes` hook
- [ ] `app/providers/GraphProvider.tsx` — Ensure `setSelectedNode` triggers recent nodes tracking

**Dependencies Already Available:**
- `react-router-dom` v6 — `useNavigate()`
- `lucide-react` — `Search`, `Clock`, `Compass`, `ArrowRight` icons
- Tailwind CSS 4 with design system tokens
- `SettingsContext` with anchor data
- `GraphContext` with `selectedNode` and `rightPanelContent`

### Technical Scope

**Affected Components:**
- [ ] Data ingestion layer — no changes
- [ ] Entity extraction — no changes
- [ ] Graph database schema — no changes (read-only queries)
- [ ] Visualization — no changes
- [x] UI/UX — command palette upgrade, recent nodes tracking
- [ ] Graph RAG querying — no changes

**Dependencies (PRDs that must be complete):**
- PRD 2 (App Shell + Navigation) — base command palette structure, keyboard navigation, ⌘K trigger
- PRD 4 (Explore: Browse Tab) — `useNodes` hook, `EntityBadge` component, Node Detail right panel

---

### Functional Requirements

#### 1. Search Input & Debounced Query

- **FR-1.1**: The command palette search input is always focused on open. Typing triggers a debounced search after 250ms of inactivity. Empty input shows default categories (Anchors + Recent + Navigation).
- **FR-1.2**: Search queries `knowledge_nodes` by `label` using case-insensitive `ilike` matching: `.ilike('label', '%${query}%')`. Limit to 15 results. Order by relevance: anchors first (WHERE `is_anchor = true`), then by `created_at DESC`.
- **FR-1.3**: While a search is in flight, show a subtle loading indicator (a small spinner or pulsing dot in the search input area). Do not clear previous results until new results arrive (prevents flash of empty state).
- **FR-1.4**: If search returns zero results, show a friendly empty state: "No nodes found for '{query}'" in `--text-secondary`, centered in the results area. Navigation items remain visible below.

#### 2. Result Categorization

Results are grouped into sections, displayed in this order:

- **FR-2.1**: **Anchors** — Always shown when input is empty. When searching, filtered to anchors matching the query. Source: `SettingsContext.anchors` (already loaded, no additional query needed). Section label: "ANCHORS" in uppercase 10px `--text-secondary` with `⚓` prefix.
- **FR-2.2**: **Recent Nodes** — Shown when input is empty OR when a recent node matches the search query. Displays the last 5 unique nodes the user has viewed (via click in Browse, Graph, or previous command palette selection). Section label: "RECENT" with `Clock` icon prefix.
- **FR-2.3**: **Search Results** — Shown only when the user has typed a query. Contains matching nodes that are NOT anchors and NOT in the recent list (to avoid duplicates across sections). Section label: "NODES" with node count badge.
- **FR-2.4**: **Navigation** — Always shown at the bottom. Static items: Go to Home, Go to Explore, Open Ask, Quick Capture, Open Settings. Section label: "NAVIGATION" with `Compass` icon prefix.

#### 3. Result Item Rendering

- **FR-3.1**: Each node result item displays: entity type colored dot (5px circle), node label (DM Sans 13px weight-500), entity type text badge (DM Sans 10px `--text-secondary` aligned right).
- **FR-3.2**: Navigation items display: a Lucide icon (matching the nav rail icon for that view), label text, optional keyboard shortcut hint on the right.
- **FR-3.3**: The active/highlighted item (controlled by keyboard ↑↓ or mouse hover) gets `--bg-hover` background with 8px border-radius. Active index resets to 0 when search results change.
- **FR-3.4**: When hovering or using keyboard to highlight a node item, show a subtle right arrow (`ArrowRight` icon, 12px, `--text-placeholder`) on the right side as a visual affordance.

#### 4. Selection Behavior

- **FR-4.1**: **Selecting a node** (↵ or click):
  1. Close the command palette
  2. Navigate to `/explore` (Explore view, Browse tab)
  3. Set `GraphContext.selectedNode` to the selected node
  4. Set `GraphContext.rightPanelContent` to `{ type: 'node', data: selectedNode }`
  5. Add the node to the recent nodes list
- **FR-4.2**: **Selecting a navigation item** (↵ or click): Close the palette and navigate to the corresponding route (same behavior as current PRD 2 implementation).
- **FR-4.3**: **Escape or clicking overlay**: Close the palette, clear search input. No navigation occurs.

#### 5. Recent Nodes Tracking

- **FR-5.1**: Maintain a list of the last 5 unique nodes viewed by the user. "Viewed" means: selected via command palette, clicked in Browse table/cards, clicked in Graph view, or clicked via citation in Ask view.
- **FR-5.2**: Store recent nodes in React state (session-scoped) via a `useRecentNodes` hook. The hook exposes `recentNodes: KnowledgeNode[]` and `addRecentNode(node: KnowledgeNode)`.
- **FR-5.3**: Deduplication: if a node is already in the recent list, move it to the front (most recent position) rather than adding a duplicate.
- **FR-5.4**: Recent nodes persist for the browser session only (React state). They reset on page refresh. Future work may persist to localStorage or Supabase — design the hook to make this swap easy.

#### 6. Keyboard Navigation

- **FR-6.1**: Preserve existing keyboard behavior from PRD 2: `↑`/`↓` to move highlight through all visible items (flattened across categories), `↵` to select, `Esc` to close, `⌘K` to toggle.
- **FR-6.2**: Keyboard navigation wraps around: pressing `↓` on the last item moves to the first, pressing `↑` on the first moves to the last.
- **FR-6.3**: Category headers are not selectable — keyboard navigation skips them.
- **FR-6.4**: When typing in the search input, keyboard `↑`/`↓` does not move the cursor within the input — it moves the highlight. The input always retains focus for typing.

---

### Implementation Guide for AI Agent

#### Step 1: Add search query function to `services/supabase.ts`

If PRD 4's `useNodes` hook already includes a label search function, reuse it. Otherwise, add:

```typescript
// services/supabase.ts

export async function searchNodesByLabel(
  query: string,
  limit: number = 15
): Promise<KnowledgeNode[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, is_anchor, confidence, source, source_type, created_at')
    .ilike('label', `%${query}%`)
    .order('is_anchor', { ascending: false, nullsFirst: false }) // Anchors first
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Command palette search failed:', error);
    return [];
  }
  return data || [];
}
```

**Note**: The `is_anchor` ordering puts anchor matches at the top of results. The `nullsFirst: false` ensures `true` values sort before `false`/`null`.

#### Step 2: Create `hooks/useRecentNodes.ts`

```typescript
// hooks/useRecentNodes.ts
import { useState, useCallback } from 'react';
import type { KnowledgeNode } from '../types/database';

const MAX_RECENT = 5;

export function useRecentNodes() {
  const [recentNodes, setRecentNodes] = useState<KnowledgeNode[]>([]);

  const addRecentNode = useCallback((node: KnowledgeNode) => {
    setRecentNodes(prev => {
      // Remove if already present (dedup)
      const filtered = prev.filter(n => n.id !== node.id);
      // Add to front, trim to max
      return [node, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  return { recentNodes, addRecentNode };
}
```

**Integration point**: This hook should be instantiated at the `GraphProvider` level (or a new `RecentNodesProvider`) so that `addRecentNode` can be called from Browse, Graph, Ask, and the command palette. Expose it via context.

#### Step 3: Upgrade `CommandPalette.tsx`

This is the main implementation. Replace or heavily modify the existing component.

**Component structure:**

```typescript
// components/shared/CommandPalette.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Compass, ArrowRight, Home, LayoutGrid, MessageSquare, PenTool, Settings } from 'lucide-react';
import { useSettings } from '../../app/providers/SettingsProvider';
import { useGraph } from '../../app/providers/GraphProvider';
import { useRecentNodes } from '../../hooks/useRecentNodes';
import { searchNodesByLabel } from '../../services/supabase';
import type { KnowledgeNode } from '../../types/database';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

// Entity type color map (import from config/entityTypes.ts)
// Or use the CSS variables: var(--e-person), var(--e-topic), etc.

interface PaletteItem {
  id: string;
  label: string;
  type: 'node' | 'navigation';
  entityType?: string;    // For nodes
  isAnchor?: boolean;     // For nodes
  icon?: React.ElementType; // For navigation
  action: () => void;
}

interface PaletteSection {
  key: string;
  label: string;
  icon?: React.ElementType;
  items: PaletteItem[];
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { anchors } = useSettings();
  const { setSelectedNode, setRightPanelContent } = useGraph();
  const { recentNodes, addRecentNode } = useRecentNodes();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setActiveIndex(0);
      // Small delay to ensure modal is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchNodesByLabel(query.trim(), 15);
      setSearchResults(results);
      setIsSearching(false);
      setActiveIndex(0);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Build sections
  const sections: PaletteSection[] = useMemo(() => {
    const result: PaletteSection[] = [];
    const trimmedQuery = query.trim().toLowerCase();

    // Helper: select a node
    const selectNode = (node: KnowledgeNode) => () => {
      onClose();
      addRecentNode(node);
      setSelectedNode(node);
      setRightPanelContent({ type: 'node', data: node });
      navigate('/explore');
    };

    // 1. ANCHORS
    const anchorItems = (trimmedQuery
      ? anchors.filter(a => a.label.toLowerCase().includes(trimmedQuery))
      : anchors
    ).map(a => ({
      id: `anchor-${a.id}`,
      label: a.label,
      type: 'node' as const,
      entityType: a.entity_type,
      isAnchor: true,
      action: selectNode(a as KnowledgeNode),
    }));

    if (anchorItems.length > 0) {
      result.push({ key: 'anchors', label: 'Anchors', items: anchorItems });
    }

    // 2. RECENT (only when no query, or if recent nodes match)
    const anchorIds = new Set(anchors.map(a => a.id));
    const recentItems = (trimmedQuery
      ? recentNodes.filter(n => n.label.toLowerCase().includes(trimmedQuery))
      : recentNodes
    )
      .filter(n => !anchorIds.has(n.id)) // Don't duplicate anchors
      .map(n => ({
        id: `recent-${n.id}`,
        label: n.label,
        type: 'node' as const,
        entityType: n.entity_type,
        action: selectNode(n),
      }));

    if (recentItems.length > 0) {
      result.push({ key: 'recent', label: 'Recent', items: recentItems });
    }

    // 3. SEARCH RESULTS (only when query is active)
    if (trimmedQuery && searchResults.length > 0) {
      const shownIds = new Set([
        ...anchorItems.map(i => i.id.replace('anchor-', '')),
        ...recentItems.map(i => i.id.replace('recent-', '')),
      ]);

      const nodeItems = searchResults
        .filter(n => !shownIds.has(n.id))
        .map(n => ({
          id: `node-${n.id}`,
          label: n.label,
          type: 'node' as const,
          entityType: n.entity_type,
          isAnchor: n.is_anchor ?? false,
          action: selectNode(n),
        }));

      if (nodeItems.length > 0) {
        result.push({ key: 'nodes', label: `Nodes (${nodeItems.length})`, items: nodeItems });
      }
    }

    // 4. NAVIGATION (always)
    result.push({
      key: 'navigation',
      label: 'Navigation',
      items: [
        { id: 'nav-home', label: 'Go to Home', type: 'navigation', icon: Home, action: () => { onClose(); navigate('/'); } },
        { id: 'nav-explore', label: 'Go to Explore', type: 'navigation', icon: LayoutGrid, action: () => { onClose(); navigate('/explore'); } },
        { id: 'nav-ask', label: 'Open Ask', type: 'navigation', icon: MessageSquare, action: () => { onClose(); navigate('/ask'); } },
        { id: 'nav-ingest', label: 'Quick Capture', type: 'navigation', icon: PenTool, action: () => { onClose(); navigate('/ingest'); } },
        { id: 'nav-settings', label: 'Open Settings', type: 'navigation', icon: Settings, action: () => { onClose(); /* trigger settings modal */ } },
      ],
    });

    return result;
  }, [query, anchors, recentNodes, searchResults, onClose, navigate, addRecentNode, setSelectedNode, setRightPanelContent]);

  // Flatten items for keyboard navigation
  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % allItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + allItems.length) % allItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        allItems[activeIndex]?.action();
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [allItems, activeIndex, onClose]);

  if (!isOpen) return null;

  // Render... (see UI spec below)
}
```

#### Step 4: Style the component per design system

**Outer overlay:**
```
position: fixed, inset: 0, z-index: 9999
background: rgba(0, 0, 0, 0.6)
backdrop-filter: blur(8px)
display: flex, align-items: flex-start, justify-content: center
padding-top: 100px
```
Click on overlay (not inner container) → `onClose()`

**Inner container:**
```
width: 520px
background: var(--bg-card) (#ffffff)
border: 1px solid var(--border-strong)
border-radius: 16px
overflow: hidden
box-shadow: 0 25px 60px rgba(0,0,0,0.15)
```

**Search input bar:**
```
padding: 14px 18px
border-bottom: 1px solid var(--border-subtle)
display: flex, align-items: center, gap: 10px
```
- Search icon: 15px, `--text-secondary`
- Input: flex 1, transparent background, no border, DM Sans 14px, `--text-primary`
- Placeholder: "Search nodes, navigate, capture..."
- Loading indicator: small 12px spinner or pulsing dot, only visible when `isSearching`
- ESC kbd badge: `padding: 2px 6px`, `border-radius: 4px`, `--bg-inset` background, `--text-secondary`, 10px font, `1px solid var(--border-subtle)`

**Results area:**
```
max-height: 340px
overflow-y: auto
padding: 6px
```

**Section header:**
```
padding: 8px 12px 4px
font-size: 10px
font-weight: 700
color: var(--text-secondary)
text-transform: uppercase
letter-spacing: 0.08em
font-family: var(--font-display) (Cabinet Grotesk)
```

**Result item:**
```
display: flex, align-items: center, gap: 10px
padding: 7px 12px
border-radius: 8px
cursor: pointer
background: transparent (hover/active: var(--bg-hover))
transition: background 0.1s ease
```
- Entity dot: 7px circle, entity type color (from `config/entityTypes.ts` or CSS variables)
- Label: DM Sans 13px weight-500, `--text-primary`
- Type badge (right side): DM Sans 10px, `--text-secondary`
- Active arrow (right side, only on highlighted item): `ArrowRight` 12px `--text-placeholder`

**Footer:**
```
padding: 8px 16px
border-top: 1px solid var(--border-subtle)
display: flex, gap: 16px
```
- Keyboard hints: DM Sans 10px `--text-secondary`: "↑↓ Navigate", "↵ Select", "⌘K Toggle"

#### Step 5: Wire up recent nodes at the provider level

The `useRecentNodes` hook needs to be accessible from multiple components (CommandPalette, Browse, Graph, Ask). Two options:

**Option A (recommended):** Add `recentNodes` and `addRecentNode` to the existing `GraphContext`:

```typescript
// In GraphProvider.tsx
const { recentNodes, addRecentNode } = useRecentNodes();

// Expose in context value
const value = {
  selectedNode,
  setSelectedNode,
  rightPanelContent,
  setRightPanelContent,
  recentNodes,
  addRecentNode,
  // ... existing fields
};
```

**Option B:** Create a separate `RecentNodesProvider` that wraps alongside `GraphProvider`.

Whichever approach is used, call `addRecentNode(node)` in these locations:
- `CommandPalette.tsx` — when a node is selected
- Browse view — when a row/card is clicked and node detail opens in right panel
- Graph view — when a node is clicked and detail opens
- Ask view — when a citation badge is clicked

#### Step 6: Handle the "Open Settings" navigation item

The command palette's "Open Settings" item needs to trigger the settings modal, which lives in the App shell. Two approaches:

**Option A (recommended):** Pass an `onOpenSettings` callback to `CommandPalette`:
```typescript
<CommandPalette isOpen={cmd} onClose={() => setCmd(false)} onOpenSettings={() => setSettings(true)} />
```

**Option B:** Use a global event or context flag for settings modal state.

---

### UI/UX Specifications — Visual Reference

The mockup's `CmdPalette` component (in `docs/synapse-v2-mockup.html`) shows the exact target design. Key elements to match:

1. **Backdrop**: Dark semi-transparent overlay with blur
2. **Container**: White card, strong border, generous border-radius, appears near top of viewport (not vertically centered)
3. **Input area**: Clean, minimal, search icon + input + ESC badge
4. **Category headers**: Small uppercase labels, very muted
5. **Items**: Generous padding, entity dot + label + type, clean hover state
6. **Footer**: Keyboard shortcut hints

The overall feel should be: fast, clean, keyboard-first. Like Spotlight/Raycast/Linear's command palette.

---

### Performance Considerations

- **Debounce**: 250ms prevents excessive queries while typing. This is fast enough to feel responsive but slow enough to avoid hammering Supabase on every keystroke
- **Anchors from context**: Anchors are already loaded in `SettingsContext` — filtering them client-side is instant, no network call needed
- **Result limit**: Cap at 15 search results. The command palette is for quick access, not exhaustive browsing. Users who need more can navigate to Explore Browse
- **Keyboard navigation performance**: The flattened items array is recomputed via `useMemo` only when sections change, not on every render
- **Scroll into view**: When keyboard-navigating through results, the active item should be scrolled into view if it's outside the visible area. Use `scrollIntoView({ block: 'nearest' })` on the active element

---

### Success Metrics

- [ ] ⌘K opens the command palette from any view
- [ ] Empty state shows Anchors + Recent + Navigation sections
- [ ] Typing a query triggers debounced search after 250ms
- [ ] Search results appear grouped correctly (Anchors matching → Recent matching → Other nodes → Navigation)
- [ ] No duplicate nodes across sections (a node that's both an anchor and recently viewed appears only in Anchors)
- [ ] Selecting a node navigates to `/explore` with node detail in right panel
- [ ] Selecting a navigation item routes correctly
- [ ] ↑↓ keyboard navigation works across all sections, wraps around
- [ ] ↵ selects the highlighted item
- [ ] Esc closes the palette
- [ ] Recent nodes track the last 5 viewed nodes
- [ ] Recent nodes update when viewing nodes from Browse, Graph, Ask, and command palette
- [ ] Search performs well with 847+ nodes (response under 300ms)
- [ ] Loading indicator shows during search
- [ ] Empty search results show friendly message
- [ ] Component matches design system (colors, typography, spacing, radius)

### Edge Cases & Considerations

- **Empty graph (new user)**: No anchors, no recent nodes, no search results. Only Navigation section visible. This should look intentional, not broken
- **Very long node labels**: Truncate with ellipsis at reasonable width (~350px). Don't let labels wrap to multiple lines
- **Special characters in search**: The `ilike` query handles most characters, but if a user types `%` or `_` (SQL wildcards), they'll be interpreted literally by Supabase's parameterized queries. No escaping needed
- **Rapid typing then selecting**: Ensure that selecting an item while a search is in-flight doesn't cause stale navigation. The `action` closure captures the correct node at render time
- **Multiple command palette opens**: Opening ⌘K should always start fresh (empty query, reset active index). Don't persist the previous search state
- **Settings modal conflict**: If the user opens the command palette while Settings is open, close Settings first (or prevent command palette from opening). Avoid stacked modals

### Testing Guidance for AI Agent

- [ ] Open command palette with ⌘K — verify it opens and input is focused
- [ ] Type a known node label — verify results appear after debounce
- [ ] Verify anchors appear at the top of results
- [ ] Navigate with ↑↓ keys — verify highlight moves correctly and wraps
- [ ] Press ↵ on a node — verify navigation to `/explore` and right panel shows node detail
- [ ] Press ↵ on "Go to Home" — verify navigation to `/`
- [ ] Press Esc — verify palette closes
- [ ] Click overlay — verify palette closes
- [ ] Open palette, select a node, open palette again — verify node appears in "Recent"
- [ ] View 6 different nodes — verify only the last 5 appear in Recent
- [ ] Search for a term with zero matches — verify empty state message
- [ ] Test with 847+ nodes — verify search responds within 300ms
- [ ] Verify no visual regressions from PRD 2's palette design

### Out of Scope

- Fuzzy/phonetic search (using exact `ilike` substring matching for now)
- Searching node descriptions (search label only — keeps queries fast and results predictable)
- Search across sources, edges, or other entities (nodes only)
- Persisting recent nodes across sessions (session-scoped React state only)
- Global keyboard shortcuts for specific navigation items (e.g., ⌘1 for Home)
- Inline node preview on hover (users select to see details in right panel)
- Search analytics or query history
```
