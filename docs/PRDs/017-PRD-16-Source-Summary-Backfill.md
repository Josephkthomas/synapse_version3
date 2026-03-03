# PRD 16 — Source Summary: Backfill & Extended Surfaces

**Phase:** Post-launch retrospective feature
**Dependencies:** PRD 15 (Source Summary: Generation & Pipeline Integration), PRD 10 (Automate View), PRD 8 (Ask View), PRD 12 (Command Palette Search)
**Estimated Complexity:** Medium (1–2 sessions)

---

## 1. Objective

PRD 15 ensures every *new* source gets a summary. This PRD closes the gap for the *existing* knowledge base — potentially hundreds of sources already ingested that have no summary. It delivers a self-contained Vercel serverless backfill function that processes existing sources in controlled batches, a trigger and progress UI in the Automate view, and propagates summary display to every remaining surface where sources appear: Automate queue cards, Ask view citations, Browse source provenance in NodeDetail, and Command Palette search results. It also adds "Regenerate summary" functionality in SourceDetail for sources where the auto-generated summary isn't satisfactory.

After this PRD, every source in the system has a summary, and that summary is visible everywhere sources are referenced.

---

## 2. What Gets Built

### Serverless Backfill Function

- **`api/summaries/backfill.ts`** — A fully self-contained Vercel serverless function. Processes sources in batches where `summary IS NULL`. All summarization logic (routing, extraction, Gemini generation, truncation) is defined inline — no shared local imports.
  - Accepts `POST` requests with an authorization header (Supabase JWT or a shared secret for cron invocation).
  - Query parameter `batch_size` (default 10, max 25).
  - Query parameter `source_type` (optional filter — allows backfilling by category, e.g., `?source_type=Meeting` to do meetings first).
  - Processes sources ordered by `created_at DESC` (most recent first — these are most likely to appear in the Home feed).
  - Returns JSON: `{ processed: number, remaining: number, errors: string[] }`.
  - Rate-limits Gemini calls with a 500ms delay between generated summaries to avoid hitting API quotas.
  - Can be invoked manually via the Automate UI, or scheduled via Vercel cron for unattended processing.

- **`vercel.json` update** — Add an optional cron entry (commented out by default, user can enable):
  ```json
  {
    "crons": [
      {
        "path": "/api/summaries/backfill?batch_size=15",
        "schedule": "*/10 * * * *"
      }
    ]
  }
  ```

### Automate View: Backfill Card

- **New integration card** in the Automate view dashboard: "Source Summaries" card showing backfill status and a manual trigger.
- Sits alongside existing integration cards (YouTube Channels, Playlists, Meeting Integrations, Processing Queue, Chrome Extension).

### Extended UI Surfaces

- **Automate queue item cards** — Add summary line to each queue item in the processing queue section.
- **Ask view citation context** — Source chunks in the right panel show the parent source's summary as a header above chunk previews.
- **NodeDetail source provenance** — When NodeDetail shows the source a node was extracted from, include the source summary.
- **Command Palette search results** — When searching and a result matches a source-level item, show the summary as subtitle text.

### SourceDetail Enhancements

- **"Regenerate summary" action** — For sources with `summary_source` of `extracted`, `generated`, or `truncated`, add a "Regenerate" ghost button next to "Edit". Clicking it re-runs `resolveSummary()` and overwrites the existing summary.
- **User edit protection** — If `summary_source === 'user'`, the "Regenerate" button shows a confirmation: "This summary was manually edited. Regenerate anyway?" with "Keep mine" (default) and "Regenerate" options.

---

## 3. Design Requirements

### Automate View: Source Summaries Card

The card follows the existing integration card pattern established in PRD 10.

- **Card layout:** White background (`--bg-card`), subtle border (`--border-subtle`), 12px border-radius. Padding `16px 22px`.
- **Header row:** Left side: "Source Summaries" title in Cabinet Grotesk 14px weight-700, with a summary icon (Lucide `FileText` or `AlignLeft`, 16px, `--text-secondary`). Right side: status indicator — green dot + "Complete" if remaining === 0, amber dot + "X remaining" if remaining > 0, gray dot + "Not started" if never run.
- **Stats row:** DM Sans 12px, `--text-secondary`. Format: "312 / 312 sources summarized" or "234 / 312 sources summarized (78 remaining)".
- **Progress bar:** Full-width, 4px height, `--bg-inset` track, `--accent-500` fill. Width = `(total - remaining) / total * 100%`. Visible only when remaining > 0.
- **Action row:** Two buttons:
  - "Run Backfill" — Tertiary button style (`--bg-inset` background, `--text-body`, `--border-default`). Disabled state (40% opacity) while a backfill is in progress.
  - "Run by Type" — Ghost button (`--accent-500` text, underline on hover). Opens a small inline dropdown with source type options (Meeting, YouTube, Research, Note, Document, All). Selecting a type triggers a filtered backfill.
- **Active state:** When backfill is running, the "Run Backfill" button text changes to "Processing..." with a 12px inline spinner. A live counter updates: "Processing batch 2 of 8...". The progress bar animates smoothly on each batch completion.
- **Last run info:** Below the action row, DM Sans 11px, `--text-secondary`: "Last run: 2 hours ago · 15 sources processed · 0 errors". Only visible if the backfill has been run at least once.
- **Error display:** If the last run had errors, show an expandable error section. Collapsed: "2 errors" in `--semantic-red-500` with a chevron. Expanded: list of source IDs and error messages in DM Sans 11px, `--text-secondary`, on `--semantic-red-50` background.

### Automate Queue Item: Summary Line

Each queue item card in the processing queue section gains a summary line.

- **Position:** Below the item title and status indicator, above the processing step indicators.
- **Font:** DM Sans 12px, weight 400, `--text-secondary`.
- **Max lines:** 1 line with `text-overflow: ellipsis`. Queue items are compact — the summary is a quick glance, not a reading experience.
- **Fallback:** If `summary IS NULL`, show nothing (no italic fallback — queue items are already dense).

### Ask View: Source Summary in Citation Context

In the Ask view right panel, the "Source Chunks" section lists text passages used as RAG context. Each chunk card currently shows source title, chunk preview, and timestamp.

- **Addition:** Insert the source summary between the source title and the chunk preview text.
- **Font:** DM Sans 12px, weight 400, `--text-body` at 80% opacity. Italic style to distinguish from the chunk content.
- **Max lines:** 2 lines with line-clamp.
- **Spacing:** 4px below the title, 8px above the chunk text.
- **Deduplication:** If multiple chunks from the same source appear consecutively, show the summary only on the first chunk card. Subsequent cards from the same source show a smaller "Same source" label in `--text-secondary` 10px instead.

### NodeDetail: Source Provenance Summary

NodeDetail (built in PRD 4) shows the source a node was extracted from in its provenance section. Currently this shows source title, type icon, and timestamp.

- **Addition:** Below the source title/type/timestamp row, add the source summary.
- **Font:** DM Sans 12px, weight 400, `--text-secondary`.
- **Max lines:** 2 lines with line-clamp.
- **Spacing:** 4px below the source metadata row, 8px above the "Connections" section divider.
- **Interaction:** The entire provenance section (title + summary) is clickable — opens SourceDetail in the right panel (existing behavior, summary just adds more click surface).

### Command Palette: Source Summary as Subtitle

If PRD 12 added source-level search results to the command palette (or when it does), the summary serves as the subtitle line.

- **Position:** Below the source title, same row alignment as entity type/description for node results.
- **Font:** DM Sans 11px, weight 400, `--text-secondary`.
- **Max lines:** 1 line with ellipsis.
- **Spacing:** 2px below the title line.

### SourceDetail: Regenerate Button

- **Position:** Next to the "Edit" ghost button, separated by 8px.
- **Label:** "Regenerate" — Ghost button style, DM Sans 11px, `--text-secondary`, underline on hover.
- **Hover state:** Text shifts to `--accent-500`.
- **Active state (generating):** Text changes to "Regenerating...", 12px spinner inline, both buttons disabled.
- **Confirmation (user-edited summaries):** If `summary_source === 'user'`, clicking "Regenerate" shows an inline confirmation bar (not a modal). The bar appears between the summary text and the section divider below it:
  - Background: `--semantic-amber-50`
  - Border: `1px solid` at `--semantic-amber-200`
  - Text: "This summary was manually edited." — DM Sans 12px, `--text-body`.
  - Buttons: "Keep mine" (tertiary, default) and "Regenerate anyway" (ghost, `--semantic-red-500` text). Both 11px.
  - The bar disappears on either action.

---

## 4. Data & Service Layer

### Serverless Backfill Function (`api/summaries/backfill.ts`)

The function is 100% self-contained. All helpers defined inline. This is the same summarization logic from `utils/summarize.ts` (PRD 15), duplicated per the Vercel serverless constraint.

```typescript
// api/summaries/backfill.ts
import { createClient } from '@supabase/supabase-js';

// ─── INLINE HELPERS (copied from utils/summarize.ts — cannot import) ───

function clampSummary(text: string, maxLength: number = 350): string {
  const cleaned = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);
  if (lastBoundary > maxLength * 0.5) {
    return truncated.slice(0, lastBoundary + 1);
  }
  return truncated.trimEnd() + '...';
}

function truncateAsSummary(content: string, maxChars: number = 300): string {
  const cleaned = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return clampSummary(cleaned, maxChars);
}

function extractMetadataSummary(
  metadata: Record<string, unknown>
): string | null {
  const candidates = [
    metadata.description,
    metadata.og_description,
    metadata.abstract,
    metadata.summary,
    metadata.excerpt,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 30);
  if (candidates.length > 0) return clampSummary(candidates[0]);
  return null;
}

function extractStructuredSummary(
  content: string,
  metadata: Record<string, unknown> | null
): string | null {
  // Known provider patterns
  const provider = (
    (metadata?.provider as string) || ''
  ).toLowerCase();
  if (
    ['circleback', 'otter', 'fireflies', 'meetgeek'].includes(provider)
  ) {
    // Provider-specific: extract content before first ## heading
    const firstHeading = content.search(/^#{1,3}\s/m);
    if (firstHeading > 20) {
      const preamble = content.slice(0, firstHeading).trim();
      if (preamble.length >= 30 && preamble.length <= 500) {
        return clampSummary(preamble);
      }
    }
  }

  // Preamble before first heading
  const firstHeadingIndex = content.search(/^#{1,3}\s/m);
  if (firstHeadingIndex > 20) {
    const preamble = content.slice(0, firstHeadingIndex).trim();
    const sentences = preamble
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);
    if (
      sentences.length >= 1 &&
      sentences.length <= 4 &&
      preamble.length <= 500
    ) {
      return clampSummary(preamble);
    }
  }

  // Labelled summary section
  const summaryHeadingPattern =
    /^#{1,3}\s*(Summary|Overview|Key Takeaways|Executive Summary|TLDR)\s*$/im;
  const match = content.match(summaryHeadingPattern);
  if (match && match.index !== undefined) {
    const afterHeading = content
      .slice(match.index + match[0].length)
      .trim();
    const nextHeading = afterHeading.search(/^#{1,3}\s/m);
    const sectionBody =
      nextHeading > 0
        ? afterHeading.slice(0, nextHeading).trim()
        : afterHeading.slice(0, 500).trim();
    if (sectionBody.length > 20) {
      return clampSummary(sectionBody);
    }
  }

  return null;
}

async function generateSummaryViaGemini(
  content: string,
  sourceType: string | null,
  apiKey: string
): Promise<string | null> {
  const truncatedContent =
    content.length > 8000
      ? content.slice(0, 8000) +
        '\n\n[Content truncated for summarization]'
      : content;

  const sourceLabel = sourceType || 'content';

  const systemPrompt = `You are a concise summarizer. Given a piece of ${sourceLabel.toLowerCase()}, produce a 2–3 sentence summary that describes what this content contains. Rules:
- Be factual and descriptive, not analytical or evaluative.
- Describe the topics covered, not what the reader should take away.
- Use plain, professional language.
- Do not start with "This [source type]..." — vary your openings.
- Do not reference the format ("this transcript", "this document") — summarize the substance.
- Maximum 300 characters.
- Return ONLY the summary text, no preamble, no quotes, no formatting.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: truncatedContent }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text || text.trim().length === 0) return null;
    return clampSummary(text.trim());
  } catch {
    return null;
  }
}

async function resolveSummaryForSource(
  sourceType: string | null,
  content: string | null,
  metadata: Record<string, unknown> | null,
  geminiApiKey: string
): Promise<{ summary: string; source: string } | null> {
  if (!content || content.trim().length === 0) return null;

  const wordCount = content.trim().split(/\s+/).length;

  // Tier 1: Short content
  if (wordCount <= 150) {
    return {
      summary: truncateAsSummary(content, 300),
      source: 'truncated',
    };
  }

  // Tier 2: Structured sources (meetings)
  if (sourceType === 'Meeting') {
    const extracted = extractStructuredSummary(content, metadata);
    if (extracted) return { summary: extracted, source: 'extracted' };
  }

  // Tier 3: Metadata
  if (metadata) {
    const metaSummary = extractMetadataSummary(metadata);
    if (metaSummary) return { summary: metaSummary, source: 'extracted' };
  }

  // Tier 4: Gemini generation
  const generated = await generateSummaryViaGemini(
    content,
    sourceType,
    geminiApiKey
  );
  if (generated) return { summary: generated, source: 'generated' };

  // Tier 5: Fallback truncation
  return {
    summary: truncateAsSummary(content, 300),
    source: 'truncated',
  };
}

// ─── HANDLER ───

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  // Auth: accept either Supabase JWT or CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    return new Response(
      JSON.stringify({ error: 'Missing environment variables' }),
      { status: 500 }
    );
  }

  // Verify auth
  const isCron =
    cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron && !authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  // Parse params
  const url = new URL(req.url);
  const batchSize = Math.min(
    parseInt(url.searchParams.get('batch_size') || '10', 10),
    25
  );
  const sourceTypeFilter = url.searchParams.get('source_type');

  // Use service role key for backfill (bypasses RLS — processes all users)
  // For user-triggered backfill, the frontend passes the user's JWT
  // and the function filters by that user.
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Determine user scope
  let userId: string | null = null;
  if (!isCron && authHeader) {
    // Verify JWT and extract user ID
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
      });
    }
    userId = user.id;
  }

  // Fetch sources needing summaries
  let query = supabase
    .from('knowledge_sources')
    .select('id, user_id, title, content, source_type, metadata')
    .is('summary', null)
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (sourceTypeFilter) {
    query = query.eq('source_type', sourceTypeFilter);
  }

  const { data: sources, error: fetchError } = await query;

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch sources', detail: fetchError.message }),
      { status: 500 }
    );
  }

  if (!sources || sources.length === 0) {
    // Count remaining to report
    let countQuery = supabase
      .from('knowledge_sources')
      .select('id', { count: 'exact', head: true })
      .is('summary', null);
    if (userId) countQuery = countQuery.eq('user_id', userId);
    const { count } = await countQuery;

    return new Response(
      JSON.stringify({ processed: 0, remaining: count || 0, errors: [] }),
      { status: 200 }
    );
  }

  // Process batch
  const errors: string[] = [];
  let processed = 0;

  for (const source of sources) {
    try {
      const result = await resolveSummaryForSource(
        source.source_type,
        source.content,
        source.metadata as Record<string, unknown> | null,
        geminiApiKey
      );

      if (result) {
        const { error: updateError } = await supabase
          .from('knowledge_sources')
          .update({
            summary: result.summary,
            summary_source: result.source,
          })
          .eq('id', source.id);

        if (updateError) {
          errors.push(`${source.id}: Update failed — ${updateError.message}`);
        } else {
          processed++;
        }
      } else {
        // Content was empty/null — nothing to summarize
        processed++;
      }

      // Rate limit between Gemini calls
      if (result?.source === 'generated') {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      errors.push(
        `${source.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  // Count remaining
  let remainingQuery = supabase
    .from('knowledge_sources')
    .select('id', { count: 'exact', head: true })
    .is('summary', null);
  if (userId) remainingQuery = remainingQuery.eq('user_id', userId);
  const { count: remaining } = await remainingQuery;

  return new Response(
    JSON.stringify({
      processed,
      remaining: remaining || 0,
      errors,
    }),
    { status: 200 }
  );
}
```

### Environment Variables

The backfill function requires server-side environment variables (not `VITE_` prefixed):

```bash
# Required for backfill function (set in Vercel dashboard)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]   # Required: bypasses RLS for cron-triggered backfill
GEMINI_API_KEY=[gemini-key]

# Optional
CRON_SECRET=[random-secret]   # For authenticating cron-triggered invocations
```

**Note:** `SUPABASE_SERVICE_ROLE_KEY` is needed because cron invocations don't have a user JWT. The function uses the service role to process sources across all users when invoked by cron. When invoked by the frontend (user-triggered), it uses the user's JWT and scopes to that user's sources only.

### Backfill Status Queries (Client-Side)

The Automate view's Source Summaries card needs two counts:

**Total sources for the user:**
```typescript
const { count: totalSources } = await supabase
  .from('knowledge_sources')
  .select('id', { count: 'exact', head: true });
```

**Sources still needing summaries:**
```typescript
const { count: missingSummaries } = await supabase
  .from('knowledge_sources')
  .select('id', { count: 'exact', head: true })
  .is('summary', null);
```

**Last run metadata:** Store in `localStorage` since this is session-level status tracking, not persistent data. Keys: `synapse_backfill_last_run` (ISO timestamp), `synapse_backfill_last_processed` (number), `synapse_backfill_last_errors` (number).

**Note on localStorage:** Per the artifact constraints, `localStorage` is not available in Claude artifacts. However, this is a spec for the actual Synapse V2 codebase running in a standard browser environment where `localStorage` is fully available. This is not an artifact.

### Backfill Trigger (Client-Side)

```typescript
async function triggerBackfill(
  sourceType?: string
): Promise<{ processed: number; remaining: number; errors: string[] }> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const params = new URLSearchParams();
  params.set('batch_size', '15');
  if (sourceType && sourceType !== 'All') {
    params.set('source_type', sourceType);
  }

  const response = await fetch(
    `/api/summaries/backfill?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
}
```

For continuous backfill (processing all remaining sources), the client calls `triggerBackfill()` in a loop:

```typescript
async function runFullBackfill(
  onProgress: (processed: number, remaining: number) => void
) {
  let totalProcessed = 0;
  let remaining = Infinity;

  while (remaining > 0) {
    const result = await triggerBackfill();
    totalProcessed += result.processed;
    remaining = result.remaining;
    onProgress(totalProcessed, remaining);

    if (result.processed === 0) break; // No more sources to process
  }

  return totalProcessed;
}
```

### Updated Supabase Selects

Add `summary, summary_source` to all existing queries that fetch `knowledge_sources` data and don't already include them (PRD 15 covered the primary queries — this PRD catches remaining surfaces):

**Ask view — source chunk context query:** When fetching source chunks for the right panel, join to get the parent source's summary:
```typescript
const { data: chunks } = await supabase
  .from('source_chunks')
  .select('id, content, chunk_index, source_id, knowledge_sources(id, title, source_type, summary, summary_source, created_at)')
  .in('id', chunkIds);
```

**NodeDetail — source provenance:** When fetching a node's source, include summary:
```typescript
const { data: source } = await supabase
  .from('knowledge_sources')
  .select('id, title, source_type, source_url, summary, summary_source, created_at')
  .eq('id', node.source_id)
  .maybeSingle();
```

**Automate queue items:** When fetching queue items that have a linked `source_id`:
```typescript
const { data: queueItems } = await supabase
  .from('youtube_ingestion_queue')
  .select('*, knowledge_sources(summary)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### New Hook: `useBackfillStatus`

```typescript
interface BackfillStatus {
  totalSources: number;
  missingSummaries: number;
  isRunning: boolean;
  lastRun: {
    timestamp: string;
    processed: number;
    errors: number;
  } | null;
}

function useBackfillStatus(): {
  status: BackfillStatus;
  refresh: () => Promise<void>;
  runBackfill: (sourceType?: string) => Promise<void>;
  runFullBackfill: () => Promise<void>;
}
```

Encapsulates the count queries, backfill trigger, localStorage read/write for last-run metadata, and running state. Consumed by the Automate view's Source Summaries card.

### SourceDetail: Regenerate Logic

```typescript
async function regenerateSummary(sourceId: string): Promise<SummaryResult | null> {
  // Fetch the source content
  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('source_type, content, metadata')
    .eq('id', sourceId)
    .maybeSingle();

  if (!source) return null;

  const result = await resolveSummary(
    source.source_type,
    source.content,
    source.metadata
  );

  if (result) {
    await supabase
      .from('knowledge_sources')
      .update({ summary: result.summary, summary_source: result.source })
      .eq('id', sourceId);
  }

  return result;
}
```

---

## 5. Interaction & State

### Automate View: Backfill Card Interactions

1. **On mount:** `useBackfillStatus` fetches total and missing counts. Card renders with current progress.
2. **"Run Backfill" click:** Sets `isRunning = true`. Calls `runFullBackfill()` which loops through batches. On each batch completion, `onProgress` updates the displayed count and progress bar width. Card re-renders with animated progress bar fill.
3. **"Run by Type" click:** Opens a small dropdown anchored to the button. Options: Meeting, YouTube, Research, Note, Document, All. Selecting an option triggers `runBackfill(sourceType)` for a single batch of that type. Dropdown closes on selection.
4. **Completion:** When `remaining === 0` or `processed === 0`, `isRunning` returns to false. Status indicator changes to green "Complete". Last-run metadata is written to localStorage.
5. **Error handling:** If a batch returns errors, they accumulate in local state. The error section appears below the action row. Errors from previous runs clear when a new run starts.
6. **Refresh:** Status auto-refreshes every 30 seconds while the card is visible (via `setInterval` in `useBackfillStatus`). Manual refresh via a subtle refresh icon button (16px, `--text-secondary`, `--bg-inset` circle, next to the status indicator).

### Ask View: Citation Summary Display

- No new interactions — the summary displays passively as part of the existing chunk card layout.
- State: summary data arrives as part of the joined query. No additional fetches needed.
- Deduplication logic: when rendering chunk cards, track `lastSourceId`. If the current chunk's `source_id` matches, show "Same source" label instead of repeating the summary.

### NodeDetail: Source Provenance Summary

- No new interactions — the summary displays passively within the existing provenance section.
- The provenance section remains clickable (opens SourceDetail). Summary text just adds more content to the click target.

### SourceDetail: Regenerate Flow

1. User clicks "Regenerate" ghost button.
2. **If `summary_source === 'user'`:** Inline confirmation bar appears. "Keep mine" dismisses the bar. "Regenerate anyway" proceeds.
3. **If `summary_source !== 'user'` (or confirmed):** Both "Edit" and "Regenerate" buttons disable. Summary text fades to 50% opacity. Inline spinner appears next to the section label.
4. `regenerateSummary(sourceId)` is called.
5. On success: new summary replaces old one, provenance badge updates, buttons re-enable.
6. On failure: error message appears inline ("Regeneration failed"), buttons re-enable, old summary remains.

### State Scope

- `useBackfillStatus` — local to the Automate view. Not stored in context (backfill status is operational, not app-wide state).
- Regeneration state — local to `SourceDetail` component (`useState<'idle' | 'regenerating' | 'confirming' | 'error'>`).
- Summary data in Ask/NodeDetail/Command Palette — arrives via existing data fetching, no new state management.

---

## 6. Forward-Compatible Decisions

1. **The backfill function accepts `source_type` as a filter.** This allows targeted runs (e.g., "backfill all meetings first") and enables future enhancements like priority-based backfill or automatic retry of failed source types.

2. **The backfill function scopes to a single user when JWT is provided, or all users when cron-invoked.** This means the same function works for both the manual trigger (user clicks "Run Backfill" in the Automate view) and an automated cron job that processes the entire platform. No separate functions needed.

3. **Summary data is included in Ask view chunk queries via a join.** This means if a future RAG enhancement changes how context is assembled or displayed, the summary is already available in the data layer without additional fetches.

4. **The `useBackfillStatus` hook is self-contained.** If a future feature needs backfill-like batch processing (e.g., re-embedding nodes with a newer model), the same pattern can be followed: serverless function + status hook + Automate card.

5. **User edit protection on regeneration establishes a precedent.** Any future action that could overwrite user-modified data (re-extraction, bulk updates) should follow the same pattern: detect `user`-sourced data, show confirmation before overwriting.

6. **Summary in Command Palette results prepares for source-level search.** Currently the command palette primarily searches nodes. Adding source summaries to the display layer means that when source search is added (searching `knowledge_sources.title` and `knowledge_sources.summary`), the results already have the right visual treatment.

---

## 7. Edge Cases & Error Handling

### Backfill Function: Gemini Rate Limits

The 500ms delay between Gemini calls should prevent most rate limit issues. If a rate limit error is returned (HTTP 429 or `RESOURCE_EXHAUSTED`), the function logs the error for that source and continues to the next one. The source remains `summary IS NULL` and will be picked up in the next batch. The error is included in the response's `errors` array so the UI can display it.

### Backfill Function: Very Large Content

Some sources may have content exceeding 100,000 characters (e.g., full book chapters, very long meeting transcripts). The inline `generateSummaryViaGemini` already truncates to 8000 characters, so this is handled. For sources with no content at all (`content IS NULL`), `resolveSummaryForSource` returns null and the source is skipped (counted as processed but no summary written).

### Backfill Function: Timeout

Vercel serverless functions have a default timeout of 10 seconds (Hobby) or 60 seconds (Pro). With a batch size of 10–15 and 500ms delays, the function should complete within 30 seconds for worst-case (all Gemini-generated). If timeout is a concern, reduce `batch_size`. The function is resumable — it processes what it can, and the next invocation picks up remaining sources.

### Backfill Function: Concurrent Invocations

If two backfill invocations run simultaneously (e.g., user clicks "Run" twice, or cron fires while manual run is active), they may process the same sources. The worst case is a source gets summarized twice — the last write wins. This is acceptable since both writes produce valid summaries. To mitigate, the client-side `runFullBackfill` disables the trigger button while running.

### Ask View: Sources Without Summaries in Citations

If a cited source has no summary yet (backfill hasn't reached it), the chunk card simply renders without the summary line. No fallback text — the chunk content itself provides sufficient context in this surface.

### NodeDetail: Source Not Found

If `node.source_id` is null (orphaned node from V1 data) or the source has been deleted, the provenance section shows "Source unavailable" in `--text-placeholder`. No summary line rendered.

### Command Palette: No Summary Available

If a source result has no summary, the subtitle line falls back to the source type label + timestamp. E.g., "Meeting · 3 days ago" instead of a summary.

### Full Backfill Already Complete

If the user clicks "Run Backfill" when all sources already have summaries (`remaining === 0`), the function returns immediately with `{ processed: 0, remaining: 0, errors: [] }`. The UI doesn't change (status already shows "Complete"). No error, no wasted API calls.

### Backfill Progress Survives Navigation

If the user navigates away from the Automate view while a backfill is running (the client-side loop is in progress), the `runFullBackfill` function continues in the background until the component unmounts. On unmount, the loop should be cancelled via an AbortController. When the user returns to the Automate view, `useBackfillStatus` re-fetches the current counts, so the progress bar reflects the actual state even if the previous run was interrupted.

---

## 8. Acceptance Criteria

### Backfill Function

- [ ] `api/summaries/backfill.ts` is fully self-contained with zero local imports.
- [ ] Calling `POST /api/summaries/backfill` with a valid user JWT processes up to `batch_size` sources for that user where `summary IS NULL`.
- [ ] Calling with a `CRON_SECRET` bearer token processes sources across all users.
- [ ] The function returns `{ processed, remaining, errors }` JSON.
- [ ] Sources are processed most-recent-first (`created_at DESC`).
- [ ] The `source_type` filter correctly limits processing to a single source type.
- [ ] Gemini calls are rate-limited with 500ms delays.
- [ ] If Gemini fails for a source, the error is logged and processing continues to the next source.
- [ ] Meeting sources with structured content (Circleback, etc.) get `extracted` summaries without Gemini calls.
- [ ] Short content sources get `truncated` summaries without Gemini calls.

### Automate View: Source Summaries Card

- [ ] The card displays total sources, summarized count, and remaining count.
- [ ] A progress bar shows the ratio of summarized to total sources.
- [ ] "Run Backfill" triggers the serverless function and updates the progress bar on each batch completion.
- [ ] "Run by Type" opens a dropdown allowing filtered backfill by source type.
- [ ] The card shows "Complete" with a green status indicator when all sources have summaries.
- [ ] Errors from the last run are displayed in an expandable section.
- [ ] The trigger button is disabled while a backfill is in progress.

### Extended UI Surfaces

- [ ] Automate queue item cards show a 1-line summary when available.
- [ ] Ask view right panel chunk cards show the parent source's summary below the source title. Duplicate summaries from the same source are collapsed to "Same source" labels.
- [ ] NodeDetail's source provenance section shows the source summary below the title/type/timestamp row.
- [ ] Command Palette search results for sources show the summary as subtitle text (when source search is available).

### SourceDetail Enhancements

- [ ] A "Regenerate" ghost button appears next to "Edit" for all sources with summaries.
- [ ] Clicking "Regenerate" on a non-user-edited summary immediately regenerates it.
- [ ] Clicking "Regenerate" on a user-edited summary (`summary_source = 'user'`) shows an inline confirmation before proceeding.
- [ ] "Keep mine" in the confirmation dismisses without changes.
- [ ] "Regenerate anyway" overwrites the user's summary with a fresh generation.
- [ ] During regeneration, both buttons are disabled and a spinner is shown.

### Data Integrity

- [ ] The backfill never overwrites a source that already has a non-null summary.
- [ ] User-edited summaries (`summary_source = 'user'`) are never modified by the backfill function.
- [ ] The backfill function handles null content gracefully (skips, no error).
- [ ] All Supabase queries across the app that fetch `knowledge_sources` now include `summary` and `summary_source` in the select.

---

## 9. File Structure

### New Files

```
api/
  summaries/
    backfill.ts               # Self-contained Vercel serverless backfill function

src/
  hooks/
    useBackfillStatus.ts      # Backfill status tracking, trigger, progress
  components/
    automate/
      BackfillCard.tsx         # Source Summaries card for Automate view
```

### Modified Files

```
vercel.json                     # Add optional cron entry for automated backfill

src/
  views/
    AutomateView.tsx            # Add BackfillCard to integration dashboard
  components/
    layout/
      SourceDetail.tsx          # Add "Regenerate" button + confirmation flow
    shared/
      FeedCard.tsx              # Already updated in PRD 15 (no further changes)
    ask/
      SourceChunkCard.tsx       # Add source summary display + dedup logic
    explore/
      NodeDetail.tsx            # Add summary to source provenance section
    command-palette/
      CommandPalette.tsx        # Add summary subtitle for source results
  services/
    supabase.ts                 # Update remaining knowledge_sources selects
                                # to include summary, summary_source
```
