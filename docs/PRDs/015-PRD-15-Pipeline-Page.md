# PRD 15 — Pipeline: Ingestion History & Health Dashboard

**Phase:** 5 — Polish + Advanced
**Dependencies:** PRD 2 (Shell + Nav), PRD 7 (Ingest + Extraction Pipeline), PRD 4 (Explore Browse — shared EntityBadge, FilterDrop components)
**Forward dependency for:** PRD 13B (Orient Engine — quality metrics feed into digest generation tuning)
**Estimated Complexity:** Medium
**Estimated Effort:** 2–3 sessions

---

## 1. Objective

Build a dedicated **Pipeline** view — a top-level observability surface accessible from the nav rail — where users monitor the health and performance of their knowledge ingestion pipeline. This page answers: "How is my graph growing, how fast is it happening, where are the problems, and how can I tune it?"

Unlike Automate (which configures *inputs*) and Orient (which configures *outputs*), Pipeline is a **diagnostic instrument**. It consolidates processing history, extraction quality metrics, confidence distributions, entity composition, and pipeline configuration into a single surface. Every extraction — whether triggered manually from Ingest, automatically from YouTube automation, or via document upload — appears here with full diagnostic metadata.

The page serves three user needs simultaneously: (1) at-a-glance health monitoring via the dashboard, (2) deep extraction diagnostics via the card detail panel, and (3) pipeline tuning via the extraction settings panel.

---

## 2. What Gets Built

### Navigation Update

| Item | Detail |
|---|---|
| **Nav rail item** | New "Pipeline" entry positioned after Orient (7th item, before Settings gear) |
| **Icon** | `Activity` from Lucide React — the EKG/heartbeat line, maps to pipeline health monitoring |
| **Route** | `/pipeline` |
| **File** | `src/views/PipelineView.tsx` |

Update the following existing files:
- `src/app/Router.tsx` — add `/pipeline` route
- `src/components/layout/NavRail.tsx` — add Pipeline nav item with Activity icon
- `src/types/index.ts` — add `'pipeline'` to the `ViewType` union
- `src/components/layout/RightPanel.tsx` — add Pipeline panel content types to `RightPanelContent` discriminated union

### New Files Created

```
src/
├── views/
│   └── PipelineView.tsx                    # Top-level Pipeline page
├── components/
│   ├── pipeline/
│   │   ├── HealthMetrics.tsx               # 4-card metrics strip
│   │   ├── ExtractionHeatmap.tsx           # GitHub-style 13-week activity grid
│   │   ├── HeatmapDayDetail.tsx            # Day metadata display (renders in right panel)
│   │   ├── DistributionChart.tsx           # Entity/Source distribution bar with toggle
│   │   ├── ConfidenceHistogram.tsx         # 5-bucket confidence distribution
│   │   ├── ProcessingSparkline.tsx         # 14-day processing time bar chart
│   │   ├── HistoryCard.tsx                 # Unified card for queue items + completed + failed
│   │   ├── HistoryCardStepBar.tsx          # Mini progress bar for in-progress items
│   │   ├── ExtractionDetail.tsx            # Right panel: full extraction diagnostics
│   │   └── ExtractionSettings.tsx          # Right panel: default extraction config editor
│   └── shared/
│       └── StarRating.tsx                  # Reusable 1–5 star rating (display + interactive)
├── hooks/
│   ├── usePipelineHistory.ts               # Fetches unified history (sessions + queue)
│   ├── usePipelineMetrics.ts               # Computes health dashboard metrics
│   └── useHeatmapData.ts                   # Aggregates extraction data into 13-week grid
└── types/
    └── pipeline.ts                         # Pipeline-specific type definitions
```

### Database Migration (One Column Addition)

**Add `source_id` to `extraction_sessions`:**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `source_id` | UUID | YES | — | FK to `knowledge_sources(id)`, ON DELETE SET NULL |

This enables reliable joins between extraction sessions and their source content. Currently the table has `source_name` and `source_type` but no direct FK. The join is essential for computing chunk counts, cross-connection identification, and linking back to source detail views.

**Add index:** `idx_extraction_sessions_source_id` on `(source_id)`.

No other new tables are required. The Pipeline page is primarily a read-only analytics surface over existing data: `extraction_sessions`, `knowledge_sources`, `knowledge_nodes`, `knowledge_edges`, `source_chunks`, `youtube_ingestion_queue`, and `extraction_settings`.

### TypeScript Types

Add to `src/types/pipeline.ts`:

```typescript
export interface PipelineHistoryItem {
  id: string;
  title: string;
  sourceType: 'YouTube' | 'Meeting' | 'Document' | 'Note' | 'Research';
  mode: 'comprehensive' | 'strategic' | 'actionable' | 'relational';
  emphasis: 'passive' | 'standard' | 'aggressive';
  status: 'pending' | 'processing' | 'extracting' | 'completed' | 'failed';
  step?: string;                          // For active items: 'queued' | 'fetching_transcript' | 'extracting' | 'saving'
  error?: string;                         // For failed items
  createdAt: string;
  relativeTime: string;                   // Computed client-side: "3h ago", "1d ago"
  // Extraction results (null for pending/processing items)
  entityCount: number;
  relationshipCount: number;
  chunkCount: number;
  duration: number;                       // milliseconds
  confidence: number;                     // 0–1 average
  crossConnections: number;
  rating: number | null;                  // 1–5 or null
  ratingText: string | null;
  // Breakdown data
  entityBreakdown: Record<string, number>;  // { Person: 3, Topic: 4, ... }
  topEntityTypes: string[];                 // Sorted by count desc
  anchors: string[];                        // Anchor labels used
  // Source linkage
  sourceId: string | null;
  sourceUrl: string | null;
  // Node/edge IDs for graph navigation
  extractedNodeIds: string[];
  extractedEdgeIds: string[];
}

export interface HeatmapCell {
  week: number;                           // 0–12
  day: number;                            // 0–6 (Mon–Sun)
  date: string;                           // ISO date string
  count: number;                          // Extractions on this day
  entities: number;
  relationships: number;
  avgConfidence: number;
  avgDuration: number;                    // seconds
  failed: number;
  sourceBreakdown: Record<string, number>;   // { YouTube: 2, Meeting: 1, ... }
  entityBreakdown: Record<string, number>;   // { Person: 5, Topic: 8, ... }
  confidenceBuckets: number[];               // [count_0.5-0.6, count_0.6-0.7, ..., count_0.9-1.0]
}

export interface PipelineMetrics {
  sourcesThisWeek: number;
  sourcesLastWeek: number;
  entitiesThisWeek: number;
  avgEntitiesPerSource: number;
  avgDuration: number;                    // milliseconds
  fastestDuration: number;
  slowestDuration: number;
  successRate: number;                    // 0–100
  failedThisWeek: number;
  avgRating: number;
  ratedCount: number;
  activeProcessing: number;
}

export type SourceTypeFilter = 'all' | 'YouTube' | 'Meeting' | 'Document' | 'Note';
export type StatusFilter = 'all' | 'active' | 'completed' | 'failed';
export type SortOption = 'recent' | 'slowest' | 'entities' | 'confidence';
```

---

## 3. Design Requirements

### Page Layout

Pipeline uses the standard three-pane layout: Nav Rail (56px) + Center Stage (flex, max-width 840px centered) + Right Panel (320px, white).

**Center Stage structure (top to bottom):**

1. **Header** — page title + subtitle + summary line
2. **Health metrics** — 4-card grid
3. **Analytics dashboard** — heatmap (full-width) + distribution chart + confidence/processing chart (2-column)
4. **Filter bar** — two compact dropdown selectors + sort dropdown
5. **Unified card list** — all extractions (queue + completed + failed), scrollable

**Right Panel states:**

| Condition | Right Panel Content |
|---|---|
| Nothing selected, no heatmap day selected | Extraction Settings editor |
| Heatmap day selected, no card selected | Heatmap day metadata + Extraction Settings below |
| Card selected (completed or failed) | Extraction detail diagnostics |
| Card selected (in-progress) | Extraction Settings (active items have no detail to show) |

### Header Area

**Page title:**
- Text: "Pipeline"
- Font: Cabinet Grotesk, 24px, weight 800, letter-spacing -0.03em
- Color: `--text-primary`

**Subtitle:**
- Text: "Ingestion health, processing history, and extraction quality."
- Font: DM Sans, 13px, weight 400
- Color: `--text-secondary`
- Margin-top: 4px

**Summary line:**
- Text: "{N} sources this week · {N} entities extracted · {N}% success rate"
- Font: DM Sans, 13px, weight 400
- Color: `--text-secondary`
- Margin-top: 8px, margin-bottom: 20px
- Sources count: `--semantic-green-500`, weight 600
- Success rate: color-coded — green if ≥ 95%, amber if 80–94%, red if < 80%, weight 600
- If active processing > 0, append: " · {N} processing" in `--accent-500`, weight 600

### Health Metrics Strip

4-column grid, 8px gap. Each card:
- Background: `--bg-card`
- Border: 1px solid `--border-subtle`
- Border-radius: 10px
- Padding: 14px 16px
- Staggered fade-up: 0.4s ease, 0.05s delay per card

**Card layout (top to bottom):**
- Row 1: label (left) + icon (right)
  - Label: DM Sans, 10px, weight 600, uppercase, letter-spacing 0.06em, `--text-secondary`
  - Icon: Lucide icon, 14px, `--text-placeholder`
- Row 2: value
  - Font: Cabinet Grotesk, 22px, weight 800, letter-spacing -0.02em, `--text-primary`
  - Margin: 8px top, 4px bottom
- Row 3: sub-text
  - Font: DM Sans, 10px, weight 500
  - Color: varies per card (see below)

**Four cards:**

| Card | Label | Icon | Value | Sub-text | Sub-color |
|---|---|---|---|---|---|
| Sources This Week | SOURCES THIS WEEK | `TrendingUp` | Count | "↑ {N} vs last week" or "↓ {N} vs last week" | `--semantic-green-500` if positive, `--semantic-red-500` if negative |
| Entities Extracted | ENTITIES EXTRACTED | `BarChart3` | Count | "Avg {N} per source" | `--text-secondary` |
| Avg Processing Time | AVG PROCESSING TIME | `Clock` | "{N}s" | "Fastest: {N}s · Slowest: {N}s" | green if < 10s, amber if 10–30s |
| Quality Score | QUALITY SCORE | `Star` | "{N}" (1 decimal) | "{N} rated extractions" | `--text-secondary` |

### Analytics Dashboard

3-card grid below the metrics strip. Margin-bottom: 24px.

**Card 1 — Extraction Activity Heatmap (full-width, spans both columns):**

Container: standard Card component, padding 16px 18px.

- Section label "EXTRACTION ACTIVITY" left-aligned
- Right side: if a day is selected, show "Clear selection" as a ghost link (`--accent-500`, underline, 10px weight 600). Always show "Last 13 weeks · click a day to drill down" in 10px `--text-placeholder`.

**Heatmap grid:**
- 13 columns (weeks) × 7 rows (Mon–Sun)
- Cell size: 11px × 11px, 2px gap, border-radius 2px
- Day labels on left column: "M", "", "W", "", "F", "", "S" — 8px font, `--text-placeholder`
- Cell colors use accent ramp at varying opacities:
  - 0 extractions: `--bg-inset`
  - 1: `rgba(214,58,0,0.12)`
  - 2: `rgba(214,58,0,0.25)`
  - 3: `rgba(214,58,0,0.45)`
  - 4: `rgba(214,58,0,0.65)`
  - 5+: `rgba(214,58,0,0.85)`
- Hover: 1px border in `--accent-500` at 30% opacity
- Selected day: 2px outline in `--accent-500`, outline-offset 1px
- Click a cell with count > 0: sets it as the selected day (updates distribution + confidence charts, shows metadata in right panel)
- Click the already-selected cell: deselects
- Legend below heatmap: "Less" → 6 color swatches → "More", 9px font, `--text-placeholder`, margin-top 8px

**Card 2 — Distribution Chart (left column):**

Container: standard Card, padding 16px 18px.

- Toggle control top-left: entity/source mode switcher
  - Container: `--bg-inset` background, `--border-subtle` border, 6px radius, 2px internal padding
  - Items: "Entities" / "Sources" — 10px weight 600, 3px 10px padding, 5px radius
  - Active: `--bg-card` background, `--text-primary` color, `box-shadow: 0 1px 2px rgba(0,0,0,0.05)`
  - Inactive: transparent background, `--text-secondary` color
- If a heatmap day is selected: show "Day view" badge top-right — 9px weight 600, `--accent-500` text, `--accent-50` background, 2px 6px padding, 4px radius
- Chart adapts data to selected day (entity breakdown for that day, or source breakdown for that day). When no day is selected, shows aggregate data.

**Distribution bar:**
- Height: 8px, border-radius 4px, overflow hidden
- Segments proportional to percentage, using entity type colors (entity mode) or source type colors (source mode)
- Transition: width 0.4s ease
- Margin-bottom: 10px

**Legend below bar:**
- Flex-wrap, gap 6px 14px
- Each item: 6px × 6px square (border-radius 2px, entity/source color) + type name (10px weight 500, `--text-body`) + count + percentage (10px, `--text-secondary`)

**Entity mode data** (aggregate): Computed from `knowledge_nodes` grouped by `entity_type`, sorted by count desc. Top 8–10 types shown.

**Source mode data** (aggregate): Computed from `knowledge_sources` grouped by `source_type`, sorted by count desc.

**Source type colors:**
- YouTube: `--semantic-red-500`
- Meeting: `--semantic-blue-500`
- Document: `--e-project` (#059669)
- Note: `--e-idea` (#ca8a04)

**Card 3 — Confidence + Processing Time (right column):**

Container: standard Card, padding 16px 18px. Two sections stacked vertically, separated by `--border-subtle` with 14px margin/padding.

**Top section — Confidence Distribution:**
- Section label "CONFIDENCE DISTRIBUTION"
- If day selected: "Day view" badge (same as distribution card)
- 5-bucket histogram: [0.5–0.6, 0.6–0.7, 0.7–0.8, 0.8–0.9, 0.9–1.0]
- Bar chart: flex row, 3px gap, 44px height area
  - Each bar: flex-1, border-radius 3px 3px 0 0
  - Height proportional to percentage of max bucket
  - Color: buckets 0–1 use `--bg-active`, buckets 2+ use `--accent-500` at decreasing opacity (bucket 2: 40%, 3: 90%, 4: 60%)
  - Percentage label above each bar: 8px weight 600, `--text-secondary`
  - Range label below each bar: 8px, `--text-placeholder`
  - Transition: height 0.4s ease
- Adapts to selected day when a heatmap cell is clicked

**Bottom section — Processing Time:**
- Section label "PROCESSING TIME (14D)" — or just "PROCESSING TIME" when a day is selected
- **When no day selected:** 14-bar sparkline
  - Flex row, 2px gap, 32px height
  - Each bar: flex-1, border-radius 2px 2px 0 0
  - Height: proportional to value within range
  - Color: `--accent-500` at 30% opacity; bars above 80th percentile get `--semantic-amber-500` at 60%
  - Axis labels: "14d ago" left, "Today" right — 8px `--text-placeholder`
  - Transition: height 0.4s ease
- **When day selected:** Single large metric
  - Value: Cabinet Grotesk, 20px, weight 800, `--text-primary` — e.g., "4.2s"
  - Label: DM Sans, 11px, `--text-secondary` — "average on this day"
  - Horizontal layout, baseline-aligned

### Filter Bar

Positioned between the analytics dashboard and the card list. Two rows are NOT used — instead, all filters are compact dropdowns in a single horizontal row. Margin-bottom: 16px.

**Layout:** flex row, space-between. Left side: dropdowns. Right side: sort selector.

**Source Type dropdown:**
- Trigger: styled as a compact pill-shaped button
  - Padding: 5px 12px
  - Border-radius: 8px
  - Font: DM Sans, 11px, weight 600
  - Background: `--bg-card`
  - Border: 1px solid `--border-subtle`
  - Color: `--text-body`
  - Chevron-down icon (12px, `--text-secondary`) after label
  - Hover: `--border-default` border
  - When a non-default filter is active: `--accent-50` background, `rgba(214,58,0,0.15)` border, `--accent-500` color
- Label: shows current selection — "All Sources", "YouTube ({count})", "Meetings ({count})", etc.
- Dropdown menu on click:
  - Position: absolute, below trigger, left-aligned
  - Background: `--bg-card`
  - Border: 1px solid `--border-strong`
  - Border-radius: 10px
  - Box-shadow: `0 4px 16px rgba(0,0,0,0.08)`
  - Padding: 4px
  - Each option: padding 8px 14px, border-radius 6px, DM Sans 12px weight 500, `--text-body`
  - Hover: `--bg-hover` background
  - Active: `--accent-50` background, `--accent-500` color, weight 600
  - Options: All Sources, YouTube ({count}), Meetings ({count}), Documents ({count}), Notes ({count})
- Clicking outside closes the dropdown

**Status dropdown:**
- Same styling as Source Type dropdown
- Label: shows current selection — "All Statuses", "In Progress ({count})", "Completed ({count})", "Failed ({count})"
- When "Failed" is active and count > 0: `--semantic-red-50` background, `rgba(239,68,68,0.2)` border, `--semantic-red-500` color
- Options: All Statuses, In Progress ({count}), Completed ({count}), Failed ({count})

**Sort dropdown:**
- Right-aligned
- Same trigger styling but slightly smaller
- Padding: 5px 10px
- Font: 10px weight 600
- Color: `--text-secondary`
- Options: Most Recent, Slowest First, Most Entities, Lowest Confidence

**Gap between dropdowns:** 8px. All dropdowns close when another opens (only one open at a time).

### Unified History Card List

All items — in-progress queue items, completed extractions, and failed extractions — appear in a single list. Sorted according to the sort dropdown (default: most recent). Filtered by the two dropdown selectors.

**Card container:** standard Card component. Margin-bottom: 8px. Staggered fade-up: 0.4s ease, 0.05s delay per card.

**Card structure — all states share the top row:**

```
┌──────────────────────────────────────────────────────────────┐
│  [TypeIcon]  Title                                   3h ago  │
│              Meeting · Comprehensive · Standard               │
│                                                               │
│  [status-specific content row]                                │
│  [entity badges — completed only]                             │
└──────────────────────────────────────────────────────────────┘
```

**Source type icon (left):**
- Container: 36px × 36px, border-radius 8px
- Background: source color at 7% opacity (`${sourceColor}12`)
- Content: emoji — Meeting: 📋, YouTube: ▶, Document: 📄, Note: ✏️
- For in-progress items: pulsing dot overlay — 8px circle, `--accent-500`, 2px white border, positioned top-right of icon container, animation `pulse 1.5s infinite`

**Title:** Cabinet Grotesk, 14px, weight 700, letter-spacing -0.01em, `--text-primary`, line-height 1.3

**Timestamp:** right-aligned, DM Sans, 11px, `--text-secondary`, white-space nowrap

**Metadata line:** below title, margin-top 3px. DM Sans, 12px, `--text-secondary`. Format: "{sourceType} · {mode} · {emphasis}" — mode and emphasis capitalized.

**Status-specific content (margin-top 12px):**

**In-progress items:**
- Step progress bar: 4 segments, 80px total width, 3px height, 2px gap, 2px radius
  - Segments: queued → fetching_transcript → extracting → saving
  - Filled segments: `--accent-500`
  - Current segment: `--accent-500` with pulse animation
  - Unfilled: `--bg-active`
- Step label: DM Sans, 11px, weight 600, `--accent-500`, text-transform capitalize, underscores replaced with spaces
- Anchor label (if any): DM Sans, 10px, `--text-placeholder`, right-aligned (margin-left auto)

**Completed items:**
- Stats row: flex, space-between
  - Left group (flex, gap 12px):
    - "{N} entities" — DM Sans 12px, `--text-body`, count in weight 600
    - "{N} rels" — same
    - "{N}s" — DM Sans 12px, `--text-secondary` (processing time)
    - "+{N} cross" — DM Sans 11px, weight 600, `--accent-500` (only if crossConnections > 0)
  - Right group: StarRating component (10px stars) or "Rate" text in `--text-placeholder` 10px
- Entity type badges (margin-top 10px): flex-wrap, gap 4px. Top 4 entity types as Badge components (small variant) with count: "Person (3)". If more than 4 types, show "+{N}" overflow label.

**Failed items:**
- Row: flex, align-center, gap 5px
  - 6px red dot (`--semantic-red-500`)
  - "Failed" label: DM Sans 11px, weight 600, `--semantic-red-500`
  - Error preview: DM Sans 11px, `--text-secondary`, margin-left 4px, truncated at 55 chars with "..."

**Card click** → sets selectedId, right panel transitions to Extraction Detail (for completed/failed) or stays on Settings (for in-progress).

**Card selected state:** `--accent-50` background, `rgba(214,58,0,0.3)` border.

**Scroll pagination:** load 20 items initially, load 20 more on scroll-to-bottom. Show a loading skeleton (3 placeholder cards with pulse animation) while fetching.

### Right Panel — Extraction Settings (Default State)

Shown when no completed/failed card is selected. This is the pipeline tuning surface.

**Panel header:**
- Icon: `Sliders` (Lucide), 16px, `--text-secondary`
- Title: "Extraction Settings" — Cabinet Grotesk, 16px, weight 700, `--text-primary`
- Subtitle: "Default configuration for all new extractions. Override per-source during ingestion." — DM Sans, 12px, `--text-secondary`, line-height 1.5, margin-bottom 20px

**If a heatmap day is selected — Day Metadata section (appears above settings):**

This section shows when a user clicks a heatmap cell, occupying the top portion of the right panel. It provides detailed metadata for that day's extraction activity.

- Section label: "SELECTED DAY"
- Day heading: "{DayName}, {MonthName} {Date}" — Cabinet Grotesk, 14px, weight 700, `--text-primary`
  - e.g., "Wednesday, Feb 19"
- Close button (X icon, 14px, `--text-secondary`) to deselect the day, right-aligned with heading
- Margin-bottom: 16px after heading

**Day stats (2×2 grid, 6px gap):**
- Each cell: `--bg-inset` background, 8px radius, 10px padding, text-center
- Value: Cabinet Grotesk, 18px, weight 800, `--text-primary`
- Label: DM Sans, 9px, weight 600, `--text-secondary`
- Cells: Sources ({count}), Entities ({count}), Avg Duration ({N}s), Confidence ({N}%)
  - Confidence value: color-coded — green if > 85%, amber if 70–85%, red if < 70%

**Day source breakdown:**
- Below stats grid, margin-top 12px
- Section label: "SOURCES"
- Each source type row: flex, align-center, gap 8px
  - Source type emoji (14px) + name (DM Sans 11px weight 500 `--text-body`) + count (DM Sans 11px weight 600 `--text-secondary`)
  - Only show types with count > 0

**Day failed indicator** (if failed > 0):
- Small red banner: `--semantic-red-50` bg, `--semantic-red-500` at 16% border, 6px radius, 8px 12px padding
- Text: "{N} failed extraction{s}" — DM Sans 11px weight 600 `--semantic-red-500`

**Divider:** `--border-subtle` with 16px margin top/bottom, separating day metadata from settings section.

**Extraction mode selector:**
- Section label: "DEFAULT MODE"
- 2×2 grid, 6px gap
- Each mode card:
  - Padding: 12px 14px
  - Border-radius: 8px
  - Border: 1px solid `--border-subtle` (inactive) or entity-color at 25% (active)
  - Background: transparent (inactive) or entity-color at 6% (active)
  - Cursor: pointer
  - Hover (inactive): `--border-default` border
  - Transition: all 0.15s ease
  - Title: DM Sans, 12px, weight 600 — active: entity color, inactive: `--text-primary`
  - Description: DM Sans, 10px, weight 400, `--text-secondary`, line-height 1.4

| Mode | Title | Description | Color |
|---|---|---|---|
| comprehensive | Comprehensive | Maximum entity capture, all relationships | `--e-topic` (#0891b2) |
| strategic | Strategic | High-level concepts, decisions, themes | `--e-goal` (#e11d48) |
| actionable | Actionable | Actions, goals, blockers, deadlines | `--e-action` (#2563eb) |
| relational | Relational | Emphasis on connections between ideas | `--e-insight` (#7c3aed) |

**Anchor emphasis selector:**
- Section label: "DEFAULT ANCHOR EMPHASIS"
- 3-item flex row, 6px gap, margin-bottom 24px
- Each item:
  - Flex: 1
  - Padding: 10px
  - Border-radius: 8px
  - Text-align: center
  - Border: 1px solid `--border-subtle` (inactive) or `--e-anchor` at 25% (active)
  - Background: transparent (inactive) or `--e-anchor` at 6% (active)
  - Title: DM Sans, 12px, weight 600 — active: `--e-anchor`, inactive: `--text-primary`
  - Description: DM Sans, 9px, `--text-secondary`, margin-top 2px

| Emphasis | Title | Description |
|---|---|---|
| passive | Passive | Minimal anchor bias |
| standard | Standard | Balanced weighting |
| aggressive | Aggressive | Strong anchor focus |

**Linked anchors:**
- Section label: "DEFAULT LINKED ANCHORS"
- Flex-wrap row of Badge components (Anchor type, small variant) — one per anchor from `knowledge_nodes` where `is_anchor = true`
- Margin-bottom: 24px

**Custom guidance:**
- Section label: "DEFAULT CUSTOM GUIDANCE"
- Textarea: 3 rows, full-width
  - Background: `--bg-inset`
  - Border: 1px solid `--border-subtle`
  - Border-radius: 8px
  - Padding: 10px 13px
  - Font: DM Sans, 12px, `--text-primary`
  - Placeholder: "E.g., Focus on action items and decisions. Prioritize technical architecture insights..."
  - Focus: `rgba(214,58,0,0.3)` border, `--accent-50` ring (3px)
  - Resize: vertical

**Save button:**
- Position: margin-top 16px, full-width
- Style: Primary button — `--accent-500` background, white text, `box-shadow: 0 2px 8px rgba(214,58,0,0.2)`
- Text: "Save Defaults"
- Font: DM Sans, 13px, weight 600
- Disabled state: 40% opacity when no changes have been made
- Loading state: spinner replacing text
- Success: brief green flash, then returns to normal

### Right Panel — Extraction Detail (Selected Card)

Shown when a completed or failed card is clicked. Replaces the settings panel content.

**Header:**
- Layout: flex row, justify-between, gap 10px
- Source icon: 40px × 40px, 10px radius, source-color tinted background, emoji center
- Title: Cabinet Grotesk, 15px, weight 700, `--text-primary`, line-height 1.3
- Subtitle: "{sourceType} · {relative time}" — DM Sans, 11px, `--text-secondary`
- Close button (X): 14px, `--text-secondary`, hover `--text-primary`. Click → deselects, returns to Settings panel.
- Margin-bottom: 16px

**Failed state — error panel:**
- Container: `--semantic-red-50` background, `--semantic-red-500` at 16% border, 10px radius, 14px 16px padding
- Header: AlertCircle icon (14px, `--semantic-red-500`) + "Extraction Failed" (DM Sans 12px weight 600 `--semantic-red-700`)
- Error text: DM Sans 11px, `--semantic-red-700`, line-height 1.5
- "Retry Extraction" button below: AI action style — `--accent-50` bg, `rgba(214,58,0,0.15)` border, `--accent-600` text, RefreshCw icon

**Completed state — full diagnostics:**

**Metrics grid (2×2, 6px gap, margin-bottom 20px):**
- Each cell: `--bg-inset` background, 8px radius, 12px 14px padding, text-center
- Value: Cabinet Grotesk, 20px, weight 800, `--text-primary`
- Label: DM Sans, 10px, weight 600, `--text-secondary`
- Cells: Entities (count), Relationships (count), Chunks (count), Duration ("{N}s")

**Quality rating (margin-bottom 20px):**
- Section label: "QUALITY RATING"
- Container: `--bg-inset` bg, `--border-subtle` border, 8px radius, 10px 14px padding, flex row, gap 8px
- If rated: StarRating (14px, display mode) + "{N}/5" (DM Sans 12px weight 600 `--text-primary`)
- If unrated: "Rate:" label (DM Sans 11px `--text-secondary`) + StarRating (14px, interactive mode)
  - On rate: saves to `extraction_sessions.feedback_rating` via Supabase update

**Average confidence (margin-bottom 20px):**
- Section label: "AVG CONFIDENCE"
- Flex row, gap 8px
- Progress bar: flex 1, height 6px, border-radius 3px, `--bg-inset` background
  - Filled portion: width = confidence%, border-radius 3px
  - Color: green if > 85%, amber if 70–85%, red if < 70%
  - Transition: width 0.3s
- Value: Cabinet Grotesk, 12px, weight 700, `--text-primary` — "{N}%"

**Extraction config (margin-bottom 20px):**
- Section label: "EXTRACTION CONFIG"
- Container: `--bg-inset` bg, `--border-subtle` border, 8px radius, 12px 14px padding
- Key-value rows separated by `--border-subtle`:
  - Mode: label left (DM Sans 11px weight 600 `--text-secondary`), Badge right (mode name, entity-color)
  - Emphasis: label left, capitalized text right (DM Sans 11px weight 500 `--text-body`)
  - Anchors (if any): label top, badges below in flex-wrap

**Entity breakdown (margin-bottom 20px):**
- Section label: "ENTITY BREAKDOWN ({total})"
- List of rows, one per entity type (sorted by count desc):
  - Dot (7px, entity color) + type name (DM Sans 11px weight 500 `--text-body`, flex 1) + proportional bar (60px wide, 4px height, entity color fill, `--bg-inset` track) + count (DM Sans 11px weight 600 `--text-secondary`, 16px width, right-aligned)
  - Padding: 5px 0 per row

**Cross-connections (margin-bottom 20px):**
- Section label: "CROSS-CONNECTIONS"
- Container: 10px 14px padding, 8px radius
- If > 0: `--accent-50` bg, `rgba(214,58,0,0.1)` border. Sparkle icon (14px, `--accent-500`) + "{N} discovered" (DM Sans 12px weight 600 `--accent-600`)
- If 0: `--bg-inset` bg, `--border-subtle` border. "No cross-connections discovered" (DM Sans 11px `--text-secondary`)

**Actions:**
- "Re-extract" button: full-width, AI action primary style — `--accent-50` bg, `rgba(214,58,0,0.15)` border, `--accent-600` text, RefreshCw icon. Click navigates to Ingest view with source pre-filled (future: PRD 7 integration).
- Below: 2-button row (flex, 6px gap):
  - "Graph" button: flex 1, tertiary style — `--bg-card` bg, `--border-subtle` border, `--text-body` text, Eye icon. Click navigates to Explore Graph with extracted node IDs highlighted.
  - "Delete" button: flex 1, tertiary style — `--bg-card` bg, `--border-subtle` border, `--semantic-red-500` text, Trash icon. Click shows inline confirmation.

---

## 4. Data & Service Layer

### Supabase Queries

All queries go through `services/supabase.ts`. New functions:

**`fetchPipelineHistory(limit: number, offset: number): Promise<PipelineHistoryItem[]>`**

Unified query that joins extraction sessions with source metadata and computes entity breakdowns:

```sql
-- Step 1: Fetch extraction sessions with source join
SELECT
  es.id,
  es.source_name AS title,
  es.source_type AS source_type,
  es.extraction_mode AS mode,
  es.anchor_emphasis AS emphasis,
  es.entity_count,
  es.relationship_count,
  es.extraction_duration_ms AS duration,
  es.feedback_rating AS rating,
  es.feedback_text AS rating_text,
  es.extracted_node_ids,
  es.extracted_edge_ids,
  es.selected_anchor_ids,
  es.source_id,
  es.created_at,
  ks.source_url
FROM extraction_sessions es
LEFT JOIN knowledge_sources ks ON ks.id = es.source_id
WHERE es.user_id = auth.uid()
ORDER BY es.created_at DESC
LIMIT $1 OFFSET $2;
```

```sql
-- Step 2: For each session, count chunks
SELECT COUNT(*) AS chunk_count
FROM source_chunks
WHERE source_id = $source_id AND user_id = auth.uid();
```

```sql
-- Step 3: For each session, compute entity breakdown
SELECT entity_type, COUNT(*) AS count
FROM knowledge_nodes
WHERE id = ANY($extracted_node_ids) AND user_id = auth.uid()
GROUP BY entity_type
ORDER BY count DESC;
```

```sql
-- Step 4: Count cross-connections (edges where one node is from this extraction and the other is not)
SELECT COUNT(*) AS cross_count
FROM knowledge_edges ke
WHERE ke.user_id = auth.uid()
  AND (
    (ke.source_node_id = ANY($extracted_node_ids) AND ke.target_node_id != ALL($extracted_node_ids))
    OR
    (ke.target_node_id = ANY($extracted_node_ids) AND ke.source_node_id != ALL($extracted_node_ids))
  );
```

**`fetchActiveQueueItems(): Promise<PipelineHistoryItem[]>`**

```sql
SELECT
  yiq.id,
  yiq.video_title AS title,
  yiq.status,
  yiq.created_at,
  yiq.started_at,
  yc.extraction_mode AS mode,
  yc.anchor_emphasis AS emphasis,
  yc.linked_anchor_ids
FROM youtube_ingestion_queue yiq
LEFT JOIN youtube_channels yc ON yc.id = yiq.channel_id
WHERE yiq.user_id = auth.uid()
  AND yiq.status IN ('pending', 'fetching_transcript', 'extracting')
ORDER BY yiq.priority ASC, yiq.created_at ASC;
```

Map `status` values to step names: `pending` → `queued`, `fetching_transcript` → `fetching_transcript`, `extracting` → `extracting`.

**`fetchHeatmapData(): Promise<HeatmapCell[]>`**

Fetch extraction sessions for the last 91 days (13 weeks) and aggregate client-side:

```sql
SELECT
  es.created_at::date AS date,
  es.entity_count,
  es.relationship_count,
  es.extraction_duration_ms,
  es.source_type,
  es.extracted_node_ids,
  CASE WHEN es.entity_count = 0 AND es.extraction_duration_ms IS NULL THEN true ELSE false END AS is_failed
FROM extraction_sessions es
WHERE es.user_id = auth.uid()
  AND es.created_at >= NOW() - INTERVAL '91 days'
ORDER BY es.created_at ASC;
```

Client-side aggregation groups by date, computes per-day totals, and maps dates to week/day grid positions.

For entity breakdowns per day, fetch node confidence scores:

```sql
SELECT
  kn.entity_type,
  kn.confidence,
  kn.created_at::date AS date
FROM knowledge_nodes kn
WHERE kn.user_id = auth.uid()
  AND kn.created_at >= NOW() - INTERVAL '91 days';
```

Client-side: group by date, compute entity type counts, confidence buckets (5 ranges: 0.5–0.6, 0.6–0.7, 0.7–0.8, 0.8–0.9, 0.9–1.0).

**`fetchPipelineMetrics(): Promise<PipelineMetrics>`**

Computed client-side from `fetchPipelineHistory()` and `fetchActiveQueueItems()` results for the current and previous week.

**`fetchExtractionSettings(): Promise<ExtractionSettings>`**

Already exists per PRD 3 — reads from `extraction_settings` table for current user.

**`updateExtractionSettings(updates: Partial<ExtractionSettings>): Promise<void>`**

Already exists per PRD 3 — writes to `extraction_settings` table.

**`updateExtractionRating(sessionId: string, rating: number, text?: string): Promise<void>`**

```sql
UPDATE extraction_sessions
SET feedback_rating = $2, feedback_text = $3
WHERE id = $1 AND user_id = auth.uid();
```

### Custom Hooks

**`usePipelineHistory(filter, statusFilter, sortBy)`**

```typescript
function usePipelineHistory(
  sourceFilter: SourceTypeFilter,
  statusFilter: StatusFilter,
  sortBy: SortOption
): {
  items: PipelineHistoryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

- Fetches active queue items + extraction history, merges into single list
- Applies filters client-side (dataset is bounded — even power users unlikely to exceed 500 sessions)
- Applies sort client-side
- Scroll pagination: loads 20 items per page

**`usePipelineMetrics(items)`**

```typescript
function usePipelineMetrics(
  items: PipelineHistoryItem[]
): PipelineMetrics
```

- Pure computation hook — derives all metrics from the history items array
- Recomputes when items change
- Week boundaries: last 7 days vs previous 7 days for trend comparison

**`useHeatmapData()`**

```typescript
function useHeatmapData(): {
  cells: HeatmapCell[];
  loading: boolean;
  getCellData: (week: number, day: number) => HeatmapCell | null;
}
```

- Fetches and aggregates extraction data into 13-week × 7-day grid
- Each cell contains precomputed breakdowns for instant display when selected

---

## 5. Interaction & State

### State Management

**Local state in `PipelineView.tsx`:**
- `selectedItemId: string | null` — which history card is selected
- `sourceFilter: SourceTypeFilter` — dropdown selection
- `statusFilter: StatusFilter` — dropdown selection
- `sortBy: SortOption` — sort dropdown
- `selectedDay: { week: number; day: number } | null` — selected heatmap cell
- `openDropdown: 'source' | 'status' | 'sort' | null` — which dropdown is currently open

**Settings Context** (from PRD 3) provides extraction_settings for the right panel defaults.

### Interactions

**Heatmap cell click (count > 0):**
- Sets `selectedDay` to `{ week, day }`
- Distribution chart and confidence histogram adapt to show that day's data
- Right panel: if no card is selected, day metadata section appears above Extraction Settings
- Clicking the same cell again: deselects (`selectedDay = null`)

**Heatmap "Clear selection" link:**
- Sets `selectedDay = null`
- Charts return to aggregate view
- Day metadata disappears from right panel

**History card click:**
- Sets `selectedItemId`
- If completed or failed: right panel transitions to Extraction Detail
- If in-progress: right panel stays on Settings (no detail available for active items)
- Clicking the same card again: deselects

**Dropdown interaction:**
- Click trigger: opens dropdown, closes any other open dropdown
- Click option: applies filter, closes dropdown
- Click outside: closes dropdown
- `Escape`: closes dropdown

**Rating interaction (in detail panel):**
- Click a star on an unrated extraction → saves rating immediately via `updateExtractionRating()`
- Stars fill on hover for preview
- After rating: display switches from interactive to static mode showing the saved rating

**"Save Defaults" click:**
- Calls `updateExtractionSettings()` with current form values
- Button shows loading state
- On success: brief green flash, button returns to disabled (no pending changes)
- On error: inline error message below button

**"Re-extract" click:**
- Navigates to `/ingest` with query params: `?source_id={sourceId}&mode={mode}&emphasis={emphasis}`
- The Ingest view (PRD 7) reads these params and pre-fills the extraction configuration

**"Graph" click:**
- Navigates to `/explore?tab=graph&highlight={extractedNodeIds.join(',')}`
- The Graph view (PRD 5) reads the highlight param and emphasizes those nodes

**"Delete" click:**
- Replaces the Delete button with inline confirmation: "Delete extraction?" + [Cancel] (ghost) + [Delete] (semantic red)
- Delete: removes nodes by ID from `knowledge_nodes` (CASCADE removes edges), removes the extraction session row. Source in `knowledge_sources` is preserved.
- On success: card removed from list, right panel returns to Settings

### URL State

- Filter state is stored in URL query params: `/pipeline?source=YouTube&status=completed&sort=slowest`
- Selected item: `/pipeline?item={id}`
- Selected heatmap day: `/pipeline?week={N}&day={N}`
- Enables browser back/forward and deep-linking

### Keyboard Navigation

- `Escape` while a card is selected → deselects, returns to Settings
- `Escape` while a dropdown is open → closes dropdown
- `Escape` while heatmap day is selected → deselects day
- Arrow keys within dropdown → navigate options
- `Enter` within dropdown → select option

---

## 6. Forward-Compatible Decisions

| Decision | Rationale | Future PRD |
|---|---|---|
| `source_id` FK on `extraction_sessions` | Enables reliable source ↔ session joins without name matching. Essential for chunk counts, source navigation, and re-extraction flows. | PRD 7 (should populate this on new extractions), all future pipeline features |
| Heatmap data computed client-side from raw session data | For < 500 sessions, client-side aggregation is faster than server-side RPCs. If volume grows, the aggregation can be moved to a Supabase RPC or materialized view without changing the hook interface. | Future performance optimization |
| `PipelineHistoryItem` includes `extractedNodeIds` and `extractedEdgeIds` | Enables "View in Graph" navigation and "Delete extraction" cleanup. These arrays already exist in `extraction_sessions`. | PRD 5 (Graph highlight mode) |
| Settings panel reads/writes via existing `extraction_settings` + SettingsContext | No duplication of the settings model. Pipeline's settings editor is an alternative surface for the same data that Settings > Extraction tab manages. Changes in either location are reflected in both. | PRD 3 (Settings) |
| Rating system uses existing `feedback_rating` / `feedback_text` columns | Over time, ratings build a training signal for mode auto-selection: "YouTube sources get higher ratings with Strategic mode." Future ML feature can use this data. | Future quality optimization |
| Distribution charts accept pre-computed data, not raw queries | The same chart components can be reused in Orient (digest quality metrics) or Home (knowledge growth visualization). | PRD 13B, PRD 6 |
| Dropdowns use a shared `FilterDropdown` component | Matches the `FilterDrop` component pattern from PRD 4 (Explore Browse). Reusable across views. | PRD 4 |

---

## 7. Edge Cases & Error Handling

### Empty States

| Condition | Behavior |
|---|---|
| Zero extraction sessions exist | Health metrics show zeros. Heatmap is all `--bg-inset`. Card list shows centered empty state: Activity icon (48px, `--text-placeholder`), "No extraction history yet" heading (Cabinet Grotesk 18px/700), "Your pipeline history will appear here as you ingest content." description (DM Sans 13px `--text-secondary`, max-width 400px, centered), "Go to Ingest" primary button linking to `/ingest`. Right panel shows Extraction Settings. |
| Zero items match active filters | Card list shows: "No {source type} {status} extractions found." — DM Sans 13px, `--text-secondary`, centered. Filters remain visible. |
| Heatmap day has zero extractions | Cell is `--bg-inset` color. Not clickable. Cursor: default. |
| No extraction sessions have ratings | Quality Score metric card shows "—" for value, "No ratings yet" for sub-text. |

### Error States

| Error | User-Facing Behavior |
|---|---|
| Network failure on history fetch | Card list replaced with: "Couldn't load pipeline history." + [Retry] tertiary button, centered. Health metrics and heatmap show loading skeletons. |
| Network failure on rating save | Toast: "Couldn't save rating. Try again." — auto-dismiss after 4s. Rating reverts to unrated state. |
| Network failure on settings save | Inline error below Save button: "Couldn't save settings. Try again." in `--semantic-red-500`. Button returns to enabled. |
| Auth session expired | Redirect to login (handled by AuthProvider). |
| `extraction_sessions` has null `extracted_node_ids` | Treat as empty array. Entity breakdown shows "No entity data available." Cross-connections show 0. "View in Graph" button is disabled. |
| `extraction_sessions` references deleted source | `source_id` is SET NULL on cascade. Show source info from `source_name` / `source_type` columns. "View Source" action is disabled. |
| YouTube queue item has no channel join | Use fallback values: mode = "comprehensive", emphasis = "standard", anchors = []. |

### Data Integrity

- Heatmap date computation uses the user's local timezone (from browser) to assign sessions to days correctly.
- Processing duration is computed from `started_at` → `completed_at` on queue items, or `extraction_duration_ms` on sessions. If both are null, show "—" instead of "0s".
- Confidence is averaged from entity-level `confidence` values, not from any session-level field. If `extracted_node_ids` is empty, confidence shows 0.
- Week numbering in the heatmap: week 0 is 12 weeks ago, week 12 is the current week. Day 0 is Monday, day 6 is Sunday.

### Performance

- **Heatmap query:** single query fetching 91 days of session data. Typical user has < 500 sessions total, so this is fast. Client-side aggregation into the 91-cell grid.
- **Entity breakdown per session:** requires a GROUP BY query on `knowledge_nodes` filtered by node IDs. For sessions with 20+ entities, this is fast. Batched if loading multiple session details.
- **Cross-connection count:** the ANY/ALL query can be slow with large node ID arrays. For sessions with > 50 extracted nodes, consider caching this count on `extraction_sessions` as a denormalized column in future.
- **History list pagination:** 20 items per page. Most metadata is precomputed or cheaply derivable. Entity breakdown is lazy-loaded only when a card is selected (right panel).
- **Dropdown menus:** counts per filter option computed from the full items array in memory. No additional queries needed.

---

## 8. Acceptance Criteria

After this PRD is complete, a user can:

- [ ] See "Pipeline" in the nav rail with an Activity icon, positioned after Orient
- [ ] Navigate to `/pipeline` and see the Pipeline page with correct three-pane layout
- [ ] See the empty state with explanation and CTA when no extraction history exists
- [ ] See 4 health metric cards with correct values computed from real extraction data
- [ ] See the 13-week extraction activity heatmap with cells colored by extraction count
- [ ] Click a heatmap cell and see day metadata appear in the right panel
- [ ] See the distribution chart and confidence histogram update to reflect the selected day's data
- [ ] Click "Clear selection" to return charts to aggregate view
- [ ] Toggle between entity and source distribution views
- [ ] See the confidence histogram with 5 buckets showing the correct distribution
- [ ] See the processing time sparkline (14 days) or single metric (when day selected)
- [ ] Use the source type dropdown to filter history cards by YouTube, Meeting, Document, Note
- [ ] Use the status dropdown to filter by In Progress, Completed, Failed
- [ ] Use the sort dropdown to sort by Most Recent, Slowest First, Most Entities, Lowest Confidence
- [ ] See in-progress queue items in the card list with animated step progress bars
- [ ] See completed items with entity count, relationship count, duration, and cross-connection count
- [ ] See failed items with red status indicator and error preview
- [ ] Click a completed card and see full extraction diagnostics in the right panel
- [ ] Click a failed card and see the error detail with Retry button
- [ ] Rate an unrated extraction using the interactive star rating in the detail panel
- [ ] See the extraction config (mode, emphasis, anchors) that was used for each extraction
- [ ] See entity type breakdown with proportional bars in the detail panel
- [ ] See cross-connection count with accent-tinted display
- [ ] Click "Re-extract" to navigate to Ingest with pre-filled configuration
- [ ] Click "Graph" to navigate to Explore with extracted nodes highlighted
- [ ] Delete an extraction with confirmation
- [ ] See and edit extraction default settings (mode, emphasis, anchors, guidance) in the right panel
- [ ] Save updated extraction defaults
- [ ] Scroll down to load more history items (pagination)
- [ ] Deep-link to a specific filter/sort/selection state via URL query params
- [ ] See staggered fade-up animation on page load
- [ ] All design elements match the Synapse design system
- [ ] Page renders correctly at 1280px, 1440px, and 1920px widths
- [ ] All Supabase queries handle errors gracefully with user-facing feedback

---

## 9. Appendix: File Structure Summary

```
Modified files:
  src/app/Router.tsx                          — add /pipeline route
  src/components/layout/NavRail.tsx           — add Pipeline nav item
  src/components/layout/RightPanel.tsx        — add pipeline panel content types
  src/types/index.ts                          — add 'pipeline' to ViewType union
  src/services/supabase.ts                    — add pipeline query functions

New files:
  src/views/PipelineView.tsx
  src/components/pipeline/HealthMetrics.tsx
  src/components/pipeline/ExtractionHeatmap.tsx
  src/components/pipeline/HeatmapDayDetail.tsx
  src/components/pipeline/DistributionChart.tsx
  src/components/pipeline/ConfidenceHistogram.tsx
  src/components/pipeline/ProcessingSparkline.tsx
  src/components/pipeline/HistoryCard.tsx
  src/components/pipeline/HistoryCardStepBar.tsx
  src/components/pipeline/ExtractionDetail.tsx
  src/components/pipeline/ExtractionSettings.tsx
  src/components/shared/StarRating.tsx
  src/hooks/usePipelineHistory.ts
  src/hooks/usePipelineMetrics.ts
  src/hooks/useHeatmapData.ts
  src/types/pipeline.ts

Database migration:
  ALTER TABLE extraction_sessions ADD COLUMN source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL;
  CREATE INDEX idx_extraction_sessions_source_id ON extraction_sessions(source_id);
```
