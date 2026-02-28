```markdown
## Feature Name: App Shell + Navigation

### Overview
Build the complete three-pane application shell, collapsible nav rail, top bar, contextual right panel, command palette (⌘K), settings modal skeleton, routing to all 5 views with styled placeholders, and the shared context providers that all future views consume. After this PRD, the app looks and navigates like a finished product — views are empty but the structure is complete.

### Prerequisites
- PRD 1 complete: Vite + React + TS project deployed on Vercel with Supabase auth, Tailwind 4 with design tokens, font imports, and AuthProvider working.

### User Value
- **Who benefits**: Every future PRD — this is the shell that all views render inside.
- **Problem solved**: Without the shell, each view PRD must also build layout infrastructure. The shell centralizes layout, navigation, and shared state.
- **Expected outcome**: A deployed app where an authenticated user can navigate between 5 views, open the command palette, open Settings, and see real anchor/recent node data in the right panel.

---

### Context for AI Coding Agent

**Read these documents before starting:**
- `docs/DESIGN-SYSTEM.md` — all visual decisions (colors, typography, spacing, component specs)
- `docs/ARCHITECTURE.md` — project structure, routing, state management, conventions
- `docs/DATA-MODEL.md` — Supabase table schemas (you'll query `knowledge_nodes` and `user_profiles`)
- `docs/BUILD-PLAN.md` — see PRD 2 section for forward-compatible decisions
- `docs/synapse-v2-mockup.html` — the interactive mockup showing exact layout and behavior

**Existing Codebase (from PRD 1):**
- `src/services/supabase.ts` — Supabase client singleton
- `src/app/providers/AuthProvider.tsx` — auth context with user session
- `src/styles/tokens.css` — design system CSS custom properties
- `src/config/entityTypes.ts` — entity type color map
- `src/types/database.ts` — Supabase table row types

**Dependencies already installed:**
- React 18, react-router-dom v6, @supabase/supabase-js v2, lucide-react, Tailwind CSS 4, D3.js v7

---

### Files to Create

```
src/
├── app/
│   ├── App.tsx                          — MODIFY: wrap in providers, add AppShell
│   ├── Router.tsx                       — CREATE: route definitions
│   └── providers/
│       ├── GraphProvider.tsx             — CREATE: selected node, right panel content, filters
│       └── SettingsProvider.tsx          — CREATE: user profile, extraction settings, anchors
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx                 — CREATE: three-pane layout container
│   │   ├── NavRail.tsx                  — CREATE: collapsible navigation sidebar
│   │   ├── TopBar.tsx                   — CREATE: view title + metadata + avatar
│   │   └── RightPanel.tsx               — CREATE: contextual panel with content switching
│   ├── ui/
│   │   ├── Dot.tsx                      — CREATE: entity type color dot
│   │   ├── SectionLabel.tsx             — CREATE: uppercase section header
│   │   └── Kbd.tsx                      — CREATE: keyboard shortcut badge
│   └── modals/
│       ├── CommandPalette.tsx            — CREATE: ⌘K search/navigate modal
│       └── SettingsModal.tsx             — CREATE: settings overlay with tab navigation
├── views/
│   ├── HomeView.tsx                     — CREATE: styled placeholder
│   ├── ExploreView.tsx                  — CREATE: styled placeholder
│   ├── AskView.tsx                      — CREATE: styled placeholder
│   ├── IngestView.tsx                   — CREATE: styled placeholder
│   └── AutomateView.tsx                 — CREATE: styled placeholder
├── hooks/
│   ├── useGraphContext.ts               — CREATE: hook to consume GraphProvider
│   └── useSettings.ts                   — CREATE: hook to consume SettingsProvider
└── types/
    ├── navigation.ts                    — CREATE: nav item types
    └── panels.ts                        — CREATE: right panel content types
```

---

### Type Definitions

Create these types first — they are referenced throughout:

**`src/types/panels.ts`**
```typescript
import type { KnowledgeNode, KnowledgeSource } from './database';

// Discriminated union for right panel content
export type RightPanelContent =
  | { type: 'node'; data: KnowledgeNode }
  | { type: 'source'; data: KnowledgeSource }
  | { type: 'feed'; data: FeedItem }
  | null;

// Feed item type (used by Home view in PRD 6, defined now for type stability)
export interface FeedItem {
  id: string;
  source: string;
  sourceType: string;
  time: string;
  nodeCount: number;
  edgeCount: number;
  summary: string;
  entities: Array<{ label: string; type: string }>;
  crossConnections: Array<{ from: string; to: string; relation: string }>;
}
```

**`src/types/navigation.ts`**
```typescript
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string; // Lucide icon name
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  type: string;
  category: 'Anchors' | 'Nodes' | 'Navigation';
  action: () => void;
}
```

---

### Implementation Guide — Step by Step

#### Step 1: Router Setup

**`src/app/Router.tsx`**

Set up react-router-dom with a flat route structure. The URL is the source of truth for which view is active — do not duplicate this in local state.

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { HomeView } from '../views/HomeView';
import { ExploreView } from '../views/ExploreView';
import { AskView } from '../views/AskView';
import { IngestView } from '../views/IngestView';
import { AutomateView } from '../views/AutomateView';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomeView /> },
      { path: '/explore', element: <ExploreView /> },
      { path: '/ask', element: <AskView /> },
      { path: '/ingest', element: <IngestView /> },
      { path: '/automate', element: <AutomateView /> },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
```

#### Step 2: Context Providers

**`src/app/providers/GraphProvider.tsx`**

Manages the selected node, right panel content, and will later hold global graph filters.

```typescript
import { createContext, useState, useCallback, type ReactNode } from 'react';
import type { RightPanelContent } from '../../types/panels';

interface GraphContextValue {
  rightPanelContent: RightPanelContent;
  setRightPanelContent: (content: RightPanelContent) => void;
  clearRightPanel: () => void;
}

export const GraphContext = createContext<GraphContextValue | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [rightPanelContent, setRightPanelContent] = useState<RightPanelContent>(null);
  const clearRightPanel = useCallback(() => setRightPanelContent(null), []);

  return (
    <GraphContext.Provider value={{ rightPanelContent, setRightPanelContent, clearRightPanel }}>
      {children}
    </GraphContext.Provider>
  );
}
```

**`src/app/providers/SettingsProvider.tsx`**

Loads user profile, extraction settings, and anchors on mount. Cached for the session — other PRDs read from this context.

```typescript
import { createContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../services/supabase';
import type { KnowledgeNode } from '../../types/database';

interface UserProfile {
  id: string;
  user_id: string;
  professional_context: { role?: string; industry?: string; current_projects?: string };
  personal_interests: { topics?: string; learning_goals?: string };
  processing_preferences: { insight_depth?: string; relationship_focus?: string };
}

interface ExtractionSettings {
  default_mode: 'comprehensive' | 'strategic' | 'actionable' | 'relational';
  default_anchor_emphasis: 'passive' | 'standard' | 'aggressive';
}

interface SettingsContextValue {
  profile: UserProfile | null;
  extractionSettings: ExtractionSettings | null;
  anchors: KnowledgeNode[];
  loading: boolean;
  refreshAnchors: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [extractionSettings, setExtractionSettings] = useState<ExtractionSettings | null>(null);
  const [anchors, setAnchors] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAnchors = async () => {
    const { data } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('is_anchor', true)
      .order('label');
    if (data) setAnchors(data);
  };

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setProfile(data);

    const { data: settings } = await supabase
      .from('extraction_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (settings) setExtractionSettings(settings);
  };

  useEffect(() => {
    Promise.all([refreshProfile(), refreshAnchors()]).finally(() => setLoading(false));
  }, []);

  return (
    <SettingsContext.Provider value={{ profile, extractionSettings, anchors, loading, refreshAnchors, refreshProfile }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

**`src/app/App.tsx`** — Compose providers:
```typescript
<AuthProvider>
  <SettingsProvider>
    <GraphProvider>
      <Router />
    </GraphProvider>
  </SettingsProvider>
</AuthProvider>
```

#### Step 3: AppShell — Three-Pane Layout

**`src/components/layout/AppShell.tsx`**

The outermost layout container. Renders nav rail, center stage (with top bar + router outlet), and conditional right panel. Uses `useLocation()` to determine if right panel should show.

```typescript
import { Outlet, useLocation } from 'react-router-dom';
import { NavRail } from './NavRail';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { useGraphContext } from '../../hooks/useGraphContext';

export function AppShell() {
  const location = useLocation();
  const { rightPanelContent } = useGraphContext();
  
  // Right panel visible on /ask always, or when content is selected on other views
  const isAskView = location.pathname === '/ask';
  const showRightPanel = isAskView || rightPanelContent !== null;

  return (
    <div className="flex w-full h-screen bg-bg-content overflow-hidden">
      <NavRail />
      <main className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
      {showRightPanel && <RightPanel />}
    </div>
  );
}
```

**Layout dimensions (must match exactly):**
- Nav rail: 56px collapsed, 190px expanded, `--bg-frame` background, right border `--border-subtle`
- Center stage: `flex: 1`, `min-width: 0` (prevents flex overflow)
- Right panel: 310px fixed width, `--bg-card` background, left border `--border-subtle`
- Top bar: 50px height, `--bg-card` background, bottom border `--border-subtle`

#### Step 4: NavRail

**`src/components/layout/NavRail.tsx`**

Collapsible sidebar. Expands on mouse enter, collapses on mouse leave. 0.2s transition.

**Structure:**
```
┌─────────────────┐
│ Logo (S mark)    │  ← 52px header with bottom border
│ "Synapse" text   │     Text only visible when expanded
├─────────────────┤
│ Home       ●     │  ← Active: accent-50 bg, accent-500 icon, left bar
│ Explore          │     Inactive: transparent bg, text-secondary icon
│ Ask              │     Hover: rgba(0,0,0,0.04) bg, text-body icon
│ Ingest           │     Labels only visible when expanded
│ Automate         │
│                  │  ← flex spacer
├─────────────────┤
│ Search     ⌘K   │  ← Bottom utilities with top border
│ Settings         │     Keyboard shortcut badge when expanded
└─────────────────┘
```

**Nav items configuration:**
```typescript
const NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/', icon: 'Home' },
  { id: 'explore', label: 'Explore', path: '/explore', icon: 'Compass' },
  { id: 'ask', label: 'Ask', path: '/ask', icon: 'MessageSquare' },
  { id: 'ingest', label: 'Ingest', path: '/ingest', icon: 'Plus' },
  { id: 'automate', label: 'Automate', path: '/automate', icon: 'Zap' },
];
```

**Active state detection:** Use `useLocation()` from react-router-dom. Compare `location.pathname` with the item's `path`. For Home, match exactly `/`. For others, match the path prefix.

**Active nav indicator (from design system):**
- Background: `--accent-50` (`#fff5f0`)
- Icon color: `--accent-500` (`#d63a00`)
- Left bar: 3px × 16px, `--accent-500`, positioned `left: -11px` from button, `border-radius: 0 2px 2px 0`
- Label: `--text-primary`, weight-600

**Inactive nav item:**
- Background: transparent
- Icon color: `--text-secondary`
- Hover: background `rgba(0,0,0,0.04)`, icon shifts to `--text-body`
- Label: `--text-secondary`, weight-500

**Logo:**
- 30×30px square, `--accent-500` background, 8px border-radius
- White "S" text, Cabinet Grotesk 13px weight-800
- When expanded: "Synapse" text appears, 14px weight-700

**Bottom utilities:**
- Search button: click opens command palette. When expanded, shows "Search" label + `⌘K` keyboard badge
- Settings button: click opens settings modal. When expanded, shows "Settings" label
- Both use `--text-secondary` icon color, `--bg-hover` on mouse enter

**Interaction behavior:**
- `onMouseEnter` on the nav element sets expanded = true
- `onMouseLeave` sets expanded = false
- Width transitions from 56px to 190px with `transition: width 0.2s ease`
- Content inside the nav must not wrap or overflow during transition — use `overflow: hidden` and `white-space: nowrap` on labels

**Clicking a nav item:** Uses `useNavigate()` from react-router. Also clears right panel content (via `clearRightPanel()` from GraphContext) except when navigating to Ask.

#### Step 5: TopBar

**`src/components/layout/TopBar.tsx`**

**Left side:** View title derived from current route.
```typescript
const VIEW_TITLES: Record<string, string> = {
  '/': 'Home',
  '/explore': 'Explore',
  '/ask': 'Ask',
  '/ingest': 'Ingest',
  '/automate': 'Automate',
};
```
- Cabinet Grotesk, 15px, weight-700, `--text-primary`

**Right side:**
- Graph stats: "[N] nodes · [N] edges" — DM Sans 12px, `--text-secondary`. Fetch actual counts from Supabase on mount:
  ```typescript
  const { count: nodeCount } = await supabase
    .from('knowledge_nodes')
    .select('*', { count: 'exact', head: true });
  const { count: edgeCount } = await supabase
    .from('knowledge_edges')
    .select('*', { count: 'exact', head: true });
  ```
- User avatar: 28px circle, `background: linear-gradient(135deg, var(--accent-500), var(--accent-300))`, white initial letter (first letter of profile name, or first letter of email), Cabinet Grotesk 11px weight-700. Clicking opens Settings modal.

#### Step 6: RightPanel

**`src/components/layout/RightPanel.tsx`**

Switches content based on `rightPanelContent` from GraphContext and current route.

**Rendering logic:**
```
if (route === '/ask')         → render AskContext panel (placeholder for now: "Context" header + "Related Subgraph" + "Source Chunks" as gray boxes)
if (content?.type === 'node') → render NodeDetail (placeholder for now: shows label, type, description from content.data)
if (content?.type === 'source') → render SourceDetail (placeholder for now)  
if (content?.type === 'feed') → render FeedDetail (placeholder for now)
if (content === null)         → render QuickAccess (fully implemented)
```

**QuickAccess (default state) — fully implemented now:**

This reads real data from Supabase and is the first panel users see.

**Anchors section:**
- Header: anchor icon (`Anchor` from lucide-react) + "ANCHORS" section label
- List items from `SettingsContext.anchors`:
  - Entity dot (using `Dot` component with the anchor's entity_type color)
  - Label: DM Sans 12px weight-500
  - Connection count: DM Sans 10px `--text-secondary`, right-aligned
  - Hover: `--bg-hover` background, 7px border-radius
  - Click: sets right panel content to `{ type: 'node', data: anchor }`

**Recent section:**
- Header: clock icon (`Clock` from lucide-react) + "RECENT" section label
- Fetch 10 most recent nodes:
  ```typescript
  const { data } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  ```
- List items:
  - Entity dot (5px, entity_type color)
  - Label: DM Sans 11px `--text-secondary`
  - Relative time: DM Sans 10px `--text-secondary` (e.g., "2h ago", "3d ago")
  - Hover: `--bg-hover` background
  - Click: sets right panel content to `{ type: 'node', data: node }`

**Panel styling:**
- Width: 310px, `--bg-card` background, left border `--border-subtle`
- Header area: 14px padding, bottom border `--border-subtle`
- Content area: 12px padding, scrollable overflow-y
- Close button (×) in header when showing node/source/feed detail — click calls `clearRightPanel()`

#### Step 7: Command Palette

**`src/components/modals/CommandPalette.tsx`**

**Trigger:** ⌘K (Mac) / Ctrl+K (Windows). Register global keydown listener in AppShell or a dedicated hook. Toggle visibility. Esc closes.

**Overlay:** Fixed position, full viewport, `background: rgba(0,0,0,0.5)`, `backdrop-filter: blur(6px)`. Click outside closes.

**Modal:** 520px width, `--bg-card` background, `--border-strong` border, 16px border-radius, `box-shadow: 0 25px 60px rgba(0,0,0,0.3)`. Centered horizontally, 100px from top.

**Search input area:**
- 14px 18px padding, bottom border `--border-subtle`
- Search icon (lucide `Search`, 15px, `--text-secondary`)
- Input: transparent background, no border, 14px DM Sans, placeholder "Search nodes, navigate, capture..."
- ESC keyboard badge on the right

**Results area:**
- Max height 340px, scrollable, 6px padding
- Items grouped by category with uppercase section headers (10px, weight-700, `--text-secondary`, 0.08em letter-spacing)
- **Initial categories (PRD 2):**
  - "Navigation" — Go to Home, Go to Explore, Open Ask, Quick Capture, Open Settings
  - "Anchors" — loaded from SettingsContext (shows entity dot + label + type)
- Each item: 7px 12px padding, 8px border-radius, hover `--bg-hover`
  - Entity dot (7px) + label (13px weight-500) + type badge (10px `--text-secondary`, right-aligned)
  - Click executes the item's action (navigate or select node) and closes palette

**Footer:**
- 8px 16px padding, top border `--border-subtle`
- Keyboard hints: "↑↓ Navigate", "↵ Select", "⌘K Toggle" — each 10px `--text-secondary`

**Keyboard navigation:**
- ↑/↓ moves highlighted index through the flat list of items
- ↵ executes the highlighted item's action
- The highlighted item gets `--bg-hover` background
- Auto-focus the search input when palette opens
- Reset search query and highlighted index when palette opens

**Filtering:**
- When user types in the search input, filter all items by `label.toLowerCase().includes(query.toLowerCase())`
- Show all items when query is empty

**Forward-compatible note:** In PRD 12, this component will receive a `searchProvider` prop that can async-fetch node results from Supabase. For now, the items are static (navigation actions) plus sync-loaded anchors from SettingsContext. Structure the component so that `items` is a prop or comes from a hook, not hardcoded inside the component.

#### Step 8: Settings Modal

**`src/components/modals/SettingsModal.tsx`**

**Trigger:** Click Settings in nav rail, or navigate to it from command palette.

**Overlay:** Fixed position, full viewport, `background: rgba(0,0,0,0.5)`, `backdrop-filter: blur(6px)`. Click outside closes.

**Modal:** 780px width, max-height 80vh, `--bg-card` background, `--border-strong` border, 16px border-radius, two-column flex layout.

**Left sidebar (200px):**
- `--bg-frame` background, right border `--border-subtle`, 20px 8px padding
- "Settings" heading: 14px weight-700, 0 12px padding, 16px margin-bottom
- Tab buttons:
  ```typescript
  const SETTINGS_TABS = [
    { id: 'profile', label: 'Profile', icon: 'User' },
    { id: 'anchors', label: 'Anchors', icon: 'Anchor' },
    { id: 'extraction', label: 'Extraction', icon: 'Zap' },
    { id: 'digests', label: 'Digests', icon: 'Calendar' },
    { id: 'integrations', label: 'Integrations', icon: 'Link' },
  ];
  ```
  - Active tab: `--bg-active` background, `--text-primary` text, `--accent-500` icon
  - Inactive tab: transparent background, `--text-secondary` text, `--text-secondary` icon
  - 9px 12px padding, 8px border-radius, 12px font, weight-500

**Right content (flex: 1):**
- 24px 28px padding, scrollable overflow-y
- Header: tab title (Cabinet Grotesk 18px weight-700) + close button (× icon, `--text-secondary`)
- Content: conditional render based on active tab

**Tab content for PRD 2:**
- **Profile:** Placeholder form with 4 input fields (Name, Professional Context, Personal Interests, Processing Preferences). Each field has a label (DM Sans 12px weight-600 `--text-secondary`) and input (`--bg-inset` background, `--border-subtle` border, 8px radius, 13px font). Save button in `--accent-500`. Fields can have placeholder text but don't need to read/write from Supabase yet — PRD 3 wires this up.
- **Anchors, Extraction, Digests, Integrations:** Show a styled "coming soon" state — the tab title, a brief description paragraph (DM Sans 13px `--text-secondary`), and a muted icon. This should look intentional, not broken.

#### Step 9: View Placeholders

Each view file should render a styled placeholder that looks intentional. Not a "TODO" or empty div — a clean, centered message that matches the design system.

**Pattern for each placeholder view:**
```typescript
export function HomeView() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[840px] mx-auto px-9 py-8">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-text-primary mb-1">
          Home
        </h1>
        <p className="text-[13px] text-text-secondary">
          Activity feed and intelligence briefings — coming in the next update.
        </p>
      </div>
    </div>
  );
}
```

**View-specific placeholder text:**
| View | Heading | Description |
|---|---|---|
| Home | "Good evening, Joseph" (or time-aware + profile name if available) | "Activity feed and intelligence briefings — coming in the next update." |
| Explore | "Explore" | "Graph visualization and entity browser — coming in the next update." |
| Ask | "Ask" | "Ask your knowledge graph anything — coming in the next update." |
| Ingest | "Ingest Knowledge" | "Add content from any source — coming in the next update." |
| Automate | "Automate" | "Integrations, webhooks, and queues — coming in the next update." |

All headings use Cabinet Grotesk, descriptions use DM Sans. The content area uses `max-w-[840px] mx-auto` centering.

#### Step 10: Modal State Management

Both the command palette and settings modal need to be controlled from the AppShell level (since they're triggered from the nav rail which is a sibling of the center stage).

**Add modal state to AppShell:**
```typescript
const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
const [settingsOpen, setSettingsOpen] = useState(false);
```

**Pass toggle functions down to NavRail** (or use a small context/callback ref). The nav rail's Search button calls `setCommandPaletteOpen(true)` and Settings calls `setSettingsOpen(true)`.

**Global keyboard listener** (in AppShell or a hook):
```typescript
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
      setSettingsOpen(false);
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

---

### Shared UI Components

Build these small components in `src/components/ui/` — they're used across every future PRD:

**`Dot.tsx`** — Entity type color indicator
```typescript
interface DotProps {
  type: string;    // Entity type name
  size?: number;   // px, default 8
}
```
Renders a circle with `background-color` from the entity type color map (`config/entityTypes.ts`), with a subtle `box-shadow` glow at 25% opacity matching the color.

**`SectionLabel.tsx`** — Uppercase section header
```typescript
interface SectionLabelProps {
  children: React.ReactNode;
}
```
Renders text in Cabinet Grotesk 10px weight-700 uppercase `--text-secondary` with 0.08em letter-spacing.

**`Kbd.tsx`** — Keyboard shortcut badge
```typescript
interface KbdProps {
  children: React.ReactNode;
}
```
Renders in `--bg-inset` background, `--border-subtle` border, `--text-secondary` color, DM Sans 10px, 2px 6px padding, 4px border-radius.

---

### Design System Mapping (Mockup → Tailwind)

The mockup uses a dark theme with inline styles. Translate every value to the light theme design system tokens:

| Mockup token | Design system token | Tailwind class |
|---|---|---|
| `T.bg.root` (#0a0a0f) | `--bg-content` (#f7f7f7) | `bg-bg-content` |
| `T.bg.surface` (#111118) | `--bg-frame` (#f0f0f0) for nav/panels, `--bg-card` (#fff) for topbar/cards | `bg-bg-frame` or `bg-bg-card` |
| `T.bg.raised` (#1a1a24) | `--bg-card` (#ffffff) | `bg-bg-card` |
| `T.bg.hover` (#2a2a38) | `--bg-hover` (#fafafa) | `bg-bg-hover` |
| `T.bg.active` (#32324a) | `--bg-active` (#f0f0f0) | `bg-bg-active` |
| `T.border.subtle` (rgba(255,255,255,0.06)) | `--border-subtle` (rgba(0,0,0,0.06)) | `border-border-subtle` |
| `T.text.primary` (#e8e8ef) | `--text-primary` (#1a1a1a) | `text-text-primary` |
| `T.text.secondary` (#8888a0) | `--text-secondary` (#808080) | `text-text-secondary` |
| `T.text.muted` (#555568) | `--text-placeholder` (#aaaaaa) | `text-text-placeholder` |
| `T.text.accent` (#6eb5ff) | `--accent-500` (#d63a00) | `text-accent-500` |

This mapping applies to every component in this PRD. When you see a mockup value, translate it to the design system equivalent.

---

### Success Criteria

- [ ] Authenticated user sees three-pane layout with nav rail, center stage, and right panel
- [ ] Nav rail collapses (56px) and expands (190px) on hover with smooth 0.2s transition
- [ ] Active nav item shows accent-50 background, accent-500 icon, and 3px left indicator bar
- [ ] Clicking nav items navigates between views, URL updates correctly
- [ ] ⌘K opens command palette with search input, navigation items, and anchors from database
- [ ] Keyboard navigation (↑↓↵ Esc) works in command palette
- [ ] Settings modal opens with 5 tabs, Profile tab shows placeholder form
- [ ] Right panel shows Quick Access with real anchors and recent 10 nodes from Supabase
- [ ] Clicking an anchor or recent node in the right panel sets the panel to a node detail view (placeholder)
- [ ] TopBar shows real node/edge counts from the database
- [ ] User avatar shows the correct initial from profile or email
- [ ] All typography uses Cabinet Grotesk for headings/labels and DM Sans for body/UI text
- [ ] All colors match the design system — light backgrounds, blood orange accent, correct entity type colors
- [ ] No broken states at 1280px, 1440px, and 1920px viewport widths
- [ ] Deployed to Vercel successfully

### Testing Scenarios

- [ ] **Empty database user:** New user with 0 nodes, 0 anchors. Quick Access shows empty states gracefully (not broken UI). TopBar shows "0 nodes · 0 edges".
- [ ] **Populated database user:** User with 100+ nodes and 5 anchors. All anchors appear in Quick Access and command palette. Recent nodes show correct sort order.
- [ ] **Rapid navigation:** Click through all 5 views quickly. No stale state, no layout flicker, URL stays in sync.
- [ ] **Keyboard flow:** ⌘K → type "exp" → results filter → ↓ to "Go to Explore" → ↵ → palette closes, Explore view active
- [ ] **Right panel toggle:** On Home view, right panel hidden by default. Click anchor in Quick Access → right panel shows. Click × → panel hides. Navigate to Ask → panel always shows.

### Edge Cases

- User profile doesn't exist yet (new user) — SettingsProvider should handle `.maybeSingle()` returning null gracefully, avatar falls back to email initial
- No anchors in database — Quick Access Anchors section shows empty state ("No anchors set. Promote nodes from the Explore view.")
- No nodes in database — Quick Access Recent section shows empty state ("No entities yet. Ingest your first source to get started.")
- Supabase query fails — show a subtle error state, not a crash. Log the error. Right panel should still render (just with empty lists).

### Out of Scope

- Node detail view content (just shows label + type from data — full implementation in PRD 4)
- Source detail view content (placeholder — full implementation in PRD 6)
- Feed detail view content (placeholder — full implementation in PRD 6)
- Settings Profile tab read/write to Supabase (wired in PRD 3)
- Settings Anchors, Extraction, Digests, Integrations tab content (PRD 3)
- Command palette node search (PRD 12)
- Ask view right panel context content (PRD 8)
- Any data creation or mutation (no ingestion, no extraction)
```
