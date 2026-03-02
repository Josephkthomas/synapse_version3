# PRD 9/10 — Capture View + Automate View

**Phase:** 4 — Automation  
**Replaces:** Original PRD 9 (Ingest: YouTube, Meetings, Documents Tabs) + Original PRD 10 (Automate View)  
**Dependencies:** PRD 2 (App Shell + Navigation), PRD 3 (Settings), PRD 7 (Ingest + Extraction Pipeline)  
**Estimated Complexity:** High (2–3 sessions)

---

## 1. Objective

Build the two views that complete Synapse's content acquisition model: **Capture** for manual, intentional content input and **Automate** for persistent, source-based knowledge pipelines. This PRD renames the nav item from "Ingest" to "Capture," simplifies the capture interface into four input modes (Text, URL, Document, Transcript), and transforms the Automate view from a read-only dashboard into a full source-centric management interface with filtering, source detail panels, per-source queue visibility, and new source onboarding.

Together, these two views create a clean mental model: Capture is "I have content right now, process it." Automate is "Content flows in continuously from connected sources."

---

## 2. What Gets Built

### 2.1 Global Change: Nav Rename

- The nav rail item currently labeled "Ingest" is renamed to **"Capture"**.
- The nav icon remains the same (the existing capture/ingest icon).
- The route changes from `/ingest` to `/capture`. If the app currently routes to `/ingest`, add a redirect.
- The top bar title renders "Capture" when this view is active.

**Files modified:**
- `src/components/layout/NavRail.tsx` — update label and route
- `src/App.tsx` or router config — update route path, add redirect from `/ingest` if needed

---

### 2.2 Capture View

The Capture view is a focused, single-column input interface. It replaces the original tabbed Ingest view (which had Quick Capture, YouTube, Meetings, Documents, and History tabs). The YouTube/Meetings connection UI moves to Automate. History remains accessible but is deprioritized.

**File created:** `src/views/CaptureView.tsx`

#### 2.2.1 Page Header

- **Title**: "Capture" — Cabinet Grotesk, 20px, weight 700, `--text-primary`, letter-spacing -0.01em.
- **Subtitle**: "Add content from any source." — DM Sans, 13px, `--text-secondary`.
- Margin-bottom 24px below subtitle.

#### 2.2.2 Mode Switcher

A horizontal row of four mode buttons that determine which input interface is shown. This is NOT a toggle group (inset container style) — it uses individual rounded buttons in a row.

- **Modes**: Text, URL, Document, Transcript
- Each button displays an icon (left) + label (right).
- **Icons** (Lucide): `Type` for Text, `Globe` for URL, `FileText` for Document, `Mic` for Transcript.
- **Active state**: `--accent-50` background, `accent-500` text/icon, border `rgba(214,58,0,0.15)`.
- **Inactive state**: transparent background, `--text-secondary` text/icon, `--border-subtle` border.
- Button padding: `8px 16px`. Border-radius: 8px. Font: DM Sans, 12px, weight 600. Gap between buttons: 6px.
- Margin-bottom: 16px below the mode switcher row.

**State**: `const [mode, setMode] = useState<'text' | 'url' | 'document' | 'transcript'>('text');`

#### 2.2.3 Text Mode (Default)

A white card containing:

- **Title input**: full-width text input. Placeholder: "Title (optional)". DM Sans, 14px, transparent background, no border. Padding: `0 0 10px 0`. Border-bottom: `1px solid --border-subtle`.
- **Content textarea**: full-width. Placeholder: "Paste meeting notes, article text, brainstorm, observations, or any content worth extracting…". DM Sans, 14px, `--text-primary`. Min-height: 200px. Transparent background, no border. Line-height: 1.7. Resize: vertical.
- **Footer bar**: below a `1px solid --border-subtle` top border, padding-top 14px. Contains:
  - Left: character count — DM Sans, 11px, `--text-placeholder`. Format: "{n} characters".
  - Right: Extract button — primary style. Label: "Extract Knowledge" with sparkle icon (14px) left of text. Background: `--accent-500`. Text: white. Font: DM Sans, 13px, weight 600. Padding: `8px 22px`. Border-radius: 8px. Disabled (opacity 0.4, cursor not-allowed) when content is empty.

**Card styling**: `--bg-card` background, `1px solid --border-subtle` border, 12px border-radius, padding `16px 20px`.

#### 2.2.4 URL Mode

A white card containing:

- **URL input row**: flex container with link icon (Lucide `Link`, 16px, `--text-secondary`) + text input. Placeholder: "Paste a YouTube URL, article link, or any web page…". DM Sans, 14px. No border on input. Margin-bottom: 14px.
- **Preview placeholder**: below the input. Rounded container (8px radius) with `--bg-inset` background, `1px solid --border-subtle` border. Padding: `14px 16px`.
  - Line 1: "Paste a URL to preview content before extraction" — DM Sans, 12px, `--text-secondary`.
  - Line 2: "Supports: YouTube videos, web articles, blog posts, documentation" — DM Sans, 11px, `--text-placeholder`.
- **Footer bar**: same pattern as Text mode. Button label: "Fetch & Extract". Disabled when URL input is empty.

**Card styling**: same as Text mode.

#### 2.2.5 Document Mode

A drag-and-drop zone (NOT inside a white card — the zone itself is the visual container):

- **Container**: 12px border-radius, `2px dashed --border-default` border, `--bg-card` background. Padding: `48px 24px`. Text-align: center. Cursor: pointer.
- **Upload icon**: Lucide `Upload`, 32px, `--text-placeholder`. Centered. Margin-bottom: 12px.
- **Primary text**: "Drop files here or click to browse" — DM Sans, 14px, weight 600, `--text-body`.
- **Secondary text**: "PDF · DOCX · Markdown · Plain text" — DM Sans, 12px, `--text-secondary`. Margin-top: 4px.
- **Hover state**: border color transitions to `--accent-500` at 40% opacity. Background shifts to `--accent-50` at 30% opacity.
- **Drag-over state**: border becomes solid (not dashed), accent-500 at 60% opacity. Background: `--accent-50`.

**Hidden file input**: `<input type="file" accept=".pdf,.docx,.md,.txt,.markdown" />` triggered by click on the zone.

#### 2.2.6 Transcript Mode

Two white cards stacked:

**Card 1 — Metadata** (same card styling as Text mode):
- Two fields side-by-side in a flex row with 12px gap:
  - **Meeting Title**: label "Meeting Title" (DM Sans, 11px, weight 600, `--text-secondary`, margin-bottom 4px). Input with placeholder "e.g. Q4 Planning with Marco". Full-width within its flex-1 container. `--bg-inset` background, `1px solid --border-subtle` border, 8px radius, `8px 12px` padding, DM Sans 13px.
  - **Date**: label "Date" (same label style). Input type="date". Same styling as Meeting Title.

**Card 2 — Transcript Content** (margin-top: 12px):
- **Textarea**: Placeholder: "Paste the full meeting transcript here…". DM Sans, 13px. Min-height: 280px. `--bg-inset` background, `1px solid --border-subtle` border, 8px radius. Padding: `12px 14px`. Line-height: 1.6.
- **Footer bar**: same pattern as Text mode. Character count on left. Extract button on right.

#### 2.2.7 Advanced Extraction Options

Below the mode-specific input (regardless of which mode is active), a collapsible section:

- **Toggle button**: ghost-style. Label: "Advanced Extraction Options" with chevron icon (rotates 180deg when open). DM Sans, 12px, weight 600, `--text-secondary`. Chevron rotation: `transform: rotate(180deg)` with `transition: transform 0.2s`.
- **Collapsed by default**: `const [advancedOpen, setAdvancedOpen] = useState(false);`

**When expanded**, a white card appears (fadeUp animation, 0.2s ease) containing:

1. **Extraction Mode** (section label "EXTRACTION MODE"):
   - 2x2 grid of mode cards. Gap: 6px.
   - Each card: padding `10px 14px`, 8px radius, cursor pointer.
   - **Selected**: border `1px solid {modeColor}40`, background `{modeColor}08`. Label in mode color.
   - **Unselected**: border `1px solid --border-subtle`, background `--bg-card`. Label in `--text-primary`.
   - Modes with colors: Comprehensive (Topic color), Strategic (Goal color), Actionable (Action color), Relational (Insight color).
   - Label: DM Sans, 12px, weight 600. Description: DM Sans, 10px, `--text-secondary`.

2. **Anchor Emphasis** (section label "ANCHOR EMPHASIS"):
   - 3-button row, each flex:1. Gap: 6px.
   - Same selected/unselected pattern but using Anchor entity color.
   - Options: Passive ("Minimal anchor bias"), Standard ("Balanced"), Aggressive ("Strong anchor focus").
   - Label: 11px weight 600. Description: 9px `--text-secondary`.

3. **Focus Anchors** (section label "FOCUS ANCHORS"):
   - Flex-wrap row of anchor toggle buttons. Gap: 5px.
   - Each button: `4px 10px` padding, 6px radius.
   - **Selected**: border `{Anchor color}50`, background `{Anchor color}0a`, text in Anchor color. Shows check icon (11px) before label.
   - **Unselected**: border `--border-subtle`, transparent background, `--text-secondary` text.
   - Font: DM Sans, 11px, weight 600.
   - Anchors loaded from `SettingsContext` (populated by PRD 3).

4. **Custom Guidance** (section label "CUSTOM GUIDANCE"):
   - Textarea. Placeholder: "e.g. Focus on action items and decisions…". 2 rows default.
   - `--bg-inset` background, `1px solid --border-subtle` border, 8px radius. DM Sans, 12px. Resize: vertical.

**Section labels**: all use the standard `SL` component — uppercase, 10px, Cabinet Grotesk, weight 700, letter-spacing 0.08em, `--text-secondary`. Margin-bottom: 8px.

#### 2.2.8 Extraction Trigger

When the user clicks the Extract button:

- The button enters loading state (spinner icon replaces sparkle, text changes to "Extracting…", stays disabled).
- The extraction pipeline from PRD 7 is invoked with:
  - `content`: the text/URL/file/transcript content
  - `sourceType`: mapped from mode — "Note" for text, "YouTube"/"Article" for URL (determined by URL pattern), "Document" for document, "Meeting" for transcript
  - `extractionMode`: from advanced options or user's default (from `SettingsContext`)
  - `anchorEmphasis`: from advanced options or user's default
  - `selectedAnchors`: from Focus Anchors selection
  - `customGuidance`: from Custom Guidance textarea
  - `title`: from title input (Text/Transcript modes) or auto-detected (URL/Document modes)
- On success: navigate to the entity review UI (from PRD 7) or show success state.
- On failure: show error inline below the Extract button.

#### 2.2.9 Layout Constraints

- Container: `height: 100%`, `overflow-y: auto`, `background: --bg-content`.
- Inner wrapper: `max-width: 720px`, `margin: 0 auto`, `padding: 28px 32px`.
- The narrower max-width (720px vs the standard 840px) is intentional — this is a focused input form, not a data-dense view.

---

### 2.3 Automate View

The Automate view is a source-centric management interface that replaces the original read-only dashboard. It follows the standard three-pane pattern: center stage shows a filterable source list, and the right panel shows source detail or new source onboarding when a source is selected.

**File created:** `src/views/AutomateView.tsx`

#### 2.3.1 Page Header

- **Title**: "Automate" — Cabinet Grotesk, 20px, weight 700, `--text-primary`, letter-spacing -0.01em.
- **Subtitle**: "Persistent knowledge pipelines. Content flows in automatically." — DM Sans, 13px, `--text-secondary`. Margin-bottom: 4px.

#### 2.3.2 Quick Stats Strip

A horizontal row of inline stats below the subtitle. Flex container, gap: 16px. Padding-top: 4px. Margin-bottom: 20px.

- **Active sources**: `{count} active sources` — count in Cabinet Grotesk weight 700 `--text-primary`, rest in DM Sans 12px `--text-secondary`. Count = sources where status is 'active' or 'connected'.
- **Processing** (conditional, only shown if > 0): `{count} processing` — DM Sans 12px, weight 600, `--semantic-blue-500`.
- **Pending** (conditional, only shown if > 0): `{count} pending` — DM Sans 12px, `--text-secondary`.
- **Failed** (conditional, only shown if > 0): `{count} failed` — DM Sans 12px, weight 600, `--semantic-red-500`.

Counts are computed from the `youtube_ingestion_queue` table across all sources.

#### 2.3.3 Filter Pills

Horizontal row of filter buttons. Gap: 6px. Margin-bottom: 20px.

**Filters**:
- All Sources (count: total sources)
- YouTube Channels (count: sources where category is youtube-channel)
- YouTube Playlists (count: sources where category is youtube-playlist)
- Meeting Services (count: sources where category is meeting)

**Each pill**:
- Padding: `5px 13px`. Border-radius: 20px. Font: DM Sans, 11px, weight 600.
- **Active**: border `rgba(214,58,0,0.15)`, background `--accent-50`, text `--accent-500`.
- **Inactive**: border `--border-subtle`, background transparent, text `--text-secondary`.
- Count shown in parentheses: font-size 9px, weight 700, opacity 0.6.
- Transition: `all 0.15s`.
- Flex with gap: 5px to arrange label and count.

**State**: `const [filter, setFilter] = useState<'all' | 'youtube-channel' | 'youtube-playlist' | 'meeting'>('all');`

#### 2.3.4 Source Cards

A vertical list of source cards. Gap: 8px. Each card represents a connected automation source.

**File created:** `src/components/automate/SourceCard.tsx`

**Card container:**
- Padding: `16px 22px`. Border-radius: 12px. Background: `--bg-card`.
- Border: `1px solid --border-subtle`. Cursor: pointer. Transition: `all 0.18s ease`.
- **Hover** (not selected): border darkens to `--border-default`, `translateY(-1px)`, box-shadow `0 2px 8px rgba(0,0,0,0.04)`.
- **Selected**: border `--accent-500` at 30% opacity, background `--accent-50` at 50% opacity.

**Card layout — top row** (flex, align-items flex-start, justify-content space-between, margin-bottom 8px):

- **Left group** (flex, align-items center, gap 10px):
  - **Category icon container**: 32x32px, 8px radius. Background: category color at 12% opacity. Centered icon: 15px, in category color.
  - **Name block**:
    - **Title**: Cabinet Grotesk, 14px, weight 700, `--text-primary`.
    - **Subtitle**: DM Sans, 11px, `--text-secondary`. Shows: handle for channels (`@lexfridman`), channel name for playlists, category label for meetings.
- **Right group** (flex, align-items center, gap 8px):
  - **Queue badge** (conditional, only if pending+processing > 0): `{count} in queue`. Padding `2px 7px`, 10px radius. Font: 10px, weight 700. Background: `--semantic-blue-50`. Text: `--semantic-blue-500`.
  - **Status label**: `StatusLabel` component — flex with StatusDot (6px colored circle) + label text (11px, weight 600, in status color).

**Description row**: DM Sans, 12px, `--text-body`, line-height 1.5. Margin-bottom: 10px.

**Stats row** (flex, align-items center, gap 16px, flex-wrap wrap):
- `{count} videos ingested` or `{count} meetings ingested` — count in weight 600 `--text-body`, rest in 11px `--text-secondary`.
- `Last scan: {time}` — 11px `--text-secondary`, time value in weight 500.
- Extraction mode badge: reuses `Badge` component from PRD 4 with mode-appropriate entity type color (Comprehensive = Topic, Strategic = Goal, Actionable = Action, Relational = Insight). Small variant.

**Category color mapping:**
- `youtube-channel`, `youtube-playlist` → `--semantic-red-500` (#ef4444)
- `meeting` → `--semantic-blue-500` (#3b82f6)

**Category icon mapping:**
- `youtube-channel` → YouTube icon (custom SVG path or Lucide equivalent)
- `youtube-playlist` → `Play` (Lucide)
- `meeting` → `Calendar` (Lucide)

**Status color mapping:**
- `active`, `connected` → `--semantic-green-500`
- `paused` → `--semantic-amber-500`
- `disconnected` → `--text-secondary`
- `error` → `--semantic-red-500`

**Stagger animation**: each card in the list uses `animation: fadeUp 0.3s ease ${index * 0.05}s both`.

#### 2.3.5 Add Source CTA

Below the source cards list. Margin-top: 12px.

- Padding: `18px 22px`. Border-radius: 12px. Border: `2px dashed --border-default`. Text-align: center. Cursor: pointer. Transition: `all 0.18s`.
- **Hover**: border color transitions to `--accent-500` at 40% opacity.
- **Content**: Plus icon (Lucide, 20px, `--text-placeholder`, centered, margin-bottom 6px). Title: "Connect a New Source" — DM Sans, 13px, weight 600, `--text-secondary`. Subtitle: "YouTube channel, playlist, or meeting service" — DM Sans, 11px, `--text-placeholder`. Margin-top: 2px.
- **onClick**: `setSelectedSourceId('new')` — opens the new source panel in the right panel.

#### 2.3.6 Source Detail Right Panel

When a source card is selected (`selectedSourceId` is set to a real source ID), the right panel (310px width) slides in from the right.

**File created:** `src/components/automate/SourceDetailPanel.tsx`

**Panel container:**
- Width: 310px. Min-width: 310px. Height: 100%. Overflow-y: auto.
- Background: `--bg-card`. Border-left: `1px solid --border-subtle`.
- Animation: `slideInRight 0.2s ease`.
- Padding: 24px.

**Panel header** (flex, align-items center, justify-content space-between, margin-bottom 20px):
- Section label: "SOURCE DETAIL" (standard SL style, margin-bottom 0).
- Close button: ghost button with x icon (14px, `--text-secondary`). Hover: background `--bg-hover`. Padding: 4px, 6px radius.
- **onClick**: `setSelectedSourceId(null)`.

**Source identity block** (margin-bottom 6px):
- Icon container: 36x36px, 9px radius, background `{catColor}12`, centered icon 18px in category color.
- Name: Cabinet Grotesk, 16px, weight 700, `--text-primary`.
- Subtitle: DM Sans, 11px, `--text-secondary` (handle, channel, or category label).
- Status label: below identity block, margin-bottom 20px. Uses `StatusLabel` component.

**Quick actions row** (flex, gap 6px, margin-bottom 24px — context-sensitive):
- **If status is active/connected**: "Pause" button (tertiary style, Lucide `Pause` icon 12px) + "Scan Now" button (tertiary style, Lucide `RefreshCw` icon 12px).
- **If status is paused**: "Resume" button (green-tinted: border `--semantic-green-500` at 30%, background `--semantic-green-50`, text `--semantic-green-700`, Lucide `PlayCircle` icon 12px).
- **If status is disconnected**: "Connect" button (primary style, accent-500 background, white text, Lucide `Link` icon 12px).
- Button styling: flex, align-items center, gap 5px. Padding: `7px 14px`. Border-radius: 8px. DM Sans, 11px, weight 600.

**Stats grid** (2-column grid, gap 8px, margin-bottom 24px):
- Each stat cell: padding `12px 14px`, 8px radius, `--bg-inset` background. Text-align: center.
  - **Value**: Cabinet Grotesk, 20px, weight 800, `--text-primary`.
  - **Label**: DM Sans, 10px, weight 600, `--text-secondary`.
- Cell 1: Videos/Meetings Ingested count + label.
- Cell 2: Queue count (pending + processing) + label "In Queue".

**Extraction Settings section** (section label "EXTRACTION SETTINGS"):
- Container: padding `14px 16px`, 10px radius, `--bg-inset` background, `1px solid --border-subtle` border. Margin-bottom: 24px.
- Three rows:
  1. **Mode**: left "Mode" label (11px, weight 600, `--text-secondary`), right: Badge with mode name + entity type color. Flex justify-content space-between, margin-bottom 10px.
  2. **Emphasis**: left "Emphasis" label, right: text value (11px, weight 500, `--text-body`). Same layout, margin-bottom 10px.
  3. **Linked Anchors**: label on its own row (margin-bottom 6px), then a flex-wrap row of Badge components for each linked anchor. If no anchors: "No anchors linked" in 11px `--text-placeholder`.
- **Edit Settings button**: full-width, padding `8px 14px`, 8px radius, `1px solid --border-subtle` border, `--bg-card` background, `--text-body` text, DM Sans 11px weight 600, centered text. Margin-top: 12px.

**Queue section** (section label "QUEUE ({count})"):
Shows queue items filtered to `sourceId === selectedSource.id`.

**Empty state**: centered content. Check icon (20px, `--text-placeholder`), "No items in queue" (11px, `--text-placeholder`). Padding: `20px 0`.

**Queue items** (flex column, gap 6px):
Each item container: padding `10px 12px`, 8px radius, `--bg-inset` background, `1px solid --border-subtle` border.

- **Top row** (flex, align-items center, justify-content space-between, margin-bottom 4px):
  - Title: DM Sans, 11px, weight 600, `--text-primary`. Overflow: hidden, text-overflow: ellipsis, white-space: nowrap. Flex: 1, margin-right: 8px.
  - Status indicator: flex, align-items center, gap 4px. Status dot (5px, in status color; pulsing animation if 'processing'). Status text (9px, weight 600, in status color, capitalized).

- **Progress bar** (shown when status is not 'complete'): flex row of 5 segments, gap 2px. Steps: queued, fetching, extracting, connecting, complete. Each segment: flex 1, height 2px, 1px radius. Completed step: `--semantic-green-500`. Current step: `--semantic-blue-500`. Failed current step: `--semantic-red-500`. Future step: `--bg-active`.

- **Failed state** (shown when status is 'failed'): flex, align-items center, justify-content space-between, margin-top 6px. Error message in 10px `--semantic-red-500`. Retry button: padding `2px 8px`, 4px radius, border `--semantic-red-500` at 30%, background `--semantic-red-50`, text `--semantic-red-500`, 9px weight 600.

- **Complete state** (shown when status is 'complete'): margin-top 6px. `{nodes} entities · {edges} edges` — 10px, `--text-secondary`.

**Danger zone** (margin-top 24px, padding-top 16px, border-top `1px solid --border-subtle`):
- "Disconnect Source" button: ghost style. Flex, align-items center, gap 5px. x icon (12px, `--semantic-red-500`) + label. DM Sans, 11px, weight 500, `--semantic-red-500`. Opacity: 0.7, hover: opacity 1. No background, no border.

#### 2.3.7 New Source Panel (Right Panel — Alternate State)

When `selectedSourceId === 'new'`, the right panel shows the source onboarding form instead of source detail.

**File created:** `src/components/automate/NewSourcePanel.tsx`

**Panel container**: same as Source Detail Panel (310px, slideInRight animation).

**Panel header**: section label "CONNECT SOURCE" + close button (same pattern as source detail).

**YouTube Channel section** (section label "YOUTUBE CHANNEL"):
- URL input: `--bg-inset` background, `1px solid --border-subtle` border, 8px radius. Padding: `8px 12px`. Placeholder: "Paste channel URL…". DM Sans, 12px. Margin-bottom: 8px.
- "Add Channel" button: full-width, padding `8px 14px`, 8px radius, `1px solid --border-subtle` border, `--bg-card` background, `--text-body` text, DM Sans 11px weight 600, centered. Margin-bottom: 20px.

**YouTube Playlist section** (section label "YOUTUBE PLAYLIST"):
- Same pattern as YouTube Channel: URL input + "Add Playlist" button. Margin-bottom: 20px.

**Coming Soon section** (section label "COMING SOON"):
- A list of future integration cards. Each card: flex, align-items center, gap 10px. Padding: `10px 12px`. 8px radius. `--bg-inset` background. `1px solid --border-subtle` border. Margin-bottom: 6px.
- Each card contains:
  - Icon container: 28x28px circle, `--bg-inset` background, centered emoji/icon, 14px font, `1px solid --border-subtle` border.
  - Name + description: Name in DM Sans 12px weight 600 `--text-primary`. Description in DM Sans 10px `--text-secondary`.
  - "Setup" button: right-aligned. Padding `4px 10px`, 6px radius, `1px solid --border-subtle` border, `--bg-card` background, DM Sans 10px weight 600, `--text-body`.
- **Services listed**: Google Drive ("Sync documents automatically"), Notion ("Import pages and databases"), Slack ("Capture from channels").

#### 2.3.8 Layout Structure

The Automate view uses a flex layout to accommodate the optional right panel:

```
<div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
  {/* Center content — scrollable */}
  <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: '--bg-content' }}>
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '28px 36px' }}>
      {/* Header, stats, filters, source cards, add CTA */}
    </div>
  </div>

  {/* Right panel — conditionally rendered */}
  {selectedSourceId && (
    selectedSourceId === 'new'
      ? <NewSourcePanel onClose={() => setSelectedSourceId(null)} />
      : <SourceDetailPanel source={selectedSource} onClose={() => setSelectedSourceId(null)} />
  )}
</div>
```

The center content uses the standard 840px max-width. The right panel is a fixed 310px that does NOT compress the center content's max-width — the center content simply has less available space and its 840px max-width naturally constrains it.

---

## 3. Design Requirements

All specifications in section 2 include exact design tokens. Additional cross-cutting requirements:

### 3.1 Typography Compliance

- All headings: Cabinet Grotesk.
- All body/UI text: DM Sans.
- Section labels: uppercase, 10px, Cabinet Grotesk, weight 700, letter-spacing 0.08em, `--text-secondary`.
- No font below 9px. No font above 20px (page titles only).

### 3.2 Color Compliance

- Zero chromatic color in backgrounds or borders except: entity type colors (on badges/dots only), accent (on one primary button per view max), semantic colors (status indicators, error/success states).
- Card backgrounds are always `--bg-card` (#ffffff).
- Content area background is always `--bg-content` (#f7f7f7).
- Inset/recessed fields use `--bg-inset` (#f0f0f0).

### 3.3 Animation Compliance

- Page content: staggered fadeUp (0.4s ease, 0.05s delay per item).
- Right panel: slideInRight (0.2s ease).
- Hover transitions: 0.15-0.18s ease.
- Chevron rotation: 0.2s on advanced options toggle.
- Processing pulse: `@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }` at 1.5s infinite.

### 3.4 Button Hierarchy (One Primary Per View)

- **Capture view**: the Extract button is the single primary (accent-500) button.
- **Automate view**: no primary button in the center stage. The "Connect" button in the right panel (for disconnected sources) is the only accent-500 button, and it's contextual.

---

## 4. Data & Service Layer

### 4.1 Capture View — Service Functions

The Capture view feeds into the existing extraction pipeline from PRD 7. No new service functions are needed beyond what PRD 7 provides. The key integration point:

```typescript
// From PRD 7 — already exists
async function runExtraction(config: ExtractionConfig): Promise<ExtractionResult>
```

The Capture view assembles the `ExtractionConfig` object from its local state (mode, content, advanced options) and invokes this function.

### 4.2 Automate View — Service Functions

**File created:** `src/services/automationSources.ts`

#### 4.2.1 Fetch All Sources (Unified Query)

The Automate view needs to display YouTube channels, YouTube playlists, and meeting integrations in a single, normalized list. This requires a unified source query that abstracts across the three underlying tables.

```typescript
interface AutomationSource {
  id: string;
  category: 'youtube-channel' | 'youtube-playlist' | 'meeting';
  name: string;
  handle?: string;        // @handle for channels
  channel?: string;       // channel name for playlists
  description?: string;
  status: 'active' | 'paused' | 'connected' | 'disconnected' | 'error';
  videosIngested?: number;
  meetingsIngested?: number;
  lastScan?: string;      // relative time string
  lastSync?: string;      // relative time string
  mode: string;           // extraction_mode
  emphasis: string;       // anchor_emphasis
  linkedAnchors: string[]; // anchor IDs
  queue: {
    pending: number;
    processing: number;
    complete: number;
    failed: number;
  };
}

async function fetchAutomationSources(): Promise<AutomationSource[]>
```

**Implementation**:
1. Query `youtube_channels` where `user_id = auth.uid()`. Select: id, channel_name, channel_url, description, is_active, extraction_mode, anchor_emphasis, linked_anchor_ids, last_checked_at, total_videos_ingested. Map `is_active` to status ('active' if true, 'paused' if false).
2. Query `youtube_playlists` where `user_id = auth.uid()`. Select: id, playlist_name, synapse_code, status, extraction_mode, anchor_emphasis, linked_anchor_ids. Map status directly.
3. For meeting integrations: currently no dedicated `meeting_sources` table exists. Check if any `knowledge_sources` records exist with `source_type = 'Meeting'` and return a synthetic source entry representing meeting integration status. If Circleback webhook data exists, show as 'connected'. Otherwise, show available services as 'disconnected'.
4. Merge all results into a single `AutomationSource[]` array, sorted by status (active first, then paused, then disconnected).

#### 4.2.2 Fetch Queue for Source

```typescript
interface QueueItem {
  id: string;
  title: string;
  sourceId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  step: 'queued' | 'fetching' | 'extracting' | 'connecting' | 'complete';
  time: string;           // relative time
  error?: string;
  nodes?: number;
  edges?: number;
}

async function fetchSourceQueue(sourceId: string): Promise<QueueItem[]>
```

**Implementation**:
- For YouTube sources: query `youtube_ingestion_queue` where `channel_id = sourceId` (for channels) or filter by playlist membership. Select: id, video_title, status, error_message, nodes_created, edges_created, created_at, started_at, completed_at.
- Map `youtube_ingestion_queue.status` to the 5-step model:
  - `pending` → step: 'queued'
  - `fetching_transcript` → step: 'fetching'
  - `extracting` → step: 'extracting'
  - `completed` → step: 'complete'
  - `failed` → step at point of failure (use error context)
- Add a synthetic 'connecting' step between 'extracting' and 'complete' — this represents cross-connection discovery. The queue table doesn't track this separately, so map it based on timing: if status is 'extracting' and `started_at` was more than 30s ago, show as 'connecting'.
- Order by: processing first, then pending, then failed, then complete.

#### 4.2.3 Fetch Queue Summary (for Stats Strip)

```typescript
interface QueueSummary {
  pending: number;
  processing: number;
  failed: number;
}

async function fetchQueueSummary(): Promise<QueueSummary>
```

**Implementation**: count query on `youtube_ingestion_queue` grouped by status where status IN ('pending', 'fetching_transcript', 'extracting', 'completed', 'failed'). Map 'fetching_transcript' and 'extracting' both to 'processing'.

#### 4.2.4 Add YouTube Channel

```typescript
async function addYouTubeChannel(channelUrl: string): Promise<AutomationSource>
```

**Implementation**:
1. Parse the channel URL to extract channel ID or handle.
2. Validate the URL format.
3. Insert into `youtube_channels` with defaults: `auto_ingest: true`, `extraction_mode: 'comprehensive'`, `anchor_emphasis: 'standard'`, `is_active: true`.
4. Return the new source in `AutomationSource` format.

**Note**: Channel metadata resolution (name, thumbnail, subscriber count) could be done immediately via YouTube RSS/API or deferred to the first poll. For this PRD, insert with the URL-derived name and let the poll function enrich metadata.

#### 4.2.5 Add YouTube Playlist

```typescript
async function addYouTubePlaylist(playlistUrl: string): Promise<AutomationSource>
```

**Implementation**:
1. Parse the playlist URL to extract playlist ID.
2. Generate a Synapse code (`SYN-${randomFourChars}`).
3. Insert into `youtube_playlists` with defaults: `status: 'active'`, `extraction_mode: 'comprehensive'`, `anchor_emphasis: 'standard'`.
4. Return the new source in `AutomationSource` format.

#### 4.2.6 Update Source Status

```typescript
async function updateSourceStatus(
  sourceId: string,
  category: AutomationSource['category'],
  status: 'active' | 'paused'
): Promise<void>
```

**Implementation**: update `is_active` on `youtube_channels` or `status` on `youtube_playlists` based on category.

#### 4.2.7 Disconnect Source

```typescript
async function disconnectSource(
  sourceId: string,
  category: AutomationSource['category']
): Promise<void>
```

**Implementation**: for YouTube sources, set `is_active = false` and `auto_ingest = false` on channels, or `status = 'paused'` on playlists. Does NOT delete the record — historical data is preserved. For meeting integrations, this is a no-op placeholder until webhook management is implemented.

#### 4.2.8 Trigger Manual Scan

```typescript
async function triggerManualScan(
  sourceId: string,
  category: AutomationSource['category']
): Promise<void>
```

**Implementation**: for YouTube channels, update `last_checked_at = null` on the channel record so the next poll picks it up immediately. For playlists, similar approach. Optionally call the poll serverless function directly via fetch if the endpoint is known.

### 4.3 Hooks

**File created:** `src/hooks/useAutomationSources.ts`

```typescript
function useAutomationSources(): {
  sources: AutomationSource[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  queueSummary: QueueSummary;
}
```

Fetches sources and queue summary on mount. Exposes refetch for after mutations (add, pause, disconnect).

**File created:** `src/hooks/useSourceQueue.ts`

```typescript
function useSourceQueue(sourceId: string | null): {
  items: QueueItem[];
  loading: boolean;
  error: string | null;
}
```

Fetches queue items for a specific source. Re-fetches when sourceId changes. Returns empty array when sourceId is null.

---

## 5. Interaction & State

### 5.1 Capture View State

All state is local to `CaptureView`:

```typescript
const [mode, setMode] = useState<'text' | 'url' | 'document' | 'transcript'>('text');
const [advancedOpen, setAdvancedOpen] = useState(false);
const [extractionMode, setExtractionMode] = useState<string>('comprehensive');
const [anchorEmphasis, setAnchorEmphasis] = useState<string>('standard');
const [selectedAnchors, setSelectedAnchors] = useState<string[]>([]);
const [customGuidance, setCustomGuidance] = useState('');
const [content, setContent] = useState('');
const [title, setTitle] = useState('');
const [isExtracting, setIsExtracting] = useState(false);
```

- Defaults for `extractionMode` and `anchorEmphasis` should be initialized from `SettingsContext` (populated by PRD 3).
- Mode, content, and advanced settings reset when the user navigates away and back.
- The advanced options section state persists while switching between input modes within the same session.

### 5.2 Automate View State

```typescript
const [filter, setFilter] = useState<'all' | 'youtube-channel' | 'youtube-playlist' | 'meeting'>('all');
const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
```

- `selectedSourceId` can be a real source ID (shows detail panel) or `'new'` (shows new source panel) or `null` (no panel).
- Clicking a selected card deselects it (`setSelectedSourceId(null)`).
- Filter selection does NOT clear the selected source — the selected source may not be in the filtered list, but its panel stays open. This matches how Explore Browse works.
- After adding a new source, `selectedSourceId` switches to the new source's ID and the sources list refetches.
- After disconnecting a source, `selectedSourceId` clears to null and the sources list refetches.

### 5.3 Right Panel Integration

The Automate view manages its own right panel inline (not through `RightPanelContent` context from PRD 2), because the panel content is view-specific (source detail, new source form) and not the shared node/source/feed detail pattern used by other views.

The right panel renders conditionally within the AutomateView flex container. When no source is selected, the full width is available for the center content.

### 5.4 Keyboard Interactions

- `Escape`: if right panel is open, close it (clear `selectedSourceId`).
- `Tab` / `Shift+Tab`: standard focus navigation through inputs and buttons.
- `Enter` in URL input (Capture URL mode): trigger fetch.
- `Cmd+Enter` in textarea (Capture Text/Transcript mode): trigger extraction.

---

## 6. Forward-Compatible Decisions

1. **`AutomationSource` as a discriminated type**: the unified source interface established here will be consumed by PRD 11 (YouTube Serverless Pipeline) when it needs to read channel/playlist configurations. The service layer provides a clean abstraction over the three underlying tables.

2. **Queue 5-step model**: the step progression (queued → fetching → extracting → connecting → complete) maps to the serverless pipeline stages in PRD 11. The 'connecting' step (cross-connection discovery) is synthetic for now but will become a real tracked step when the extraction pipeline adds cross-connection progress tracking.

3. **`SourceCard` as a reusable component**: built with props `{ source: AutomationSource; isSelected: boolean; onClick: () => void }`. Can be reused in the Home view activity feed if we decide to show source status there (PRD 6 enhancement).

4. **New Source panel extensibility**: the "Coming Soon" section lists Google Drive, Notion, and Slack. When these integrations are built (future PRDs beyond 14), they plug into the same panel with real connection flows replacing the "Setup" placeholder buttons. The `AutomationSource.category` union type should be extended at that point.

5. **Capture mode switcher**: the four modes (text, url, document, transcript) map cleanly to `source_type` values in `knowledge_sources`. If new source types are added (e.g., "Audio" for podcast transcription), a new mode can be added to the switcher without restructuring the view.

6. **`StatusLabel` and `StatusDot` as shared components**: built in `src/components/shared/StatusIndicator.tsx` since they're needed by Automate, and will also be used by PRD 11's queue management and potentially the Home view's processing status display.

---

## 7. Edge Cases & Error Handling

### 7.1 Empty States

- **No automation sources**: the source list is empty. Show a centered empty state: illustration placeholder (could be a simple icon composition), "No sources connected yet" heading (Cabinet Grotesk, 16px, weight 700), "Connect a YouTube channel or playlist to start building your knowledge graph automatically." description (DM Sans, 13px, `--text-secondary`), and a prominent "Connect a Source" button (primary style) that opens the new source panel.
- **No queue items for source**: handled by the "No items in queue" empty state with check icon (see section 2.3.6).
- **Capture with no content**: Extract button disabled at 40% opacity.

### 7.2 Network Failures

- **Source list fails to load**: show inline error below the filter pills. "Couldn't load your automation sources. Check your connection and try again." with a "Retry" ghost button. DM Sans, 12px, `--semantic-red-500`.
- **Queue fails to load**: show inline error in the queue section of the right panel. Same pattern.
- **Add channel/playlist fails**: show inline error below the URL input in the new source panel. If it's a duplicate (UNIQUE constraint violation), show: "This channel is already connected."
- **Extraction fails (Capture view)**: show error inline below the Extract button. Error text in `--semantic-red-500`, 12px. Include the error message from the pipeline.

### 7.3 URL Validation

- **Capture URL mode**: validate URL format before enabling the Fetch button. Basic regex: must start with `http://` or `https://`. YouTube URLs detected by pattern (`youtube.com/watch`, `youtu.be/`).
- **New source panel**: validate YouTube channel/playlist URL patterns. Channel: `youtube.com/@handle`, `youtube.com/channel/UCxxx`. Playlist: `youtube.com/playlist?list=PLxxx`. Show inline validation error for unrecognized formats.

### 7.4 Duplicate Sources

- When adding a YouTube channel that's already connected: the Supabase insert will fail on the UNIQUE constraint. Catch this error and show: "This channel is already connected" in `--semantic-amber-500`.
- When adding a duplicate playlist: same handling.

### 7.5 Large Queue

- If a source has more than 50 queue items, paginate: show the most recent 20 with a "Show more" link at the bottom. Load 20 more on click.

### 7.6 Auth Expiry

- All Supabase queries use RLS. If the auth session expires mid-interaction, Supabase returns an error. Catch this globally (should be handled by the AuthProvider from PRD 1) and redirect to login.

### 7.7 Real-Time Updates

- Queue status can change while the user is viewing. For this PRD, the queue is fetched on panel open and on explicit user actions (retry, scan now). Real-time subscriptions (Supabase Realtime) are a future enhancement, not required here.

---

## 8. Acceptance Criteria

After this PRD is complete, a user can:

**Capture View:**
- [ ] See "Capture" in the nav rail (not "Ingest").
- [ ] Switch between Text, URL, Document, and Transcript input modes.
- [ ] Paste text content and see character count update live.
- [ ] Expand the Advanced Extraction Options section.
- [ ] Select an extraction mode, anchor emphasis, focus anchors, and enter custom guidance.
- [ ] Click Extract and see the extraction pipeline run (loading state on button).
- [ ] See error feedback if extraction fails.
- [ ] See the Document mode drag-and-drop zone respond to hover and drag-over states.
- [ ] See Transcript mode with title and date fields above the transcript textarea.

**Automate View:**
- [ ] See the quick stats strip showing active sources, processing, pending, and failed counts from real database data.
- [ ] Filter sources by category using filter pills.
- [ ] See source cards with correct status indicators, queue badges, stats, and extraction mode badges.
- [ ] Click a source card to open its detail panel on the right.
- [ ] See per-source extraction settings (mode, emphasis, linked anchors) in the detail panel.
- [ ] See the per-source queue with 5-step progress bars for each item.
- [ ] See failed queue items with error messages and retry buttons.
- [ ] See completed queue items with entity/edge counts.
- [ ] Pause an active source, resume a paused source.
- [ ] Click "Scan Now" to trigger a manual scan on an active source.
- [ ] Click "Connect a New Source" to open the new source panel.
- [ ] Add a YouTube channel by pasting a channel URL.
- [ ] Add a YouTube playlist by pasting a playlist URL.
- [ ] See the new source appear in the list after adding it.
- [ ] Disconnect a source via the danger zone action.
- [ ] Close the right panel by clicking x or pressing Escape.
- [ ] See staggered fade-up animation on source cards.
- [ ] See smooth slide-in animation on the right panel.
- [ ] See the empty state when no sources are connected.

---

## 9. Files Created & Modified

### New Files

| File | Purpose |
|---|---|
| `src/views/CaptureView.tsx` | Capture view — 4-mode input + advanced extraction options |
| `src/views/AutomateView.tsx` | Automate view — source list + filter pills + right panel orchestration |
| `src/components/automate/SourceCard.tsx` | Source card component for the list |
| `src/components/automate/SourceDetailPanel.tsx` | Right panel: source config, stats, queue |
| `src/components/automate/NewSourcePanel.tsx` | Right panel: new source onboarding form |
| `src/components/shared/StatusIndicator.tsx` | `StatusDot` and `StatusLabel` components |
| `src/services/automationSources.ts` | All Supabase queries for automation sources and queue |
| `src/hooks/useAutomationSources.ts` | Hook: fetch sources + queue summary |
| `src/hooks/useSourceQueue.ts` | Hook: fetch queue items for a specific source |

### Modified Files

| File | Change |
|---|---|
| `src/components/layout/NavRail.tsx` | Rename "Ingest" to "Capture", update route |
| `src/App.tsx` (or router config) | Update route path `/ingest` to `/capture`, add redirect |
