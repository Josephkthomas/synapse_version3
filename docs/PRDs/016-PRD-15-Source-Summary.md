# PRD 15 — Source Summary: Generation & Pipeline Integration

**Phase:** Post-launch retrospective feature
**Dependencies:** PRD 6 (Home View / FeedCard), PRD 7 (Ingest / Extraction Pipeline)
**Estimated Complexity:** Medium (1–2 sessions)

---

## 1. Objective

Add a short, scannable summary (2–3 sentences) to every knowledge source in Synapse. Today, understanding what a source contains requires either reading the full raw content or scanning the extracted entities — neither is efficient when scrolling through a feed of 30+ sources. Source summaries transform the Home feed, Source Detail panel, and processing queue from title-only navigation into content-aware scanning.

This PRD covers the schema addition, the source-type-aware summarization logic (including smart extraction from pre-structured sources like Circleback), integration into the existing extraction pipeline for all new sources, and graceful fallback rendering for existing sources that don't yet have summaries (backfill is handled in PRD 16).

---

## 2. What Gets Built

### Schema Migration

- **New column on `knowledge_sources`:** `summary` — `TEXT`, nullable, default `NULL`.
- **New column on `knowledge_sources`:** `summary_source` — `VARCHAR(50)`, nullable, default `NULL`. Values: `'extracted'` (pulled from pre-structured content), `'generated'` (Gemini-created), `'user'` (manually written or edited), `'truncated'` (short content used directly).

**Migration SQL:**

```sql
ALTER TABLE knowledge_sources ADD COLUMN summary TEXT;
ALTER TABLE knowledge_sources ADD COLUMN summary_source VARCHAR(50);
```

No new tables. No index required initially (summaries are read alongside their parent source row, not queried independently). A GIN index on `summary` can be added in PRD 16 when summary-based search is introduced.

### Summarization Logic

- **`utils/summarize.ts`** — New utility module containing:
  - `resolveSummary(sourceType, content, metadata): Promise<SummaryResult | null>` — The routing function. Determines whether a summary can be extracted from existing content structure or needs Gemini generation. Returns `{ summary: string; source: SummarySource }` or `null` if content is empty/invalid.
  - `extractStructuredSummary(content, metadata): string | null` — Attempts to pull a summary from pre-structured sources (Circleback, Otter, Fireflies, academic papers with abstracts). Returns `null` if no structured summary is found.
  - `generateSummary(content, sourceType): Promise<string>` — Calls Gemini to produce a 2–3 sentence isolated summary. Used only when extraction fails or isn't applicable.
  - `truncateAsSummary(content, maxChars?: number): string` — For short content (notes under ~150 words), returns a cleaned truncation as the summary.

- **`types/summary.ts`** — Type definitions:
  ```typescript
  type SummarySource = 'extracted' | 'generated' | 'user' | 'truncated';

  interface SummaryResult {
    summary: string;
    source: SummarySource;
  }
  ```

### Pipeline Integration

- **Modify `useExtraction` hook** (or equivalent extraction orchestration in `services/gemini.ts`) to call `resolveSummary()` immediately after the source is saved to `knowledge_sources` and before entity extraction begins.
- **Modify extraction progress UI** to include a "Generating summary" step as the first completed step after "Saving source".
- **Write the summary to `knowledge_sources`** via `UPDATE ... SET summary = $1, summary_source = $2 WHERE id = $3` as soon as it's resolved — this happens independently of and before the entity extraction completes.

### UI Updates

- **Modify `FeedCard.tsx`** to render the summary when present, with a truncated-content fallback when `summary IS NULL`.
- **Modify `SourceDetail.tsx`** (right panel) to display the full summary prominently, with an "Edit" affordance.
- **Add summary field to the `KnowledgeSource` TypeScript type** in `types/database.ts`.

---

## 3. Design Requirements

### Summary in FeedCard

The summary line sits between the title/metadata row and the entity badges section.

- **Font:** DM Sans, 13px, weight 400
- **Color:** `--text-body` (#3d3d3d)
- **Max lines:** 2 lines with `-webkit-line-clamp: 2` and `overflow: hidden; text-overflow: ellipsis`
- **Spacing:** 6px above (from the timestamp/counts row), 10px below (before entity badges)
- **Fallback (no summary):** Show first ~180 characters of raw content in `--text-secondary` (#808080) with italic style to visually distinguish it from a real summary. Append "..." if truncated.

### Summary in SourceDetail (Right Panel)

The summary appears below the source title and metadata header, above the entity list.

- **Font:** DM Sans, 13px, weight 400
- **Color:** `--text-body`
- **Full text:** No truncation — show the complete summary (typically 2–3 sentences).
- **Container:** No additional card or background. Separated from the metadata above by 12px and from the entity section below by 16px with a `border-bottom: 1px solid var(--border-subtle)` divider.
- **Edit affordance:** A small "Edit" ghost button (DM Sans, 11px, `--accent-500`, underline on hover) right-aligned on the same line as a "SUMMARY" section label. Clicking "Edit" transforms the summary text into an auto-resizing textarea (`--bg-inset` background, `--border-subtle`, 13px DM Sans) with "Save" (tertiary button) and "Cancel" (ghost button) below it. Saving writes `summary_source = 'user'`.
- **Fallback (no summary):** Same italic treatment as FeedCard but at full width. Below the fallback text, show a ghost button: "Generate summary" in `--accent-500`. Clicking triggers `resolveSummary()` for this source and writes the result. Show a small inline spinner (12px, `--accent-500`) while generating.
- **Summary source indicator:** Next to the section label, show a subtle badge indicating provenance. DM Sans, 10px, weight 500, `--text-secondary`, `--bg-inset` background, 4px border-radius, 4px 8px padding.
  - `extracted` → "From source"
  - `generated` → "AI generated"
  - `user` → "Edited"
  - `truncated` → "Preview"

### Progress UI Update

The extraction progress indicator (horizontal step bar or vertical timeline from PRD 7) gains a new first step:

- **Step label:** "Summarizing"
- **Position:** First step, before "Extracting entities"
- **Behavior:** Completes quickly (typically <2s for extraction/truncation, 3–5s for Gemini generation). Transitions to green check on completion. The summary appears in the background feed immediately after this step.

Updated step sequence: Saving source → **Summarizing** → Extracting entities → Reviewing → Saving to graph → Generating embeddings → Chunking source → Discovering connections → Complete.

---

## 4. Data & Service Layer

### Source-Type Routing Logic (`resolveSummary`)

```typescript
async function resolveSummary(
  sourceType: string | null,
  content: string | null,
  metadata: Record<string, unknown> | null
): Promise<SummaryResult | null> {
  if (!content || content.trim().length === 0) return null;

  const wordCount = content.trim().split(/\s+/).length;

  // Tier 1: Short content — use as-is
  if (wordCount <= 150) {
    return {
      summary: truncateAsSummary(content, 300),
      source: 'truncated',
    };
  }

  // Tier 2: Structured sources — attempt extraction
  if (sourceType === 'Meeting') {
    const extracted = extractStructuredSummary(content, metadata);
    if (extracted) {
      return { summary: extracted, source: 'extracted' };
    }
  }

  // Tier 3: Check metadata for pre-existing summaries (og:description, abstracts)
  if (metadata) {
    const metaSummary = extractMetadataSummary(metadata);
    if (metaSummary) {
      return { summary: metaSummary, source: 'extracted' };
    }
  }

  // Tier 4: Gemini generation
  const generated = await generateSummary(content, sourceType);
  return { summary: generated, source: 'generated' };
}
```

### Structured Summary Extraction (`extractStructuredSummary`)

Targets meeting transcripts from Circleback, Otter, Fireflies, and similar tools. These tools consistently place a summary at the top of their output, before the detailed transcript or notes.

**Detection heuristics (applied in order):**

1. **Metadata provider check:** If `metadata.provider` or `metadata.tool` contains known values (`circleback`, `otter`, `fireflies`, `meetgeek`), apply tool-specific extraction patterns.
2. **Heading-based extraction:** Look for content before the first markdown heading (`## ` or `### `) that isn't itself a heading. If this preamble is 1–4 sentences long, use it as the summary.
3. **Labelled section extraction:** Search for a section headed "Summary", "Overview", "Key Takeaways", "Executive Summary", or "TLDR" (case-insensitive). Extract its body text (up to 3 sentences or 400 characters).
4. **Structured bullet extraction:** If the content starts with a short bulleted list (3–7 items, each under 100 characters) followed by longer content, join the first 3 bullets into a sentence-form summary.

If none of these heuristics match, return `null` (falls through to Gemini generation).

```typescript
function extractStructuredSummary(
  content: string,
  metadata: Record<string, unknown> | null
): string | null {
  // 1. Known provider patterns
  const provider = (metadata?.provider as string || '').toLowerCase();
  if (['circleback', 'otter', 'fireflies', 'meetgeek'].includes(provider)) {
    return extractProviderSummary(content, provider);
  }

  // 2. Preamble before first heading
  const firstHeadingIndex = content.search(/^#{1,3}\s/m);
  if (firstHeadingIndex > 20) {
    const preamble = content.slice(0, firstHeadingIndex).trim();
    const sentences = preamble.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 1 && sentences.length <= 4 && preamble.length <= 500) {
      return clampSummary(preamble);
    }
  }

  // 3. Labelled summary section
  const summaryHeadingPattern = /^#{1,3}\s*(Summary|Overview|Key Takeaways|Executive Summary|TLDR)\s*$/im;
  const match = content.match(summaryHeadingPattern);
  if (match && match.index !== undefined) {
    const afterHeading = content.slice(match.index + match[0].length).trim();
    const nextHeading = afterHeading.search(/^#{1,3}\s/m);
    const sectionBody = nextHeading > 0 ? afterHeading.slice(0, nextHeading).trim() : afterHeading.slice(0, 500).trim();
    if (sectionBody.length > 20) {
      return clampSummary(sectionBody);
    }
  }

  // 4. No structured summary found
  return null;
}
```

### Metadata Summary Extraction

Checks for pre-existing summary-like fields in the JSONB metadata:

```typescript
function extractMetadataSummary(metadata: Record<string, unknown>): string | null {
  // Check common metadata fields that contain summaries
  const candidates = [
    metadata.description,
    metadata.og_description,
    metadata.abstract,
    metadata.summary,
    metadata.excerpt,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 30);

  if (candidates.length > 0) {
    return clampSummary(candidates[0]);
  }
  return null;
}
```

### Gemini Summary Generation (`generateSummary`)

A lightweight, dedicated Gemini call — separate from the extraction prompt composer. Uses the same API pattern as `services/gemini.ts` but with a simpler, focused prompt.

```typescript
async function generateSummary(
  content: string,
  sourceType: string | null
): Promise<string> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const truncatedContent = content.length > 8000
    ? content.slice(0, 8000) + '\n\n[Content truncated for summarization]'
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
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

  if (!text || text.trim().length === 0) {
    // Fallback if Gemini fails: truncate content
    return truncateAsSummary(content, 300);
  }

  return clampSummary(text.trim());
}
```

### Helper: `clampSummary`

Ensures no summary exceeds a reasonable display length:

```typescript
function clampSummary(text: string, maxLength: number = 350): string {
  const cleaned = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  // Truncate at last sentence boundary within limit
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
```

### Helper: `truncateAsSummary`

For short content that serves as its own summary:

```typescript
function truncateAsSummary(content: string, maxChars: number = 300): string {
  const cleaned = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  return clampSummary(cleaned, maxChars);
}
```

### Supabase Write

After `resolveSummary` returns, write immediately:

```typescript
const { error } = await supabase
  .from('knowledge_sources')
  .update({
    summary: result.summary,
    summary_source: result.source,
  })
  .eq('id', sourceId);
```

For the SourceDetail "Edit" action:

```typescript
const { error } = await supabase
  .from('knowledge_sources')
  .update({
    summary: editedSummary,
    summary_source: 'user',
  })
  .eq('id', sourceId);
```

For the SourceDetail "Generate summary" on-demand action (for sources without a summary):

```typescript
const result = await resolveSummary(source.source_type, source.content, source.metadata);
if (result) {
  await supabase
    .from('knowledge_sources')
    .update({ summary: result.summary, summary_source: result.source })
    .eq('id', source.id);
}
```

### Updated Supabase Queries

Anywhere `knowledge_sources` is queried, the `select` must now include `summary` and `summary_source`. Affected queries:

- **Home feed query** (PRD 6): `supabase.from('knowledge_sources').select('id, title, source_type, source_url, metadata, created_at, summary, summary_source').order('created_at', { ascending: false })`
- **Source Detail fetch**: add `summary, summary_source` to the select
- **Extraction session history** (if showing source previews): add `summary` via join

### Updated TypeScript Types

In `types/database.ts`, extend the `KnowledgeSource` type:

```typescript
interface KnowledgeSource {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  source_type: string | null;
  source_url: string | null;
  metadata: Record<string, unknown> | null;
  summary: string | null;          // NEW
  summary_source: string | null;   // NEW: 'extracted' | 'generated' | 'user' | 'truncated'
  created_at: string;
}
```

---

## 5. Interaction & State

### Pipeline Flow (New Source)

1. User submits content in Quick Capture (or via YouTube/Meeting/Document tabs).
2. Raw content saved to `knowledge_sources`. Progress UI shows "Saving source ✓".
3. **`resolveSummary()` is called.** Progress UI shows "Summarizing..." with accent-500 pulse.
   - If source is short (≤150 words): `truncateAsSummary()` runs synchronously. Nearly instant.
   - If source is a Meeting with structured content: `extractStructuredSummary()` runs synchronously. Nearly instant.
   - If metadata contains a usable summary: `extractMetadataSummary()` runs synchronously. Nearly instant.
   - Otherwise: `generateSummary()` calls Gemini. Takes 2–5 seconds.
4. Summary written to database. Progress UI shows "Summarizing ✓". FeedCard in background updates if Home view is visible.
5. Entity extraction continues as normal (steps 3–11 of existing pipeline).

### SourceDetail Edit Flow

1. User clicks "Edit" next to the summary in the right panel.
2. Summary text transforms into textarea, pre-filled with current summary. Focus is set to the textarea.
3. "Save" and "Cancel" buttons appear below.
4. On Save: writes to Supabase with `summary_source = 'user'`, reverts to display mode, updates local state.
5. On Cancel: reverts to display mode with no changes.
6. State: `isEditingSummary` boolean, managed locally in `SourceDetail` component.

### SourceDetail Generate Flow (Existing Sources Without Summary)

1. User opens SourceDetail for a source where `summary IS NULL`.
2. Fallback text shows truncated content in italic. "Generate summary" ghost button appears.
3. User clicks "Generate summary".
4. Inline spinner appears. Button text changes to "Generating...".
5. `resolveSummary()` is called with the source's type, content, and metadata.
6. On success: summary appears, spinner disappears, provenance badge updates.
7. On failure: show inline error text ("Summary generation failed — try again") in `--semantic-red-500`, 12px, with a "Retry" ghost button.

### State Management

- Summary data flows through existing data fetching patterns — no new context needed.
- The summary is part of the `KnowledgeSource` object, which is already fetched and passed to `FeedCard` and `SourceDetail`.
- Edit state is local to `SourceDetail` (`useState<boolean>` for edit mode, `useState<string>` for draft text).
- On-demand generation state is local to `SourceDetail` (`useState<'idle' | 'generating' | 'error'>` for generation status).

---

## 6. Forward-Compatible Decisions

1. **`utils/summarize.ts` is a standalone module.** It has no dependencies on React components or hooks. This allows PRD 16 to import and use the same logic in a Vercel serverless backfill function (where it will be copied inline per the self-containment constraint, but the logic is identical).

2. **`summary_source` tracks provenance.** This enables PRD 16 to implement "Regenerate summary" (which overwrites `generated` or `extracted` but warns before overwriting `user`), and enables future analytics on summary quality by source type.

3. **The Gemini summarization prompt is isolated from the extraction prompt composer.** Summary generation is intentionally a separate, lightweight call — not folded into the extraction prompt. This means: (a) summaries can be generated independently of extraction, (b) the backfill function doesn't need the full prompt composition system, and (c) summary generation can be swapped to a different/cheaper model in the future without affecting extraction quality.

4. **FeedCard renders summaries generically.** It doesn't know or care about `summary_source` — it just shows the text. This means PRD 16's backfill can populate summaries for existing sources and the Home feed immediately reflects them without any UI changes.

5. **The SourceDetail "Generate summary" button handles the transition from pre-backfill to post-backfill gracefully.** Before the PRD 16 backfill runs, users can generate summaries on-demand for individual sources they care about. After the backfill, this button rarely appears. No dead UI.

6. **Content truncation for Gemini input (8000 chars) is intentional.** For very long sources (2-hour meeting transcripts), sending the full content is wasteful for a 2–3 sentence summary. The first ~8000 characters (roughly 2000 tokens) capture the key topics. This also keeps the Gemini call fast and cheap.

---

## 7. Edge Cases & Error Handling

### Empty or Missing Content

`resolveSummary` returns `null` if `content` is null, empty, or whitespace-only. The database remains `summary = NULL`. FeedCard shows no summary line (not even a fallback) when both `summary` and `content` are null. SourceDetail shows "No content available" in `--text-placeholder`.

### Gemini API Failure

If the Gemini summarization call fails (network error, rate limit, malformed response):
- The pipeline does **not** halt. Summary generation failure is non-blocking.
- `summary` remains `NULL` for this source. The fallback rendering (truncated content in italic) handles this gracefully.
- The error is logged to console with the source ID for debugging.
- The extraction pipeline continues to the next step normally.
- In SourceDetail, the "Generate summary" button remains available for manual retry.

### Gemini Returns Unusable Output

If Gemini returns text but it's clearly not a summary (e.g., empty string, single word, or longer than 500 characters):
- Apply `clampSummary()` to enforce length.
- If the result is still under 20 characters after clamping, fall back to `truncateAsSummary(content)` and set `summary_source = 'truncated'`.

### Content Is Already a Summary (Very Short Notes)

If a user writes a 2-sentence note in Quick Capture, `resolveSummary` detects it's ≤150 words and uses the content itself (cleaned and truncated) as the summary. The `truncated` source type distinguishes this from AI-generated summaries so that "Regenerate" actions in PRD 16 can offer to generate a proper summary if the user wants one.

### Meeting Source Without Structured Summary

If `sourceType === 'Meeting'` but `extractStructuredSummary` returns null (e.g., raw unstructured transcript pasted without Circleback formatting), the flow falls through to Gemini generation. This is expected and correct — the routing function tries extraction first but doesn't fail if the content isn't structured.

### User Edits Summary Then Source Is Re-Extracted

If a source undergoes re-extraction (via the "Re-extract" button in History or SourceDetail), the summary is **not** regenerated if `summary_source === 'user'`. User edits are preserved. If `summary_source` is any other value, the summary is regenerated as part of the re-extraction flow.

### Auth Expiry During Generation

If the Supabase session expires between saving the source and writing the summary, the write will fail silently (RLS rejection). The extraction pipeline handles this via the existing auth refresh pattern. The summary write should check for errors and retry once after refreshing the session.

### Concurrent Summary Updates

If a user clicks "Generate summary" in SourceDetail while a pipeline summary generation is in-flight for the same source (unlikely but possible), the last write wins. This is acceptable — both are writing valid summaries and the result is correct either way.

---

## 8. Acceptance Criteria

### Schema

- [ ] `knowledge_sources` table has `summary` (TEXT, nullable) and `summary_source` (VARCHAR(50), nullable) columns.
- [ ] Existing rows are unaffected (both columns are NULL for all pre-existing sources).

### Summarization Logic

- [ ] A short note (≤150 words) pasted into Quick Capture produces a `truncated` summary without calling Gemini.
- [ ] A Circleback meeting transcript with a "Summary" or "Key Takeaways" heading at the top produces an `extracted` summary without calling Gemini.
- [ ] A long YouTube transcript or research document produces a `generated` summary via Gemini that is 2–3 sentences, factual, and under 350 characters.
- [ ] A source with `metadata.description` or `metadata.og_description` (e.g., from URL ingestion) uses that as an `extracted` summary.
- [ ] If Gemini fails, the source still saves successfully and the summary remains NULL — no pipeline interruption.

### Pipeline Integration

- [ ] Every new source ingested through Quick Capture receives a summary as the first post-save step.
- [ ] The extraction progress UI shows "Summarizing" as the first step and marks it complete before entity extraction begins.
- [ ] The summary is written to the database immediately and independently — it does not wait for entity extraction to complete.

### UI — FeedCard

- [ ] FeedCards on the Home view display the summary text below the title/metadata row.
- [ ] Summary text is clamped to 2 lines with ellipsis overflow.
- [ ] Sources without a summary show the first ~180 characters of raw content in italic secondary text as a fallback.
- [ ] Sources with neither a summary nor content show no summary line at all.

### UI — SourceDetail

- [ ] The SourceDetail right panel displays the full summary with a provenance badge ("From source", "AI generated", "Edited", or "Preview").
- [ ] Clicking "Edit" transforms the summary into an editable textarea with Save/Cancel buttons.
- [ ] Saving an edit writes `summary_source = 'user'` and updates the display immediately.
- [ ] For sources without a summary, a "Generate summary" ghost button appears. Clicking it generates and saves a summary with an inline loading spinner.
- [ ] Generation failure shows an inline error message with a Retry option.

### Forward Compatibility

- [ ] `utils/summarize.ts` exports all functions and has no React dependencies — it can be copied into a serverless function for PRD 16 backfill.
- [ ] Re-extracting a source with `summary_source = 'user'` preserves the user's summary.
- [ ] Re-extracting a source with any other `summary_source` regenerates the summary.

---

## 9. File Structure

### New Files

```
src/
  utils/
    summarize.ts          # resolveSummary, extractStructuredSummary, generateSummary,
                          # extractMetadataSummary, truncateAsSummary, clampSummary
  types/
    summary.ts            # SummarySource type, SummaryResult interface
```

### Modified Files

```
src/
  types/
    database.ts           # Add summary, summary_source to KnowledgeSource interface
  services/
    supabase.ts           # Add summary, summary_source to all knowledge_sources selects
  hooks/
    useExtraction.ts      # Add summarization step after source save, before extraction
  components/
    shared/
      FeedCard.tsx         # Render summary line with fallback
    layout/
      SourceDetail.tsx     # Render summary with edit/generate affordances, provenance badge
  views/
    IngestView.tsx         # Update progress step labels (add "Summarizing" step)
```
