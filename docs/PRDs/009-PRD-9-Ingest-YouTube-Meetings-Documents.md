# PRD 9 — Ingest: YouTube, Meetings, Documents Tabs

**Phase:** 4 — Automation
**Dependencies:** PRD 2 (Shell + Navigation), PRD 3 (Settings — provides AnchorPicker, SettingsContext), PRD 7 (Ingest Quick Capture + Extraction Pipeline — provides tab bar, `useExtraction` hook, EntityReview component, extraction pipeline services)
**Estimated Complexity:** Medium (1–2 sessions)

---

## 1. Objective

Build the three remaining content ingestion tabs — YouTube, Meetings, and Documents — that extend the Ingest view established in PRD 7. Each tab provides a specialized capture interface tuned to its source type, but all three funnel content into the same extraction pipeline built in PRD 7. This PRD also enhances the existing History tab with richer status display and filtering.

The YouTube tab is the most complex: it lets users connect playlists, browse their videos, select specific ones for processing, configure per-playlist extraction settings, and monitor queue status. The Meetings tab provides a paste-to-extract workflow alongside placeholder integration cards for future third-party connectors. The Documents tab offers drag-and-drop file upload with client-side text extraction for supported formats.

After this PRD, Synapse can ingest content from every planned input channel except automated polling (PRD 11) and the Chrome Extension (PRD 14).

---

## 2. What Gets Built

### Views & Components

| File | Type | Description |
|---|---|---|
| `src/components/ingest/YouTubeTab.tsx` | Component | Full YouTube tab: connect form, playlist cards, video list, queue banner |
| `src/components/ingest/ConnectPlaylistForm.tsx` | Component | URL input + Connect button with validation and loading state |
| `src/components/ingest/PlaylistCard.tsx` | Component | Expandable card for a connected playlist showing videos, settings, stats |
| `src/components/ingest/VideoListItem.tsx` | Component | Individual video row with checkbox, thumbnail placeholder, title, duration, status |
| `src/components/ingest/PlaylistSettingsPanel.tsx` | Component | Per-playlist extraction config: mode, emphasis, linked anchors, custom instructions |
| `src/components/ingest/QueueStatusBanner.tsx` | Component | Horizontal banner showing pending/processing/complete/failed counts |
| `src/components/ingest/MeetingsTab.tsx` | Component | Meetings tab: paste transcript form + integration cards |
| `src/components/ingest/MeetingTranscriptForm.tsx` | Component | Meeting-specific capture form with title input + transcript textarea |
| `src/components/ingest/IntegrationCard.tsx` | Component | Generic integration card with name, icon, description, status, Connect button |
| `src/components/ingest/IntegrationSetupModal.tsx` | Component | Modal showing setup instructions for a third-party integration |
| `src/components/ingest/DocumentsTab.tsx` | Component | Documents tab: drag-and-drop zone, file list, processing state |
| `src/components/ingest/FileDropZone.tsx` | Component | Drop zone with file browser fallback, format validation, drag visual feedback |
| `src/components/ingest/FileListItem.tsx` | Component | Uploaded file row with name, size, format badge, status, remove button |
| `src/components/ingest/HistoryTab.tsx` | Component | Enhanced History tab with filters, richer status display, expandable rows |

### Hooks

| File | Type | Description |
|---|---|---|
| `src/hooks/useYouTubePlaylists.ts` | Hook | CRUD operations for connected playlists, video fetching, queue management |
| `src/hooks/useFileUpload.ts` | Hook | File drag-and-drop handling, client-side text extraction, format validation |
| `src/hooks/useExtractionHistory.ts` | Hook | Paginated history fetch from `extraction_sessions` with filters |

### Service Functions Added to Existing Files

| File | Function | Description |
|---|---|---|
| `src/services/supabase.ts` | `connectPlaylist(userId, playlistUrl)` | Parse playlist URL, create `youtube_playlists` row, generate SYN code |
| `src/services/supabase.ts` | `getConnectedPlaylists(userId)` | Fetch all `youtube_playlists` for user with video counts |
| `src/services/supabase.ts` | `updatePlaylistSettings(playlistId, settings)` | Update extraction config on a playlist |
| `src/services/supabase.ts` | `disconnectPlaylist(playlistId)` | Soft delete (set status to 'paused') or hard delete |
| `src/services/supabase.ts` | `getPlaylistVideos(playlistId, userId)` | Fetch videos from `youtube_ingestion_queue` for a playlist |
| `src/services/supabase.ts` | `queueVideosForProcessing(videoIds, userId)` | Update status to 'pending' for selected videos |
| `src/services/supabase.ts` | `getQueueStats(userId)` | Count of pending/processing/complete/failed items |
| `src/services/supabase.ts` | `getExtractionHistory(userId, filters, pagination)` | Paginated `extraction_sessions` with optional source_type filter |
| `src/services/youtube.ts` | `parsePlaylistUrl(url)` | Extract playlist ID from various YouTube URL formats |
| `src/services/youtube.ts` | `fetchPlaylistMetadata(playlistId)` | Get playlist name and video count via YouTube Data API |
| `src/services/youtube.ts` | `generateSynapseCode()` | Generate unique SYN-XXXX code |
| `src/utils/fileParser.ts` | `extractTextFromFile(file)` | Client-side text extraction for supported formats |

### Types

| File | Type | Description |
|---|---|---|
| `src/types/youtube.ts` | Types | `YouTubePlaylist`, `YouTubeVideo`, `QueueStats`, `PlaylistSettings` |
| `src/types/ingest.ts` | Types | `UploadedFile`, `FileFormat`, `IntegrationConfig`, `MeetingSource` |

---

## 3. Design Requirements

### 3.1 Tab Bar (Exists from PRD 7 — No Changes)

The Ingest view tab bar was built in PRD 7 with five tabs: Quick Capture, YouTube, Meetings, Documents, History. PRD 7 implemented Quick Capture as functional and the remaining four as placeholder content. This PRD replaces those placeholders with full implementations.

The tab bar uses the toggle group component: `--bg-inset` container with `3px` padding, `10px` border-radius. Active tab has `--bg-card` (white) background with subtle shadow. Inactive tabs are transparent with `--text-secondary` text. DM Sans, `12px`, weight `600`.

### 3.2 YouTube Tab

The YouTube tab has three vertical zones: connect form (top), queue status banner (conditional, below form), connected playlists (scrollable list).

#### Connect Playlist Form

A compact form card at the top of the tab.

- Container: `--bg-card` background, `1px solid var(--border-subtle)`, `12px` border-radius, `16px 22px` padding.
- Label: "CONNECT PLAYLIST" — Cabinet Grotesk, `10px`, weight `700`, `letter-spacing: 0.08em`, `--text-secondary`, uppercase. Margin-bottom: `10px`.
- Layout: horizontal flex, `gap: 10px`, `align-items: center`.
- URL input: `flex: 1`, `--bg-inset` background, `1px solid var(--border-subtle)`, `8px` border-radius, `10px 14px` padding. DM Sans, `13px`, `--text-primary`. Placeholder: "Paste YouTube playlist URL...". Focus: `border-color: var(--accent-300)`, `box-shadow: 0 0 0 3px var(--accent-50)`.
- Connect button: Secondary style — `--text-primary` (`#1a1a1a`) background, white text, `8px` border-radius, DM Sans `12px` weight `600`, `10px 20px` padding. Disabled when input is empty or invalid. Loading state: button text changes to "Connecting..." with a spinner.
- Validation: Accept URLs matching `youtube.com/playlist?list=`, `youtube.com/watch?v=...&list=`, and raw playlist IDs (PL...). Show inline error text below input in `--semantic-red-500`, DM Sans `11px`, if URL is invalid after blur.

**Connection flow:**
1. User pastes URL → parse playlist ID via `parsePlaylistUrl()`.
2. On "Connect" click: call YouTube Data API to fetch playlist metadata (name, video count).
3. Create `youtube_playlists` row with generated SYN code, default extraction settings from `SettingsContext`.
4. Add playlist to connected list. Show success toast or inline confirmation.

#### Queue Status Banner

Appears below the connect form when there are any queued items. Full-width within the tab content.

- Container: `--accent-50` background, `1px solid` `--accent-100`, `10px` border-radius, `12px 18px` padding.
- Layout: horizontal flex with four stat groups and a "View Queue" link.
- Each stat: count in DM Sans `14px` weight `700` `--text-primary`, label below in DM Sans `10px` weight `500` `--text-secondary`.
- Stats: Pending (amber dot), Processing (accent dot with pulse), Complete (green dot), Failed (red dot).
- "View Queue" link: ghost button style — DM Sans `11px` weight `600` `--accent-500`, underline on hover. Clicking navigates to Automate view (PRD 10).
- Banner is hidden when all counts are zero.

#### Connected Playlists List

Below the banner. Each playlist renders as a `PlaylistCard` — an expandable card.

**Collapsed state:**
- Container: `--bg-card`, `1px solid var(--border-subtle)`, `12px` border-radius, `14px 20px` padding. Standard card hover.
- Layout: horizontal flex between left content and right controls.
- Left: ▶ emoji in a tinted container (`28px × 28px`, `--semantic-red-50` background, `6px` radius), playlist name (Cabinet Grotesk `14px` weight `700`), video count and SYN code below (DM Sans `11px` `--text-secondary`, format: "87 videos · SYN-4A2F").
- Right: status indicator (green dot + "Active" or gray dot + "Paused"), chevron icon (Lucide `ChevronDown`, rotates 180° on expand, `0.2s ease`).
- Gap between playlist cards: `8px`.

**Expanded state:**
- Chevron rotated. Card gains `--border-default` border.
- Expansion area appears below the header with smooth height animation (`max-height` transition, `0.3s ease`).
- Three sub-sections: Video List, Playlist Settings, Actions.

**Video List sub-section:**
- Section label: "VIDEOS" — standard section label style.
- Select All checkbox at the top: DM Sans `11px` weight `600`, with count "(12 of 87 selected)".
- Scrollable video list: `max-height: 320px`, `overflow-y: auto`, thin custom scrollbar.
- Each `VideoListItem`:
  - Checkbox (custom styled: `16px × 16px`, `--bg-inset` unchecked, `--accent-500` checked with white check icon, `4px` radius).
  - Video title: DM Sans `12px` weight `500` `--text-body`. Truncated to 1 line.
  - Duration: DM Sans `10px` `--text-secondary`, format "12:34". Right-aligned.
  - Published date: DM Sans `10px` `--text-secondary`.
  - Status badge (if already processed): tiny pill — "Completed" in `--semantic-green-500` on `--semantic-green-50`, or "Failed" in `--semantic-red-500` on `--semantic-red-50`, or "Pending" in `--semantic-amber-500` on `--semantic-amber-50`. DM Sans `9px` weight `600`.
  - Row hover: `--bg-hover` background, `0.1s ease`.
  - Already-completed videos have their checkbox disabled and title in `--text-secondary`.
- "Add to Queue" button below the list: Primary style (`--accent-500`), disabled when no uncompleted videos are selected. Label: "Add {N} to Queue". This is the only primary button on this tab when visible.

**Playlist Settings sub-section:**
- Section label: "EXTRACTION SETTINGS" — standard section label style.
- Reuses the same extraction config components from PRD 7's Advanced Options, but scoped to this playlist:
  - Extraction Mode: 2×2 grid of mode cards (smaller variant, `10px` padding).
  - Anchor Emphasis: row of 3 options.
  - Linked Anchors: `AnchorPicker` component (from PRD 3) in compact mode.
  - Custom Instructions: small textarea, `2 rows`.
- Values load from the `youtube_playlists` row. Changes auto-save on blur (debounced 500ms) via `updatePlaylistSettings()`.
- Defaults are inherited from `extraction_settings` (via SettingsContext) when the playlist is first connected. Per-playlist overrides take priority.

**Actions sub-section:**
- Section label: "ACTIONS" — standard section label style.
- Layout: horizontal flex, `gap: 8px`.
- "Pause Playlist" tertiary button (Lucide `Pause` icon). Toggles to "Resume Playlist" (Lucide `Play` icon) when paused. Updates `youtube_playlists.status`.
- "Refresh Videos" tertiary button (Lucide `RefreshCw` icon). Re-fetches playlist items from YouTube API.
- "Disconnect" ghost button in `--semantic-red-500`. Shows confirmation dialog before deleting.

#### YouTube Empty State

When no playlists are connected:
- Centered within the tab content area.
- ▶ icon: `48px`, `--text-placeholder`.
- Heading: "Connect YouTube playlists & channels" — Cabinet Grotesk `16px` weight `700` `--text-primary`.
- Subtext: "RSS polling · Three-tier transcript extraction · Per-playlist settings" — DM Sans `12px` `--text-secondary`.
- The connect form still appears above the empty state — the empty state replaces the playlist list area.

### 3.3 Meetings Tab

The Meetings tab has two zones: paste transcript form (top) and integration cards (below).

#### Meeting Transcript Form

A card-style form for manual meeting transcript ingestion.

- Container: `--bg-card`, `1px solid var(--border-subtle)`, `12px` border-radius, `16px 22px` padding.
- Meeting Title input: full width, `--bg-inset` background, `8px` radius, DM Sans `13px`. Label: "MEETING TITLE" in section label style. Placeholder: "e.g., InfoCert Partnership Call".
- Meeting Date input: standard date input, `--bg-inset`, DM Sans `12px`. Optional — defaults to today. Placed on the same row as Meeting Title if space allows (side-by-side on desktop, stacked on narrow).
- Participants input: full width, `--bg-inset`, DM Sans `12px`. Placeholder: "e.g., Marco Bellini, Sarah Chen". Stored in `knowledge_sources.metadata.participants`.
- Transcript textarea: large, min-height `200px`, auto-expanding, `--bg-inset` background, `8px` radius, DM Sans `13px`. Placeholder: "Paste your meeting transcript here...". No character limit displayed (long transcripts are expected).
- Collapsible "Advanced Extraction Options" below the textarea: identical to PRD 7's Quick Capture advanced options (mode, emphasis, anchors, custom guidance), but with `extraction_mode` defaulting to "actionable" for meetings (overridable).
- "Extract Meeting" primary button: `--accent-500`. Disabled when title or transcript is empty. On click: saves to `knowledge_sources` with `source_type: 'Meeting'`, metadata including `{ participants, meeting_date }`, then triggers the PRD 7 extraction pipeline via `useExtraction()`.

#### Integration Cards

Below the transcript form, separated by `24px` gap and a section label: "INTEGRATIONS" in standard section label style, with helper text: "Connect meeting transcript services for automatic ingestion." — DM Sans `12px` `--text-secondary`.

Four `IntegrationCard` components in a 2×2 grid (`grid-template-columns: 1fr 1fr`, `gap: 8px`):

| Integration | Icon | Description | Status |
|---|---|---|---|
| Circleback | 🔵 | "Auto-capture meeting transcripts" | Check `knowledge_sources` for `source_type = 'Meeting'` with Circleback metadata |
| Fireflies | 🟣 | "AI meeting notes and transcripts" | Placeholder — always "Not connected" |
| tl;dv | 🟢 | "Record and transcribe meetings" | Placeholder — always "Not connected" |
| MeetGeek | 🟡 | "Meeting productivity assistant" | Placeholder — always "Not connected" |

**IntegrationCard design:**
- Container: `--bg-card`, `1px solid var(--border-subtle)`, `10px` border-radius, `14px 16px` padding.
- Icon: `24px × 24px` circle with the integration's brand color at `15%` opacity, emoji centered.
- Name: DM Sans `13px` weight `600` `--text-primary`.
- Description: DM Sans `11px` `--text-secondary`, 1 line.
- Status row: either green dot + "Connected" or gray dot + "Not connected", DM Sans `10px` weight `600`.
- "Connect" button: tertiary style for unconnected, "Manage" tertiary for connected.
- Card hover: standard card hover spec.

**On "Connect" click:** Opens `IntegrationSetupModal` — a centered modal (`480px` width) with:
- Integration name and icon at top.
- Step-by-step setup instructions (hardcoded per integration).
- For Circleback: explains webhook setup process, shows the webhook URL to copy.
- For others: "Coming soon — this integration is on our roadmap." with a "Notify me" ghost button (no-op, for future use).
- Close button (×) in top-right corner.

### 3.4 Documents Tab

The Documents tab has two zones: file drop zone (top) and file list (below, appears after files are added).

#### File Drop Zone

- Container: `14px` border-radius, `2px dashed var(--border-default)` border, `36px 24px` padding, centered content.
- Default state:
  - Lucide `Plus` icon: `28px`, `--text-placeholder`.
  - Primary text: "Drop files or click to browse" — DM Sans `14px` weight `500` `--text-secondary`.
  - Format text: "PDF · DOCX · Markdown · Plain text" — DM Sans `11px` `--text-secondary`.
  - Cursor: `pointer`. Hidden `<input type="file">` triggered on click, with `accept` attribute matching supported MIME types.
- Drag-over state: border color transitions to `--accent-300`, background transitions to `--accent-50`, border becomes `2px solid` (not dashed). Plus icon becomes `--accent-500`. Primary text changes to "Drop to upload". Transition: `0.15s ease`.
- **Supported formats and MIME types:**
  - PDF: `application/pdf` → text extraction via `pdf.js` (loaded dynamically)
  - DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` → text extraction via `mammoth.js`
  - Markdown: `text/markdown`, `.md` extension → read as raw text
  - Plain text: `text/plain`, `.txt` extension → read as raw text
  - CSV: `text/csv`, `.csv` extension → read as raw text
- **Unsupported format rejection:** If the user drops an unsupported file (e.g., `.xlsx`, `.png`, image), show an inline error below the drop zone: "Unsupported format: {extension}. Supported: PDF, DOCX, Markdown, Plain text, CSV" — DM Sans `11px` `--semantic-red-500`. Auto-dismisses after 5 seconds.
- Multiple files can be dropped at once (up to 5). If more than 5, show: "Maximum 5 files at a time. Please upload in batches."

#### File List

Appears below the drop zone after files are added. Each file renders as a `FileListItem`.

- Gap between items: `6px`.
- `FileListItem` design:
  - Container: `--bg-card`, `1px solid var(--border-subtle)`, `8px` border-radius, `10px 16px` padding.
  - Layout: horizontal flex.
  - File icon: format-specific (Lucide `FileText` for text/md, `FileType` for PDF, `File` for DOCX), `16px`, `--text-secondary`.
  - File name: DM Sans `12px` weight `600` `--text-primary`. Truncated to 1 line.
  - File size: DM Sans `10px` `--text-secondary`, format "2.4 MB".
  - Format badge: tiny pill with format name ("PDF", "DOCX", "MD", "TXT"), DM Sans `9px` weight `600`, `--bg-inset` background, `--text-secondary` text.
  - Status: "Ready" (gray), "Extracting text..." (amber with spinner), "Extracted" (green check), "Failed" (red ×).
  - Remove button: Lucide `X`, `14px`, `--text-secondary`, hover `--semantic-red-500`. Removes file from the list.

**After all files are text-extracted:**
- "Extract Knowledge" primary button appears below the file list. Label: "Extract {N} Document{s}". On click: for each file, saves to `knowledge_sources` with `source_type: 'Document'`, extracted text as `content`, filename as `title`, and metadata `{ original_filename, file_size, file_format }`. Then triggers the PRD 7 extraction pipeline for each source sequentially (or with a configurable concurrency of 2).
- Collapsible "Advanced Extraction Options" between the file list and the extract button — identical to PRD 7's pattern but with mode defaulting to "comprehensive" for documents.

**Text extraction strategy (client-side):**

```typescript
// utils/fileParser.ts
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
    case 'csv':
      return file.text();

    case 'pdf':
      return extractPDFText(file); // Uses pdf.js loaded via CDN

    case 'docx':
      return extractDOCXText(file); // Uses mammoth.js

    default:
      throw new Error(`Unsupported format: ${extension}`);
  }
}
```

For PDF extraction, dynamically import pdf.js from CDN. For DOCX, use mammoth.js (already available in the React artifact environment). Both should run in the browser — no server-side processing needed for text extraction.

**Large file handling:**
- Files over 10MB: show warning "Large file — extraction may take a moment" but proceed.
- Files over 50MB: reject with error "File exceeds 50MB limit. Please split into smaller documents."
- Text content over 100,000 characters: truncate with warning "Document truncated to first ~25,000 words for extraction. Full content preserved in source."

### 3.5 History Tab (Enhanced)

The History tab was stubbed in PRD 7. This PRD enhances it with filters, richer status display, and expandable rows.

#### Filter Bar

- Layout: horizontal flex, `gap: 8px`, `margin-bottom: 16px`.
- Source Type filter: dropdown pill (reuse `FilterDrop` from PRD 4 if available, or build a simple select). Options: All, Meeting, YouTube, Document, Note, Research. Each with its source type emoji.
- Status filter: dropdown pill. Options: All, Completed, Failed.
- Sort: "Newest first" default, with a toggle to "Oldest first". DM Sans `11px` `--text-secondary`.
- Result count: DM Sans `11px` `--text-secondary`, right-aligned. Format: "23 extractions".

#### History List

Reads from `extraction_sessions` table, paginated (20 per page).

Each row is a card-style item:
- Container: `--bg-card`, `1px solid var(--border-subtle)`, `8px` border-radius, `12px 16px` padding. Standard card hover.
- Layout: horizontal flex, space-between.
- Left side:
  - Source type emoji in tinted container (`20px × 20px`, `4px` radius).
  - Source name: DM Sans `13px` weight `600` `--text-primary`.
  - Timestamp: DM Sans `11px` `--text-secondary`, relative format ("3 hours ago").
- Right side:
  - Entity count: DM Sans `11px` `--text-secondary`, format "8 entities".
  - Relationship count: DM Sans `11px` `--text-secondary`, format "12 relationships".
  - "Re-extract" tertiary button: DM Sans `10px` weight `600`, `--bg-inset`, `--text-secondary`, `5px` radius.

**Expandable row (on click):**
- Shows extraction details:
  - Mode used (badge style matching the mode color).
  - Anchor emphasis level.
  - Duration: "Completed in 12.4s".
  - Selected anchors (as small anchor badges).
  - Entity list: entity badges (from PRD 4's `Badge` component) for all extracted entities.
  - "View in Browse" ghost button — navigates to Explore Browse with filter set to `source_id` matching this extraction's source.

**Empty state:**
- "No extractions yet" — DM Sans `13px` `--text-secondary`.
- "Content you extract will appear here with full processing history."
- Lucide `History` icon, `40px`, `--text-placeholder`.

**Pagination:**
- "Load more" tertiary button at the bottom when more results exist. DM Sans `12px` weight `600`.

---

## 4. Data & Service Layer

### 4.1 YouTube Playlist Connection

```typescript
// services/youtube.ts

const PLAYLIST_URL_PATTERNS = [
  /[?&]list=(PL[\w-]+)/,              // Standard playlist URL
  /youtube\.com\/playlist\?list=(PL[\w-]+)/, // Direct playlist URL
  /^(PL[\w-]{10,})$/,                 // Raw playlist ID
];

export function parsePlaylistUrl(url: string): string | null {
  const trimmed = url.trim();
  for (const pattern of PLAYLIST_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function generateSynapseCode(): string {
  const chars = '0123456789ABCDEF';
  let code = 'SYN-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

### 4.2 Playlist Metadata Fetch

```typescript
// services/youtube.ts

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export async function fetchPlaylistMetadata(
  playlistId: string
): Promise<{ name: string; videoCount: number; thumbnailUrl?: string } | null> {
  // If no YouTube API key, return null (degrade gracefully)
  if (!YOUTUBE_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) return null;

  const data = await response.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    name: item.snippet.title,
    videoCount: item.contentDetails.itemCount,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url,
  };
}
```

**Fallback when no YouTube API key:** If `VITE_YOUTUBE_API_KEY` is not configured, the connect flow still works — it creates the playlist row with the raw playlist ID as the name and `known_video_count: 0`. A banner in the YouTube tab displays: "YouTube API key not configured — playlist names and video lists require API access. Add your key in Settings → Integrations." The user can still manually add videos to the queue through other means (Chrome Extension, PRD 14).

### 4.3 Playlist Video Fetching

```typescript
// services/youtube.ts

export async function fetchPlaylistVideos(
  playlistId: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return [];

  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', YOUTUBE_API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString());
    if (!response.ok) break;

    const data = await response.json();
    for (const item of data.items ?? []) {
      videos.push({
        video_id: item.contentDetails.videoId,
        video_title: item.snippet.title,
        video_url: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
        thumbnail_url: item.snippet.thumbnails?.medium?.url ?? null,
        published_at: item.contentDetails.videoPublishedAt,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && videos.length < maxResults);

  return videos.slice(0, maxResults);
}
```

### 4.4 Supabase — Playlist CRUD

```typescript
// services/supabase.ts

export async function connectPlaylist(
  userId: string,
  playlistId: string,
  playlistUrl: string,
  metadata?: { name?: string; videoCount?: number; thumbnailUrl?: string }
): Promise<YouTubePlaylist> {
  const synapseCode = generateSynapseCode();

  // Load default extraction settings from user's config
  const { data: settings } = await supabase
    .from('extraction_settings')
    .select('default_mode, default_anchor_emphasis')
    .eq('user_id', userId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    user_id: userId,
    playlist_id: playlistId,
    playlist_url: playlistUrl,
    synapse_code: synapseCode,
    extraction_mode: settings?.default_mode ?? 'comprehensive',
    anchor_emphasis: settings?.default_anchor_emphasis ?? 'standard',
    status: 'active',
  };

  if (metadata?.name) payload.playlist_name = metadata.name;
  if (metadata?.videoCount) payload.known_video_count = metadata.videoCount;

  const { data, error } = await supabase
    .from('youtube_playlists')
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This playlist is already connected.');
    }
    throw new Error(`Failed to connect playlist: ${error.message}`);
  }

  return data;
}

export async function getConnectedPlaylists(userId: string): Promise<YouTubePlaylist[]> {
  const { data, error } = await supabase
    .from('youtube_playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch playlists: ${error.message}`);
  return data ?? [];
}

export async function updatePlaylistSettings(
  playlistId: string,
  settings: Partial<PlaylistSettings>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (settings.extraction_mode) payload.extraction_mode = settings.extraction_mode;
  if (settings.anchor_emphasis) payload.anchor_emphasis = settings.anchor_emphasis;
  if (settings.linked_anchor_ids !== undefined) payload.linked_anchor_ids = settings.linked_anchor_ids;
  if (settings.custom_instructions !== undefined) payload.custom_instructions = settings.custom_instructions;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('youtube_playlists')
    .update(payload)
    .eq('id', playlistId);

  if (error) throw new Error(`Failed to update playlist: ${error.message}`);
}

export async function disconnectPlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase
    .from('youtube_playlists')
    .delete()
    .eq('id', playlistId);

  if (error) throw new Error(`Failed to disconnect playlist: ${error.message}`);
}
```

### 4.5 Queue Management

```typescript
// services/supabase.ts

export async function queueVideosForProcessing(
  videos: { video_id: string; video_title: string; video_url: string; thumbnail_url?: string; published_at?: string }[],
  playlistId: string,
  userId: string
): Promise<number> {
  // Get the channel_id from the playlist (youtube_ingestion_queue requires it)
  // For playlist-sourced videos, we need to check if a channel exists or create a mapping
  // For now, upsert into the queue with the playlist as the grouping mechanism

  const items = videos.map(v => ({
    user_id: userId,
    video_id: v.video_id,
    video_title: v.video_title,
    video_url: v.video_url,
    thumbnail_url: v.thumbnail_url ?? null,
    published_at: v.published_at ?? null,
    status: 'pending',
    priority: 5,
  }));

  // Use upsert to handle videos already in queue
  const { data, error } = await supabase
    .from('youtube_ingestion_queue')
    .upsert(items, { onConflict: 'user_id,video_id', ignoreDuplicates: true })
    .select('id');

  if (error) throw new Error(`Failed to queue videos: ${error.message}`);
  return data?.length ?? 0;
}

export async function getQueueStats(userId: string): Promise<QueueStats> {
  const statuses = ['pending', 'fetching_transcript', 'extracting', 'completed', 'failed'];
  const results: Record<string, number> = {};

  // Fetch counts in parallel
  const counts = await Promise.all(
    statuses.map(async status => {
      const { count } = await supabase
        .from('youtube_ingestion_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', status);
      return { status, count: count ?? 0 };
    })
  );

  for (const c of counts) {
    results[c.status] = c.count;
  }

  return {
    pending: results.pending ?? 0,
    processing: (results.fetching_transcript ?? 0) + (results.extracting ?? 0),
    completed: results.completed ?? 0,
    failed: results.failed ?? 0,
  };
}
```

### 4.6 Extraction History

```typescript
// services/supabase.ts

export async function getExtractionHistory(
  userId: string,
  filters?: { sourceType?: string; status?: 'completed' | 'failed' },
  pagination?: { offset: number; limit: number }
): Promise<{ sessions: ExtractionSession[]; totalCount: number }> {
  let query = supabase
    .from('extraction_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (filters?.sourceType && filters.sourceType !== 'all') {
    query = query.eq('source_type', filters.sourceType);
  }

  // Status filtering: sessions with entity_count > 0 are completed, those with 0 may be failed
  if (filters?.status === 'completed') {
    query = query.gt('entity_count', 0);
  } else if (filters?.status === 'failed') {
    query = query.eq('entity_count', 0);
  }

  const offset = pagination?.offset ?? 0;
  const limit = pagination?.limit ?? 20;

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);

  return {
    sessions: data ?? [],
    totalCount: count ?? 0,
  };
}
```

### 4.7 File Text Extraction

```typescript
// utils/fileParser.ts

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
    case 'csv':
      return file.text();

    case 'pdf':
      return extractPDFText(file);

    case 'docx':
      return extractDOCXText(file);

    default:
      throw new Error(`Unsupported format: .${extension}`);
  }
}

async function extractPDFText(file: File): Promise<string> {
  // Dynamically load pdf.js from CDN
  const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: { str: string }) => item.str)
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

async function extractDOCXText(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// Size and content limits
export const FILE_SIZE_LIMITS = {
  WARNING_BYTES: 10 * 1024 * 1024,   // 10MB
  MAX_BYTES: 50 * 1024 * 1024,       // 50MB
  MAX_CONTENT_CHARS: 100_000,         // ~25,000 words
} as const;

export function validateFile(file: File): { valid: boolean; error?: string; warning?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const supportedFormats = ['pdf', 'docx', 'md', 'txt', 'csv'];

  if (!extension || !supportedFormats.includes(extension)) {
    return { valid: false, error: `Unsupported format: .${extension}. Supported: PDF, DOCX, Markdown, Plain text, CSV` };
  }

  if (file.size > FILE_SIZE_LIMITS.MAX_BYTES) {
    return { valid: false, error: `File exceeds 50MB limit. Please split into smaller documents.` };
  }

  if (file.size > FILE_SIZE_LIMITS.WARNING_BYTES) {
    return { valid: true, warning: 'Large file — extraction may take a moment.' };
  }

  return { valid: true };
}
```

### 4.8 Environment Variable: YouTube API Key

This PRD introduces a new optional environment variable:

```
VITE_YOUTUBE_API_KEY=[youtube-data-api-v3-key]
```

This key is required for playlist metadata and video list fetching. Without it, the YouTube tab works in a degraded mode where users can only manage playlists that were previously connected (with cached data) or that the serverless pipeline (PRD 11) populates.

Add to `.env.example` and document in CLAUDE.md.

---

## 5. Interaction & State

### 5.1 `useYouTubePlaylists` Hook

```typescript
interface UseYouTubePlaylistsReturn {
  playlists: YouTubePlaylist[];
  isLoading: boolean;
  error: string | null;
  queueStats: QueueStats;
  connectPlaylist: (url: string) => Promise<void>;
  disconnectPlaylist: (id: string) => Promise<void>;
  refreshVideos: (playlistId: string) => Promise<YouTubeVideo[]>;
  queueVideos: (videos: YouTubeVideo[], playlistId: string) => Promise<number>;
  updateSettings: (playlistId: string, settings: Partial<PlaylistSettings>) => void;
}
```

- Loads playlists and queue stats on mount.
- `connectPlaylist`: validates URL → fetches metadata → inserts to Supabase → refreshes playlist list.
- `queueVideos`: inserts to queue → refreshes queue stats → returns count of newly queued items.
- `updateSettings`: debounced auto-save (500ms) to prevent rapid writes during anchor selection.

### 5.2 `useFileUpload` Hook

```typescript
interface UseFileUploadReturn {
  files: UploadedFile[];
  isDragging: boolean;
  error: string | null;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  extractAll: () => Promise<void>;
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}
```

- `addFiles`: validates each file, adds to state with `status: 'ready'`, auto-triggers text extraction.
- Text extraction runs immediately after adding — the file status updates through `'ready' → 'extracting' → 'extracted' | 'failed'`.
- `extractAll`: for each successfully extracted file, creates a `knowledge_sources` entry and triggers the PRD 7 pipeline.
- `isDragging`: true while a drag is active over the drop zone, drives the visual feedback state.

### 5.3 Meeting Transcript Submission

The meeting transcript form uses local component state (no custom hook needed — it's a simple form). On submit:

1. Validate that title and transcript are not empty.
2. Save to `knowledge_sources`: `{ title: meetingTitle, content: transcript, source_type: 'Meeting', metadata: { participants, meeting_date } }`.
3. Create `extraction_sessions` entry with the selected mode and emphasis.
4. Trigger the PRD 7 extraction pipeline via `useExtraction()`.
5. On success: clear the form, show success feedback, navigate to History tab (optional — or show inline summary).

### 5.4 Right Panel Behavior

The YouTube, Meetings, and Documents tabs do not directly control the right panel. The right panel remains in its default state (Quick Access from PRD 2) or shows whatever was last set by another view.

Exception: when the user clicks a video in the YouTube tab that has already been completed (has a `source_id`), the right panel opens SourceDetail for that video's source.

### 5.5 Cross-Tab Navigation

- "View Queue" link in the Queue Status Banner → navigates to `/automate` (Automate view, PRD 10).
- "View in Browse" button in History expanded row → navigates to `/explore?tab=browse&source={sourceId}`.
- Re-extract button in History → reloads the source content, opens it in the Quick Capture tab with pre-populated text and the original extraction settings.

---

## 6. Types

```typescript
// types/youtube.ts

export interface YouTubePlaylist {
  id: string;
  user_id: string;
  playlist_id: string;
  playlist_url: string;
  playlist_name: string | null;
  synapse_code: string | null;
  linked_anchor_ids: string[];
  extraction_mode: string;
  anchor_emphasis: string;
  custom_instructions: string | null;
  known_video_count: number;
  status: 'active' | 'paused' | 'error';
  created_at: string;
  updated_at: string;
}

export interface YouTubeVideo {
  video_id: string;
  video_title: string;
  video_url: string;
  thumbnail_url: string | null;
  published_at: string | null;
  duration_seconds?: number;
  status?: 'pending' | 'fetching_transcript' | 'extracting' | 'completed' | 'failed' | 'skipped';
  source_id?: string | null;
  nodes_created?: number;
  edges_created?: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface PlaylistSettings {
  extraction_mode: string;
  anchor_emphasis: string;
  linked_anchor_ids: string[];
  custom_instructions: string | null;
}

// types/ingest.ts

export interface UploadedFile {
  id: string;                    // Client-generated UUID
  file: File;                    // Original File object
  name: string;
  size: number;
  format: FileFormat;
  status: 'ready' | 'extracting' | 'extracted' | 'failed';
  extractedText?: string;
  error?: string;
  warning?: string;
}

export type FileFormat = 'pdf' | 'docx' | 'md' | 'txt' | 'csv';

export interface IntegrationConfig {
  id: string;
  name: string;
  icon: string;                  // Emoji
  description: string;
  status: 'connected' | 'not_connected';
  setupInstructions: string[];
  comingSoon: boolean;
}

export interface MeetingSource {
  title: string;
  transcript: string;
  meeting_date: string;
  participants: string;
}
```

---

## 7. Forward-Compatible Decisions

### 7.1 Extraction Pipeline Reuse (→ PRD 11: YouTube Serverless)

All three tabs funnel into the same `useExtraction()` hook from PRD 7. The YouTube tab specifically sets `source_type: 'YouTube'` and includes video metadata. When PRD 11's serverless pipeline processes videos automatically, it writes to the same `knowledge_sources` table with the same schema — the only difference is the trigger (manual queue selection here vs. automated cron there). The `youtube_ingestion_queue` table serves as the shared state between manual queuing (this PRD) and automated processing (PRD 11).

### 7.2 Integration Cards (→ Future: Full Integrations)

The `IntegrationCard` component is designed with a `status` prop and `onConnect` callback that currently shows a setup modal. When real integrations are built (Circleback webhooks, Fireflies API, etc.), the same component gains an `onManage` flow without structural changes. The `IntegrationSetupModal` content is sourced from a static config object per integration, making it easy to update instructions or add new integrations.

### 7.3 File Upload Pattern (→ PRD 14: Chrome Extension)

The `extractTextFromFile()` utility is a pure function that works on `File` objects. PRD 14's Chrome Extension will capture web content and create blobs that can use the same extraction pathway. The `FileDropZone` component is specific to this view, but the underlying text extraction logic is fully reusable.

### 7.4 YouTube API Key Configuration (→ PRD 10: Automate View, Settings → Integrations)

The `VITE_YOUTUBE_API_KEY` env var introduced here is also used by PRD 11's serverless functions. PRD 10's Automate view will show the YouTube integration status, and Settings → Integrations (PRD 3) already has a read-only card for API keys. A future enhancement could allow the API key to be stored in `youtube_settings.apify_api_key`-style columns rather than env vars, enabling per-user configuration.

### 7.5 Queue Status Banner (→ PRD 10: Automate View)

The `QueueStatusBanner` component uses the same `getQueueStats()` function that PRD 10's Automate view will use for its queue dashboard. The banner provides a quick glance within the Ingest context, while the Automate view provides the full queue management interface.

### 7.6 History Filtering Pattern (→ PRD 12: Command Palette)

The `getExtractionHistory()` function's filter and pagination pattern is consistent with the `useNodes()` pattern from PRD 4. Both use Supabase's `.range()` for pagination and support combinable filters.

---

## 8. Edge Cases & Error Handling

### 8.1 Invalid Playlist URL

- Show inline validation error immediately on blur if URL doesn't match any recognized pattern.
- If URL looks valid but YouTube API returns 404 (playlist not found or private): show error "Playlist not found. It may be private or the URL may be incorrect."
- If YouTube API is rate-limited: show "YouTube API limit reached. Try again in a few minutes."

### 8.2 Duplicate Playlist Connection

The `youtube_playlists` table has a UNIQUE constraint on `(user_id, playlist_id)`. If the user tries to connect an already-connected playlist, the Supabase insert fails with error code `23505`. Catch this and show: "This playlist is already connected."

### 8.3 No YouTube API Key

If `VITE_YOUTUBE_API_KEY` is not set:
- Connect form: input is disabled, helper text explains "YouTube API key required — configure in Settings → Integrations."
- Connected playlists: show cached data (playlist name, SYN code) but video lists are empty. A banner at the top of the YouTube tab explains the limitation.
- Queue still works — manually queued videos (from other sources like the Chrome Extension) can still be processed.

### 8.4 File Extraction Failures

**PDF with no extractable text (scanned image PDF):**
- `pdf.js` returns empty text for each page.
- Show file status as "Failed" with error: "No extractable text — PDF may be an image scan. OCR is not supported."

**Corrupted DOCX:**
- `mammoth.js` throws an error.
- Show file status as "Failed" with error: "Could not read document. The file may be corrupted."

**Very large text after extraction:**
- If extracted text exceeds `MAX_CONTENT_CHARS` (100,000 characters), truncate and set a warning on the file: "Document truncated to first ~25,000 words."

### 8.5 Empty Transcript Submission

- "Extract Meeting" button is disabled when title or transcript textarea is empty.
- If the user submits with only whitespace, show inline validation: "Please enter a transcript."

### 8.6 Network Failure During Playlist Connection

- Show inline error below the connect form: "Connection failed — check your internet and try again."
- The Connect button returns to its enabled state so the user can retry.

### 8.7 Concurrent Extraction from Documents

When multiple documents are queued for extraction:
- Process sequentially by default (one at a time) to avoid overloading the Gemini API.
- Show a progress summary: "Extracting 1 of 3 documents..."
- If one document fails, continue with the next. Show per-file status in the file list.

### 8.8 Session Persistence

- YouTube playlists persist in Supabase — they survive page refreshes and sessions.
- Uploaded files in the Documents tab are in-memory only — they are lost on page refresh. This is intentional; the extracted sources persist in `knowledge_sources`.
- Meeting transcript form content is not persisted — a filled but unsubmitted form is lost on tab switch or refresh. Consider warning the user if they navigate away with unsaved content (via `beforeunload` or a route guard).

### 8.9 Queue Status Polling

The `QueueStatusBanner` fetches stats on mount and does not auto-poll. For real-time updates, the user can manually refresh (pull-to-refresh pattern or a subtle refresh icon on the banner). PRD 10 will implement proper polling in the Automate view. For this PRD, stats are accurate on page load and after queue actions.

---

## 9. Acceptance Criteria

After this PRD is complete, a user can:

**YouTube Tab:**
- [ ] Paste a YouTube playlist URL and click Connect to add it to their connected playlists
- [ ] See the connected playlist appear as an expandable card with name, video count, and SYN code
- [ ] Expand a playlist to see its video list with titles, durations, and processing status
- [ ] Select multiple unprocessed videos via checkboxes and click "Add to Queue"
- [ ] See the Queue Status Banner update with accurate pending/processing counts
- [ ] Configure per-playlist extraction settings (mode, emphasis, anchors, custom instructions)
- [ ] Pause, resume, refresh, or disconnect a playlist
- [ ] See an appropriate error for invalid URLs, duplicate connections, or missing API key
- [ ] See a helpful empty state when no playlists are connected

**Meetings Tab:**
- [ ] Enter a meeting title, optional date, optional participants, and paste a transcript
- [ ] Click "Extract Meeting" to trigger the extraction pipeline with source_type "Meeting"
- [ ] See the extraction pipeline progress (reuses PRD 7's progress UI)
- [ ] See integration cards for Circleback, Fireflies, tl;dv, and MeetGeek
- [ ] Click "Connect" on an integration card to see setup instructions in a modal
- [ ] See "Coming soon" messaging for integrations not yet supported

**Documents Tab:**
- [ ] Drag and drop one or more files onto the drop zone and see them appear in the file list
- [ ] Click the drop zone to open the system file browser as an alternative to drag-and-drop
- [ ] See each file's text extraction status update (ready → extracting → extracted/failed)
- [ ] See appropriate error messages for unsupported formats, oversized files, or extraction failures
- [ ] Click "Extract Documents" to trigger the pipeline for all successfully extracted files
- [ ] Remove individual files from the list before extraction
- [ ] See a warning for large files (>10MB) and rejection for very large files (>50MB)

**History Tab:**
- [ ] See a list of all past extractions with source type emoji, name, timestamp, and entity/edge counts
- [ ] Filter by source type and sort by newest/oldest
- [ ] Expand a history row to see extraction details (mode, emphasis, anchors, entity badges)
- [ ] Click "Re-extract" to reload the source into Quick Capture with original settings
- [ ] Click "View in Browse" to navigate to the Explore Browse tab filtered to that source
- [ ] See paginated results with "Load more" for large extraction histories
- [ ] See a helpful empty state when no extractions have been performed yet
