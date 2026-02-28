# ARCHITECTURE.md — Synapse V2 Technical Architecture

## Overview

Synapse V2 is a React single-page application hosted on Vercel, backed by Supabase (PostgreSQL with pgvector) and Google Gemini AI. The frontend is a three-pane layout: nav rail (left), center stage (main content), and contextual right panel.

---

## Frontend Architecture

### React + Vite + TypeScript

The app uses Vite as the build tool with React 18 and TypeScript in strict mode. No Next.js — this is a pure SPA with client-side routing.

```bash
# Project init
npm create vite@latest synapse-v2 -- --template react-ts
```

### Routing

Use `react-router-dom` v6 with a flat route structure matching the 5 primary views:

```typescript
// src/app/Router.tsx
const routes = [
  { path: '/', element: <HomeView /> },
  { path: '/explore', element: <ExploreView /> },
  { path: '/ask', element: <AskView /> },
  { path: '/ingest', element: <IngestView /> },
  { path: '/automate', element: <AutomateView /> },
];
```

The nav rail, top bar, and right panel live in the layout shell — they are not part of individual views. The layout shell wraps the router outlet.

### State Management

Use React Context + hooks for global state. No Redux, no Zustand unless complexity demands it later.

**Required contexts:**
- `AuthContext` — user session, sign in/out, loading state
- `GraphContext` — selected node, right panel content, active filters (shared between views)
- `SettingsContext` — user profile, extraction defaults, anchor list (loaded once on auth)

Each context has its own provider file in `src/app/providers/`. Providers are composed in `App.tsx`:

```typescript
<AuthProvider>
  <SettingsProvider>
    <GraphProvider>
      <AppShell />
    </GraphProvider>
  </SettingsProvider>
</AuthProvider>
```

### Tailwind CSS 4 Configuration

Tailwind 4 uses CSS-first configuration. Design system tokens are defined as CSS custom properties in `src/styles/tokens.css` and referenced via Tailwind's `theme()` function or directly as `var(--token-name)`.

```css
/* src/styles/tokens.css */
@import "tailwindcss";

@theme {
  /* Map design system tokens to Tailwind theme */
  --color-bg-frame: #f0f0f0;
  --color-bg-content: #f7f7f7;
  --color-bg-card: #ffffff;
  --color-bg-inset: #f0f0f0;
  --color-bg-hover: #fafafa;
  --color-bg-active: #f0f0f0;

  --color-accent-50: #fff5f0;
  --color-accent-100: #ffe0cc;
  --color-accent-200: #ffb899;
  --color-accent-300: #ff9466;
  --color-accent-400: #e8703d;
  --color-accent-500: #d63a00;
  --color-accent-600: #b83300;
  --color-accent-700: #9a2c00;

  --color-text-primary: #1a1a1a;
  --color-text-body: #3d3d3d;
  --color-text-secondary: #808080;
  --color-text-placeholder: #aaaaaa;

  --font-family-display: 'Cabinet Grotesk', -apple-system, sans-serif;
  --font-family-body: 'DM Sans', -apple-system, sans-serif;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

This enables usage like `className="bg-bg-card text-text-primary rounded-md"` throughout components.

---

## Service Layer

### `services/supabase.ts`

Single file containing all Supabase operations. Exports a singleton client and typed query functions.

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Key patterns:**
- All query functions are `async` and return typed results
- Error handling: every query checks for `error` and either throws or returns a typed error object
- Use `.maybeSingle()` for lookups that may not match (user profile, settings)
- Pagination: use `.range(from, to)` for large result sets
- Real-time subscriptions for queue status updates via `supabase.channel()`

**Function categories:**
- `fetchNodes()`, `fetchEdges()`, `fetchSources()` — core graph data
- `fetchUserProfile()`, `updateUserProfile()` — user settings
- `fetchAnchors()`, `promoteToAnchor()`, `demoteAnchor()` — anchor management
- `saveKnowledgeSource()`, `saveNodes()`, `saveEdges()` — ingestion persistence
- `semanticSearch()`, `keywordSearch()` — hybrid search for RAG
- `fetchYouTubeChannels()`, `fetchQueue()` — automation data

### `services/gemini.ts`

All Google Gemini API interactions. This service handles:
- Entity and relationship extraction from source content
- Embedding generation (768-dimensional vectors via `text-embedding-004`)
- Cross-connection discovery (comparing new nodes against existing graph)
- Graph RAG query answering (retrieval + generation)
- Deep research mode (multi-hop graph traversal)

**API pattern:**
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function extractEntities(
  content: string,
  systemPrompt: string
): Promise<ExtractionResult> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: content }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  // Parse and validate response...
}
```

### `services/auth.ts`

Authentication helpers wrapping Supabase Auth:
- `signInWithEmail()`, `signUpWithEmail()`
- `signOut()`
- `onAuthStateChange()` — for the AuthProvider to subscribe to
- `getCurrentUser()` — returns the current session user or null

---

## Vercel Serverless Functions

Functions in the `api/` directory deploy as independent Vercel serverless functions. Each function is a standalone HTTP handler.

### Critical Constraint: No Shared Imports

Vercel bundles each file in `api/` independently. Local imports from sibling files or `_utils/` directories **will fail silently** at runtime. This was a major bug source in v1.

**Rules:**
1. Every `api/` file must be fully self-contained
2. Helper functions (auth verification, data parsing, etc.) must be defined inline
3. npm package imports are fine — only local file imports break
4. Always test by checking Vercel runtime logs, not frontend error messages

**Pattern for serverless functions:**
```typescript
// api/youtube/process.ts
import { createClient } from '@supabase/supabase-js';

// ─── INLINE HELPERS (cannot import from other files) ───
function verifyAuth(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  // ... validation logic inline
}

function extractPlaylistId(url: string): string | null {
  // ... parsing logic inline
}

// ─── HANDLER ───
export default async function handler(req: Request) {
  // ... implementation
}
```

---

## Graph Visualization

### D3.js Force-Directed Graph

The Explore view's Graph tab uses D3.js v7 for an interactive force-directed graph rendered on an HTML5 Canvas element (not SVG — Canvas performs better at 500+ nodes).

**Architecture:**
```
ExploreView.tsx
└── GraphTab.tsx
    └── GraphCanvas.tsx    ← D3 force simulation + Canvas rendering
        ├── useGraphSimulation()   ← hook managing D3 force sim
        ├── useGraphRenderer()     ← hook for Canvas draw loop
        └── useGraphInteraction()  ← hook for mouse/touch events
```

**Rendering tiers:**
- **Source-Anchor level** (default) — shows sources as rounded rectangles, anchors as circles, edges as curved lines with thickness mapping to shared entity count
- **Entity expansion** — double-click a source/anchor to fan out constituent entities in a radial pattern
- **Full entity graph** — future mode showing all nodes (requires viewport culling and level-of-detail)

**Performance targets:**
- Smooth 60fps with up to 200 visible nodes
- Viewport culling: only render nodes within the visible canvas area
- Level-of-detail: reduce label rendering for distant/small nodes
- Throttle force simulation ticks to prevent layout thrashing

---

## Data Flow Patterns

### Ingestion Pipeline

```
User Input (text/URL/file)
  → Source persisted to knowledge_sources
  → System prompt composed (promptBuilder.ts):
      Base instructions
      + Extraction mode template
      + User profile context
      + Anchor context + emphasis level
      + Custom guidance
  → Gemini extraction (services/gemini.ts)
  → Entity review UI (user approves/edits/removes)
  → Nodes saved to knowledge_nodes with embeddings
  → Edges saved to knowledge_edges
  → Cross-connections discovered (new nodes vs existing graph)
  → Additional edges created
```

### Graph RAG Query Pipeline

```
User Question
  → Query decomposition (optional, for complex queries)
  → Parallel search:
      Semantic search (pgvector cosine similarity on source chunks)
      Keyword search (PostgreSQL full-text search on node labels/descriptions)
  → Merge + rerank results
  → Deep graph traversal (follow edges from top results, 2-3 hops)
  → Context assembly (source chunks + node summaries + relationship paths)
  → Gemini generation with assembled context
  → Response with source citations
```

---

## Environment Variables

```bash
# Required — set in Vercel dashboard for production
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_GEMINI_API_KEY=[gemini-key]

# Optional
VITE_APP_URL=https://synapse-v2.vercel.app
```

**Never commit actual keys to the repository.** Use `.env.local` for local development (gitignored).

---

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `NavRail.tsx`, `EntityBadge.tsx` |
| Hooks | camelCase with `use` prefix | `useGraphSimulation.ts` |
| Services | camelCase | `supabase.ts`, `gemini.ts` |
| Utilities | camelCase | `promptBuilder.ts` |
| Types | camelCase, descriptive | `database.ts`, `graph.ts` |
| Config files | camelCase | `entityTypes.ts`, `extractionModes.ts` |
| CSS files | camelCase | `tokens.css` |
| API routes | kebab-case directories | `api/youtube/process.ts` |
| PRD documents | kebab-case with number prefix | `001-scaffold.md` |

---

## Dependencies

### Core
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "@supabase/supabase-js": "^2.x",
  "d3": "^7.x",
  "lucide-react": "latest"
}
```

### Dev
```json
{
  "typescript": "^5.x",
  "vite": "^6.x",
  "@vitejs/plugin-react": "latest",
  "tailwindcss": "^4.x",
  "@tailwindcss/vite": "latest",
  "@types/d3": "^7.x",
  "@types/react": "^18.x",
  "@types/react-dom": "^18.x"
}
```

### Do Not Install
- No state management library (use React Context)
- No CSS-in-JS (use Tailwind)
- No component library (build from design system)
- No testing framework yet (will add in later phase)
