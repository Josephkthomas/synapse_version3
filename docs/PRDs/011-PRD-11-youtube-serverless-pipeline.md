```markdown
## Feature Name: YouTube Serverless Pipeline

### Overview
Three independent Vercel serverless cron functions that automate YouTube content discovery and processing: channel RSS polling, playlist polling via YouTube Data API v3, and queue processing with three-tier transcript extraction feeding into the existing extraction pipeline.

### User Value
- **Who benefits**: Users who subscribe to YouTube channels and connect playlists for automated knowledge extraction
- **Problem solved**: Manual YouTube ingestion is tedious; users want new videos from their subscribed channels and curated playlists to automatically enter the knowledge graph without intervention
- **Expected outcome**: Videos from connected channels appear in the queue within 15 minutes of RSS detection. Playlist videos appear within 5 minutes. Transcripts are extracted and processed into knowledge nodes/edges automatically, with full extraction pipeline execution (entity extraction, embeddings, chunking, cross-connections).

### Context for AI Coding Agent

**⚠️ CRITICAL CONSTRAINT — READ FIRST:**
Every file under `api/` deploys as an independent Vercel serverless function. **No shared local imports.** All helper functions, type definitions, and utilities must be defined inline within each file. npm package imports are fine — only local file imports (e.g., `import { foo } from './_utils/bar'`) will cause silent `FUNCTION_INVOCATION_FAILED` errors at runtime. This is documented in `docs/LEGACY-PATTERNS.md` §7 and `docs/CLAUDE.md` under "Vercel Serverless Functions". Violating this rule is the #1 cause of deployment failures.

**Existing V1 Implementations:**
There are working V1 implementations of all three files. The project knowledge contains the full source code for:
- `api/youtube/poll.ts` — V1 channel RSS poller (working in production)
- `api/youtube/process.ts` — V1 queue processor with three-tier transcript extraction (working in production)
- `api/youtube/scan.ts` — V1 manual scan endpoint (reference for duration extraction patterns)

These V1 files are the authoritative reference. The V2 versions should preserve the core logic that works while improving error handling, logging, and code organization.

**Existing Codebase Patterns:**
- Database schema: `docs/DATA-MODEL.md` — tables `youtube_channels`, `youtube_playlists`, `youtube_ingestion_queue`, `youtube_settings`, `youtube_scan_history`, `knowledge_sources`, `knowledge_nodes`, `knowledge_edges`, `source_chunks`
- Extraction pipeline: `services/gemini.ts` for entity extraction, `utils/promptBuilder.ts` for prompt composition, `utils/chunking.ts` for source chunking — but these are frontend files and **cannot be imported** in serverless functions. All extraction logic must be reimplemented inline.
- Supabase patterns: Service role key for serverless (bypasses RLS), not anon key. Created inline per function.
- Gemini API: Direct REST calls to `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` with `responseMimeType: 'application/json'`
- Embeddings: `text-embedding-004` model, 768-dimensional vectors

**Dependencies (npm — safe to import):**
- `@supabase/supabase-js` — database client
- `@vercel/node` — request/response types
- `@google/genai` — Gemini SDK (used in V1 process.ts)
- `youtube-caption-extractor` — Tier 1 transcript extraction

**Environment Variables (set in Vercel dashboard, not `VITE_` prefixed):**
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (bypasses RLS)
- `GEMINI_API_KEY` — Google Gemini API key
- `APIFY_API_KEY` — Apify API key for Tier 3 transcript extraction
- `CRON_SECRET` — Optional secret for securing cron endpoints
- `YOUTUBE_API_KEY` — Optional YouTube Data API v3 key for duration lookups and playlist fetching

**Files to Create:**
- [ ] `api/youtube/poll.ts` — Channel RSS polling (cron every 15 min)
- [ ] `api/youtube/poll-playlist.ts` — Playlist polling via YouTube Data API v3 (cron every 5 min)
- [ ] `api/youtube/process.ts` — Queue processing with transcript extraction + knowledge extraction (cron every 5 min)
- [ ] `vercel.json` — Cron schedule configuration (create or update if exists)

### Technical Scope

**Affected Components:**
- [x] Data ingestion layer (serverless cron functions)
- [x] Entity extraction (Gemini integration — reimplemented inline in process.ts)
- [x] Graph database schema (`youtube_ingestion_queue`, `knowledge_sources`, `knowledge_nodes`, `knowledge_edges`, `source_chunks`)
- [ ] Visualization (no changes)
- [ ] UI/UX (no changes — PRD 10 already built the Automate View that displays this data)
- [ ] Graph RAG querying (no changes — but new nodes become queryable)

**Dependencies (PRDs that must be complete):**
- PRD 7 (Ingest + Extraction Pipeline) — process.ts reimplements the extraction pipeline inline
- PRD 9 (YouTube/Meetings UI) — the Ingest view's YouTube tab provides the UI for connecting channels/playlists
- PRD 10 (Automate View) — displays queue status and integration health

---

### Functional Requirements

#### 1. Channel RSS Polling (`api/youtube/poll.ts`)

- **FR-1.1**: On POST request (cron or manual trigger), fetch all rows from `youtube_channels` where `is_active = true` AND `auto_ingest = true`
- **FR-1.2**: For each active channel, fetch RSS feed from `https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}`. Parse XML using regex (no XML parser dependency needed — RSS structure is simple and stable)
- **FR-1.3**: Extract from each `<entry>`: `yt:videoId`, `title`, `published` date, `media:description` (first 500 chars), construct `thumbnail_url` as `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`
- **FR-1.4**: Deduplicate against existing queue items — query `youtube_ingestion_queue` for the user's existing `video_id` values, skip any already present
- **FR-1.5**: Filter by duration. Two strategies depending on available API key:
  - **With YouTube API key** (`YOUTUBE_API_KEY` env var or user's key from `youtube_settings.youtube_api_key`): Batch-fetch durations via YouTube Data API v3 `/videos` endpoint (up to 50 IDs per request). Parse ISO 8601 duration from `contentDetails.duration`
  - **Without YouTube API key**: Fetch each video's YouTube page HTML and extract duration via regex patterns (see V1 `getVideoDuration` function). This is slower and less reliable but free
- **FR-1.6**: Apply channel-specific duration filters: `min_video_duration` (default 90s to skip Shorts), `max_video_duration` (default NULL = unlimited). Videos with unknown duration when using API should be excluded; without API, include them to avoid blocking content
- **FR-1.7**: Insert qualifying videos into `youtube_ingestion_queue` with: `user_id`, `channel_id` (FK to `youtube_channels.id`), `video_id`, `video_title`, `video_url`, `thumbnail_url`, `published_at`, `duration_seconds`, `status: 'pending'`, `priority: 5`
- **FR-1.8**: Update `youtube_channels.last_checked_at` to current timestamp after processing each channel
- **FR-1.9**: Log a scan history entry in `youtube_scan_history` with `scan_type: 'auto_poll'`, videos found/added/skipped counts, duration_ms
- **FR-1.10**: Return JSON response with `{ success, channelsPolled, newVideosQueued, errors[], duration_ms }`

#### 2. Playlist Polling (`api/youtube/poll-playlist.ts`)

- **FR-2.1**: On POST request, fetch all rows from `youtube_playlists` where `status = 'active'`
- **FR-2.2**: For each active playlist, fetch videos via YouTube Data API v3: `GET https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={playlist_id}&maxResults=50&key={API_KEY}`. Handle pagination via `nextPageToken` up to max 200 items (4 pages)
- **FR-2.3**: The YouTube API key source priority: (1) `YOUTUBE_API_KEY` environment variable, (2) user's personal key from `youtube_settings.youtube_api_key`. If no key available, log error and skip playlist
- **FR-2.4**: Extract from each playlist item: `contentDetails.videoId`, `snippet.title`, `snippet.publishedAt`, `snippet.thumbnails.high.url`, `snippet.description` (first 500 chars)
- **FR-2.5**: Deduplicate against existing `youtube_ingestion_queue` items for the user
- **FR-2.6**: Insert new videos with playlist-specific settings inherited from `youtube_playlists`: `extraction_mode`, `anchor_emphasis`, `linked_anchor_ids`, `custom_instructions`. These override channel defaults when the video enters processing
- **FR-2.7**: To associate queue items with playlists, the `channel_id` field in `youtube_ingestion_queue` points to the playlist's associated channel. If no channel association exists, the queue item should still be created — use a lookup to find if any `youtube_channels` row matches the video's channel. If none found, this field can reference a placeholder or the playlist's own ID depending on schema constraints. **Important**: Check the FK constraint on `youtube_ingestion_queue.channel_id` — it references `youtube_channels(id)`. For playlist-only videos, you may need to create a synthetic channel entry or modify the approach. Examine the V1 implementation for how this was handled.
- **FR-2.8**: Update `youtube_playlists.known_video_count` with the total item count returned by the API
- **FR-2.9**: Return JSON response with `{ success, playlistsPolled, newVideosQueued, errors[], duration_ms }`

#### 3. Queue Processing (`api/youtube/process.ts`)

- **FR-3.1**: On POST request, determine processing mode:
  - **Cron mode** (authorized via `CRON_SECRET` or Vercel signature): Process up to `MAX_ITEMS_PER_BATCH = 2` pending items across all users
  - **User mode** (authorized via Supabase JWT): Process up to `MAX_ITEMS_PROCESS_ALL = 20` pending items for that user only (triggered by "Process Now" button in UI)
- **FR-3.2**: Fetch pending queue items ordered by `priority ASC, created_at ASC` (lower priority number = higher priority). Join with `youtube_channels` to get channel-specific extraction settings
- **FR-3.3**: For each queue item, execute the **Three-Tier Transcript Extraction**:

  **Tier 1 — `youtube-caption-extractor` (npm package)**
  - Import and call `getSubtitles({ videoID, lang: 'en' })`
  - Timeout: 15 seconds
  - On success: concatenate all subtitle segment `.text` values into full transcript
  - On failure: proceed to Tier 2

  **Tier 2 — Innertube API (YouTube internal)**
  - POST to `https://www.youtube.com/youtubei/v1/get_transcript`
  - Request body: `{ context: { client: { clientName: 'WEB', clientVersion: '2.20231219.04.00' } }, params: base64EncodedVideoId }`
  - The `params` value is a protobuf-encoded video ID. V1 uses a specific encoding function — preserve this exact implementation
  - Parse response to extract transcript segments from `actions[0].updateEngagementPanelAction.content.transcriptRenderer.content.transcriptSearchPanelRenderer.body.transcriptSegmentListRenderer.initialSegments`
  - Concatenate segment text values
  - Timeout: 15 seconds
  - On failure: proceed to Tier 3

  **Tier 3 — Apify (`pintostudio/youtube-transcript-scraper`)**
  - Requires `APIFY_API_KEY` environment variable
  - POST to `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${APIFY_API_KEY}`
  - Request body: `{ urls: [videoUrl], outputFormat: 'singleStringOutput' }`
  - Poll for completion via `GET https://api.apify.com/v2/actor-runs/{runId}?token={key}` until status is `SUCCEEDED` or `FAILED`
  - Fetch results from dataset: `GET https://api.apify.com/v2/datasets/{defaultDatasetId}/items?token={key}`
  - Timeout: 120 seconds total
  - On failure: mark queue item as failed

- **FR-3.4**: Update queue item status through stages: `pending` → `fetching_transcript` → `extracting` → `completed` or `failed`. Update `started_at` when processing begins, `transcript_fetched_at` when transcript succeeds, `completed_at` when done
- **FR-3.5**: On transcript success, save transcript text to `youtube_ingestion_queue.transcript` and `transcript_language`
- **FR-3.6**: After transcript retrieval, execute the **Full Extraction Pipeline** inline:

  **Step 1 — Save source**: Insert into `knowledge_sources` with `source_type: 'YouTube'`, `title`, `content` (transcript), `source_url`, `metadata` (channel name, duration, published_at). Save the returned `source_id` to the queue item

  **Step 2 — Compose extraction prompt**: Build system prompt inline following the modular pattern from `docs/LEGACY-PATTERNS.md` §1:
  - Base extraction instructions (entity ontology, relationship types, output JSON schema)
  - Extraction mode template (from queue item's inherited settings or channel defaults)
  - User profile context (fetch from `user_profiles` table)
  - Anchor context (fetch anchors from `knowledge_nodes` where `is_anchor = true`, apply emphasis level from settings)
  - Custom instructions (from channel/playlist `custom_instructions` field)

  **Step 3 — Call Gemini for extraction**: POST to Gemini 2.0 Flash with composed prompt + transcript content. Use `responseMimeType: 'application/json'`, `temperature: 0.1`. Parse response for `{ entities: [...], relationships: [...] }`

  **Step 4 — Save nodes**: Insert extracted entities into `knowledge_nodes` with: `user_id`, `label`, `entity_type`, `description`, `confidence`, `source` (video title), `source_type: 'YouTube'`, `source_url`, `source_id`, `tags`. Use defensive INSERT pattern (only include non-null fields). Track created node IDs

  **Step 5 — Generate embeddings**: For each new node, call Gemini `text-embedding-004` with `"{label}: {description}"`. Save 768-dimensional vector to `knowledge_nodes.embedding`. Batch where possible to reduce API calls

  **Step 6 — Save edges**: Insert extracted relationships into `knowledge_edges` with: `user_id`, `source_node_id`, `target_node_id`, `relation_type`, `evidence`, `weight: 1.0`. Map source/target labels to actual node IDs from Step 4

  **Step 7 — Chunk source content**: Split transcript into ~500-token passages at sentence boundaries. For each chunk, generate embedding via Gemini. Insert into `source_chunks` with: `user_id`, `source_id`, `chunk_index`, `content`, `embedding`

  **Step 8 — Cross-connection discovery**: Fetch existing nodes (top 50–100 by embedding similarity to new nodes). Send new + relevant existing nodes to Gemini asking for cross-source relationships. Save discovered edges to `knowledge_edges`

- **FR-3.7**: Update queue item on success: `status: 'completed'`, `nodes_created`, `edges_created`, `completed_at`
- **FR-3.8**: On failure: increment `retry_count`. If `retry_count < max_retries`, set status back to `pending` for retry. If `retry_count >= max_retries`, set `status: 'failed'` with `error_message`
- **FR-3.9**: Log processing results to `youtube_scan_history` with `scan_type: 'process'`
- **FR-3.10**: Return JSON with `{ success, processed, results: [{ id, status, error?, nodes_created?, edges_created? }], duration_ms }`
- **FR-3.11**: Respect daily video limit from `youtube_settings.daily_video_limit` (default 20). Check `videos_ingested_today` before processing. Reset counter when `daily_limit_reset_at` has passed

#### 4. Vercel Cron Configuration

- **FR-4.1**: Configure `vercel.json` with cron schedules:
  ```json
  {
    "crons": [
      { "path": "/api/youtube/poll", "schedule": "*/15 * * * *" },
      { "path": "/api/youtube/poll-playlist", "schedule": "*/5 * * * *" },
      { "path": "/api/youtube/process", "schedule": "*/5 * * * *" }
    ]
  }
  ```
- **FR-4.2**: All cron endpoints accept POST method only. Return 405 for other methods. Include CORS headers for manual trigger from frontend

#### 5. Authentication & Authorization

- **FR-5.1**: Each function supports dual auth:
  - **Cron auth**: `Authorization: Bearer {CRON_SECRET}` header or `x-vercel-signature` header (set automatically by Vercel)
  - **User auth**: Supabase JWT in `Authorization: Bearer {token}` header. Verify via `supabase.auth.getUser(token)`. When user-triggered, scope all queries to that user's data only
- **FR-5.2**: If `CRON_SECRET` is not configured, allow unauthenticated requests (development mode)

---

### Implementation Guide for AI Agent

**IMPORTANT: Read `docs/LEGACY-PATTERNS.md` and `docs/CLAUDE.md` before starting. The serverless constraint is non-negotiable.**

#### Step 1: Create or update `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/youtube/poll",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/youtube/poll-playlist",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/youtube/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

If `vercel.json` already exists, merge the `crons` array with any existing configuration. Preserve existing settings (e.g., `buildCommand`, `outputDirectory`, `framework`).

#### Step 2: Implement `api/youtube/poll.ts`

This is the simplest of the three. Reference the V1 implementation directly — it's production-tested.

**File structure (all inline, no imports from local files):**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── ENVIRONMENT ───
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_MIN_DURATION = 90;
const DEFAULT_MAX_DURATION: number | null = null;

// ─── INLINE HELPERS (must be defined in this file) ───

function verifyCronAuth(req: VercelRequest): boolean {
  // Check CRON_SECRET, x-vercel-signature, or dev mode
}

function decodeHTMLEntities(text: string): string {
  // Decode &amp; &lt; &gt; &quot; &#39;
}

interface YouTubeVideoFromRSS {
  video_id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  published_at: string;
  description: string | null;
}

async function fetchChannelVideosFromRSS(channelId: string): Promise<YouTubeVideoFromRSS[]> {
  // Fetch RSS XML, parse with regex, extract video entries
}

async function getVideoDuration(videoId: string): Promise<number | null> {
  // Fallback: fetch YouTube page HTML, extract duration via regex patterns
}

async function fetchVideoDurationsFromAPI(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, number | null>> {
  // Batch fetch via YouTube Data API v3 /videos endpoint
  // Parse ISO 8601 duration (PT#M#S format)
}

// ─── HANDLER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  // Method check (POST only)
  // Auth verification
  // Fetch active channels
  // For each channel:
  //   Fetch RSS → Parse videos → Deduplicate → Filter by duration → Queue new videos
  //   Update last_checked_at
  //   Log to youtube_scan_history
  // Return summary
}
```

**Key implementation details from V1 to preserve:**

1. **RSS parsing** uses regex, not an XML parser. The patterns are:
   - `/<entry>([\s\S]*?)<\/entry>/g` for entries
   - `/<yt:videoId>([^<]+)<\/yt:videoId>/` for video ID
   - `/<title>([^<]+)<\/title>/` for title
   - `/<published>([^<]+)<\/published>/` for date
   - `/<media:description>([^<]*)<\/media:description>/` for description

2. **Duration extraction fallback** (no API key) uses multiple regex patterns against the YouTube watch page HTML:
   ```
   /"lengthSeconds":"(\d+)"/
   /"approxDurationMs":"(\d+)"/
   /"duration":"PT(\d+)M(\d+)S"/
   /itemprop="duration" content="PT(\d+)M(\d+)S"/
   ```

3. **YouTube API duration batch fetch** uses: `GET https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id={comma-separated-ids}&key={key}`. Parse ISO 8601 duration from `contentDetails.duration`

4. **API key resolution**: Check `YOUTUBE_API_KEY` env var first, then user's key from `youtube_settings.youtube_api_key`. Cache per user during the function execution

5. **Queue insert** uses upsert-like behavior: `ON CONFLICT (user_id, video_id) DO NOTHING` to handle race conditions with manual queueing from the UI

#### Step 3: Implement `api/youtube/poll-playlist.ts`

**This is a NEW file not present in V1.** Build it following the same patterns as poll.ts.

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── ENVIRONMENT ───
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── INLINE HELPERS ───

function verifyCronAuth(req: VercelRequest): boolean { /* same pattern */ }

interface YouTubePlaylistItem {
  video_id: string;
  title: string;
  url: string;
  thumbnail_url: string;
  published_at: string;
  description: string | null;
  channel_id_youtube: string; // The YouTube channel ID of the video's uploader
}

async function fetchPlaylistItems(
  playlistId: string,
  apiKey: string,
  maxPages: number = 4
): Promise<YouTubePlaylistItem[]> {
  const items: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: '50',
      key: apiKey,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`
    );

    if (!response.ok) {
      console.error(`Playlist API error: ${response.status}`);
      break;
    }

    const data = await response.json();

    for (const item of data.items || []) {
      const videoId = item.contentDetails?.videoId;
      if (!videoId) continue;

      items.push({
        video_id: videoId,
        title: item.snippet?.title || 'Untitled',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: item.snippet?.thumbnails?.high?.url
          || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        published_at: item.snippet?.publishedAt || new Date().toISOString(),
        description: (item.snippet?.description || '').substring(0, 500) || null,
        channel_id_youtube: item.snippet?.videoOwnerChannelId || '',
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return items;
}

// ─── HANDLER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS + method check + auth
  // Fetch active playlists
  // For each playlist:
  //   Resolve YouTube API key (env var → user's personal key)
  //   Fetch playlist items via API
  //   Deduplicate against existing queue
  //   Handle channel_id FK constraint (see note below)
  //   Insert with playlist-specific settings
  //   Update known_video_count
  // Return summary
}
```

**Channel ID FK handling strategy:**

The `youtube_ingestion_queue.channel_id` column has a FK constraint to `youtube_channels(id)`. For playlist-sourced videos, the originating YouTube channel may not be in the user's `youtube_channels` table. Strategy:

1. For each video, check if the video's YouTube channel ID exists in `youtube_channels` for this user
2. If yes, use that channel's `id` as the FK
3. If no, check if the playlist has a linked channel. If the playlist row has a way to reference a channel, use it
4. **Fallback**: If the `channel_id` column is nullable or if there's another way to handle this, use NULL. If not nullable, you may need to create a synthetic "Playlist Import" channel entry for the user. Check the actual DB constraint and adapt.

**IMPORTANT**: Examine the `youtube_ingestion_queue` schema carefully. If `channel_id` is `NOT NULL` with a FK constraint, playlist-only videos need a valid channel reference. The V1 approach may have addressed this — check the existing data patterns.

#### Step 4: Implement `api/youtube/process.ts`

This is the most complex file. Reference the V1 implementation heavily.

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── ENVIRONMENT ───
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const APIFY_API_KEY = process.env.APIFY_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const APIFY_ACTOR_ID = 'pintostudio/youtube-transcript-scraper';

const MAX_ITEMS_PER_BATCH = 2;
const MAX_ITEMS_PROCESS_ALL = 20;

// ─── INLINE AUTH HELPERS ───

function verifyCronAuth(req: VercelRequest): boolean { /* same pattern */ }

async function verifyUserAuth(req: VercelRequest): Promise<{
  user: { id: string } | null;
  isCron: boolean;
}> {
  // Check cron auth first, then try Supabase JWT verification
}

// ─── INLINE TRANSCRIPT EXTRACTION ───

// Tier 1: youtube-caption-extractor
async function fetchTranscriptTier1(videoId: string): Promise<string | null> {
  try {
    const { getSubtitles } = await import('youtube-caption-extractor');
    const subtitles = await Promise.race([
      getSubtitles({ videoID: videoId, lang: 'en' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tier 1 timeout')), 15000)
      ),
    ]);
    if (!subtitles || subtitles.length === 0) return null;
    return subtitles.map((s: any) => s.text).join(' ');
  } catch (error) {
    console.log(`[Process] Tier 1 failed for ${videoId}:`, error);
    return null;
  }
}

// Tier 2: Innertube API
async function fetchTranscriptTier2(videoId: string): Promise<string | null> {
  try {
    // Encode video ID for Innertube params
    // V1 uses a specific protobuf-like encoding — preserve exactly
    const params = encodeInnertubeParams(videoId);

    const response = await Promise.race([
      fetch('https://www.youtube.com/youtubei/v1/get_transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20231219.04.00',
            },
          },
          params,
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tier 2 timeout')), 15000)
      ),
    ]);

    if (!response.ok) return null;
    const data = await response.json();

    // Navigate response structure to find transcript segments
    const segments = data?.actions?.[0]
      ?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.content
      ?.transcriptSearchPanelRenderer?.body
      ?.transcriptSegmentListRenderer?.initialSegments;

    if (!segments?.length) return null;

    return segments
      .map((seg: any) =>
        seg?.transcriptSegmentRenderer?.snippet?.runs
          ?.map((run: any) => run?.text)
          .join('')
      )
      .filter(Boolean)
      .join(' ');
  } catch (error) {
    console.log(`[Process] Tier 2 failed for ${videoId}:`, error);
    return null;
  }
}

function encodeInnertubeParams(videoId: string): string {
  // This encoding must match V1 exactly
  // It produces a base64-encoded protobuf-like structure
  // Reference the V1 process.ts for the exact implementation
}

// Tier 3: Apify
async function fetchTranscriptTier3(
  videoUrl: string,
  apifyApiKey: string
): Promise<{ success: boolean; transcript: string | null; language: string | null; error?: string }> {
  // POST to start Apify actor run
  // Poll for completion (max 120s)
  // Fetch results from dataset
  // Return transcript text
}

// Orchestrator
async function fetchTranscript(
  videoId: string,
  videoUrl: string
): Promise<{ transcript: string | null; language: string | null; tier: number }> {
  // Try Tier 1
  let transcript = await fetchTranscriptTier1(videoId);
  if (transcript) return { transcript, language: 'en', tier: 1 };

  // Try Tier 2
  transcript = await fetchTranscriptTier2(videoId);
  if (transcript) return { transcript, language: 'en', tier: 2 };

  // Try Tier 3 (if API key available)
  if (APIFY_API_KEY) {
    const result = await fetchTranscriptTier3(videoUrl, APIFY_API_KEY);
    if (result.success && result.transcript) {
      return { transcript: result.transcript, language: result.language || 'en', tier: 3 };
    }
  }

  return { transcript: null, language: null, tier: 0 };
}

// ─── INLINE EXTRACTION PIPELINE ───

// Entity ontology (must be defined inline)
const ENTITY_TYPES = [
  'Person', 'Organization', 'Team', 'Topic', 'Project', 'Goal', 'Action',
  'Risk', 'Blocker', 'Decision', 'Insight', 'Question', 'Idea', 'Concept',
  'Takeaway', 'Lesson', 'Document', 'Event', 'Location', 'Technology',
  'Product', 'Metric', 'Hypothesis', 'Anchor'
];

const RELATIONSHIP_TYPES = {
  positive: ['leads_to', 'supports', 'enables', 'created', 'achieved', 'produced'],
  negative: ['blocks', 'contradicts', 'risks', 'prevents', 'challenges', 'inhibits'],
  neutral: ['part_of', 'relates_to', 'mentions', 'connected_to', 'owns', 'associated_with'],
};

function buildExtractionPrompt(config: {
  mode: string;
  anchorEmphasis: string;
  anchors: Array<{ label: string; entity_type: string; description: string }>;
  userProfile: any | null;
  customInstructions?: string;
}): string {
  // Compose modular prompt following LEGACY-PATTERNS.md §1
  // Base instructions + mode template + profile context + anchor context
}

interface ExtractionResult {
  entities: Array<{
    label: string;
    entity_type: string;
    description: string;
    confidence: number;
    tags: string[];
  }>;
  relationships: Array<{
    source: string;
    target: string;
    relation_type: string;
    evidence: string;
  }>;
}

async function extractEntities(
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

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No extraction response from Gemini');
  return JSON.parse(text);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `${GEMINI_BASE_URL}/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    }
  );

  const data = await response.json();
  return data.embedding?.values || [];
}

function chunkText(text: string, targetTokens: number = 500): string[] {
  // Split at sentence boundaries, targeting ~targetTokens per chunk
  // Approximate: 1 token ≈ 4 characters
  const targetChars = targetTokens * 4;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > targetChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// ─── HANDLER ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS + method check
  // Auth (cron or user JWT)
  // Determine batch size
  // Fetch pending queue items
  // For each item:
  //   Update status → 'fetching_transcript'
  //   Run three-tier transcript extraction
  //   If transcript found:
  //     Update status → 'extracting'
  //     Save to knowledge_sources
  //     Fetch extraction config (user profile, anchors, settings)
  //     Build prompt, call Gemini extraction
  //     Save nodes with embeddings
  //     Save edges
  //     Chunk transcript, embed chunks, save to source_chunks
  //     Cross-connection discovery
  //     Update queue item → 'completed'
  //   If transcript failed:
  //     Increment retry_count or mark 'failed'
  //   Log to youtube_scan_history
  // Return summary
}
```

#### Step 5: Test each function independently after deployment

After deploying to Vercel:

1. **Test poll.ts**: `curl -X POST https://your-app.vercel.app/api/youtube/poll -H "Authorization: Bearer YOUR_CRON_SECRET"`
2. **Test poll-playlist.ts**: `curl -X POST https://your-app.vercel.app/api/youtube/poll-playlist -H "Authorization: Bearer YOUR_CRON_SECRET"`
3. **Test process.ts**: `curl -X POST https://your-app.vercel.app/api/youtube/process -H "Authorization: Bearer YOUR_CRON_SECRET"`
4. Check Vercel **runtime logs** (not build logs) for any errors
5. Verify data appears in Supabase tables

---

### Data Model Reference

No schema changes required. All tables already exist. Key tables used:

**Read:**
- `youtube_channels` — active channels to poll
- `youtube_playlists` — active playlists to poll
- `youtube_settings` — per-user API keys and limits
- `youtube_ingestion_queue` — pending items to process
- `user_profiles` — user context for extraction prompts
- `knowledge_nodes` — existing anchors and nodes for cross-connection discovery
- `extraction_settings` — default extraction mode and anchor emphasis

**Write:**
- `youtube_ingestion_queue` — insert new items, update status/transcript/results
- `youtube_channels` — update `last_checked_at`, `total_videos_ingested`
- `youtube_playlists` — update `known_video_count`
- `youtube_scan_history` — insert audit log entries
- `knowledge_sources` — insert source records for processed videos
- `knowledge_nodes` — insert extracted entities with embeddings
- `knowledge_edges` — insert extracted + cross-connection relationships
- `source_chunks` — insert chunked transcript passages with embeddings
- `extraction_sessions` — insert extraction session record

---

### Error Handling Requirements

- **Network errors**: Wrap all fetch calls in try/catch. Log error details. For transcript tiers, fall through to next tier. For Gemini/Supabase calls, mark queue item as failed with descriptive error_message
- **Gemini rate limits**: If Gemini returns 429, log and skip the item (will be retried next cron run). Do not retry immediately
- **Apify failures**: Timeout after 120s. If actor run fails, log the Apify run ID for debugging
- **Invalid JSON from Gemini**: Wrap `JSON.parse` in try/catch. If extraction response isn't valid JSON, log the raw response and mark as failed
- **Supabase errors**: Check every query for `.error`. Log the full error object. For insert conflicts (duplicate video_id), treat as a no-op, not an error
- **Vercel timeout**: Functions have a 10–60s timeout depending on plan. `poll.ts` and `poll-playlist.ts` should complete within 30s. `process.ts` processes max 2 items per batch to stay within timeout. If Tier 3 (Apify) is needed, one item per batch may be safer

---

### Success Metrics

- [ ] Channel RSS polling discovers new videos within 15 minutes of publication
- [ ] Playlist polling discovers new videos within 5 minutes of being added
- [ ] Three-tier transcript extraction achieves >95% success rate across channels with captions
- [ ] Extracted knowledge nodes appear in the Explore Browse view
- [ ] Extracted source chunks are queryable via the Ask view's Graph RAG
- [ ] Queue items transition through statuses correctly (pending → fetching_transcript → extracting → completed)
- [ ] Failed items are retried up to 3 times before being marked permanently failed
- [ ] Scan history entries are logged for every cron execution
- [ ] Daily video limit is respected
- [ ] No `FUNCTION_INVOCATION_FAILED` errors in Vercel runtime logs after deployment

### Edge Cases & Considerations

- **Empty RSS feed**: Some channels have no recent videos. Log and skip gracefully
- **Private/deleted videos**: YouTube API may return items that can't be accessed. Handle 403/404 during transcript fetch
- **Videos without captions**: All three tiers may fail. Mark as failed with clear error message ("No captions available")
- **Very long videos** (2+ hours): Transcripts may exceed Gemini's context window. Consider truncating to first 50,000 characters or splitting into segments for separate extraction calls
- **Concurrent cron executions**: Two cron runs may overlap. Use status checks (`WHERE status = 'pending'`) and optimistic locking to avoid double-processing. The `started_at` timestamp can serve as a lock indicator
- **Race condition with manual processing**: User clicks "Process Now" while cron is running. Use `UPDATE ... WHERE status = 'pending' RETURNING *` pattern to atomically claim items
- **Channel without YouTube API key**: Duration filtering falls back to HTML scraping, which may be blocked by YouTube. Include videos with unknown duration rather than blocking all content
- **Playlist FK constraint**: Videos from playlists may not have a corresponding channel in `youtube_channels`. See FR-2.7 for handling strategy

### Testing Guidance for AI Agent

- [ ] Deploy to Vercel and verify no `FUNCTION_INVOCATION_FAILED` in runtime logs
- [ ] Test poll.ts with at least one active channel — verify new videos appear in `youtube_ingestion_queue`
- [ ] Test poll-playlist.ts with at least one active playlist — verify new videos appear in queue with correct settings
- [ ] Test process.ts — verify transcript extraction succeeds and knowledge nodes are created
- [ ] Verify deduplication: run poll.ts twice and confirm no duplicate queue entries
- [ ] Test with CRON_SECRET auth header
- [ ] Test with Supabase JWT auth header (user-triggered mode)
- [ ] Verify 405 response for GET requests
- [ ] Check that `youtube_scan_history` entries are created
- [ ] Verify embeddings are generated (check `knowledge_nodes.embedding` is not null for new nodes)
- [ ] Verify source chunks are created with embeddings
- [ ] Test failure path: use an invalid video ID, verify retry logic and error_message storage
- [ ] Verify daily limit enforcement

### Out of Scope

- UI changes (already handled by PRD 9 and PRD 10)
- New database tables or schema modifications
- OAuth-based YouTube account sync (using public APIs only)
- Real-time WebSocket notifications for queue status (frontend polls via Supabase)
- Meeting transcript integrations (Circleback, Fireflies — future PRDs)
- Chrome extension capture pipeline (PRD 14)
- Streaming extraction progress to frontend (process.ts runs asynchronously)
```
