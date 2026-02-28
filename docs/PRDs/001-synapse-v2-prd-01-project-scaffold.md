```markdown
# PRD 01: Synapse v2 — Project Scaffold & Authentication

## Overview

Bootstrap a new Synapse v2 application from scratch using React + Vite + Tailwind CSS. This PRD sets up the project structure, installs all core dependencies, configures Supabase authentication (login/signup/session), establishes the design system as CSS custom properties, and deploys a working authenticated shell to Vercel. No views or features yet — just a working, styled, authenticated skeleton that every subsequent PRD builds on.

## User Value

- **Who benefits**: Developer (Joseph) and all future PRDs — this is the foundation everything else depends on
- **Problem solved**: The existing Synapse v1 codebase has accumulated broken features and technical debt. A clean scaffold ensures every feature added works before the next one starts.
- **Expected outcome**: A deployed app at a Vercel URL that shows a login screen, authenticates against the existing Supabase project, and displays an empty authenticated shell with the correct design tokens applied.

## Context for AI Coding Agent

**This is a greenfield project.** You are creating a new repository from scratch. Do not reference or copy code from any existing Synapse codebase.

**The app connects to an EXISTING Supabase project.** The database, tables, RLS policies, and all knowledge graph data already exist. You are only building a new frontend that connects to this same backend. Do NOT create new database tables or modify the schema in this PRD.

**Design System Source of Truth:** The visual design follows a specific design system (details provided in this PRD). The mockup HTML file uses a dark theme — **ignore the dark theme**. Build with the light theme specified below.

**Key Technology Decisions:**
- React 18 with Vite (not Next.js, not CRA)
- Tailwind CSS v3 for utility classes PLUS CSS custom properties for design tokens
- TypeScript throughout
- Supabase JS client v2 for auth and data
- Lucide React for icons
- D3.js v7 will be added later (not in this PRD)
- DM Sans (Google Fonts) + Cabinet Grotesk (Fontshare) for typography

## Files to Create

```
synapse-v2/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
├── vercel.json
├── README.md
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                    # Global styles, CSS custom properties, font imports
│   ├── vite-env.d.ts
│   ├── lib/
│   │   └── supabase.ts             # Supabase client singleton
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth provider with session management
│   ├── hooks/
│   │   └── useAuth.ts              # Convenience hook for auth context
│   ├── components/
│   │   ├── Layout.tsx              # Three-pane shell (nav + center + right panel)
│   │   ├── NavRail.tsx             # Left navigation rail
│   │   ├── TopBar.tsx              # Center stage top bar
│   │   └── auth/
│   │       ├── LoginPage.tsx       # Login form
│   │       └── ProtectedRoute.tsx  # Auth guard wrapper
│   ├── pages/
│   │   └── PlaceholderView.tsx     # Empty view with "Coming soon" for each route
│   └── types/
│       └── index.ts                # Shared TypeScript types
```

## Technical Scope

**Affected Components:**
- [x] Project configuration and build tooling
- [x] Authentication (Supabase)
- [x] Design system tokens (CSS custom properties)
- [x] Typography setup (font loading)
- [x] Base layout shell (nav rail, center, right panel)
- [x] Deployment configuration (Vercel)
- [ ] Data ingestion layer — NOT in this PRD
- [ ] Entity extraction — NOT in this PRD
- [ ] Graph visualization — NOT in this PRD
- [ ] Graph RAG querying — NOT in this PRD

**Dependencies (npm packages):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

## Design System Tokens

**CRITICAL:** Implement these EXACTLY as CSS custom properties in `src/index.css`. Every subsequent PRD references these tokens.

### Backgrounds (Light Theme)
```css
:root {
  --bg-frame: #f0f0f0;       /* Nav rail, panels, structural frame */
  --bg-content: #f7f7f7;     /* Main content area behind cards */
  --bg-card: #ffffff;         /* Cards, elevated surfaces, topbar */
  --bg-inset: #f0f0f0;       /* Input fields, code blocks, recessed areas */
  --bg-hover: #fafafa;        /* Hover state on cards and list items */
  --bg-active: #f0f0f0;       /* Active/selected backgrounds */
}
```

### Borders
```css
:root {
  --border-subtle: rgba(0,0,0,0.06);
  --border-default: rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.16);
}
```

### Text
```css
:root {
  --text-primary: #1a1a1a;
  --text-body: #3d3d3d;
  --text-secondary: #808080;
  --text-placeholder: #aaaaaa;
}
```

### Accent — Blood Orange
```css
:root {
  --accent-50: #fff5f0;
  --accent-100: #ffe0cc;
  --accent-200: #ffb899;
  --accent-300: #ff9466;
  --accent-400: #e8703d;
  --accent-500: #d63a00;    /* PRIMARY brand color */
  --accent-600: #b83300;    /* Hover state */
  --accent-700: #9a2c00;    /* Active/pressed state */
  --accent-800: #6e2000;
  --accent-900: #441400;
}
```

### Semantic Colors
```css
:root {
  --semantic-red-50: #fef2f2;
  --semantic-red-500: #ef4444;
  --semantic-red-700: #b91c1c;
  --semantic-green-50: #f0fdf4;
  --semantic-green-500: #22c55e;
  --semantic-green-700: #15803d;
  --semantic-amber-50: #fffbeb;
  --semantic-amber-500: #f59e0b;
  --semantic-amber-700: #b45309;
  --semantic-blue-50: #eff6ff;
  --semantic-blue-500: #3b82f6;
  --semantic-blue-700: #1d4ed8;
}
```

### Entity Type Colors
```css
:root {
  --e-person: #d97706;
  --e-org: #7c3aed;
  --e-topic: #0891b2;
  --e-project: #059669;
  --e-goal: #e11d48;
  --e-decision: #db2777;
  --e-action: #2563eb;
  --e-risk: #dc2626;
  --e-insight: #7c3aed;
  --e-idea: #ca8a04;
  --e-blocker: #dc2626;
  --e-tech: #0d9488;
  --e-concept: #4f46e5;
  --e-question: #ea580c;
  --e-anchor: #b45309;
  --e-lesson: #65a30d;
}
```

### Typography
```css
:root {
  --font-display: 'Cabinet Grotesk', -apple-system, sans-serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-editorial: 'Instrument Serif', Georgia, serif;
}
```

### Spacing & Radius
```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 36px;
  --space-2xl: 48px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

## Functional Requirements

### 1. Project Setup
- FR-1: Initialize Vite project with React + TypeScript template
- FR-2: Install and configure Tailwind CSS v3 with PostCSS
- FR-3: Configure `tailwind.config.js` to extend with design token values so Tailwind utilities can reference them (e.g., `bg-frame`, `text-primary`, `accent-500`, `font-display`, `font-body`)
- FR-4: Add font imports to `index.html`:
  ```html
  <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap" rel="stylesheet">
  ```
- FR-5: Set `<title>` to "Synapse" and add a simple SVG favicon (the "S" mark as a 32x32 SVG with blood orange background and white letter)

### 2. Supabase Client
- FR-6: Create Supabase client singleton in `src/lib/supabase.ts` using `createClient()` with env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- FR-7: Create `.env.example` documenting all required environment variables:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  VITE_GEMINI_API_KEY=your-gemini-api-key-here
  ```

### 3. Authentication
- FR-8: Create `AuthContext.tsx` that:
  - Initializes by calling `supabase.auth.getSession()` to check for existing session
  - Subscribes to `supabase.auth.onAuthStateChange()` for real-time auth updates
  - Provides `user`, `session`, `loading`, `signIn(email, password)`, `signUp(email, password)`, and `signOut()` via context
  - Cleans up the auth subscription on unmount
- FR-9: Create `useAuth.ts` hook that wraps `useContext(AuthContext)` with a guard that throws if used outside the provider
- FR-10: Create `LoginPage.tsx` with:
  - Centered card on `--bg-content` background
  - Synapse logo mark at top (30×30px rounded square, `--accent-500` background, white "S" in Cabinet Grotesk)
  - "Synapse" wordmark below logo in Cabinet Grotesk, 20px, weight 800
  - Email input field (styled per design system: `--bg-inset` background, `--border-subtle` border, `--radius-sm` radius)
  - Password input field (same styling)
  - "Sign in" primary button (`--accent-500` background, white text, `--radius-sm`, full width)
  - Toggle link to switch between "Sign in" and "Create account" modes
  - Error message display in `--semantic-red-500` text
  - Loading state on button (disabled + "Signing in..." text)
- FR-11: Create `ProtectedRoute.tsx` that:
  - Shows a centered loading spinner while `loading` is true (simple CSS spinner, `--accent-500` color)
  - Redirects to `/login` if no session
  - Renders `children` if authenticated

### 4. App Shell & Routing
- FR-12: Configure `react-router-dom` with these routes:
  ```
  /login     → LoginPage (public)
  /          → ProtectedRoute → Layout (redirects to /home)
  /home      → ProtectedRoute → Layout → PlaceholderView("Home")
  /explore   → ProtectedRoute → Layout → PlaceholderView("Explore")
  /ask       → ProtectedRoute → Layout → PlaceholderView("Ask")
  /ingest    → ProtectedRoute → Layout → PlaceholderView("Ingest")
  /automate  → ProtectedRoute → Layout → PlaceholderView("Automate")
  ```
- FR-13: `Layout.tsx` implements the three-pane structure:
  ```
  ┌──────┬─────────────────────────────┬────────────┐
  │ Nav  │       Center Stage          │   Right    │
  │ Rail │  ┌─────────────────────┐    │   Panel    │
  │      │  │ TopBar (50px)       │    │            │
  │ 56px │  ├─────────────────────┤    │   310px    │
  │      │  │ Content (scrolls)   │    │            │
  │      │  └─────────────────────┘    │            │
  └──────┴─────────────────────────────┴────────────┘
  ```
  - Full viewport height (`100vh`), `overflow: hidden` on outer shell
  - Nav rail: `width: 56px`, `background: var(--bg-frame)`, `border-right: 1px solid var(--border-subtle)`
  - Center stage: `flex: 1`, `background: var(--bg-content)`
  - Right panel: `width: 310px`, `background: var(--bg-card)`, `border-left: 1px solid var(--border-subtle)`
  - Right panel is HIDDEN by default in this PRD (will be toggled open in future PRDs). For now, just render the nav rail + center stage.

### 5. Nav Rail
- FR-14: `NavRail.tsx` contains:
  - **Logo area** (top): 30×30px rounded square (`border-radius: 8px`), `background: var(--accent-500)`, white "S" centered in Cabinet Grotesk 14px weight 800. 28px gap below.
  - **Nav items** (middle, flex column):
    - Home (House icon), Explore (Compass icon), Ask (MessageSquare icon), Ingest (Plus icon), Automate (Zap icon)
    - Each item is a `<NavLink>` from react-router-dom
    - Each button: 40×40px, `border-radius: 10px`, centered icon
    - **Active state**: `background: var(--accent-50)` (#fff5f0), icon `stroke: var(--accent-500)`, plus a 3px × 16px indicator bar on the left edge in `--accent-500`, positioned at `left: -11px`, `border-radius: 0 2px 2px 0`
    - **Inactive state**: transparent background, icon `stroke: var(--text-secondary)` (#808080)
    - **Hover (inactive)**: `background: rgba(0,0,0,0.04)`, icon stroke shifts to `--text-body`
    - Icon size: 20px, stroke-width: 1.8
  - **Utility items** (bottom, pushed down with flex spacer):
    - Search button (Search icon, 16px) — non-functional for now, just renders the icon
    - Settings button (Settings icon, 16px) — non-functional for now
    - Both use same 40×40px button style as nav items but with 16px icons
  - Tooltip: When hovering a nav item, show the label in a small tooltip to the right (optional — skip if complex; can add in a future PRD)

### 6. TopBar
- FR-15: `TopBar.tsx` displays:
  - Height: 50px, `background: var(--bg-card)`, `border-bottom: 1px solid var(--border-subtle)`
  - Left side: Current view name in Cabinet Grotesk, 15px, weight 700, color `--text-primary`
  - Right side: Metadata text "0 nodes · 0 edges" in DM Sans, 12px, color `--text-secondary` (will be dynamic later)
  - Right side: User avatar — 28px circle with `background: linear-gradient(135deg, var(--accent-500), var(--accent-300))`, user's first initial in white, Cabinet Grotesk, 11px, weight 700. Clicking it calls `signOut()`.
  - Horizontal padding: 24px

### 7. Placeholder Views
- FR-16: `PlaceholderView.tsx` accepts a `title` prop and renders:
  - Centered content within `max-width: 840px; margin: 0 auto; padding: 32px 36px`
  - The view title in Cabinet Grotesk, 24px, weight 800, color `--text-primary`
  - Below: "Coming in the next update" in DM Sans, 14px, color `--text-secondary`

### 8. Global Styles
- FR-17: `index.css` includes:
  - All CSS custom properties defined above
  - Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`)
  - `body` set to `font-family: var(--font-body); background: var(--bg-content); color: var(--text-body);`
  - Custom scrollbar styles: 5px width, transparent track, `rgba(0,0,0,0.08)` thumb, `rgba(0,0,0,0.15)` thumb on hover
  - `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`
  - `input, textarea, button, select { font-family: inherit; }`
  - Focus-visible style: `outline: none; box-shadow: 0 0 0 3px var(--accent-50); border-color: rgba(214,58,0,0.3);`

### 9. Deployment
- FR-18: `vercel.json` configures SPA rewrites:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- FR-19: `.gitignore` includes: `node_modules`, `dist`, `.env`, `.env.local`, `.vercel`
- FR-20: `README.md` includes: project name, tech stack summary, setup instructions (`npm install`, configure `.env`, `npm run dev`), build command (`npm run build`), and note that this connects to an existing Supabase project

## Implementation Guide for AI Agent

### Step 1: Initialize the project
```bash
npm create vite@latest synapse-v2 -- --template react-ts
cd synapse-v2
npm install
```

### Step 2: Install dependencies
```bash
npm install react-router-dom @supabase/supabase-js lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3: Configure Tailwind
In `tailwind.config.js`, set `content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']` and extend the theme with the design system tokens:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        frame: 'var(--bg-frame)',
        content: 'var(--bg-content)',
        card: 'var(--bg-card)',
        inset: 'var(--bg-inset)',
        accent: {
          50: 'var(--accent-50)',
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
      },
      fontFamily: {
        display: ['Cabinet Grotesk', '-apple-system', 'sans-serif'],
        body: ['DM Sans', '-apple-system', 'sans-serif'],
        editorial: ['Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
    },
  },
  plugins: [],
}
```

### Step 4: Set up `index.html`
Replace the default Vite `index.html`. Add the font link tags in `<head>` (see FR-4). Set `<title>Synapse</title>`. Link the favicon.

### Step 5: Write `src/index.css`
This is the most important file for the design system. Include ALL CSS custom properties from the tokens section above, then the Tailwind directives, then global resets (see FR-17).

### Step 6: Create `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 7: Create `src/contexts/AuthContext.tsx`
```typescript
import { createContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Step 8: Create `src/hooks/useAuth.ts`
```typescript
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### Step 9: Create auth components

`src/components/auth/ProtectedRoute.tsx`:
```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-content)',
      }}>
        <div style={{
          width: 28,
          height: 28,
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--accent-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

Add the spin keyframe in `index.css`:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

`src/components/auth/LoginPage.tsx`:
Build a centered login card. Exact specs:
- Page background: `var(--bg-content)`
- Card: `var(--bg-card)` background, `var(--border-subtle)` border, `border-radius: var(--radius-lg)` (16px), `padding: 40px 36px`, `width: 380px`, centered vertically and horizontally
- Logo mark: 30×30px, `border-radius: 8px`, `background: var(--accent-500)`, white "S" in Cabinet Grotesk 14px weight 800, centered
- Wordmark: "Synapse" in Cabinet Grotesk 20px weight 800, `color: var(--text-primary)`, `margin-top: 12px`
- Inputs: `background: var(--bg-inset)`, `border: 1px solid var(--border-subtle)`, `border-radius: 8px`, `padding: 10px 14px`, `font-size: 13px`, `color: var(--text-primary)`, full width, 8px gap between inputs
- Primary button: `background: var(--accent-500)`, `color: white`, `border-radius: 8px`, `padding: 11px 0`, `font-size: 13px`, `font-weight: 600`, full width, `margin-top: 16px`. Hover: `background: var(--accent-600)`. Disabled during loading.
- Toggle link: "Don't have an account? Sign up" / "Already have an account? Sign in" — DM Sans 12px, color `--text-secondary`, with the action word in `--accent-500`
- Error display: DM Sans 12px, `color: var(--semantic-red-500)`, `margin-top: 8px`

### Step 10: Create Layout, NavRail, TopBar
Follow the exact specs in FR-13 through FR-15. Use `useLocation()` from react-router-dom to determine the active nav item. Use Lucide React icons: `Home`, `Compass`, `MessageSquare`, `Plus`, `Zap`, `Search`, `Settings`.

### Step 11: Create PlaceholderView and wire up routing
`PlaceholderView.tsx` takes `{ title: string }` prop and renders the view title. Wire all routes through `App.tsx` with `BrowserRouter`, `Routes`, `Route`.

### Step 12: Create deployment configuration
Create `vercel.json` (FR-18), `.gitignore` (FR-19), `.env.example` (FR-7), `README.md` (FR-20).

### Step 13: Verify build
```bash
npm run build
```
Ensure no TypeScript errors, no build warnings, and the `dist/` folder is created with `index.html` and asset bundles.

## TypeScript Types

`src/types/index.ts` — Starter types that will be extended in future PRDs:
```typescript
export type ViewId = 'home' | 'explore' | 'ask' | 'ingest' | 'automate'

export type EntityType =
  | 'Person' | 'Organization' | 'Team' | 'Topic' | 'Project'
  | 'Goal' | 'Action' | 'Risk' | 'Blocker' | 'Decision'
  | 'Insight' | 'Question' | 'Idea' | 'Concept' | 'Takeaway'
  | 'Lesson' | 'Document' | 'Event' | 'Location' | 'Technology'
  | 'Product' | 'Metric' | 'Hypothesis' | 'Anchor'

export type SourceType = 'Meeting' | 'YouTube' | 'Research' | 'Note' | 'Document'

export type RelationType =
  | 'leads_to' | 'supports' | 'blocks' | 'depends_on' | 'part_of'
  | 'authored' | 'mentions' | 'conflicts_with' | 'relates_to' | 'enables'
  | 'created' | 'achieved' | 'produced' | 'contradicts' | 'risks'
  | 'prevents' | 'challenges' | 'inhibits' | 'connected_to' | 'owns'
  | 'associated_with'

export interface KnowledgeNode {
  id: string
  label: string
  entity_type: EntityType
  description?: string
  confidence?: number
  is_anchor: boolean
  source?: string
  source_type?: SourceType
  source_url?: string
  source_id?: string
  tags?: string[]
  user_id: string
  created_at: string
  updated_at: string
}

export interface KnowledgeEdge {
  id: string
  source_node_id: string
  target_node_id: string
  relation_type: RelationType
  evidence?: string
  user_id: string
  created_at: string
}
```

## Success Metrics

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` produces a clean production build with no TypeScript errors
- [ ] Login page renders with correct design system styling (light bg, blood orange button, Cabinet Grotesk headings)
- [ ] User can sign in with existing Supabase credentials
- [ ] User can sign up with new credentials
- [ ] Authenticated shell shows nav rail with 5 nav items + logo
- [ ] Active nav item has blood orange indicator bar and accent-50 background
- [ ] TopBar shows current view name and user avatar
- [ ] Clicking avatar signs user out and redirects to login
- [ ] All 5 routes render PlaceholderView with correct titles
- [ ] Refreshing a route maintains auth session (no redirect to login)
- [ ] Closing and reopening the browser maintains session
- [ ] Fonts load correctly: Cabinet Grotesk on headings, DM Sans on body text
- [ ] App deploys to Vercel successfully

## Edge Cases & Considerations

- **Supabase env vars missing**: The supabase client should throw a clear error at initialization, not fail silently at runtime
- **Session expiry**: The `onAuthStateChange` listener handles this automatically — when session expires, user is redirected to login
- **Network failure during auth**: The login form should catch errors from `signIn`/`signUp` and display them. Do not crash or show blank screen.
- **Route mismatch**: Unknown routes should redirect to `/home` for authenticated users or `/login` for unauthenticated users
- **Font loading**: If Cabinet Grotesk fails to load from Fontshare, the fallback stack (`-apple-system, sans-serif`) keeps the app usable
- **Mobile viewport**: The three-pane layout is desktop-only for now. On viewports below 768px, hide the nav rail labels and right panel (responsive is out of scope for this PRD, but don't use fixed pixel widths that break on mobile — use flexbox)

## Testing Guidance for AI Agent

- [ ] Sign in with valid credentials → see authenticated shell
- [ ] Sign in with wrong password → see error message
- [ ] Sign up with new email → see authenticated shell (or confirmation message if Supabase requires email verification)
- [ ] Click each nav item → URL changes, TopBar title updates, active indicator moves
- [ ] Click avatar → signs out, redirected to login
- [ ] Visit `/explore` while not authenticated → redirected to `/login`
- [ ] Visit `/login` while authenticated → redirected to `/home`
- [ ] Verify fonts in DevTools: headings should show "Cabinet Grotesk", body should show "DM Sans"
- [ ] Verify CSS custom properties are applied: inspect any element and confirm `--accent-500` resolves to `#d63a00`
- [ ] Run `npm run build` — zero errors, zero warnings

## Out of Scope

- Graph visualization (D3.js) — PRD 05
- Graph RAG chat — PRD 06
- Data fetching from `knowledge_nodes` or `knowledge_edges` — PRD 02+
- Command palette (⌘K) — PRD 02
- Settings modal — PRD 03
- Right panel content — PRD 02+
- Nav rail expand-on-hover behavior — PRD 02
- Dark mode — Future
- Mobile responsive layout — Future
- Any database schema changes — Never in frontend PRDs
```
