# PRD 13A — Orient Page: Digest Management UI

**Phase:** 5 — Polish + Advanced
**Dependencies:** PRD 2 (Shell + Nav), PRD 3 (Settings Context), PRD 6 (Home — Briefings tab integration)
**Forward dependency for:** PRD 13B (Orient Engine: Generation Pipeline)
**Estimated Complexity:** Medium–High
**Estimated Effort:** 2–3 sessions

---

## 1. Objective

Build a dedicated **Orient** view — a top-level page accessible from the nav rail — where users manage their automated intelligence digests. This page provides a unified surface for creating, configuring, monitoring, and previewing AI-generated briefings that draw from the user's knowledge graph.

The Orient page mirrors the structural patterns of the Automate view (list + filter pills + right panel detail) so that users who have learned one can immediately navigate the other. The key difference: Automate manages *inputs* flowing into the graph; Orient manages *intelligence flowing out*.

For a user with an active knowledge graph, this page answers: "What is my graph telling me, on a schedule, without me having to ask?"

---

## 2. What Gets Built

### Navigation Update

| Item | Detail |
|---|---|
| **Nav rail item** | New "Orient" entry positioned after Automate (6th item, before Settings gear) |
| **Icon** | `Compass` from Lucide React — communicates orientation/direction, visually distinct from Automate's `Zap` |
| **Route** | `/orient` |
| **File** | `src/views/OrientView.tsx` |

Update the following existing files:
- `src/app/Router.tsx` — add `/orient` route
- `src/components/layout/NavRail.tsx` — add Orient nav item with Compass icon
- `src/types/index.ts` — add `'orient'` to the `ViewType` union
- `src/components/layout/RightPanel.tsx` — add Orient panel content types to `RightPanelContent` discriminated union

### New Files Created

```
src/
├── views/
│   └── OrientView.tsx                  # Top-level Orient page
├── components/
│   ├── orient/
│   │   ├── DigestList.tsx              # Left content: filter pills + digest card list
│   │   ├── DigestCard.tsx              # Individual digest card in the list
│   │   ├── DigestDetail.tsx            # Right panel: selected digest detail
│   │   ├── DigestCreateForm.tsx        # Right panel: new digest creation form
│   │   ├── ModulePicker.tsx            # Module template selection grid
│   │   ├── ModuleListItem.tsx          # Single module in the reorderable list
│   │   └── DeliverySection.tsx         # Delivery channel configuration
│   └── shared/
│       └── FrequencyIcon.tsx           # Reusable frequency icon (sun/calendar-week/calendar)
├── config/
│   └── digestModules.ts               # Static module template definitions
├── hooks/
│   └── useDigests.ts                   # Data fetching + mutations for digest_profiles & digest_modules
└── types/
    └── digest.ts                       # Digest-specific type definitions
```

### Database Migration (New Table Required)

**`digest_deliveries`** — stores the output of each digest generation run.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | NO | — | FK to auth.users |
| `digest_profile_id` | UUID | NO | — | FK to `digest_profiles(id)`, ON DELETE CASCADE |
| `status` | VARCHAR(50) | NO | `'generating'` | generating, ready, failed |
| `content` | JSONB | YES | — | Rendered digest output (structured by module) |
| `module_outputs` | JSONB | YES | — | Per-module results for granular viewing |
| `error_message` | TEXT | YES | — | Error detail on failure |
| `generated_at` | TIMESTAMPTZ | NO | `NOW()` | When generation started |
| `completed_at` | TIMESTAMPTZ | YES | — | When generation finished |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | Row creation time |

RLS policy follows standard pattern (`auth.uid() = user_id`).

**Column additions to existing `digest_profiles` table:**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `last_generated_at` | TIMESTAMPTZ | YES | — | Cached timestamp of most recent delivery |
| `next_scheduled_at` | TIMESTAMPTZ | YES | — | Computed next run time for display |
| `delivery_channels` | JSONB | YES | `'{"in_app": true}'` | Channel config: `{ in_app: bool, email?: string, slack_webhook?: string, telegram_bot_token?: string }` |
| `description` | TEXT | YES | — | User-provided description of the digest's purpose |

**Column addition to existing `digest_modules` table:**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `config` | JSONB | YES | `'{}'` | Module-specific configuration (e.g., custom query text, anchor filter IDs, time window override) |

**Add TypeScript types** in `src/types/database.ts`:

```typescript
export interface DigestProfile {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  schedule_time: string;           // HH:MM:SS format
  schedule_timezone: string;
  schedule_day_of_week: number | null;  // 0-6 for weekly
  schedule_day_of_month: number | null; // 1-28 for monthly
  density: 'brief' | 'standard' | 'comprehensive';
  delivery_channels: DeliveryChannels;
  last_generated_at: string | null;
  next_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryChannels {
  in_app: boolean;
  email?: string;
  slack_webhook?: string;
  telegram_bot_token?: string;
}

export interface DigestModule {
  id: string;
  digest_profile_id: string;
  user_id: string;
  template_id: string;
  custom_context: string | null;
  config: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DigestDelivery {
  id: string;
  user_id: string;
  digest_profile_id: string;
  status: 'generating' | 'ready' | 'failed';
  content: Record<string, unknown> | null;
  module_outputs: Record<string, unknown> | null;
  error_message: string | null;
  generated_at: string;
  completed_at: string | null;
  created_at: string;
}
```

---

## 3. Design Requirements

### Page Layout

Orient uses the standard three-pane layout: Nav Rail (56px) + Center Stage (flex, max-width 840px centered) + Right Panel (310px, white).

**Center Stage structure (top to bottom):**

1. **Header row** — page title left-aligned, primary action button right-aligned
2. **Summary line** — beneath title
3. **Filter pills** — horizontal row
4. **Section groups** — digest cards grouped by frequency, each group with a section label
5. **Empty state** — when no digests exist

**Right Panel states:**

| Condition | Right Panel Content |
|---|---|
| No digest selected, digests exist | "Create New Digest" form (default) |
| No digests exist | "Create New Digest" form |
| Digest selected | Digest detail view |

### Header Area

**Page title:**
- Text: "Orient"
- Font: Cabinet Grotesk, 24px, weight 800, letter-spacing -0.03em
- Color: `--text-primary` (#1a1a1a)

**Subtitle:**
- Text: "Intelligence briefings from your knowledge graph."
- Font: DM Sans, 13px, weight 400
- Color: `--text-secondary` (#808080)
- Margin-top: 4px below title

**Summary line:**
- Text: "{N} active digests · {N} daily · {N} weekly · {N} monthly"
- Font: DM Sans, 13px, weight 400
- Color: `--text-secondary`
- Margin-top: 8px below subtitle
- The count for "active" uses `--semantic-green-500` (#22c55e) when > 0
- If any digests have `status: failed` on their last delivery, append " · {N} failed" in `--semantic-red-500`

**"+ New Digest" button:**
- Position: right-aligned with page title (flex row, space-between)
- Style: Primary button — `--accent-500` background, white text, `box-shadow: 0 2px 8px rgba(214,58,0,0.2)`
- Font: DM Sans, 13px, weight 600
- Padding: 10px 22px
- Border-radius: 8px
- Icon: Lucide `Plus` (16px) before text
- Hover: `--accent-600` background
- Active: `--accent-700` background
- Click action: deselects any selected digest, right panel shows Create form, scrolls right panel to top

### Filter Pills

Horizontal row below the summary line. Margin-top: 16px.

| Pill | Filter Logic |
|---|---|
| All Digests ({total count}) | Show all |
| Daily ({count}) | `frequency = 'daily'` |
| Weekly ({count}) | `frequency = 'weekly'` |
| Monthly ({count}) | `frequency = 'monthly'` |

**Pill styling** (matches Automate view exactly):
- Padding: 5px 13px
- Border-radius: 20px
- Font: DM Sans, 11px, weight 600
- Inactive: transparent background, `--border-subtle` border, `--text-secondary` color
- Active: `--accent-50` background, `rgba(214,58,0,0.15)` border, `--accent-500` color
- Count in parentheses, same styling as label
- Gap between pills: 6px
- Transition: all 0.15s ease

### Digest Cards

Cards are grouped by frequency under section labels. Within each frequency group, cards are sorted by `schedule_time` ascending (earliest first).

**Section labels** (only shown when frequency filter is "All Digests"):
- Text: "DAILY DIGESTS", "WEEKLY DIGESTS", "MONTHLY DIGESTS" (uppercase)
- Font: Cabinet Grotesk, 10px, weight 700, letter-spacing 0.08em
- Color: `--text-secondary`
- Margin-top: 24px before first group, 36px between groups
- Margin-bottom: 12px before first card in group

**Card structure:**

```
┌──────────────────────────────────────────────────────────────┐
│  [FreqIcon]  Title                          [StatusDot] Active │
│              Daily · 7:00 AM EST              ─── or ───      │
│                                              [StatusDot] Paused│
│  [ModuleTag] [ModuleTag] [ModuleTag] [+N]                     │
│  Last delivered: 2h ago    Comprehensive                       │
└──────────────────────────────────────────────────────────────┘
```

**Card container:**
- Background: `--bg-card` (#ffffff)
- Border: 1px solid `--border-subtle`
- Border-radius: 12px
- Padding: 16px 22px
- Margin-bottom: 8px (gap between cards)
- Cursor: pointer
- Transition: all 0.18s ease

**Card hover:**
- Border-color: `--border-default`
- Transform: translateY(-1px)
- Box-shadow: 0 2px 8px rgba(0,0,0,0.04)

**Card selected (clicked):**
- Border-color: `rgba(214,58,0,0.3)` (accent at 30%)
- Background: `--accent-50` (#fff5f0)
- No translateY (stays flat when selected)

**Frequency icon** (left side of first row):
- Container: 36px × 36px, border-radius 8px
- Daily: `Sun` icon (Lucide), background `rgba(245,158,11,0.08)`, icon color `--semantic-amber-500`
- Weekly: `CalendarDays` icon (Lucide), background `rgba(59,130,246,0.08)`, icon color `--semantic-blue-500`
- Monthly: `Calendar` icon (Lucide), background `rgba(34,197,94,0.08)`, icon color `--semantic-green-500`
- Icon size: 18px, stroke-width 1.5

**Title:**
- Font: Cabinet Grotesk, 14px, weight 700, letter-spacing -0.01em
- Color: `--text-primary`

**Schedule subtitle:**
- Font: DM Sans, 12px, weight 400
- Color: `--text-secondary`
- Format: "{Frequency} · {time} {timezone}" — e.g., "Daily · 7:00 AM EST"
- For weekly: "Weekly · Mondays, 9:00 AM EST"
- For monthly: "Monthly · 1st, 8:00 AM EST"

**Status indicator** (right-aligned, first row):
- Active: 6px circle `--semantic-green-500` + "Active" in DM Sans 11px weight 600 `--semantic-green-500`
- Paused: 6px circle `--text-secondary` + "Paused" in DM Sans 11px weight 600 `--text-secondary`
- Draft: 6px circle `--semantic-amber-500` + "Draft" in DM Sans 11px weight 600 `--semantic-amber-500`
- A digest is "Draft" when `is_active = false` AND it has zero modules

**Module tags** (second row area):
- Shown below title/schedule, with 8px margin-top
- Each tag: DM Sans 10px, weight 600, padding 2px 8px, border-radius 4px
- Background: `--bg-inset` (#f0f0f0)
- Color: `--text-secondary`
- Max visible: 3 tags. If more, show "+{N}" tag in same styling
- Gap between tags: 4px

**Bottom metadata row:**
- Left: "Last delivered: {relative time}" — DM Sans 11px, weight 400, `--text-secondary`
  - If never delivered: "Not yet delivered" in `--text-placeholder`
  - If last delivery failed: "Last delivery failed" in `--semantic-red-500`
- Right: Density badge — DM Sans 10px, weight 600, padding 2px 8px, border-radius 4px
  - Brief: `--semantic-blue-50` bg, `--semantic-blue-500` text
  - Standard: `--bg-inset` bg, `--text-secondary` text
  - Comprehensive: `--accent-50` bg, `--accent-500` text
- Margin-top: 10px

**Staggered fade-up animation** on page load: each card animates in with 0.4s ease, 0.05s delay increment per card.

### Right Panel — Create New Digest Form

The default right panel state. Also shown when "+ New Digest" button is clicked.

**Panel header:**
- Title: "Create a Digest" — Cabinet Grotesk, 16px, weight 700
- Subtitle: "Set up an automated intelligence briefing" — DM Sans, 12px, `--text-secondary`
- Margin-bottom: 20px

**Form fields (vertical stack, 20px gap between field groups):**

**1. Title**
- Section label: "TITLE" — uppercase, Cabinet Grotesk, 10px, weight 700, letter-spacing 0.08em, `--text-secondary`
- Input: text field, placeholder "Morning Intelligence Brief"
- Styling: `--bg-inset` background, `--border-subtle` border, 8px radius, 9px 13px padding, DM Sans 13px
- Focus: `rgba(214,58,0,0.3)` border, `--accent-50` ring (3px)

**2. Description (optional)**
- Section label: "DESCRIPTION"
- Input: textarea, 2 rows, placeholder "What this digest is for..."
- Same input styling as above, with `resize: vertical`

**3. Frequency**
- Section label: "FREQUENCY"
- Toggle group component: 3 options — Daily / Weekly / Monthly
- Container: `--bg-inset` background, `--border-subtle` border, 10px radius, 3px internal padding
- Items: flex-1, 8px vertical padding, 8px radius, DM Sans 12px weight 600
- Inactive: transparent background, `--text-secondary` color
- Active: `--bg-card` (white) background, `--text-primary` color, `box-shadow: 0 1px 3px rgba(0,0,0,0.05)`
- Transition: all 0.15s ease

**4. Schedule**
- Section label: "SCHEDULE"
- Time input: `type="time"`, styled as input field
- Timezone select: dropdown with common timezones, styled as input field
- For **Weekly**: add day-of-week selector as a row of 7 small toggles (M T W T F S S). Active toggle: `--accent-50` bg, `--accent-500` text, `rgba(214,58,0,0.15)` border. Inactive: `--bg-inset` bg, `--text-secondary`. Each toggle: 32px × 32px, 6px radius, DM Sans 11px weight 600.
- For **Monthly**: add day-of-month selector as a number input (1–28), styled as input field. Label: "Day of month"
- All schedule fields in a grid: time + timezone on one row (50/50 split), day selector below if applicable

**5. Density**
- Section label: "DENSITY"
- 3-option row (similar to extraction emphasis selector):
- Each option is a card:
  - Padding: 10px 14px
  - Border-radius: 8px
  - Border: 1px solid `--border-subtle` (inactive) or `rgba(59,130,246,0.3)` / `rgba(128,128,128,0.3)` / `rgba(214,58,0,0.3)` (active, matching density color)
  - Background: transparent (inactive) or density-tinted at 8% (active)
  - Title: DM Sans 12px weight 600, `--text-primary` (active) or `--text-body` (inactive)
  - Description: DM Sans 10px weight 400, `--text-secondary`, line-height 1.4

| Density | Description | Active tint |
|---|---|---|
| Brief | "Key highlights. 2–3 min read." | `--semantic-blue-50` |
| Standard | "Balanced depth. 5–7 min read." | `--bg-inset` |
| Comprehensive | "Full analysis. 10–15 min read." | `--accent-50` |

**6. Modules**
- Section label: "MODULES"
- If modules have been added: show reorderable list of `ModuleListItem` components (see below)
- Below the list (or as the only element if empty): "Add Module" button
  - Style: Tertiary button — `--bg-inset` background, `--text-body` text, `--border-default` border
  - Icon: Lucide `Plus` (14px) before text
  - Click: opens `ModulePicker` inline (expands below the button, pushes content down)

**ModuleListItem** (within the form):
- Container: `--bg-card` background, `--border-subtle` border, 8px radius, 10px 14px padding
- Layout: drag handle (6 dots icon, `--text-placeholder`) | icon (module template icon, 16px) | title (DM Sans 12px, weight 600) | toggle switch (active/inactive) | remove button (X icon, `--text-placeholder`, hover `--semantic-red-500`)
- Gap between items: 6px
- Drag-and-drop reordering updates `sort_order` values

**ModulePicker** (expanded inline):
- Container: `--bg-inset` background, `--border-subtle` border, 10px radius, 12px padding
- Grid: 1 column within the 310px panel, stacked vertically
- Each template card:
  - Padding: 10px 14px
  - Background: `--bg-card`
  - Border: 1px solid `--border-subtle`
  - Border-radius: 8px
  - Cursor: pointer
  - Hover: `--border-default` border
  - Icon (16px, `--text-secondary`) + Title (DM Sans 12px, weight 600, `--text-primary`) on first row
  - Description (DM Sans 11px, weight 400, `--text-secondary`) on second row
  - Frequency compatibility tags (DM Sans 9px, weight 600, `--text-placeholder`) — e.g., "Daily · Weekly · Monthly"
  - Click: adds module to the list, collapses picker
- Templates filtered by selected frequency (daily templates hidden when frequency is "monthly", etc.)
- "Cancel" ghost button at bottom to collapse without adding

**7. Delivery Channels**
- Section label: "DELIVERY"
- In-app toggle: always on, shown as a non-interactive label: "In-app (always on)" — DM Sans 12px, `--text-secondary`, with green dot
- Email: toggle + text input for email address. When toggled on, input appears with slide-down animation
- Slack: toggle + text input for webhook URL
- Telegram: toggle + text input for bot token
- Each channel row: 12px vertical padding, flex row with toggle left and label/input right
- Toggle switch: 36px × 20px, `--bg-inset` track when off, `--semantic-green-500` track when on, white circle thumb, 0.15s transition

**8. Create button**
- Position: bottom of form, full-width, sticky at panel bottom (with 16px padding and `--bg-card` background for sticky area)
- Style: Primary button — `--accent-500` background, white text
- Text: "Create Digest"
- Disabled state: 40% opacity when title is empty or no modules added
- Loading state: replace text with small spinner (accent-tinted)
- Success: brief green flash, form resets, new digest appears in list and becomes selected (right panel transitions to detail)

### Right Panel — Digest Detail

Shown when a digest card is clicked in the list.

**Panel header:**
- Close button: `X` icon, top-right, `--text-secondary`, hover `--text-primary`. Click deselects digest, returns to Create form.
- Frequency icon: same component as card, but 40px × 40px container, 10px radius
- Title: Cabinet Grotesk, 16px, weight 700, `--text-primary`
- Subtitle: "{Frequency} · {time} {timezone}" — DM Sans, 12px, `--text-secondary`
- Status: colored dot + label, same styling as card
- Margin-bottom: 16px

**Action buttons row** (below header, flex row, 6px gap):
- "Pause" / "Resume" toggle: Tertiary button. Shows "Pause" (with `Pause` icon) when active, "Resume" (with `Play` icon) when paused.
- "Generate Now": Tertiary button with `RefreshCw` icon. Triggers immediate generation (placeholder — actual generation in PRD 13B). Shows loading spinner while generating.
- "Delete": Ghost button in `--semantic-red-500`. Click shows inline confirmation: "Delete this digest?" with "Cancel" (ghost) and "Delete" (semantic red primary) buttons.

**Stats cards** (2-up grid, 6px gap, margin-top 20px):
- Each card: `--bg-inset` background, 8px radius, 14px padding, text-center
- **Card 1 — Deliveries:**
  - Number: Cabinet Grotesk, 24px, weight 800, `--text-primary`
  - Label: DM Sans, 10px, weight 500, `--text-secondary` — "Delivered"
- **Card 2 — Modules:**
  - Number: Cabinet Grotesk, 24px, weight 800, `--text-primary`
  - Label: DM Sans, 10px, weight 500, `--text-secondary` — "Modules"

**Recent Deliveries section** (margin-top 24px):
- Section label: "RECENT DELIVERIES ({count})"
- List of delivery items, max 5 visible initially
- Each delivery row:
  - Layout: flex row, space-between
  - Left: delivery title (generated from date, e.g., "Mon, Mar 3 — Morning Brief") — DM Sans 12px, weight 500, `--text-body`
  - Right: relative time — DM Sans 11px, weight 400, `--text-secondary`
  - Status icon: tiny circle (4px) before title — `--semantic-green-500` for ready, `--semantic-red-500` for failed, `--semantic-amber-500` for generating
  - Padding: 8px 0, border-bottom: 1px solid `--border-subtle` (except last item)
  - Hover: `--bg-hover` background
  - Click: placeholder — will open delivery preview in future PRD 13B
- If > 5 deliveries: "Show all {N}" ghost link at bottom — DM Sans 11px, weight 600, `--accent-500`
- If no deliveries: "No deliveries yet. Click 'Generate Now' to create the first one." — DM Sans 12px, `--text-secondary`, centered

**Modules section** (margin-top 24px):
- Section label: "MODULES ({count})"
- Reorderable list of `ModuleListItem` components (same as create form but with edit affordance)
- Each item is clickable → inline expand to show module config (custom_context textarea, anchor selector if relevant)
- "Add Module" tertiary button at bottom

**Settings section** (margin-top 24px):
- Section label: "SETTINGS"
- Key-value pairs in a compact list:
  - "Density" — value shown as density badge (same as card)
  - "Schedule" — "{time} {timezone}" with day info if weekly/monthly
  - "Delivery" — comma-separated active channels: "In-app, Email"
- Each row: DM Sans 12px. Label in weight 500 `--text-secondary`, value in weight 500 `--text-body`
- "Edit Settings" ghost link at section bottom. Click: transitions right panel to an edit form (same layout as create form, pre-filled with current values, "Save" replaces "Create")

### Empty State

When `digest_profiles` returns zero rows for the current user:

**Center stage:**
- Centered vertically and horizontally within the content area
- `Compass` icon at 48px, `--text-placeholder` color
- Heading: "No digests yet" — Cabinet Grotesk, 18px, weight 700, `--text-primary`
- Description: "Automated intelligence briefings that surface patterns, connections, and developments from your knowledge graph. Set them on a schedule and let your graph work for you." — DM Sans, 13px, weight 400, `--text-secondary`, max-width 400px, text-align center, line-height 1.6
- Button: "+ Create Your First Digest" — Primary button (accent-500), margin-top 20px

**Right panel:** Shows Create form by default (same as when "+ New Digest" is clicked).

---

## 4. Module Template Definitions

Defined in `src/config/digestModules.ts` as a static configuration map. Each template has an `id`, display metadata, and frequency compatibility.

```typescript
export interface ModuleTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;              // Lucide icon name
  frequencies: ('daily' | 'weekly' | 'monthly')[];
  configSchema: {
    fields: ModuleConfigField[];
  };
}

export interface ModuleConfigField {
  key: string;
  type: 'text' | 'textarea' | 'anchor_select' | 'number';
  label: string;
  placeholder?: string;
  required?: boolean;
}
```

**Module templates:**

| ID | Title | Description | Frequencies | Config Fields |
|---|---|---|---|---|
| `new_connections` | New Connections | Cross-source relationships discovered since last digest | Daily, Weekly, Monthly | — |
| `anchor_updates` | Anchor Updates | Activity and developments around your anchor entities | Daily, Weekly, Monthly | `anchors`: anchor_select (optional — defaults to all) |
| `knowledge_growth` | Knowledge Growth | Sources ingested, entities extracted, graph expansion metrics | Daily, Weekly, Monthly | — |
| `custom_query` | Custom Query | A question answered by your graph each cycle | Daily, Weekly, Monthly | `query`: textarea (required, placeholder "What emerging themes connect my recent research?") |
| `morning_brief` | Morning Brief | Executive summary of yesterday's additions | Daily | — |
| `action_items` | Action Items | Open actions, approaching deadlines, blocked items | Daily | — |
| `weekly_synthesis` | Weekly Synthesis | Pattern recognition across the week's additions | Weekly | — |
| `relationship_evolution` | Relationship Evolution | How entity connections have shifted over 7 days | Weekly | — |
| `knowledge_gaps` | Knowledge Gaps | Areas where your graph is thin relative to your anchors | Weekly, Monthly | — |
| `monthly_report` | Monthly Intelligence Report | Comprehensive trend analysis across the month | Monthly | — |
| `anchor_deep_dive` | Anchor Deep Dive | Per-anchor summary of the month's developments | Monthly | `anchors`: anchor_select (optional) |
| `graph_health` | Graph Health | Orphan nodes, weak connections, extraction quality metrics | Monthly | — |

---

## 5. Data & Service Layer

### Supabase Queries

All queries go through `services/supabase.ts`. New functions:

**`fetchDigestProfiles(): Promise<DigestProfile[]>`**
```sql
SELECT * FROM digest_profiles
WHERE user_id = auth.uid()
ORDER BY
  CASE frequency
    WHEN 'daily' THEN 1
    WHEN 'weekly' THEN 2
    WHEN 'monthly' THEN 3
  END,
  schedule_time ASC;
```

**`fetchDigestModules(profileId: string): Promise<DigestModule[]>`**
```sql
SELECT * FROM digest_modules
WHERE digest_profile_id = $1
  AND user_id = auth.uid()
ORDER BY sort_order ASC;
```

**`fetchDigestDeliveries(profileId: string, limit?: number): Promise<DigestDelivery[]>`**
```sql
SELECT * FROM digest_deliveries
WHERE digest_profile_id = $1
  AND user_id = auth.uid()
ORDER BY generated_at DESC
LIMIT $2;  -- default 10
```

**`createDigestProfile(profile: Omit<DigestProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_generated_at' | 'next_scheduled_at'>): Promise<DigestProfile>`**
- INSERT into `digest_profiles`
- Returns the created row

**`updateDigestProfile(id: string, updates: Partial<DigestProfile>): Promise<DigestProfile>`**
- UPDATE `digest_profiles` SET ... WHERE id = $1 AND user_id = auth.uid()
- Returns updated row

**`deleteDigestProfile(id: string): Promise<void>`**
- DELETE FROM `digest_profiles` WHERE id = $1 AND user_id = auth.uid()
- Cascades to `digest_modules` and `digest_deliveries`

**`createDigestModule(module: Omit<DigestModule, 'id' | 'user_id' | 'created_at'>): Promise<DigestModule>`**
- INSERT into `digest_modules`

**`updateDigestModule(id: string, updates: Partial<DigestModule>): Promise<DigestModule>`**
- UPDATE `digest_modules` SET ... WHERE id = $1 AND user_id = auth.uid()

**`deleteDigestModule(id: string): Promise<void>`**
- DELETE FROM `digest_modules` WHERE id = $1

**`reorderDigestModules(moduleIds: string[]): Promise<void>`**
- For each moduleId at index i, UPDATE `digest_modules` SET sort_order = i WHERE id = moduleId AND user_id = auth.uid()
- Execute as a batch (loop with individual updates — Supabase doesn't support batch UPDATE)

**`fetchDigestSummary(): Promise<DigestSummary>`**
- Used for the summary line
```typescript
interface DigestSummary {
  total: number;
  active: number;
  daily: number;
  weekly: number;
  monthly: number;
  failed: number;  // profiles where last delivery status = 'failed'
}
```
- Computed client-side from `fetchDigestProfiles()` result — no separate query needed

### Custom Hook

**`useDigests()`**

```typescript
function useDigests(): {
  profiles: DigestProfile[];
  loading: boolean;
  error: string | null;
  summary: DigestSummary;
  selectedProfile: DigestProfile | null;
  selectedModules: DigestModule[];
  selectedDeliveries: DigestDelivery[];
  selectProfile: (id: string | null) => void;
  createProfile: (data: CreateDigestInput) => Promise<DigestProfile>;
  updateProfile: (id: string, updates: Partial<DigestProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  addModule: (profileId: string, templateId: string, config?: Record<string, unknown>) => Promise<void>;
  updateModule: (id: string, updates: Partial<DigestModule>) => Promise<void>;
  removeModule: (id: string) => Promise<void>;
  reorderModules: (moduleIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}
```

- Fetches all profiles on mount
- When `selectedProfile` changes, fetches modules and deliveries for that profile
- All mutation functions optimistically update local state before confirming with Supabase
- Error states set `error` string, which the UI displays as a toast or inline message

---

## 6. Interaction & State

### State Management

**Local state in `OrientView.tsx`:**
- `selectedDigestId: string | null` — which digest card is selected
- `activeFilter: 'all' | 'daily' | 'weekly' | 'monthly'` — filter pill selection
- `rightPanelMode: 'create' | 'detail' | 'edit'` — controls right panel content

**`useDigests` hook** manages all data state (profiles, modules, deliveries, loading, error).

**Settings Context** is read-only here — used to access user timezone for schedule defaults.

### Interactions

**Filter pill click:**
- Sets `activeFilter`, filters the displayed list
- Does not deselect current selection (if selected digest is still visible)
- If selected digest is filtered out, deselect it and show Create form

**Digest card click:**
- Sets `selectedDigestId` to the card's profile ID
- Right panel transitions to Digest Detail (0.15s fade)
- Card gets selected styling (accent border + accent-50 bg)
- Previously selected card loses selection

**Digest card click (already selected):**
- Deselects: `selectedDigestId = null`, right panel returns to Create form

**"+ New Digest" button click:**
- `selectedDigestId = null`
- `rightPanelMode = 'create'`
- Right panel scrolls to top
- If any card was selected, it deselects

**Create form → "Create Digest" click:**
- Validates: title required, at least 1 module
- Calls `createProfile` then `addModule` for each module in the list
- On success: new profile appears in list, auto-selects it, right panel transitions to detail
- On error: inline error message below the Create button in `--semantic-red-500`

**Detail panel → "Delete" click:**
- Shows inline confirmation (replaces Delete button with "Delete this digest? [Cancel] [Delete]")
- Cancel: returns to normal action buttons
- Delete: calls `deleteProfile`, removes from list, deselects, right panel returns to Create form

**Detail panel → "Pause" / "Resume" click:**
- Calls `updateProfile(id, { is_active: !current })
- Optimistic update: status indicator and button label flip immediately

**Detail panel → "Edit Settings" click:**
- `rightPanelMode = 'edit'`
- Right panel shows same form layout as Create, pre-filled with current values
- "Save" button replaces "Create Digest"
- "Cancel" ghost button returns to detail view without saving

**Module drag-and-drop reorder:**
- Uses native HTML5 drag events (no library dependency)
- Visual feedback: dragged item gets 4% opacity reduction, drop target shows accent-50 highlight bar
- On drop: calls `reorderModules` with new ID order

### Keyboard Navigation

- `Escape` while a digest is selected → deselects, returns to Create form
- `Escape` while ModulePicker is open → closes picker
- Tab navigation through form fields follows natural DOM order
- Enter on Create/Save button submits form (unless disabled)

### URL State

The selected digest ID is stored in the URL as a query parameter: `/orient?digest={id}`. This enables:
- Deep-linking to a specific digest detail
- Browser back button returns to unselected state
- Page refresh preserves selection

---

## 7. Forward-Compatible Decisions

| Decision | Rationale | Future PRD |
|---|---|---|
| Module templates defined as static config with `configSchema` | Adding new module types requires only a new entry in the config map — no structural changes. PRD 13B will add the execution logic per template. | PRD 13B |
| `digest_deliveries` table stores structured JSONB `content` and `module_outputs` | The delivery preview, Home Briefings tab, and future email/Slack rendering all read from this table. Structured output enables per-module display. | PRD 13B, PRD 6 (Briefings tab enhancement) |
| `delivery_channels` as JSONB on `digest_profiles` | Avoids a separate table while remaining extensible. New channels (e.g., Discord, Notion) can be added as new keys without migration. | PRD 13B |
| `ModuleConfigField` schema supports `anchor_select` type | The anchor picker component from PRD 3 (`AnchorPicker.tsx`) will be reused in module configuration for anchor-specific modules. | PRD 13B |
| `useDigests` hook exposes `refetch()` | The Home Briefings tab can call this to refresh digest state after navigation. The Orient Engine (13B) calls refetch after generation completes. | PRD 13B, PRD 6 |
| `RightPanelContent` union extended with `{ type: 'digest'; data: DigestProfile }` | Consistent with existing pattern for node and source detail. Future cross-view navigation (e.g., Home Briefings → Orient detail) uses the same mechanism. | PRD 6 |
| Selected digest stored in URL query param | Enables deep-linking from Home Briefings tab directly to a specific digest's detail panel in Orient. | PRD 6, PRD 13B |
| `custom_query` module stores query text in `config.query` | PRD 13B will pass this directly to the `queryGraph()` RAG function from PRD 8. No additional mapping needed. | PRD 13B, PRD 8 |

---

## 8. Edge Cases & Error Handling

### Empty States

| Condition | Behavior |
|---|---|
| Zero digests exist | Full-page empty state with Compass icon, explanation text, and CTA button. Right panel shows Create form. |
| Zero digests match active filter | Inline message: "No {frequency} digests." — DM Sans 13px, `--text-secondary`, centered in content area. Right panel remains in current state. |
| Digest has zero modules | Card shows "Draft" status (amber). Detail panel shows message: "Add at least one module to activate this digest." in `--semantic-amber-500`. "Generate Now" button is disabled. |
| Zero deliveries for a digest | Detail deliveries section shows: "No deliveries yet. Click 'Generate Now' to create the first one." |

### Error States

| Error | User-Facing Behavior |
|---|---|
| Network failure on profile fetch | Content area shows: "Couldn't load digests. [Retry]" — centered, retry button in tertiary style. |
| Network failure on create/update/delete | Inline error below the action button: "Something went wrong. Please try again." in `--semantic-red-500`. Optimistic update is rolled back. |
| Auth session expired | Redirect to login (handled by AuthProvider). |
| Supabase RLS denial | Treated same as network failure — user sees generic error. |
| Malformed `delivery_channels` JSONB | Defensive parsing in `useDigests`: if parsing fails, default to `{ in_app: true }`. Log warning to console. |
| `digest_modules` references unknown `template_id` | Show module with title "Unknown Module" and a "Remove" button. Log warning. |
| Duplicate digest titles | Allowed — no uniqueness constraint. Titles are user-facing labels, not identifiers. |

### Data Integrity

- `schedule_day_of_month` is clamped to 1–28 to avoid month-length edge cases (no 29th, 30th, 31st).
- Timezone strings must be valid IANA timezone identifiers. The timezone selector only shows valid options.
- When a profile is deleted, CASCADE removes its modules and deliveries. The UI confirms before delete.
- Module `sort_order` is recomputed on every reorder operation to avoid gaps.

### Performance

- Digest list: unlikely to exceed 10–20 items. No pagination needed.
- Delivery history: paginated at 5 items in the detail panel, with "Show all" expanding the list (max 50, then paginate with "Load more").
- Module templates: static config, loaded once, never queried from database.
- Profile + module fetch: two sequential queries per selection. Could be parallelized with `Promise.all` if latency becomes noticeable.

---

## 9. Acceptance Criteria

After this PRD is complete, a user can:

- [ ] See "Orient" in the nav rail with a Compass icon, positioned after Automate
- [ ] Navigate to `/orient` and see the Orient page with correct three-pane layout
- [ ] See the empty state with explanation text and CTA when no digests exist
- [ ] Click "+ New Digest" and see the creation form in the right panel
- [ ] Fill in title, frequency, schedule, density, and modules to create a new digest
- [ ] See the new digest appear in the list immediately after creation
- [ ] Filter digests by frequency using the pill filters
- [ ] Click a digest card to see its detail in the right panel
- [ ] See correct status indicators (Active, Paused, Draft) on digest cards
- [ ] See module tags and density badges on each digest card
- [ ] Pause and resume a digest from the detail panel
- [ ] Edit a digest's settings (title, schedule, density, delivery channels) from the detail panel
- [ ] Add, remove, and reorder modules within a digest
- [ ] Delete a digest with confirmation
- [ ] See the "Recent Deliveries" section (empty state until PRD 13B wires up generation)
- [ ] See frequency-appropriate module templates when adding modules (daily templates hidden for monthly digests)
- [ ] Deep-link to a specific digest via URL query parameter
- [ ] See staggered fade-up animation on page load
- [ ] Navigate between Orient and other views without losing selection state within a session
- [ ] All design elements match the Synapse design system (typography, spacing, colors, component styles)
- [ ] Page renders correctly at 1280px, 1440px, and 1920px widths
- [ ] All Supabase queries handle errors gracefully with user-facing feedback

---

## Appendix: File Structure Summary

```
Modified files:
  src/app/Router.tsx                    — add /orient route
  src/components/layout/NavRail.tsx     — add Orient nav item
  src/components/layout/RightPanel.tsx  — add digest panel content type
  src/types/index.ts                    — add 'orient' to ViewType union
  src/types/database.ts                 — add DigestProfile, DigestModule, DigestDelivery types
  src/services/supabase.ts              — add digest CRUD functions

New files:
  src/views/OrientView.tsx
  src/components/orient/DigestList.tsx
  src/components/orient/DigestCard.tsx
  src/components/orient/DigestDetail.tsx
  src/components/orient/DigestCreateForm.tsx
  src/components/orient/ModulePicker.tsx
  src/components/orient/ModuleListItem.tsx
  src/components/orient/DeliverySection.tsx
  src/components/shared/FrequencyIcon.tsx
  src/config/digestModules.ts
  src/hooks/useDigests.ts
  src/types/digest.ts

Database migration:
  CREATE TABLE digest_deliveries (...)
  ALTER TABLE digest_profiles ADD COLUMN last_generated_at, next_scheduled_at, delivery_channels, description
  ALTER TABLE digest_modules ADD COLUMN config
```
