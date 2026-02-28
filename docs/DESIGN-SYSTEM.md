---
name: synapse-design-system
description: The complete design system and brand language for Synapse, a personal knowledge graph platform. Use this skill whenever building, modifying, or reviewing any UI component, page, view, or visual element in the Synapse application. Trigger when the user mentions colors, fonts, typography, spacing, layout, cards, buttons, badges, entity styling, graph visualization, dark mode, light mode, theming, brand guidelines, or any visual design decision for Synapse. Also use proactively alongside frontend-design and ui-color-theory skills to ensure every design decision follows the Synapse brand system. This skill is the single source of truth for all visual decisions in the Synapse codebase.
---

# Synapse Design System

This document is the definitive design reference for the Synapse platform. Every UI component, page layout, color choice, and typographic decision in the codebase must follow these specifications. When in doubt, consult this document before making visual decisions.

## Brand Identity

### What Synapse Is

Synapse is a knowledge operating system that transforms scattered personal knowledge into an interconnected, queryable, visual system. It ingests diverse data sources (YouTube, meetings, documents, notes), extracts entities and relationships using AI, visualizes knowledge as an interactive graph, and enables Graph RAG querying.

### Positioning

Synapse is not a productivity tool, not an AI chatbot, not a note-taking app, and not a dashboard. It is infrastructure for AI agent fleets — a platform where every piece of information added makes every other piece more valuable.

**Tagline options:** "Your knowledge, connected." / "Stop organizing. Start understanding."

### Design Personality

The interface should feel like a clean, modern research tool — quiet, confident, and intelligent. The design recedes so the knowledge can advance. The aesthetic is closer to an architect's studio or a scientific instrument than a typical SaaS dashboard.

**Key qualities:** Clean, modern, neutral, precise, confident, warm-but-not-soft.

**The design is NOT:** Playful, trendy, dark/cyberpunk, overly colorful, decorative, or busy. It avoids generic AI aesthetics (purple gradients, neon glows, excessive dark mode).

### Target User

Intellectually ambitious professionals (28-45) operating across multiple domains simultaneously: founders, strategy consultants, VCs, research leads, senior product managers. They value depth over simplicity and will invest time in a powerful tool. They identify as synthesizers — looking for patterns, connections, and non-obvious relationships.

---

## Color System

The color system follows a strict hierarchy: 90-95% neutral with color used surgically for function. The interface is overwhelmingly white, gray, and black, with accent color appearing only on interactive elements and status indicators.

### Layer 1: Neutral Foundation

#### Backgrounds

The application uses a light mode foundation with clean, neutral backgrounds. No warm tinting, no cream, no beige. Pure neutral whites and grays.

| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--bg-frame` | `#f0f0f0` | rgb(240,240,240) | Nav rail, panels, structural frame — the darkest background layer |
| `--bg-content` | `#f7f7f7` | rgb(247,247,247) | Main content area behind cards |
| `--bg-card` | `#ffffff` | rgb(255,255,255) | Cards, elevated surfaces, topbar |
| `--bg-inset` | `#f0f0f0` | rgb(240,240,240) | Input fields, code blocks, recessed areas |
| `--bg-hover` | `#fafafa` | rgb(250,250,250) | Hover state on cards and list items |
| `--bg-active` | `#f0f0f0` | rgb(240,240,240) | Active/selected backgrounds (nav items) |

The approach is: slightly gray content background with white cards sitting on top. Cards read as "lifted" because they are the lightest element. The frame (nav, panels) is the same value as inset areas, creating a consistent structural layer.

#### Borders

Borders use pure black at low opacity. No warm tinting. Borders should be visible enough to separate elements but quiet enough that removing them would not break the layout.

| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `rgba(0,0,0,0.06)` | Default card borders, section dividers, subtle separations |
| `--border-default` | `rgba(0,0,0,0.10)` | Hover state borders, input field borders, stronger separations |
| `--border-strong` | `rgba(0,0,0,0.16)` | Modal borders, dropdown borders, high-emphasis separations |

Never use solid colored borders. Never use drop shadows as a primary means of card separation — if a shadow is needed, use `0 2px 8px rgba(0,0,0,0.04)` maximum.

#### Text Hierarchy

Text uses neutral blacks and grays. No warm or cool tinting. The hierarchy is built through three distinct values with pure black reserved only for the most critical headings.

| Token | Hex | Usage |
|---|---|---|
| `--text-primary` | `#1a1a1a` | Headings, entity names, important labels. Near-black but not pure black |
| `--text-body` | `#3d3d3d` | Paragraphs, descriptions, most interface copy. The workhorse value |
| `--text-secondary` | `#808080` | Timestamps, metadata, muted labels, supporting information |
| `--text-placeholder` | `#aaaaaa` | Placeholder text in input fields |

Never use pure `#000000` for text. Never use colored text for body copy. Entity type colors may be used for entity labels and badges only.


### Layer 2: Functional Accent — Blood Orange

The accent color is a deep, rich blood orange — sitting at the intersection of red and orange. It has full saturation and intensity. It is used sparingly and only on interactive or status-communicating elements.

**The accent is NOT:** Peach, salmon, copper, amber, terracotta, coral, or any muted/pastel variant. It is a decisive, saturated red-orange.

#### Accent Ramp

The accent is defined as a full ramp from lightest tint to darkest shade. Never use a single hex value in isolation — always pull from this ramp.

| Step | Hex | Usage |
|---|---|---|
| 50 | `#fff5f0` | Tinted backgrounds for selected/active states (e.g., active nav item bg, selected card bg) |
| 100 | `#ffe0cc` | Hover tint on interactive surfaces |
| 200 | `#ffb899` | Light badge fills, progress bar backgrounds |
| 300 | `#ff9466` | Secondary interactive highlights |
| 400 | `#e8703d` | Links, secondary buttons |
| **500** | **`#d63a00`** | **Primary — buttons, active nav indicator, key interactive elements. This is the brand color.** |
| 600 | `#b83300` | Hover state on primary buttons |
| 700 | `#9a2c00` | Active/pressed state on primary buttons |
| 800 | `#6e2000` | Dark accent for emphasis, dark backgrounds if needed |
| 900 | `#441400` | Darkest accent value |

The 500 value (`#d63a00`) is the primary brand color. It passes WCAG AA contrast with white text. All interactive accent usages should use 500 for default, 600 for hover, 700 for pressed/active.

#### Where Accent Color Appears

Accent color ONLY appears on:
- Primary action buttons (one per view maximum)
- Active navigation indicator (the small bar on the nav rail)
- The logo mark
- Selected filter pills and active toggle states
- Focus rings on interactive elements
- The "Explore with AI" primary action button
- Confidence bars and key metrics where emphasis is needed
- Cross-connection labels in feed cards

Accent color NEVER appears on:
- Backgrounds of large surfaces
- Card fills (except the barely-there 50 tint for selected states)
- Non-interactive decorative elements
- Icons (icons are neutral gray unless showing active state)
- Every button (only the single most important action per view)
- Text body copy
- Glows, gradients, or decorative shadows

#### Secondary Accent (Optional)

For links and informational elements that need differentiation from the primary accent, a muted steel blue may be used sparingly.

| Token | Hex | Usage |
|---|---|---|
| `--accent2-500` | `#4a7794` | Informational links, secondary interactive elements |
| `--accent2-600` | `#3d6580` | Hover state |

This is optional and should be used only when the blood orange accent would create confusion (e.g., a link in a destructive context).

### Layer 3: Semantic Colors

Semantic colors communicate status and meaning. They override brand expression — a delete button is always red regardless of the brand color.

| Semantic | Hex (50/500/700) | Usage |
|---|---|---|
| **Red** | `#fef2f2` / `#ef4444` / `#b91c1c` | Destructive actions (delete, remove), errors, failed states, Risk entity type |
| **Green** | `#f0fdf4` / `#22c55e` / `#15803d` | Success, completion, active/connected status, Project entity type |
| **Amber** | `#fffbeb` / `#f59e0b` / `#b45309` | Warnings, attention needed, pending states, anchor indicators |
| **Blue** | `#eff6ff` / `#3b82f6` / `#1d4ed8` | Informational states, Action entity type |

Each semantic color must exist as at minimum three values: a light tint (50) for backgrounds, a medium value (500) for icons and text, and a dark value (700) for emphasis. Color is never the sole indicator of meaning — always pair with icons, labels, or text.

### Layer 4: Entity Type Colors

Entity type colors are the primary chromatic elements in the interface. They communicate "what kind of thing is this" and are valid on non-interactive elements (dots, badges, graph nodes). These colors are slightly desaturated compared to their pure values to sit comfortably on light backgrounds.

| Entity Type | Hex | CSS Variable |
|---|---|---|
| Person | `#d97706` | `--e-person` |
| Organization | `#7c3aed` | `--e-org` |
| Topic | `#0891b2` | `--e-topic` |
| Project | `#059669` | `--e-project` |
| Goal | `#e11d48` | `--e-goal` |
| Decision | `#db2777` | `--e-decision` |
| Action | `#2563eb` | `--e-action` |
| Risk | `#dc2626` | `--e-risk` |
| Insight | `#7c3aed` | `--e-insight` |
| Idea | `#ca8a04` | `--e-idea` |
| Blocker | `#dc2626` | `--e-blocker` |
| Technology | `#0d9488` | `--e-tech` |
| Concept | `#4f46e5` | `--e-concept` |
| Question | `#ea580c` | `--e-question` |
| Anchor | `#b45309` | `--e-anchor` |
| Lesson | `#65a30d` | `--e-lesson` |

#### Entity Badge Styling

Entity badges use the entity color at very low opacity for the background fill, slightly higher opacity for the border, and the full color for text:

```css
.entity-badge {
  background: rgba([entity-color], 0.06);
  border: 1px solid rgba([entity-color], 0.16);
  color: var(--e-[type]);
  padding: 3px 9px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
}
```

Each badge includes a small colored dot (5px circle) before the label text.


---

## Typography

### Font Stack

Synapse uses a two-font system: a bold display font for headlines and a clean body font for everything else.

| Role | Font | Weights | Source |
|---|---|---|---|
| **Display** | Cabinet Grotesk | 500, 700, 800 | Fontshare (free) |
| **Body / UI** | DM Sans | 400, 500, 600, 700 | Google Fonts (free) |
| **Secondary Display** | Instrument Serif | 400 | Google Fonts (free) |

**Cabinet Grotesk** is the primary display font. It has tight proportions, high personality at heavy weights, and reads as confident and editorial. Use it for page headings, card titles, section labels, large metrics, and the logo wordmark.

**DM Sans** is the body and UI font. It is clean, geometric, highly legible at small sizes, and pairs well with the bolder display font. Use it for all body text, button labels, input text, metadata, badges, and any text that is not a heading.

**Instrument Serif** is a secondary display option for editorial or marketing contexts only. It may be used for the landing page tagline, briefing titles on the Home view, or the greeting message ("Good evening, Joseph"). It should never be used for UI elements, labels, or body text within the application.

### Type Scale

| Element | Font | Size | Weight | Tracking | Example |
|---|---|---|---|---|---|
| Page heading | Cabinet Grotesk | 24-28px | 800 | -0.03em | "Good evening, Joseph" |
| Section heading | Cabinet Grotesk | 18-20px | 700 | -0.02em | "Activity Feed" |
| Card title | Cabinet Grotesk | 14px | 700 | -0.01em | "InfoCert Partnership Call" |
| Large metric | Cabinet Grotesk | 28-36px | 800 | -0.03em | "847" (node count) |
| Body text | DM Sans | 13-14px | 400 | normal | Descriptions, summaries |
| UI label | DM Sans | 12px | 600 | normal | Button text, filter labels |
| Small label | DM Sans | 11px | 600 | normal | Badge text, metadata inline |
| Section label | Cabinet Grotesk | 10px | 700 | 0.08em | "CROSS-CONNECTIONS" (uppercase) |
| Metadata | DM Sans | 11-12px | 400-500 | normal | Timestamps, counts |
| Tiny/caption | DM Sans | 9-10px | 600 | normal | Confidence percentages, tag labels |

### Type Principles

1. **Headlines carry visual weight.** Use large, bold type as spatial landmarks — they should function as visual elements, not just text. The greeting, key metrics, and section headings should be noticeably larger than typical SaaS convention.

2. **Tracking tightens at large sizes.** Display font at 24px+ uses -0.03em letter-spacing. At 14px (card titles), use -0.01em. Body text uses normal tracking.

3. **Weight creates hierarchy, not color.** Differentiate importance through font weight (400 vs 600 vs 800) and the text color tokens (primary vs body vs secondary), never through colored text except for entity type labels.

4. **Section labels are uppercase and small.** All section labels (e.g., "CROSS-CONNECTIONS", "SOURCE", "TAGS") use Cabinet Grotesk at 10px, weight 700, uppercase, with 0.08em letter-spacing, in `--text-secondary` color.

---

## Spacing System

### Scale

All spacing uses a consistent 4px base unit:

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Minimum gap between inline elements |
| `sm` | 8px | Gap between badges, pills, small items |
| `md` | 16px | Card internal padding (top/bottom), gap between sections |
| `lg` | 24px | Card internal padding (left/right), panel padding, major section gaps |
| `xl` | 36px | Content area padding, major vertical rhythm between groups |
| `2xl` | 48px | Page-level top/bottom margins |

### Card Padding

Cards use `16px 22px` (md vertical, slightly more than lg horizontal). This creates comfortable reading width while maintaining vertical compactness.

### Content Width

The main content area has a maximum width of `840px`, centered within the available space. This prevents lines of text from becoming too long for comfortable reading.

### Vertical Rhythm

Feed cards are separated by `8px`. Design system sections are separated by `36px` with a border-top for visual breaks. The greeting area has `28px` bottom margin before content begins.

---

## Component Specifications

### Cards

Cards are the primary content container. They use white background on the light gray content area.

```css
.card {
  background: var(--bg-card);        /* #ffffff */
  border: 1px solid var(--border-subtle);  /* rgba(0,0,0,0.06) */
  border-radius: 12px;
  padding: 16px 22px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.card:hover {
  border-color: var(--border-default);  /* rgba(0,0,0,0.10) */
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
```

Cards never have shadows by default. The hover shadow is extremely subtle. Cards never have colored backgrounds (except the barely-there accent-50 tint for selected states).

### Buttons

Buttons follow a strict hierarchy through visual weight. The more important a button, the bolder its treatment.

| Level | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Primary** | `--accent-500` (#d63a00) | White | None | Single most important action per view. Has `box-shadow: 0 2px 8px rgba(214,58,0,0.2)` |
| **Secondary** | `--text-primary` (#1a1a1a) | White | None | Important but not primary actions |
| **Tertiary** | `--bg-inset` (#f0f0f0) | `--text-body` | `--border-default` | Standard multi-purpose buttons |
| **Ghost** | Transparent | `--accent-500` | None | Text links, underlined with `text-underline-offset: 3px` |

Button border-radius is `8px`. Padding is `10px 22px`. Font is DM Sans at 13px, weight 600.

### AI Action Buttons

AI-powered actions in the right panel use a distinct style:

```css
.ai-action-primary {
  background: var(--accent-50);       /* #fff5f0 */
  border: 1px solid var(--accent-border);  /* rgba(214,58,0,0.15) */
  color: var(--accent-600);           /* #b83300 */
  font-weight: 600;
  border-radius: 8px;
  padding: 10px 14px;
  width: 100%;
}

.ai-action-secondary {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  color: var(--text-body);
  font-weight: 500;
}
```

The primary AI action ("Explore with AI") uses the accent-50 tint. Secondary AI actions ("Re-link", "Find Similar") use neutral styling.

### Filter Pills

```css
.filter-pill {
  padding: 5px 13px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
}

.filter-pill.active {
  background: var(--accent-50);
  border-color: rgba(214,58,0,0.15);
  color: var(--accent-500);
}
```

### Input Fields

```css
.input-field {
  padding: 9px 13px;
  border-radius: 8px;
  background: var(--bg-inset);        /* #f0f0f0 — recessed appearance */
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-body);
}

.input-field:focus {
  border-color: rgba(214,58,0,0.3);
  box-shadow: 0 0 0 3px var(--accent-50);
}
```

Input fields use the inset/frame background color to appear recessed into the surface.

### Toggle Groups

```css
.toggle-group {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: var(--bg-inset);
  border: 1px solid var(--border-subtle);
}

.toggle-item {
  flex: 1;
  padding: 8px 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.toggle-item.active {
  background: var(--bg-card);     /* white — pops out of the recessed container */
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
```

### Confidence Bars

```css
.confidence-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-inset);
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent-500);  /* blood orange */
}
```

### Connection Relationship Tags

The small inline tags showing relationship types (e.g., "supports", "enables", "part_of"):

```css
.relationship-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--bg-inset);
  color: var(--text-secondary);
  font-size: 9px;
  font-weight: 600;
}
```

### Source Type Icons

Source type icons are displayed in small containers with a very light tint of the source category color:

```css
.source-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

/* Meeting sources */
.source-icon.meeting { background: rgba(37,99,235,0.07); }

/* YouTube sources */
.source-icon.youtube { background: rgba(220,38,38,0.07); }

/* Research sources */
.source-icon.research { background: rgba(124,58,237,0.07); }

/* Note sources */
.source-icon.note { background: rgba(5,150,105,0.07); }

/* Document sources */
.source-icon.document { background: rgba(217,119,6,0.07); }
```


---

## Layout Architecture

### Three-Pane Structure

The application uses a fixed three-pane layout:

```
┌──────┬─────────────────────────────┬────────────┐
│      │                             │            │
│ Nav  │       Center Stage          │   Right    │
│ Rail │                             │   Panel    │
│      │                             │            │
│ 56px │        flex: 1              │   310px    │
│      │                             │            │
└──────┴─────────────────────────────┴────────────┘
```

| Pane | Width | Background | Purpose |
|---|---|---|---|
| **Nav Rail** | 56px fixed | `--bg-frame` (#f0f0f0) | Primary navigation, logo, search, settings |
| **Center Stage** | Flexible (fills remaining) | `--bg-content` (#f7f7f7) | Main content area with topbar |
| **Right Panel** | 310px fixed | `--bg-card` (#ffffff) | Contextual detail, node info, actions |

The app fills the full viewport height (`100vh`) with no scrolling on the outer shell. Only the center content area and right panel scroll internally.

### Nav Rail

The nav rail is the leftmost structural element. It contains the logo at the top, primary nav items in the middle, and utility items (search, settings) at the bottom.

```
Logo (S mark, 30x30px, accent-500 bg, white text, 8px radius)
  ↕ 28px gap
Home (active: accent-50 bg, accent-500 icon, left indicator bar)
Explore
Ask
Ingest
Automate
  ↕ flex spacer
Search (⌘K)
Settings
```

**Active nav item:** Background uses `--accent-50` (#fff5f0). Icon stroke uses `--accent-500`. A 3px × 16px bar in `--accent-500` appears on the left edge (positioned at `left: -11px` from the button, with `border-radius: 0 2px 2px 0`).

**Inactive nav item:** No background. Icon stroke uses `--text-secondary`. On hover, background becomes `rgba(0,0,0,0.04)` and icon stroke shifts to `--text-body`.

Nav buttons are 40×40px with 10px border-radius.

### Topbar

The topbar sits at the top of the center stage. Height is 50px. Background is `--bg-card` (white). It contains the view title on the left and metadata + avatar on the right, separated by `border-bottom: 1px solid var(--border-subtle)`.

The view title uses Cabinet Grotesk at 15px, weight 700. The metadata (e.g., "847 nodes · 1,234 edges") uses DM Sans at 12px in `--text-secondary`.

The user avatar is a 28px circle with a gradient from `--accent-500` to a lighter orange, containing the user's initial in white, Cabinet Grotesk, 11px, weight 700.

### Center Content Area

The content area has `padding: 32px 36px` and an inner container with `max-width: 840px; margin: 0 auto`. This ensures comfortable reading width regardless of screen size.

### Right Panel

The right panel has `padding: 24px`. Its background is white (`--bg-card`) with a left border of `1px solid var(--border-subtle)`. It has no accent glow, no decorative gradient — just clean white with content hierarchy created through typography.

---

## Views

### Home View

The Home view is the default landing view showing recent activity and AI-generated briefings.

**Structure:**
1. Greeting heading — Cabinet Grotesk, 26px, weight 800. Format: "Good evening, [Name]"
2. Summary line — DM Sans, 13px, `--text-secondary`. Format: "3 sources processed today · 33 new entities · 42 relationships discovered"
3. Insight banner (conditional) — accent-50 background, accent border, with lightning bolt icon in accent-500. Shows AI-discovered connections.
4. Feed/Briefings toggle — toggle group component
5. Feed cards — chronological list of processed sources with extracted entities

**Feed cards contain:**
- Source type icon (emoji in a tinted container)
- Source title (Cabinet Grotesk, 14px, weight 700)
- Timestamp (DM Sans, 11px, `--text-secondary`)
- Entity/relation counts (DM Sans, 11px, `--text-secondary`)
- Summary text (DM Sans, 13px, `--text-body`)
- Entity badges (styled per entity badge specification)
- Cross-connections section (below a subtle border-top divider)

### Explore View

The Explore view has two tabs: Graph and Browse.

**Graph tab** uses a source-anchor level abstraction rather than showing individual entities:
- Sources rendered as rounded rectangles with type icons
- Anchors rendered as circles
- Edges show source-to-anchor relationships with thickness indicating entity density
- Click to select and show detail in right panel
- Double-click to expand entity cluster around the node
- Scope selector: Overview, Anchors Only, Sources Only

**Browse tab** shows a filterable table/card view of all entities:
- Dropdown filter selectors (Entity Type, Source, Anchor, Tags, Confidence slider)
- Active filters shown as dismissible chips
- Table columns: Entity (with expand chevron), Type, Anchors, Source, Tags, Confidence, Connections (with mini bar), Time
- Expandable rows showing top connections and quick actions (Explore with AI, Re-link, Find Similar)
- Card view alternative with entity badges and anchor indicators

### Ask View

Chat interface for Graph RAG querying. Left side is the conversation, right panel shows source chunks and cited entities.

### Ingest View

Quick capture with text area, URL input, and file upload. Advanced extraction settings (mode, emphasis, anchors, custom guidance). History tab showing processing status.

### Automate View

Integration cards for connected services (meeting transcripts, YouTube channels, etc.) with status indicators and configuration.

---

## Interaction Patterns

### Hover States

All hover transitions use `0.15s-0.18s ease` timing. Hover states are subtle — they communicate interactivity without being distracting.

- **Cards:** Border darkens from `--border-subtle` to `--border-default`, 1px upward translate, barely-there shadow
- **Nav items:** Light background tint appears, icon darkens
- **List items (connections, etc.):** Background shifts to `--bg-hover`
- **Buttons:** Background shifts one step darker (follow the accent ramp for colored buttons)

### Focus States

All interactive elements must have visible focus indicators for keyboard accessibility:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--accent-50);
  border-color: rgba(214,58,0,0.3);
}
```

### Animations

Page content uses staggered fade-up animations on load:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Each sequential element adds 0.05s delay (first item: 0s, second: 0.05s, third: 0.1s, etc.). Duration is 0.4s with ease timing. Maximum stagger depth is 6-7 items.

No bouncy or playful animations. All motion is measured and purposeful — like a confident gesture, not a wave.

---

## Graph Visualization Design

### Source-Anchor Level (Default View)

The primary graph view shows sources and anchors, not individual entities. This prevents the "hairball" problem at scale.

**Source nodes:** Rounded rectangles (wider than tall). Background uses source type color at 7-15% opacity. Border uses source type color at 30% opacity. Contains the source type emoji and a label beneath. Size varies slightly by entity count.

**Anchor nodes:** Circles. Background uses anchor/entity color at 10-18% opacity. Border uses entity color at 40% opacity. Contains ⚓ symbol. Label and connection count beneath.

**Edges:** Curved (quadratic bezier) lines connecting sources to anchors. Stroke width maps to shared entity count (1px minimum, 5px maximum). Default color is `rgba(0,0,0,0.08)`. On hover (when either connected node is hovered), edges highlight to `rgba(214,58,0,0.3)` and show an entity count label at the midpoint.

**Expanded entity cluster:** When a node is double-clicked, its constituent entities fan out in a radial pattern around the parent. Each entity is a small dot (6px radius) colored by entity type. Thin lines connect each entity dot back to the parent. Entity labels appear in DM Sans at 8px.

### Dot-Matrix Inspiration

For future iterations, consider a dot-matrix/field visualization approach inspired by scientific data plots: entities as dots of varying sizes on a clean white field, with size mapping to connection count, opacity mapping to confidence/relevance, and color mapping to entity type. Anchors rendered as solid black dots. Relationships shown through proximity and clustering rather than drawn lines, with connections revealed on interaction only. This approach is cleaner at scale and more visually distinctive.

---

## Dark Mode (Future)

Dark mode is not part of the initial release. When implemented, it must be built as a separate considered palette, not an inversion of the light palette. Key principles from the ui-color-theory skill:

- Double the value distance between background layers compared to light mode
- Surfaces get lighter as they elevate (cards lighter than content area)
- Text uses light gray (~85-90% white), not pure white, to reduce eye strain
- Accent shifts to the 300-400 range from the ramp for legibility on dark backgrounds
- Borders brighten to 15-25% white
- Entity type colors may need saturation adjustment for dark backgrounds

---

## Accessibility Requirements

### Contrast Ratios

All text must pass WCAG AA minimum contrast ratios:
- Normal text (under 18px): 4.5:1 against background
- Large text (18px+ or 14px bold+): 3:1 against background
- UI components and graphical objects: 3:1 against adjacent colors

### Color Independence

Color is never the sole indicator of meaning. Entity types are identified by both color dot AND text label. Error states include both red color AND error icon/text. Success states include both green AND a checkmark/confirmation.

### Focus Visibility

All interactive elements must have visible focus indicators. Never rely on the browser default focus ring.

---

## File and Import References

### Font Imports

```html
<!-- Cabinet Grotesk from Fontshare -->
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap" rel="stylesheet">

<!-- DM Sans from Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Instrument Serif (secondary, optional — for editorial/marketing use) -->
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap" rel="stylesheet">
```

### CSS Variable Block

This is the complete set of CSS custom properties for the Synapse design system:

```css
:root {
  /* Backgrounds */
  --bg-frame: #f0f0f0;
  --bg-content: #f7f7f7;
  --bg-card: #ffffff;
  --bg-inset: #f0f0f0;
  --bg-hover: #fafafa;
  --bg-active: #f0f0f0;

  /* Borders */
  --border-subtle: rgba(0,0,0,0.06);
  --border-default: rgba(0,0,0,0.10);
  --border-strong: rgba(0,0,0,0.16);

  /* Text */
  --text-primary: #1a1a1a;
  --text-body: #3d3d3d;
  --text-secondary: #808080;
  --text-placeholder: #aaaaaa;

  /* Accent — Blood Orange */
  --accent-50: #fff5f0;
  --accent-100: #ffe0cc;
  --accent-200: #ffb899;
  --accent-300: #ff9466;
  --accent-400: #e8703d;
  --accent-500: #d63a00;
  --accent-600: #b83300;
  --accent-700: #9a2c00;
  --accent-800: #6e2000;
  --accent-900: #441400;

  /* Semantic */
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

  /* Entity Types */
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

  /* Typography */
  --font-display: 'Cabinet Grotesk', -apple-system, sans-serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-editorial: 'Instrument Serif', Georgia, serif;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 36px;
  --space-2xl: 48px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

---

## Quick-Reference Checklist

When building or reviewing any Synapse UI:

**Colors:**
- [ ] Backgrounds are neutral white/gray only (#f0f0f0, #f7f7f7, #ffffff)
- [ ] No warm tinting, no cream, no beige, no peach anywhere in backgrounds
- [ ] Accent (#d63a00) appears only on interactive elements and active states
- [ ] Only one primary-accent button per view
- [ ] Entity badges use correct type colors at 6% bg / 16% border opacity
- [ ] All text passes WCAG AA contrast ratios

**Typography:**
- [ ] Headings use Cabinet Grotesk with tight letter-spacing
- [ ] Body/UI text uses DM Sans
- [ ] Text hierarchy uses three values only (primary, body, secondary)
- [ ] No pure black (#000000) text — use #1a1a1a maximum
- [ ] Section labels are uppercase, 10px, Cabinet Grotesk, weight 700

**Components:**
- [ ] Cards have subtle borders, no default shadows
- [ ] Hover states are subtle (0.18s ease, barely-there shadow)
- [ ] Inputs use inset/recessed background (#f0f0f0)
- [ ] Focus states use accent-50 ring with accent border
- [ ] Buttons follow the 4-level hierarchy (primary → secondary → tertiary → ghost)

**Layout:**
- [ ] Three-pane structure maintained (56px + flex + 310px)
- [ ] Content area max-width is 840px, centered
- [ ] Consistent spacing from the spacing scale
- [ ] No decorative glows, gradients, or shadows

**Icons:**
- [ ] Icons are monochrome gray (stroke only, no fill)
- [ ] Icons use `--text-secondary` color by default
- [ ] Only active-state icons use `--accent-500`
- [ ] No color on icons unless communicating active/selected state
