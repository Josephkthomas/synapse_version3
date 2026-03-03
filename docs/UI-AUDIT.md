# UI-AUDIT.md — Synapse V2 Interface Quality Standards & Remediation Guide

## Purpose

This document serves as a **persistent reference** for every PRD implementation in Synapse V2. It catalogs known UI defects, establishes enforceable quality rules that go beyond the design system's specifications, and provides concrete remediation patterns. Every component built or modified must pass the checks in this document before being considered complete.

The design system (`DESIGN-SYSTEM.md`) defines *what* things should look like. This document defines *how to avoid the ways they go wrong* — the gaps between specification and implementation that produce a cheap, unfinished feel.

---

## Part 1: Active Defect Catalog

Each defect is tagged with severity, affected view(s), root cause category, and resolution status.

---

### 1.1 — Nav Rail: Logo and Top Icon Collision

**Severity:** High — visible on every page, first thing users see.
**Views affected:** All.
**Category:** Spacing / Structural Padding.

**Problem:** The Synapse logo mark and the first nav item (Home icon) sit too close together vertically. The logo appears to collide with the nav icons rather than sitting in its own header zone.

**Root cause:** Insufficient vertical gap between the logo container and the nav item group. The design system specifies a 28px gap after the logo, but the implementation either omits this or the logo container's own padding is eating into it.

**Remediation:**
- The logo container must have a fixed height of 52px with the logo centered vertically within it.
- Below the logo container, add a `28px` gap before the first nav icon.
- The logo container should have a subtle `border-bottom: 1px solid var(--border-subtle)` to create visual separation from the navigation zone.
- Nav icons begin in their own flex group with `gap: 4px` between items.

**Verification:** Visually, the logo should breathe — there must be clear daylight between the logo mark and the Home icon. A user should never perceive them as a single group.

---

### 1.2 — Topbar: Avatar Too Close to Right Edge

**Severity:** Medium — visible on every page.
**Views affected:** All.
**Category:** Spacing / Edge Padding.

**Problem:** The user avatar circle (top-right) sits too close to the right edge of the viewport. When the right panel is visible, the avatar crowds against the right panel's left border.

**Remediation:**
- Topbar horizontal padding must be `24px` on both sides.
- The avatar specifically needs an additional `4px` optical margin on the right because circular elements at edges read as closer than rectangular ones.
- Implementation: Topbar right side should be `padding-right: 24px` on the container, with the avatar being the last element. No additional negative margins.

**Verification:** The gap between the avatar's right edge and the topbar's right boundary should be visually identical to the gap between the search input's left edge and the topbar's left boundary.

---

### 1.3 — Page Title Placement & Vertical Space Efficiency

**Severity:** High — creates a disjointed, unpolished feel across every view.
**Views affected:** All.
**Category:** Structural Redundancy / Vertical Space Waste.
**Resolution:** RESOLVED — Page title in topbar + full-width control bar pattern. No standalone title rows in content area.

**Problem (original):** Every view showed the page name twice (topbar + content area heading), wasting vertical space. A dedicated title row inside the content area compressed the actual functional content.

**Decision:** Move the page title into the topbar (to the right of the Synapse logo). Remove all standalone title/subtitle blocks from content areas. Each view's filters, toggles, and stats live in a **full-width control bar** immediately below the topbar, above the 2:1 column split. This eliminates wasted vertical space.

**Topbar after remediation:**

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Pipeline    🔍 Search graph...       2,482 nodes · 1,885 edges  A │
    └─────────────────────────────────────────────────────────────────────┘

- Height: **52px**, `background: var(--color-accent-50)` (light orange), `border-bottom: 1px solid var(--border-subtle)`.
- Left side: Page title (Cabinet Grotesk 15px/700, `--text-primary`), positioned next to the Synapse logo.
- Center: Search input (DM Sans 13px, semi-transparent white bg). Connects to ⌘K command palette.
- Right side: Node/edge count metadata (DM Sans 12px, `--text-secondary`) + user avatar (28px circle, 4px optical margin-right).
- The VIEW_TITLES mapping in `TopBar.tsx` provides the title for each route.

---

### 1.3a — Title and Content Horizontal Misalignment

**Severity:** High — directly caused by 1.3, persists even after title deduplication.
**Views affected:** All.
**Category:** Horizontal Alignment / Content Centering.

**Problem:** Content elements across views start at different horizontal positions. The topbar used one padding system (`padding: 0 24px` full-width), the content area uses another (`max-width: 840px; margin: 0 auto; padding: 32px 36px`). This means the topbar search/metadata and the content below don't share the same left edge.

**Remediation:** See Rule 2.2 (Content Column Alignment). The topbar's inner content must use the same max-width centering as the content area. The search input left edge must align with the page title left edge.

---

### 1.4 — Explore View: Primary Filter Toggle (Anchors/Entities/Sources) Styling

**Severity:** High — the primary navigation mode for the Explore view.
**Views affected:** Explore.
**Category:** Component Hierarchy / Visual Prominence.

**Problem:** The Anchors / Entities / Sources toggle is the primary navigation within the Explore view. In the current build, it uses a toggle group with the active item styled in solid `--accent-500` (blood orange fill, white text). While this is more visible than the previous Graph/Browse text links, the styling and filter naming need standardization (see 1.5).

**Current state:** RESOLVED — The primary toggle now uses standard pill buttons matching the gold standard (Automate/Orient). The old segmented ToggleGroup with solid accent-500 fill has been replaced with individual pill buttons: `borderRadius: 20`, `padding: 5px 13px`, `fontSize: 12`, active state uses `accent-50` bg + `accent-500` text (same as every other control bar pill). This ensures visual consistency across all views.

**Remediation (implemented):**
- Primary toggle (Anchors / Entities / Sources): Individual pill buttons with standard pill styling (see Rule 2.1 button specs). Active pill: accent-50 bg, accent-500 text. Inactive pill: transparent bg, text-secondary color.
- Filter dropdowns (Anchors, Entity Types, etc.): Same pill styling as all other dropdown trigger buttons. Separated by vertical dividers.
- Time range pills (7 days, 30 days, All): Individual pill buttons with same styling. No longer a ToggleGroup — replaced with standalone pills for visual consistency.

---

### 1.5 — Explore View: Filter Naming Inconsistency Across Sub-Views

**Severity:** High — confusing and unprofessional.
**Views affected:** Explore (all sub-views).
**Category:** Naming / Standardization.

**Problem:** The filter dropdown labels change depending on which primary tab is active:
- In "Anchors" view: shows "Entity Types" as the only filter dropdown.
- In "Entities" view: shows "Source Types" and "Connection Types" as filters.
- In "Sources" view: shows "Source" (abbreviated, inconsistent with "Source Types" in Entities).

This inconsistency means users can't build a mental model of the filter system. The same concept ("what source did this come from?") is labeled differently in different contexts.

**Remediation — Standardized Filter Taxonomy:**

Every sub-view gets the same filter bar structure. Filters that don't apply to a given sub-view are either hidden or disabled (grayed out with tooltip "Not applicable in this view").

| Filter Label | What It Filters | Available In |
|---|---|---|
| **Anchors** | Filter by which anchor(s) content relates to | Entities, Sources |
| **Entity Types** | Filter by entity ontology type (Person, Topic, etc.) | Anchors, Entities |
| **Source Types** | Filter by ingestion source type (YouTube, Meeting, Document, etc.) | Entities, Sources |
| **Tags** | Filter by user-assigned or AI-generated tags | Entities |
| **Confidence** | Minimum confidence threshold slider | Entities |

**Naming rules:**
- Always use the full label: "Entity Types", not "Entities" or "Type".
- Always use the full label: "Source Types", not "Source" or "Sources" (which conflicts with the primary toggle label).
- "Anchors" (the filter) is always labeled "Anchors" — never "Anchor" singular.
- "Tags" — always "Tags".
- "Confidence" — shown as a slider or ">= X%" chip, not a dropdown.
- The primary toggle tabs ("Anchors", "Entities", "Sources") refer to *what you're browsing*. The filter dropdowns refer to *how you're filtering*. These are different namespaces and should never be confused.

**Verification:** Switch between all three Explore sub-views. The filter labels that appear should match the table above exactly. No filter should change its label based on context.

---

### 1.6 — Right Panel: Text Overflow / Container Breakout

**Severity:** High — looks broken and unprofessional.
**Views affected:** Ask (Context panel), potentially any right panel content.
**Category:** Overflow Handling / Container Constraints.

**Problem:** Text in the right panel overflows its container, extending beyond the panel boundaries. The "CONTEXT" header and section content break out of their parent container, creating a visually broken appearance.

**Root cause:** Missing `overflow` constraints, missing `max-width` on text containers, or the panel's padding not being properly accounted for by child elements.

**Remediation — apply all of these as baseline right panel rules:**
- Right panel root: `width: 310px; padding: 24px; overflow-y: auto; overflow-x: hidden;`
- All text containers inside: `max-width: 100%; overflow-wrap: break-word; word-break: break-word;`
- Section headers inside panel: Use the standard section label style, with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` if there's any risk of length.
- Every child element: `min-width: 0;` (critical for flex children to prevent blowout).
- Box-sizing check — children with borders or padding must not exceed the panel's inner width of `310px - 48px = 262px`.

**Verification:** Resize the browser to minimum supported width (1280px). Load content with long entity names (20+ characters). No text should visually exceed the right panel's border line.

---

### 1.7 — Settings Modal: Static Input Fields Don't Accommodate Content

**Severity:** Medium — frustrating for users with detailed profiles.
**Views affected:** Settings -> Profile tab.
**Category:** Dynamic Sizing / Content Accommodation.

**Problem:** Text fields for Professional Context, Personal Interests, and Processing Preferences have fixed heights. When users enter substantial content, the text is clipped.

**Remediation:**
- All multi-line fields must use **auto-expanding textareas** that grow with content.
- Minimum height: `80px` (approximately 3 lines).
- Maximum height: `240px` — beyond this, the textarea scrolls internally.
- The textarea should have a subtle resize handle (`resize: vertical`) as a fallback.
- Styling: `background: var(--bg-inset); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px; font-family: var(--font-body); font-size: 13px; line-height: 1.5;`

**Verification:** Enter 200+ characters into Professional Context. The field should grow smoothly. The Save button should remain visible without scrolling the modal.

---

### 1.8 — Home View: Excessive White Space / Underutilized Real Estate

**Severity:** Medium.
**Views affected:** Home.
**Category:** Layout Density / Feature Utility.
**Resolution:** RESOLVED in current build — stat cards and insight banner now implemented.

**Current state:** The Home view now shows a greeting, activity summary, four stat cards (Nodes, Edges, Sources, Anchors), a cross-connection insight banner, and the Feed/Briefings toggle with feed cards. This is the correct density.

**Stat cards spec (for reference):**
- Four stat cards in a horizontal row with `gap: 12px`.
- Each card: `background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px 20px;`
- Number: Cabinet Grotesk, 28px, weight 800, `--text-primary`, letter-spacing -0.03em.
- Label: DM Sans, 11px, weight 500, `--text-secondary`.
- Cards flex equally: `flex: 1; min-width: 0;`

---

### 1.9 — Right Panel Divider Line Inconsistency

**Severity:** Medium — breaks the sense of structural integrity across views.
**Views affected:** Home vs. Explore (and potentially all views).
**Category:** Structural Consistency / Border Treatment.

**Problem:** The vertical divider line between the center stage and the right panel behaves differently across views. On the Home view, the right panel's left border extends the full height of the viewport. On the Explore view, the divider appears cut off, not reaching the bottom.

**Root cause:** The right panel's left border is applied to the panel element itself, but the panel's height varies depending on its content. If content is short, the border only extends as far as the content.

**Remediation:**
- The right panel must be `height: 100%` (filling the full height of the layout container), regardless of content length.
- Implementation: The three-pane layout container is `display: flex; height: 100vh;`. The right panel is `width: 310px; min-height: 100%; border-left: 1px solid var(--border-subtle); overflow-y: auto;`.
- The right panel's content scrolls independently, but the panel itself (and its border) always fills the viewport height.

**Verification:** Navigate between Home, Explore, and Ask. The right panel's left border must be a continuous vertical line from the topbar to the bottom of the viewport on every view, regardless of content length.

---

### 1.10 — Nav Rail Expand/Collapse Causes Graph Re-render

**Severity:** High — performance and UX disruption on the most complex view.
**Views affected:** Explore (Graph sub-view), potentially Explore (Source/Anchor cards).
**Category:** Performance / Layout Stability.

**Problem:** When the nav rail expands from 56px to 190px on hover, the center stage's available width changes. This triggers a resize of the graph canvas, which currently causes D3 to re-initialize or re-render the force simulation. For the Explore graph (which may have 2,400+ nodes and 1,800+ edges), this is expensive — the graph "jumps," nodes scatter, and the user loses their spatial context.

**Root cause:** The center stage uses `flex: 1`, so any change to the nav rail's width immediately changes the center stage width. The graph canvas listens for container resize and re-renders.

**Remediation — two-part fix:**

**Part A: Nav rail overlays instead of pushing.** Change the expanded nav rail from a width change (which reflows the layout) to a `position: absolute` overlay. The outer nav rail element always reserves 56px in the flex layout. The inner element is positioned absolutely and animates its width without affecting the layout. See Rule 2.9 and Pattern 4.4 for implementation details.

**Part B: Graph canvas resize debouncing (defense in depth).** Even with Part A, the graph should be resilient to container resizes from other causes (browser resize, right panel toggle). Key principle: resize should SCALE the existing graph, not regenerate it. The D3 force simulation positions are preserved; only the viewport transform changes. The simulation is NOT restarted. See Pattern 4.5 for implementation.

**Verification:** Hover over the nav rail while the Explore graph is visible. The graph should not visibly jump, re-scatter, or flash. The nav rail label text appears as an overlay. Moving the mouse away collapses the rail without any graph disturbance.

---

## Part 2: Structural Quality Rules

These rules apply to **every component and view** in the project. They supplement the design system with implementation-level enforcement.

---

### 2.1 — Page Title in Topbar + Full-Width Control Bar

**Rule:** Every view's title lives in the topbar. There are NO standalone title/subtitle rows inside the content area. Each view has a full-width control bar below the topbar containing view-specific controls.

**Topbar title specification:**
- Font: Cabinet Grotesk
- Size: 15px
- Weight: 700
- Color: `--text-primary`
- Letter-spacing: -0.01em
- Position: Left side of topbar, immediately after the Synapse logo

**VIEW_TITLES mapping** (in `TopBar.tsx`): `/` → Home, `/explore` → Explore, `/ask` → Ask, `/capture` → Capture, `/automate` → Automate, `/orient` → Orient, `/pipeline` → Pipeline

**Full-width control bar** (below topbar, above the 2:1 column split):
- Spans the entire viewport width (across both left and right columns)
- **Gold standard references:** Automate and Orient views — all other views must match these exactly

**Control bar container rules (non-negotiable, hard-coded pixel specs):**
1. **Height:** `height: 44px` (fixed) for simple bars (Ask StatusBar, Home GreetingHeader). `minHeight: 44px` for bars with potentially wrapping content (Explore, Pipeline). Never shorter, never taller without wrapping.
2. **Padding:** `padding: '0 24px'` for fixed-height bars, `padding: '8px 24px'` for minHeight bars
3. **Gap:** `gap: 8px` between all elements
4. **Full width:** Must span across BOTH the left and right columns (positioned above the 2:1 split, not inside either column)
5. **Background:** `background: var(--color-bg-card)`
6. **Border:** `borderBottom: 1px solid var(--border-subtle)`
7. **Flex:** `display: flex`, `align-items: center`, `flex-shrink: 0`

**Control bar button/pill rules (non-negotiable, hard-coded pixel specs):**
1. **Border radius:** `borderRadius: 20px` — ALL buttons in control bars use rounded pill edges. `borderRadius: 8` is WRONG. This applies to filter pills, mode switchers, dropdown triggers, toggle buttons, search inputs, and any other interactive element in the control bar.
2. **Padding:** `padding: 5px 13px` — exactly these values for all pill buttons and dropdown trigger buttons
3. **Font family:** `font-family: var(--font-body)` (DM Sans) — via `className="font-body font-semibold"`
4. **Font size:** `fontSize: 12px` — exactly 12px for all text in control bar elements (pills, dropdown triggers, stats, labels). Never 11px or 13px.
5. **Font weight:** `fontWeight: 600` (semibold) — via `font-semibold` class
6. **Active state:** `border: 1px solid rgba(214,58,0,0.15)`, `background: var(--color-accent-50)`, `color: var(--color-accent-500)`
7. **Inactive state:** `border: 1px solid var(--border-subtle)`, `background: transparent`, `color: var(--color-text-secondary)` — NEVER use `--color-text-body` (which is darker)
8. **Stats/metadata text:** `fontSize: 12px`, `font-body`, `color: var(--color-text-secondary)`
9. **Divider between sections:** `width: 1px`, `height: 24px`, `background: var(--border-subtle)`, `flexShrink: 0`
10. **Dropdown trigger buttons:** Same specs as pills (5px 13px padding, borderRadius 20, fontSize 12, font-semibold). ChevronDown icon: `size={12}`. Inactive color: `--color-text-secondary` NOT `--color-text-body`.
11. **Search inputs in control bar:** `borderRadius: 20px`, `padding: 5px 26px 5px 28px`, `fontSize: 12px`, `border: 1px solid var(--border-subtle)`, `background: var(--color-bg-inset)`
12. **Icon-only toggle buttons (grid/list):** `width: 26px`, `height: 26px`, `borderRadius: 20px`, icon `size={12}`

**Per-view control bar contents:**

| View | Control Bar Contents |
|---|---|
| Home | Compact GreetingHeader (greeting DM Sans 12px/600 + daily stats 12px inline, separated by divider) |
| Explore | ExploreToolbar (view toggle DM Sans 12px/600 + filter dropdowns + time range pills) |
| Ask | StatusBar (RAG status dot + label 12px/600 + stats 12px + New chat pill button) |
| Capture | Mode switcher pill buttons (Text / URL / Document / Transcript) with icons |
| Automate | Filter pills + stats strip + Connect Source button |
| Orient | Filter pills + digest stats + New Digest button |
| Pipeline | Source/Status/Sort filter pill dropdowns + stats strip |

**View structure pattern:**
```tsx
<div className="flex flex-col h-full">
  <ControlBar />  {/* full-width, above the split */}
  <div className="flex flex-1 overflow-hidden">
    <LeftColumn />
    <DragHandle />
    <RightColumn />
  </div>
</div>
```

---

### 2.2 — Content Column Alignment

**Rule:** Within any single view, all content must align to the same left edge. The topbar's inner content and the view content below must share the same horizontal reference frame.

**Implementation — the ContentColumn wrapper:**

```tsx
// components/layout/ContentColumn.tsx
interface ContentColumnProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;  // For views like Explore Graph that need full bleed
}

export const ContentColumn: React.FC<ContentColumnProps> = ({
  children,
  className,
  fullWidth = false,
}) => (
  <div
    className={`w-full ${fullWidth ? '' : 'mx-auto max-w-[840px] px-[36px]'} ${className ?? ''}`}
  >
    {children}
  </div>
);
```

**Topbar alignment:** The topbar's inner content must use the same `max-width: 840px; margin: 0 auto; padding: 0 36px` as the content area. The search input and metadata sit within this centered column.

**Exception — full-bleed views:** The Explore Graph view needs the canvas to fill all available horizontal space. In this case, the title and filter bar still use `ContentColumn`, but the graph canvas below breaks out to `fullWidth`. The title's left edge still aligns with the topbar content.

    ┌─ Topbar ──────────────────────────────────────────────┐
    │    [Search...]                     [2,482 nodes]  [A] │  <- max-width: 840px inner
    ├───────────────────────────────────────────────────────┤
    │    Explore                                            │  <- max-width: 840px
    │    [Anchors] [Entities] [Sources]  | Filters...       │  <- max-width: 840px
    ├───────────────────────────────────────────────────────┤
    │                                                       │
    │              [ Full-bleed graph canvas ]               │  <- 100% width
    │                                                       │
    └───────────────────────────────────────────────────────┘

---

### 2.3 — Container Overflow Prevention

**Rule:** No child element may visually exceed its parent container's bounds.

Every container that could receive dynamic content must have overflow protection. Apply `min-width: 0` to all flex children. Apply `overflow-wrap: break-word` to all text in constrained containers. Apply `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to single-line truncatable text.

**Special attention areas:** Right panel (262px usable width), entity badge labels, relationship tags, source titles in feed cards, filter pill labels.

---

### 2.4 — Edge Padding Minimums

**Rule:** No interactive or content element may sit closer than 16px to the viewport edge or a structural boundary.

| Zone | Minimum padding to nearest content |
|---|---|
| Nav rail top (above logo) | 12px |
| Nav rail sides (icon to left/right edge) | 8px |
| Topbar left/right (search/avatar to edges) | 24px |
| Content area top (below topbar) | 32px |
| Content area sides (to center stage edges) | 36px |
| Right panel (all sides to content) | 24px |
| Modal (content to modal edge) | 32px |
| Card (content to card edge) | 16px vertical, 22px horizontal |

---

### 2.5 — Dynamic Text Accommodation

**Rule:** Any field that accepts user-generated text of more than one line must auto-expand or provide scrollable overflow with clear affordance.

Fixed-height text containers for variable-length content are a defect. Applies to settings profile textareas, ingest custom guidance input, Ask chat message input, and any future free-text input. See Pattern 4.3 for the auto-resize hook implementation.

---

### 2.6 — Explore View Filter Standardization

**Rule:** The Explore view's filter controls follow a strict three-tier hierarchy with standardized naming.

**Tier 1 — Primary View Toggle (what you're browsing):**
- Options: **Anchors** | **Entities** | **Sources**
- Component: Individual pill buttons matching the gold standard (NOT a ToggleGroup/segmented control)
- Styling: Exactly the same as all other control bar pills — `padding: 5px 13px`, `borderRadius: 20`, `fontSize: 12`, `font-body font-semibold`. Active: accent-50 bg, accent-500 text. Inactive: transparent bg, text-secondary color.
- Separated from content filters by a vertical divider.

**Tier 2 — Content Filters (how you're filtering):**
- Presented as dropdown trigger buttons on the same row, separated from the primary toggle by a vertical divider.
- Each dropdown trigger uses the SAME pill styling as Tier 1: `padding: 5px 13px`, `borderRadius: 20`, `fontSize: 12`, `font-body font-semibold`, inactive color `--color-text-secondary`. ChevronDown icon at `size={12}`.
- When a filter has active selections, it switches to the active state (accent-50 bg, accent-500 text).

**Tier 3 — Time Range (when):**
- Right-aligned on the filter row via `flex-1` spacer before them.
- Individual pill buttons: `7 days` | `30 days` | `All`.
- Exactly the same pill styling as Tier 1 and Tier 2 — `padding: 5px 13px`, `borderRadius: 20`, `fontSize: 12`.

**Standardized filter labels by sub-view:**

| Sub-View | Available Tier 2 Filters |
|---|---|
| **Anchors** | Entity Types |
| **Entities** | Entity Types, Source Types, Anchors, Tags, Confidence |
| **Sources** | Source Types, Anchors |

**Naming rules (non-negotiable):**
- "Entity Types" — always plural "Types", never "Entity Type" or "Type" alone.
- "Source Types" — always "Source Types", never "Source" or "Sources".
- "Anchors" (as filter) — always "Anchors", never "Anchor".
- "Tags" — always "Tags".
- "Confidence" — shown as a slider or threshold chip, not a dropdown.

---

### 2.7 — Toggle/Tab Hierarchy

**Rule:** When a view has multiple levels of navigation or filtering, each level must be visually distinct in weight, size, and spacing.

| Level | Component | Visual Treatment |
|---|---|---|
| **Tier 1**: View mode | Pill buttons | Standard pill styling: 5px 13px, borderRadius 20, fontSize 12, font-semibold. Active: accent-50 bg + accent-500 text |
| **Tier 2**: Content filters | Pill dropdown triggers | Identical styling to Tier 1. ChevronDown icon indicates dropdown. |
| **Tier 3**: Time range, sort | Pill buttons | Identical styling to Tier 1. Right-aligned via flex spacer. |

All three tiers use the **exact same pill styling** for cross-view consistency. The visual distinction comes from their position (left → right) and dividers between groups, not from different sizes or weights. Tier 1 and Tier 2 share a row, separated by the vertical divider. Tier 3 is right-aligned on the same row.

---

### 2.8 — Right Panel Structural Consistency

**Rule:** The right panel is a permanent structural element that always fills the full viewport height, regardless of content.

- Root element: `width: 310px; height: 100%; border-left: 1px solid var(--border-subtle); background: var(--bg-card); overflow-y: auto; overflow-x: hidden;`
- The left border runs the full height of the app shell — never truncated by short content.
- Empty/default state shows a centered placeholder vertically centered in the panel.

---

### 2.9 — Nav Rail: Overlay Expansion

**Rule:** The nav rail expands as a floating overlay, not by changing its width in the layout flow.

The collapsed nav rail is `56px` wide and participates in the flex layout. When expanded on hover, it becomes `190px` via `position: absolute`, overlaying the center stage content. The center stage width **does not change**. This prevents layout reflow, graph re-renders, and grid card reflow on any view. See Pattern 4.4 for implementation.

---

### 2.10 — Feed Card Information Density

**Rule:** Feed cards (Home view) should display enough metadata to be useful without clicking.

Minimum information per feed card: source type icon, title (Cabinet Grotesk 14px/700), timestamp (relative, DM Sans 11px, `--text-secondary`), content preview (2 lines max, stripped of markdown), entity count badge + connection count badge, and related sources chips where applicable. Apply `line-clamp: 2` for consistent card heights.

---

### 2.11 — Consistent Card Heights in Grid Views

**Rule:** When cards are displayed in a grid, all cards in the same row must have the same height. Use CSS Grid with `grid-auto-rows: 1fr` or flexbox with `align-items: stretch`.

---

## Part 3: View-Specific Remediation Checklists

---

### 3.1 — Home View Checklist

- [ ] Topbar shows "Home" title on left, search centered, node/edge counts + avatar on right
- [ ] Full-width control bar with compact GreetingHeader (greeting + daily stats inline)
- [ ] Quick stats row present inside left column with 4 stat cards
- [ ] Stats load from real Supabase counts
- [ ] Insight banner conditional
- [ ] Feed cards show source icon, title, timestamp, 2-line preview, entity/connection counts
- [ ] Feed card preview text is cleaned of markdown artifacts
- [ ] Right panel left border extends full viewport height
- [ ] No standalone title/subtitle rows inside content area

---

### 3.2 — Explore View Checklist

- [ ] Topbar shows "Explore" title on left
- [ ] Full-width control bar (ExploreToolbar): `minHeight: 44`, `padding: 8px 24px`, `gap: 8`, bg-card, border-bottom
- [ ] Primary toggle: Anchors / Entities / Sources as individual pill buttons (borderRadius 20, padding 5px 13px, fontSize 12, font-body font-semibold). Active: accent-50 bg + accent-500 text. NO segmented control or ToggleGroup.
- [ ] Vertical divider separates primary toggle from filter dropdowns
- [ ] Filter dropdown triggers: same pill styling (borderRadius 20, padding 5px 13px, fontSize 12, font-semibold, inactive color text-secondary)
- [ ] Filter dropdown labels match standardized names (Rule 2.6)
- [ ] Time range: individual pill buttons right-aligned (same styling), NOT a ToggleGroup
- [ ] Search input: borderRadius 20, fontSize 12, padding 5px
- [ ] Sort selector: borderRadius 20, padding 5px 13px, fontSize 12
- [ ] Grid/List toggle: borderRadius 20, 26x26px icon buttons
- [ ] Filters available per sub-view match the table in Rule 2.6
- [ ] Graph canvas is full-bleed below the control bar
- [ ] Nav rail hover does NOT cause graph re-render or layout shift
- [ ] Right panel left border extends full viewport height
- [ ] No standalone title row inside content area

---

### 3.3 — Ask View Checklist

- [ ] Topbar shows "Ask" title on left
- [ ] Full-width StatusBar control bar: `height: 44px` (fixed), `padding: 0 24px`, `gap: 8`, bg-card, border-bottom
- [ ] StatusBar shows RAG status dot + label (font-body font-semibold 12px) + stats (font-body 12px) + "New chat" pill button
- [ ] "New chat" button: `borderRadius: 20`, `padding: 5px 13px`, `fontSize: 12`, `font-body font-semibold`
- [ ] Right panel text does not overflow container
- [ ] Right panel section headers use section label style
- [ ] Right panel content respects max-width: 262px
- [ ] Entity names in right panel truncate with ellipsis if too long
- [ ] Chat messages have proper text wrapping
- [ ] Right panel left border extends full viewport height
- [ ] No standalone title/subtitle rows inside content area

---

### 3.4 — Settings Modal Checklist

- [ ] All multi-line textareas auto-expand (min 80px, max 240px)
- [ ] Name field is single-line, full width
- [ ] Labels use DM Sans 12px/600, `--text-body`
- [ ] Input fields use `--bg-inset` background, `--border-subtle` border
- [ ] Focus state: `--accent-50` ring with accent border
- [ ] Save button is primary style (accent-500 bg, white text) with loading state
- [ ] Modal has `--border-strong` outer border, `--radius-lg` corners

---

### 3.5 — Navigation (All Views) Checklist

- [ ] Logo has 28px gap below before first nav item
- [ ] Nav items are 40x40px with 10px radius
- [ ] Active item: accent-50 bg, accent-500 icon, 3px left indicator bar
- [ ] Inactive items: `--text-secondary` icon, transparent bg
- [ ] Hover: `rgba(0,0,0,0.04)` bg, icon shifts to `--text-body`
- [ ] Nav rail expands as overlay (position: absolute), not layout push
- [ ] Labels appear on expand (DM Sans 12px/500)
- [ ] Expanding nav rail does NOT change center stage width
- [ ] Bottom utilities pinned to bottom with flex spacer
- [ ] Avatar in topbar has at least 24px clearance from right edge
- [ ] Topbar content aligns with ContentColumn below

---

### 3.6 — Automate View Checklist

- [ ] Topbar shows "Automate" title on left
- [ ] Full-width control bar with filter pills + stats strip + Connect Source button
- [ ] Control bar styling matches standard (bg-card, border-bottom, 8px 24px padding, minHeight 44)
- [ ] No standalone title/subtitle rows inside content area
- [ ] Left column content starts immediately with source cards

---

### 3.7 — Capture View Checklist

- [ ] Topbar shows "Capture" title on left
- [ ] Full-width control bar with mode switcher buttons (Text/URL/Document/Transcript)
- [ ] Control bar styling matches standard
- [ ] No standalone title/subtitle rows inside content area

---

### 3.8 — Orient View Checklist

- [ ] Topbar shows "Orient" title on left
- [ ] Full-width control bar with filter pills + digest stats + New Digest button
- [ ] Control bar styling matches standard
- [ ] No standalone title/subtitle rows inside content area

---

### 3.9 — Pipeline View Checklist

- [ ] Topbar shows "Pipeline" title on left
- [ ] Full-width control bar with Source/Status/Sort filter dropdowns + stats strip
- [ ] Control bar styling matches standard (bg-card, border-bottom, 8px 24px padding, minHeight 44)
- [ ] No standalone title/subtitle rows inside content area
- [ ] Health metrics, heatmap, and charts render inside left column
- [ ] History cards below the analytics section
- [ ] Right panel shows ExtractionDetail or ExtractionSettings

---

## Part 4: Global Implementation Patterns

---

### 4.1 — Content Column Wrapper

See Rule 2.2. Use for all view content AND topbar inner content.

```tsx
// components/layout/ContentColumn.tsx
interface ContentColumnProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const ContentColumn: React.FC<ContentColumnProps> = ({
  children,
  className,
  fullWidth = false,
}) => (
  <div className={`w-full ${fullWidth ? '' : 'mx-auto max-w-[840px] px-[36px]'} ${className ?? ''}`}>
    {children}
  </div>
);
```

---

### 4.2 — Safe Text Container

```tsx
// components/ui/SafeText.tsx
interface SafeTextProps {
  children: React.ReactNode;
  lines?: number;
  className?: string;
}

export const SafeText: React.FC<SafeTextProps> = ({ children, lines, className }) => (
  <span
    className={`min-w-0 break-words ${className ?? ''}`}
    style={lines ? {
      display: '-webkit-box',
      WebkitLineClamp: lines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    } : undefined}
  >
    {children}
  </span>
);
```

---

### 4.3 — Auto-Resize Textarea Hook

```typescript
// hooks/useAutoResize.ts
import { useEffect, RefObject } from 'react';

export const useAutoResize = (
  ref: RefObject<HTMLTextAreaElement>,
  value: string,
  minHeight = 80,
  maxHeight = 240,
) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
    el.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, minHeight, maxHeight]);
};
```

---

### 4.4 — Nav Rail Overlay Pattern

```tsx
// components/layout/NavRail.tsx — structural pattern
const NavRail: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    // Outer: always 56px, participates in flex layout, never changes width
    <div className="w-[56px] flex-shrink-0 relative z-[100]">
      {/* Inner: positioned absolutely, animates width as overlay */}
      <div
        className={`absolute left-0 top-0 h-full bg-[var(--bg-frame)] border-r border-[var(--border-subtle)] overflow-hidden transition-[width] duration-200 ease-out z-[200] ${
          expanded ? 'w-[190px] shadow-[4px_0_16px_rgba(0,0,0,0.06)]' : 'w-[56px]'
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Nav content */}
      </div>
    </div>
  );
};
```

---

### 4.5 — Graph Resize Resilience

```typescript
// Key principle: resize should SCALE the existing graph, not regenerate it.
// D3 force simulation positions are preserved; only the viewport transform changes.
// The simulation is NOT restarted on resize.
const useResizeScale = (
  containerRef: RefObject<HTMLDivElement>,
  onScale: (width: number, height: number) => void,
) => {
  const prevSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const observer = new ResizeObserver(
      debounce((entries: ResizeObserverEntry[]) => {
        const { width, height } = entries[0].contentRect;
        if (prevSize.current.width === 0) {
          prevSize.current = { width, height };
          onScale(width, height);
        } else {
          onScale(width, height);
          prevSize.current = { width, height };
        }
      }, 150)
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
};
```

---

### 4.6 — Markdown Stripping for Previews

```tsx
// utils/stripMarkdown.ts
export const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .trim();
};
```

---

## Part 5: Review Protocol

Before marking any PRD as complete, run this checklist:

1. **Topbar pass:** Does the topbar show the correct page title on the left? Is the search bar centered? Are node/edge counts + avatar on the right? Is the height 52px with light orange bg?
2. **Control bar pass:** Does the view have a full-width control bar below the topbar? Does it use the exact hard-coded specs (bg-card, border-bottom, height 44px or minHeight 44px, padding 0 24px or 8px 24px, gap 8)? Are ALL buttons/pills using borderRadius 20, padding 5px 13px, fontSize 12, font-body font-semibold? Is the inactive color `--text-secondary` (not `--text-body`)? Does the bar span the full width above the column split?
3. **No title row pass:** Verify there are NO standalone title/subtitle `<h1>` or heading blocks inside the content area. Page name lives only in the topbar.
4. **Overflow pass:** Resize browser to 1280px width. Does any text break out of its container?
5. **Spacing pass:** Is the nav rail logo visually separated from the first nav item? Is the avatar separated from the right edge?
6. **Hierarchy pass:** Can you identify the view's navigation hierarchy at a glance?
7. **Right panel pass:** Does the right panel's left border extend the full viewport height?
8. **Nav expansion pass:** Hover over the nav rail. Does the center stage content shift or reflow? (It should NOT.)
9. **Filter naming pass:** (Explore only) Do all filter dropdown labels match the standardized names in Rule 2.6?
10. **Dynamic content pass:** Enter long text in any input field. Does the field accommodate it?
11. **Empty state pass:** What does the view look like with zero data? Is the empty state styled and intentional?
12. **Cross-view consistency pass:** Navigate between ALL views (Home, Explore, Ask, Capture, Automate, Orient, Pipeline). Do they share the same topbar height, control bar styling, and spacing rhythm?

---

## Appendix: Defect Category Reference

| Category | Description | Common Causes |
|---|---|---|
| **Spacing / Structural Padding** | Elements too close to edges or to each other | Missing padding tokens, flex gap omissions |
| **Horizontal Alignment** | Content at different horizontal positions within the same view | Mismatched centering strategies, different padding values |
| **Overflow Handling** | Text or elements exceeding container bounds | Missing overflow: hidden, missing min-width: 0 on flex children |
| **Component Hierarchy** | UI elements at the same visual weight when they should be different | Not using the design system's component variants |
| **Dynamic Sizing** | Fixed containers for variable content | Fixed height on textareas, no auto-resize |
| **Layout Density** | Too much empty space with too little information | Missing data widgets |
| **Visual Consistency** | Different spacing, alignment, or styling between views | Per-view custom implementations |
| **Structural Redundancy** | The same information shown in multiple places | Duplicate titles, repeated labels |
| **Naming Inconsistency** | The same concept labeled differently in different contexts | Ad-hoc filter labels per view |
| **Performance / Layout Stability** | UI changes causing expensive re-renders or visual jumps | Layout reflow triggering canvas re-initialization |
| **Structural Consistency** | Structural elements behaving differently across views | Right panel border height varying by content |

---

*This document should be updated as new defect patterns are discovered. Every PRD implementation should reference this document alongside the design system.*
