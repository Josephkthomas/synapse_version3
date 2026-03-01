# PRD 7 — Ingest View: Quick Capture + Extraction Pipeline

**Phase:** 3 — Intelligence
**Dependencies:** PRD 2 (App Shell), PRD 3 (Settings — provides SettingsContext with profile, extraction defaults, and anchors; provides AnchorPicker component), PRD 4 (Browse — provides NodeDetail, entity badge component)
**Estimated Complexity:** Very High (3–4 sessions)
**Key Risks:** Gemini API reliability and rate limits, extraction prompt quality tuning, embedding generation throughput, cross-connection discovery token limits at scale, entity review UI polish, pipeline error recovery mid-flow

---

## 1. Objective

Build the Ingest view's Quick Capture tab and the complete extraction pipeline that transforms raw content into structured knowledge graph data. This is the core value-creation flow of Synapse — the moment unstructured text becomes interconnected entities, relationships, and retrievable knowledge. The pipeline encompasses: saving raw content, composing a modular AI prompt, calling Gemini for entity extraction, presenting entities for user review and editing, persisting approved entities with embeddings, chunking source content for RAG, and discovering cross-connections to the existing graph. A multi-step progress UI keeps the user informed throughout a process that takes 15–30 seconds. A History tab surfaces past extraction sessions for audit and re-extraction.

---

## 2. What Gets Built

### New Files Created

| File | Purpose |
|---|---|
| **View & UI Components** | |
| `src/components/ingest/IngestView.tsx` | Top-level Ingest view. Tab bar (Quick Capture, YouTube, Meetings, Documents, History). Only Quick Capture and History tabs are functional in this PRD — others show styled placeholders for PRD 9. |
| `src/components/ingest/QuickCaptureTab.tsx` | The Quick Capture content area: textarea, action bar, collapsible advanced options, and the extraction trigger. Manages pre-extraction state. |
| `src/components/ingest/AdvancedOptions.tsx` | Collapsible panel with extraction mode selector, anchor emphasis selector, focus anchors picker, and custom guidance textarea. |
| `src/components/ingest/ExtractionProgress.tsx` | Multi-step progress indicator showing the current pipeline stage. Horizontal step bar with icons, labels, and active/complete/pending states. |
| `src/components/ingest/ExtractionSummary.tsx` | Post-pipeline summary card showing entity count, relationship count, cross-connections discovered, and processing time. Includes "View in Browse" and "Ingest Another" actions. |
| `src/components/ingest/HistoryTab.tsx` | List of past extraction sessions from the `extraction_sessions` table. Each row shows source name, type, timestamp, entity count, relationship count. |
| `src/components/shared/EntityReview.tsx` | The entity review UI — a polished table/card layout showing extracted entities and relationships. Supports inline editing of labels, entity types, descriptions, and confidence. Supports toggling entities on/off (removed entities shown with strikethrough and reduced opacity). Shows relationship list. "Save to Graph" and "Re-extract" buttons. **This is a standalone reusable component.** |
| **Pipeline & Services** | |
| `src/hooks/useExtraction.ts` | The master extraction hook. Orchestrates the full 10-step pipeline, exposes state (`currentStep`, `entities`, `relationships`, `error`, `progress`), and provides control functions (`start`, `approveAndSave`, `reExtract`, `reset`). |
| `src/services/gemini.ts` | All Gemini API interactions: `extractEntities()`, `generateEmbedding()`, `generateEmbeddings()` (batch), `discoverCrossConnections()`. Each function handles request construction, response parsing, error handling, and retry logic. |
| `src/utils/promptBuilder.ts` | Modular prompt composition system: `buildExtractionPrompt(config)` assembles the final system prompt from `getBaseInstructions()`, `getModeTemplate()`, `buildProfileContext()`, `buildAnchorContext()`, and custom guidance. |
| `src/utils/chunking.ts` | Source content chunking: `chunkSourceContent(content, targetTokens?)` splits text into ~500-token passages with sentence-boundary awareness and overlap. |
| `src/services/crossConnections.ts` | Cross-connection discovery: `discoverCrossConnections(newNodeIds, userId)` finds semantically similar existing nodes, sends candidates to Gemini for relationship inference, returns new edges. |
| `src/services/extractionPersistence.ts` | Database persistence functions for the extraction pipeline: `saveSource()`, `saveNodes()`, `saveEdges()`, `saveChunks()`, `saveExtractionSession()`. Separated from `supabase.ts` to keep the service file manageable. |
| **Config & Types** | |
| `src/config/extractionModes.ts` | Mode configuration — label, description, entity color, and the prompt template fragment for each of the 4 modes. If this file already exists from PRD 1 scaffold, extend it with the full prompt templates. |
| `src/config/baseInstructions.ts` | The base extraction prompt: entity ontology (all 24 types with descriptions), relationship types, JSON output schema, and extraction rules. This is a long string constant (~2000 words). |
| `src/types/extraction.ts` | Type definitions: `ExtractionConfig`, `ExtractionResult`, `ExtractedEntity`, `ExtractedRelationship`, `ExtractionStep`, `PipelineState`, `ReviewEntity` (entity with UI state like `removed`, `edited`). |

### Modified Files

| File | Change |
|---|---|
| `src/components/ingest/` (directory) | Replace PRD 2's placeholder with the full IngestView component tree. |
| `src/services/supabase.ts` | Add `fetchExtractionSessions()` for the History tab. Add `checkDuplicateNodes(labels, userId)` for entity deduplication before saving. |
| `src/contexts/SettingsContext.tsx` | No changes needed — PRD 3 already provides `profile`, `extractionSettings`, and `anchors`. Verify the context exposes all three. |

---

## 3. Design Requirements

### Ingest View Layout

Content constrained to `max-width: 720px` (narrower than the standard 840px — the ingest flow is a focused single-column experience). Centered with `margin: 0 auto`. Padding: `28px 32px`.

**View header:**
- Heading: "Ingest Knowledge" — Cabinet Grotesk, 20px, weight-700, `--text-primary`. Letter-spacing: -0.01em.
- Subtitle: "Add content from any source." — DM Sans, 13px, weight-400, `--text-secondary`. Margin-top: 4px. Margin-bottom: 20px.

### Tab Bar

Same toggle group component used in the Home view (PRD 6).

- Container: `--bg-inset` background, `--border-subtle` border, 10px radius, 3px padding.
- 5 tabs: Quick Capture, YouTube, Meetings, Documents, History.
- Active tab: `--bg-card` white background, `--text-primary` color, subtle shadow.
- Inactive tabs: transparent background, `--text-secondary` color.
- DM Sans, 12px, weight-600.
- Margin-bottom: 24px.
- YouTube, Meetings, Documents tabs show placeholder content (styled empty states with relevant emoji, description, and placeholder "Connect" buttons). These become functional in PRD 9.

### Quick Capture Tab

**Textarea card:**
- Container: Card component — `--bg-card` background, `--border-subtle` border, 12px radius.
- Textarea: Full width within the card. No visible border on the textarea itself — it's a borderless textarea inside a bordered card. `--bg-card` background (same as card). DM Sans, 14px, weight-400, `--text-primary`. Line-height: 1.6.
- Placeholder: "Paste a URL, write a note, or drop content here..." in `--text-placeholder` (#aaaaaa).
- Padding: `20px 22px` inside the card.
- Auto-resize: textarea height grows with content. Min-height: 120px. Max-height: 400px (after which it scrolls internally).
- Focus state: card border transitions to `--border-default`. No accent ring on the card (the card itself is the visual container).

**Action bar (below textarea, inside the same card):**
- Separator: `border-top: 1px solid` `--border-subtle`. Padding-top: 12px. Margin-top: 12px.
- Layout: flex row, space-between, align-center.
- Left side: placeholder icon buttons for Attach (Lucide `Paperclip`) and URL (Lucide `Link`). Ghost button style — transparent background, `--text-secondary` icons at 16px. These are **non-functional placeholders** in this PRD — they become functional when file upload (PRD 9) and URL extraction are built.
- Right side: "Extract Knowledge" primary button — `--accent-500` background, white text, DM Sans 13px weight-600, 8px radius, `12px 24px` padding. Lucide `Sparkles` icon (14px, white) inline before text. Disabled state: 40% opacity when textarea is empty.

**This is the single primary-accent button for the Ingest view.** No other button in this view uses the accent-500 background.

### Advanced Extraction Options

A collapsible section below the textarea card.

**Toggle row:**
- Flex row. Cursor: pointer. Padding: `12px 0`.
- Left: "Advanced Extraction Options" — DM Sans, 13px, weight-600, `--text-body`.
- Right: Chevron icon (Lucide `ChevronDown`, 14px, `--text-secondary`). Rotates 180° when expanded. Transition: `transform 0.2s ease`.
- Hover: text color darkens to `--text-primary`.

**Expanded panel (animates open with `max-height` transition, 0.3s ease):**

The panel is wrapped in a Card component — `--bg-card` background, `--border-subtle` border, 12px radius, `20px 22px` padding. Margin-top: 4px.

**Extraction Mode selector:**
- Section label: "EXTRACTION MODE" — uppercase, Cabinet Grotesk, 10px, weight-700, letter-spacing 0.08em, `--text-secondary`. Margin-bottom: 8px.
- 2×2 grid. Gap: 6px. Each card: `12px 14px` padding, 8px radius.
- Selected card: entity-type color tint background (color at 6% opacity), entity-type color border (at 25% opacity), label in entity-type color.
- Unselected card: `--bg-card` background (or transparent), `--border-subtle` border, `--text-primary` label.
- Label: DM Sans, 12px, weight-600. Description below: DM Sans, 10px, weight-400, `--text-secondary`, line-height 1.4.
- Mode → Color mapping: Comprehensive → `--e-topic` (#0891b2), Strategic → `--e-goal` (#e11d48), Actionable → `--e-action` (#2563eb), Relational → `--e-insight` (#7c3aed).
- Default selection loaded from `SettingsContext.extractionSettings.default_mode`.

**Anchor Emphasis selector:**
- Section label: "ANCHOR EMPHASIS" — same section label styling. Margin-top: 16px. Margin-bottom: 8px.
- 3-option row. Gap: 6px. Each option: `flex: 1`, `10px` padding, 8px radius, text-align center.
- Selected option: `--e-anchor` (#b45309) color tint background (at 6%), `--e-anchor` border (at 25%), `--e-anchor` label color.
- Unselected: same as mode unselected.
- Label: DM Sans, 12px, weight-600.
- Default loaded from `SettingsContext.extractionSettings.default_anchor_emphasis`.

**Focus Anchors:**
- Section label: "FOCUS ANCHORS" — same styling. Margin-top: 16px. Margin-bottom: 8px.
- Renders the user's anchors as toggle chips (from `SettingsContext.anchors`). Each chip: entity-colored dot (5px) + label. Inactive chips: `--bg-inset` background, `--border-subtle` border, `--text-secondary` text. Active chips: entity color at 6% background, entity color at 16% border, entity color text. Toggle on click. DM Sans, 11px, weight-600, `4px 10px` padding, 6px radius.
- If no anchors exist: show "No anchors defined — add them in Settings" in DM Sans, 12px, `--text-secondary`. "Settings" is a ghost-style link that opens the Settings modal to the Anchors tab.

**Custom Guidance:**
- Section label: "CUSTOM GUIDANCE" — same styling. Margin-top: 16px. Margin-bottom: 8px.
- Textarea: `--bg-inset` background, `--border-subtle` border, 8px radius, DM Sans 12px, `--text-body`. Placeholder: "Focus on action items and decisions..." in `--text-placeholder`. 2 rows min, resizable vertically.

### Extraction Progress UI

Replaces the Quick Capture content area when the pipeline is running. The progress indicator is **critical for user trust** — the pipeline takes 15–30 seconds.

**Layout:** Centered within the content area. Card component with `20px 24px` padding.

**Step bar:**
- Horizontal layout with 8 steps connected by lines.
- Each step: circular icon (24px diameter) with a label below.
- **Pending step:** Circle with `--bg-inset` background, `--border-subtle` border. Icon in `--text-placeholder`. Label in `--text-secondary`, DM Sans 10px weight-500.
- **Active step:** Circle with `--accent-500` background (filled), white icon. A subtle pulse animation (CSS `@keyframes pulse` — opacity oscillates between 0.7 and 1.0, 1.5s infinite). Label in `--accent-500`, weight-600.
- **Completed step:** Circle with `--semantic-green-500` background, white checkmark icon. Label in `--text-body`, weight-500.
- **Failed step:** Circle with `--semantic-red-500` background, white × icon. Label in `--semantic-red-500`, weight-600.
- Connecting lines between steps: 2px height, `--border-subtle` for pending segments, `--semantic-green-500` for completed segments, `--accent-500` for the active-to-next segment.

**Pipeline steps (in order):**

| # | Label | Icon | Description |
|---|---|---|---|
| 1 | Saving source | Lucide `Save` | Persisting raw content to `knowledge_sources` |
| 2 | Composing prompt | Lucide `FileText` | Building the extraction system prompt |
| 3 | Extracting entities | Lucide `Sparkles` | Calling Gemini for entity/relationship extraction |
| 4 | Reviewing | Lucide `Eye` | User reviews and edits extracted entities (pauses here) |
| 5 | Saving to graph | Lucide `Database` | Persisting approved entities and relationships |
| 6 | Generating embeddings | Lucide `Cpu` | Creating vector embeddings for each entity |
| 7 | Chunking source | Lucide `Scissors` | Splitting source into ~500-token RAG passages |
| 8 | Discovering connections | Lucide `Zap` | Finding cross-connections to existing graph |

**Step 4 (Reviewing) pauses the pipeline** and shows the Entity Review UI. Steps 5–8 resume after the user clicks "Save to Graph."

**Below the step bar:** A status text line showing the current operation in DM Sans, 13px, `--text-body`. Examples: "Saving source content...", "Waiting for Gemini extraction...", "Found 12 entities and 18 relationships", "Generating embedding 4 of 12...", "Checking 8 new entities against 847 existing nodes..."

**Elapsed time:** Right-aligned below the step bar. DM Sans, 11px, `--text-secondary`. Format: "0:12" (minutes:seconds), updating every second.

### Entity Review UI (`EntityReview.tsx`)

This is the most UI-intensive component in the PRD. It appears after Gemini extraction (step 4) and is the user's opportunity to curate what enters their knowledge graph.

**Container:** Full-width within the progress card. Replaces the step detail area while review is active.

**Header row:**
- "Review Extracted Entities" — Cabinet Grotesk, 16px, weight-700, `--text-primary`.
- Right side: entity count badge. Format: "12 entities · 18 relationships" — DM Sans, 12px, `--text-secondary`.
- Margin-bottom: 16px.

**Entity list (scrollable, max-height: 400px):**

Each entity is a row in a clean list. Gap: 4px between rows.

**Entity row:**
- Container: `--bg-card` background (or transparent on `--bg-card` parent), `--border-subtle` bottom border. Padding: `10px 14px`. Border-radius: 8px on hover. Hover: `--bg-hover` background.
- Layout: flex row, gap: 12px, align-center.
- **Toggle checkbox (left):** 18×18px checkbox. Checked = entity is included, unchecked = entity is removed. When unchecked, the entire row gets `opacity: 0.4` and the label gets `text-decoration: line-through`. Checkbox uses `--accent-500` for checked state fill, `--border-default` for unchecked border.
- **Entity dot:** 8px circle, entity type color. Flex-shrink: 0.
- **Label (editable):** DM Sans, 13px, weight-600, `--text-primary`. Clicking the label switches to an inline text input (same font, `--bg-inset` background, `--border-subtle` border, 6px radius). Press Enter or blur to confirm. Esc to cancel.
- **Type selector (editable):** A small select dropdown or clickable badge that opens a dropdown with all 24 entity types. Each option shows entity dot + type name. Current type shown as a colored badge (same entity badge styling from design system). DM Sans, 11px.
- **Confidence:** DM Sans, 11px, `--text-secondary`. Format: "94%". Editable via click → small number input (min 0, max 100).
- **Description (expandable):** Hidden by default. Click a chevron or the row to expand. Shows description text in DM Sans, 12px, `--text-body`, line-height 1.4. Editable in expanded state (inline textarea, same background treatment as label editing). Tags shown below description as small pills.

**Relationship list (below entities, collapsible):**

- Section label: "RELATIONSHIPS (18)" — section label styling.
- Each relationship: `[Source label] → [relation_type] → [Target label]`. Source and target are entity-colored text. Relation type is a small relationship tag (`--bg-inset` background, `--text-secondary`, 9px, weight-600, 4px radius). DM Sans, 12px.
- Relationships are read-only in V2 — no editing. Relationships that reference a removed entity are shown with `opacity: 0.3` and strikethrough.
- Collapsible with a toggle. Default: collapsed if >10 relationships, expanded if ≤10.

**Action bar (sticky at bottom of the review area):**
- Background: `--bg-card` with top border `--border-subtle`. Padding: `12px 14px`.
- Left: "N of M entities selected" — DM Sans, 12px, `--text-secondary`.
- Right: Two buttons.
  - "Re-extract" — Tertiary style (`--bg-inset`, `--text-body`, `--border-default`). DM Sans, 12px, weight-600. Restarts the extraction at step 2 (re-composes prompt, re-calls Gemini). The user can tweak advanced options before re-extracting.
  - "Save to Graph" — Secondary style (`--text-primary` background `#1a1a1a`, white text). DM Sans, 12px, weight-600. Only enabled when ≥1 entity is selected. Triggers steps 5–8 of the pipeline.

**Why secondary and not primary for "Save to Graph"?** The primary accent button is already used on "Extract Knowledge." Having two accent buttons in the same flow would violate the one-primary-per-view rule. The dark secondary button is high-contrast enough to serve as the key action.

### Extraction Summary

Shown after the pipeline completes (all 8 steps done).

**Container:** Card component. `--bg-card` background, `--border-subtle` border, 12px radius, `20px 24px` padding. Centered.

**Content:**
- Success icon: Lucide `CheckCircle` at 32px, `--semantic-green-500`. Margin-bottom: 8px.
- Heading: "Extraction Complete" — Cabinet Grotesk, 18px, weight-700, `--text-primary`.
- Stats grid (2×2): Each stat shows the number (Cabinet Grotesk, 24px, weight-800, `--text-primary`) and a label below (DM Sans, 11px, `--text-secondary`).
  - "N Entities" | "N Relationships" | "N Cross-Connections" | "N.Ns Processing"
- Margin-top: 20px.
- Action buttons: flex row, gap: 8px.
  - "View in Browse" — Tertiary button. Navigates to `/explore` with the Browse tab active, optionally pre-filtered by the source just created.
  - "Ingest Another" — Tertiary button. Resets the ingest view to the Quick Capture initial state.
  - "Rate Extraction" — Ghost button (`--accent-500` text, underline on hover). Opens a small inline feedback form (1–5 star rating + optional text), which updates the `extraction_sessions` row.

### History Tab

**List of extraction sessions:**

Each session is a compact card row. Gap: 4px.

- **Row layout:** Flex row, `--bg-card` background (or transparent), `--border-subtle` bottom border, `12px 16px` padding. Hover: `--bg-hover`.
- Left: Source type emoji (12px) + Source name (DM Sans, 13px, weight-600, `--text-primary`) + Timestamp (DM Sans, 11px, `--text-secondary`).
- Right: Entity count (DM Sans, 11px, `--text-secondary`, "N entities") + "Re-extract" tertiary button (DM Sans, 10px, weight-600, `--bg-inset` background, `--border-subtle`, 5px radius).

**Re-extract flow:** Clicking "Re-extract" on a history item loads the original source content (fetched via the source ID linked in the extraction session) into the Quick Capture textarea, pre-fills the advanced options with the mode/emphasis/anchors from the original session, and returns to the Quick Capture state ready for a new extraction.

**Empty state:** "No extractions yet. Start by capturing some knowledge above." — DM Sans, 13px, `--text-secondary`. Centered with Lucide `Inbox` icon at 28px, `--text-placeholder`.

**Pagination:** Show up to 20 sessions. If more exist, show a "Load more" ghost button.

---

## 4. Data & Service Layer

### Prompt Composition System (`utils/promptBuilder.ts`)

The most critical non-UI piece of this PRD. Extraction quality is directly proportional to prompt quality.

#### `buildExtractionPrompt(config: ExtractionConfig): string`

Assembles the final system prompt from modular parts:

```typescript
interface ExtractionConfig {
  mode: 'comprehensive' | 'strategic' | 'actionable' | 'relational';
  anchorEmphasis: 'passive' | 'standard' | 'aggressive';
  anchors: Array<{ label: string; entity_type: string; description: string }>;
  userProfile: UserProfile | null;
  customGuidance?: string;
}
```

**Part 1 — Base Instructions (`config/baseInstructions.ts`):**

A long string constant (~2000 words) defining:

- **Entity ontology** — All 24 types with one-sentence descriptions:
  - Person: "A named individual mentioned in the content."
  - Organization: "A company, institution, or formal group."
  - Team: "A named working group within an organization."
  - Topic: "A subject area or domain of knowledge."
  - Project: "A named initiative or effort with a goal."
  - Goal: "A desired outcome or objective."
  - Action: "A specific task, step, or thing to be done."
  - Risk: "A potential negative outcome or threat."
  - Blocker: "Something preventing progress."
  - Decision: "A choice that was made or needs to be made."
  - Insight: "A non-obvious observation or realization."
  - Question: "An open question or uncertainty."
  - Idea: "A proposed approach or creative suggestion."
  - Concept: "An abstract principle or framework."
  - Takeaway: "A key point or lesson from the content."
  - Lesson: "Something learned from experience."
  - Document: "A named report, paper, or written artifact."
  - Event: "A meeting, conference, or significant occurrence."
  - Location: "A named place or geographic entity."
  - Technology: "A tool, platform, framework, or technical approach."
  - Product: "A named product or service."
  - Metric: "A quantitative measurement or KPI."
  - Hypothesis: "A testable assumption or prediction."
  - Anchor: "A user-designated high-priority entity."

- **Relationship types** — Positive (leads_to, supports, enables, created, achieved, produced), Negative (blocks, contradicts, risks, prevents, challenges, inhibits), Neutral (part_of, relates_to, mentions, connected_to, owns, associated_with).

- **Output JSON schema:**
  ```json
  {
    "entities": [
      {
        "label": "string — the entity name, concise and specific",
        "entity_type": "string — one of the 24 types above",
        "description": "string — 1-2 sentence description from the source context",
        "confidence": "number — 0.0 to 1.0, how confident you are this entity is real and meaningful",
        "tags": ["string — 2-4 topical tags for this entity"]
      }
    ],
    "relationships": [
      {
        "source": "string — exact label of the source entity",
        "target": "string — exact label of the target entity",
        "relation_type": "string — one of the relationship types above",
        "evidence": "string — brief justification from the source content"
      }
    ]
  }
  ```

- **Extraction rules:**
  - One entity per distinct concept — do not create duplicate entries for the same thing referenced differently.
  - Use the most specific entity type available. Prefer "Technology" over "Topic" for a specific tool.
  - Labels should be proper nouns or short noun phrases. Not sentences.
  - Confidence below 0.5 should be omitted. Aim for quality over quantity.
  - Relationships must reference exact entity labels from the entities array.
  - Every entity should have at least one relationship to another extracted entity.

**Part 2 — Mode Template (`config/extractionModes.ts`):**

Each mode provides a paragraph of additional instruction:

- **Comprehensive:** "Extract ALL meaningful entities from the content. Cast a wide net — include people, organizations, topics, technologies, actions, decisions, risks, and insights. Capture every relationship you can identify. Err on the side of extracting more rather than fewer. This mode is for building a thorough, detailed knowledge base."
- **Strategic:** "Focus on high-level strategic entities: decisions, goals, insights, concepts, and key people driving strategy. Skip minor actions, routine topics, and operational details. Extract the entities a C-suite executive would care about. Relationships should emphasize strategic connections (supports, enables, blocks, leads_to)."
- **Actionable:** "Focus on actionable entities: actions, goals, blockers, decisions, risks, and deadlines. Extract ownership (who is responsible for what). Skip background context and conceptual discussions unless they directly relate to an action item. This mode is for turning meetings into task lists and strategy into execution."
- **Relational:** "Focus on connections between concepts rather than exhaustive entity extraction. For each entity you extract, ensure it has multiple relationships to other entities. Prefer fewer, more connected entities over many isolated ones. This mode is for building a densely interconnected graph."

**Part 3 — Profile Context (`utils/promptBuilder.ts` inline or separate utility):**

If `userProfile` is provided:
```
## User Context
The user is a [professional_context.role] in [professional_context.industry].
Current projects: [professional_context.current_projects joined].
Areas of interest: [personal_interests.topics joined].
Learning goals: [personal_interests.learning_goals joined].
Processing preference: [processing_preferences.insight_depth], [processing_preferences.relationship_focus].

Frame your extraction through this professional lens. Entities and relationships that are relevant to the user's role and interests should receive higher confidence scores.
```

**Part 4 — Anchor Context (`utils/promptBuilder.ts` inline or separate utility):**

If anchors are provided:

- **Passive emphasis:**
  ```
  ## Areas of Interest
  The user has the following areas of ongoing interest. Note connections to these if they naturally exist, but do not force connections:
  [anchor list with labels and types]
  ```

- **Standard emphasis:**
  ```
  ## Priority Anchors
  The user has designated these as priority entities. Actively look for connections between the source content and these anchors. If a meaningful relationship exists, extract it with supporting evidence:
  [anchor list with labels, types, and descriptions]
  ```

- **Aggressive emphasis:**
  ```
  ## High-Priority Anchors — Active Connection Required
  The user considers these entities critically important. For EACH anchor below, determine whether the source content has ANY connection — direct or indirect. Extract entities that serve as bridges between the content and these anchors, even if the connection requires inference:
  [anchor list with labels, types, and descriptions]
  ```

**Part 5 — Custom Guidance:**

If `customGuidance` is truthy:
```
## Additional Guidance from the User
[customGuidance text verbatim]
```

The five parts are joined with `\n\n` and returned as a single string.

### Gemini Service (`services/gemini.ts`)

#### `extractEntities(content: string, systemPrompt: string): Promise<ExtractionResult>`

```typescript
interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  rawResponse: string;  // For debugging
}

interface ExtractedEntity {
  label: string;
  entity_type: string;
  description: string;
  confidence: number;
  tags: string[];
}

interface ExtractedRelationship {
  source: string;       // References entity label
  target: string;       // References entity label
  relation_type: string;
  evidence: string;
}
```

**Implementation:**
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function extractEntities(
  content: string,
  systemPrompt: string
): Promise<ExtractionResult> {
  const response = await fetchWithRetry(
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

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new ExtractionError('No content in Gemini response', data);
  }

  const rawText = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(rawText);

  // Validate structure
  if (!Array.isArray(parsed.entities)) {
    throw new ExtractionError('Response missing entities array', parsed);
  }

  return {
    entities: parsed.entities.map(validateEntity).filter(Boolean),
    relationships: (parsed.relationships || []).map(validateRelationship).filter(Boolean),
    rawResponse: rawText,
  };
}
```

**Validation helpers:** `validateEntity` checks that label, entity_type, and confidence exist. `validateRelationship` checks that source, target, and relation_type exist. Invalid entries are silently dropped (warn in console).

**Retry logic (`fetchWithRetry`):**
- Max 3 attempts.
- Exponential backoff: 1s, 2s, 4s.
- Retry on HTTP 429 (rate limit), 500, 503.
- Do not retry on 400 (bad request) or 401 (auth failure).

#### `generateEmbedding(text: string): Promise<number[]>`

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetchWithRetry(
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
  return data.embedding.values; // 768-dimensional float array
}
```

**Text for entity embeddings:** `"${entity.label}: ${entity.description}"` — combining label and description gives the embedding richer semantic signal than label alone.

#### `generateEmbeddings(texts: string[]): Promise<number[][]>`

Batch embedding generation. The Gemini embedding API processes one text at a time, so this is a controlled-concurrency parallel call:

```typescript
async function generateEmbeddings(
  texts: string[],
  concurrency: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<number[][]> {
  const results: number[][] = new Array(texts.length);
  let completed = 0;

  // Process in batches of `concurrency`
  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    batchResults.forEach((emb, j) => {
      results[i + j] = emb;
    });
    completed += batch.length;
    onProgress?.(completed, texts.length);
  }

  return results;
}
```

Concurrency of 5 balances speed against rate limits. Adjust if Gemini returns 429s.

### Source Chunking (`utils/chunking.ts`)

#### `chunkSourceContent(content: string, targetTokens?: number): string[]`

Splits source text into ~500-token passages for RAG retrieval. Uses a sentence-boundary-aware approach.

```typescript
function chunkSourceContent(
  content: string,
  targetTokens: number = 500
): string[] {
  // Rough approximation: 1 token ≈ 4 characters for English text
  const targetChars = targetTokens * 4;
  const overlapChars = 100; // ~25 token overlap for context continuity

  // Split into sentences
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > targetChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap from the end of the previous chunk
      const overlapStart = Math.max(0, currentChunk.length - overlapChars);
      currentChunk = currentChunk.substring(overlapStart) + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
```

**Important:** Chunks smaller than 100 characters are merged with the previous chunk. Chunks are never empty.

### Cross-Connection Discovery (`services/crossConnections.ts`)

The highest-value output of the extraction pipeline. This is what makes Synapse compound — each new source creates connections to all previous sources.

#### `discoverCrossConnections(newNodeIds: string[], userId: string): Promise<DiscoveredEdge[]>`

```typescript
interface DiscoveredEdge {
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  evidence: string;
  weight: number;
}
```

**Step 1 — Fetch new nodes with embeddings:**
```typescript
const { data: newNodes } = await supabase
  .from('knowledge_nodes')
  .select('id, label, entity_type, description, embedding')
  .in('id', newNodeIds);
```

**Step 2 — For each new node, find semantically similar existing nodes:**

Use Supabase RPC for vector similarity search. If an RPC function `match_knowledge_nodes` exists:
```typescript
const { data: similarNodes } = await supabase.rpc('match_knowledge_nodes', {
  query_embedding: newNode.embedding,
  match_threshold: 0.7,
  match_count: 20,
  exclude_ids: newNodeIds, // Don't match against other new nodes
});
```

If no RPC exists, fall back to fetching the top N existing nodes by embedding similarity client-side (less efficient but functional). Limit to top 50–100 candidates per new node.

**Step 3 — Send candidates to Gemini for relationship inference:**

Batch the candidates into groups of ~20 pairs. For each batch, construct a prompt:

```
Given these pairs of entities from different sources, identify which pairs have meaningful relationships. Only return relationships where a genuine connection exists — do not force connections.

New entities (from the just-ingested source):
[list of new entity labels + descriptions]

Existing entities (from the user's knowledge graph):
[list of candidate labels + descriptions]

Return JSON:
{
  "connections": [
    {
      "new_entity": "exact label",
      "existing_entity": "exact label",
      "relation_type": "one of: leads_to, supports, enables, blocks, contradicts, part_of, relates_to, etc.",
      "evidence": "brief justification"
    }
  ]
}
```

Use the same Gemini call pattern as extraction (temperature 0.1, JSON response mime type).

**Step 4 — Map labels back to node IDs and return edges.**

Match returned labels (case-insensitive) to the node objects from steps 1 and 2. Drop any connections where the label lookup fails. Assign `weight: 0.8` to all cross-connections (slightly lower than intra-source relationships, which default to 1.0).

**Performance guard:** If `newNodeIds.length * 20 > 200` candidate pairs, batch the Gemini calls. Cap at 3 Gemini calls for cross-connection discovery per extraction to avoid excessive API usage.

### Extraction Persistence (`services/extractionPersistence.ts`)

#### `saveSource(userId, content, metadata): Promise<string>`

```typescript
async function saveSource(
  userId: string,
  content: string,
  metadata: {
    title?: string;
    sourceType: string;
    sourceUrl?: string;
    summary?: string;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      user_id: userId,
      title: metadata.title || deriveTitle(content),
      content,
      source_type: metadata.sourceType,
      source_url: metadata.sourceUrl || null,
      metadata: {
        summary: metadata.summary || null,
        ingested_via: 'quick_capture',
      },
    })
    .select('id')
    .single();

  if (error) throw new PersistenceError('Failed to save source', error);
  return data.id;
}
```

**`deriveTitle(content)`:** Extracts a title from the content — first line if it's short (<100 chars), otherwise first 60 characters + "...". If content starts with "http", extract domain name as title.

#### `saveNodes(userId, entities, sourceId, sourceMetadata): Promise<SavedNode[]>`

```typescript
interface SavedNode {
  id: string;
  label: string;
  entity_type: string;
  embedding?: number[];
}

async function saveNodes(
  userId: string,
  entities: ReviewEntity[],  // Only entities where removed === false
  sourceId: string,
  sourceMetadata: { sourceName: string; sourceType: string; sourceUrl?: string }
): Promise<SavedNode[]> {
  // Filter to only included entities
  const included = entities.filter(e => !e.removed);

  // Check for duplicates against existing graph
  const existingLabels = await checkDuplicateNodes(
    included.map(e => e.label),
    userId
  );

  const toInsert = included
    .filter(e => !existingLabels.has(e.label.toLowerCase()))
    .map(e => ({
      user_id: userId,
      label: e.label,
      entity_type: e.entity_type,
      description: e.description || null,
      confidence: e.confidence,
      source: sourceMetadata.sourceName,
      source_type: sourceMetadata.sourceType,
      source_url: sourceMetadata.sourceUrl || null,
      source_id: sourceId,
      tags: e.tags?.length ? e.tags : null,
      // Do NOT include embedding here — it's added in a separate step
    }));

  if (!toInsert.length) return [];

  const { data, error } = await supabase
    .from('knowledge_nodes')
    .insert(toInsert)
    .select('id, label, entity_type');

  if (error) throw new PersistenceError('Failed to save nodes', error);
  return data;
}
```

**Defensive INSERT note:** Omit `tags` field entirely when the array is empty or null (empty arrays in UUID[] columns can cause issues per CLAUDE.md). Omit `embedding` — it's updated separately after generation.

**Duplicate handling:** `checkDuplicateNodes` fetches existing node labels (case-insensitive) and returns a Set. Entities whose label matches an existing node are skipped. A future enhancement could merge rather than skip.

#### `saveEdges(userId, relationships, savedNodes): Promise<string[]>`

```typescript
async function saveEdges(
  userId: string,
  relationships: ExtractedRelationship[],
  savedNodes: SavedNode[],
  removedLabels: Set<string>
): Promise<string[]> {
  const labelToId = new Map(savedNodes.map(n => [n.label.toLowerCase(), n.id]));

  const toInsert = relationships
    .filter(r => {
      // Both source and target must exist as saved nodes
      const sourceId = labelToId.get(r.source.toLowerCase());
      const targetId = labelToId.get(r.target.toLowerCase());
      // Neither entity was removed
      return sourceId && targetId && !removedLabels.has(r.source.toLowerCase()) && !removedLabels.has(r.target.toLowerCase());
    })
    .map(r => ({
      user_id: userId,
      source_node_id: labelToId.get(r.source.toLowerCase())!,
      target_node_id: labelToId.get(r.target.toLowerCase())!,
      relation_type: r.relation_type,
      evidence: r.evidence || null,
      weight: 1.0,
    }));

  if (!toInsert.length) return [];

  const { data, error } = await supabase
    .from('knowledge_edges')
    .insert(toInsert)
    .select('id');

  if (error) throw new PersistenceError('Failed to save edges', error);
  return data.map(d => d.id);
}
```

#### `updateNodeEmbeddings(nodeIds, embeddings): Promise<void>`

After embedding generation, batch-update nodes with their vectors:

```typescript
async function updateNodeEmbeddings(
  nodes: Array<{ id: string; embedding: number[] }>
): Promise<void> {
  // Supabase doesn't support batch updates in a single call.
  // Use parallel individual updates with controlled concurrency.
  const batchSize = 10;
  for (let i = 0; i < nodes.length; i += batchSize) {
    await Promise.all(
      nodes.slice(i, i + batchSize).map(n =>
        supabase
          .from('knowledge_nodes')
          .update({ embedding: n.embedding })
          .eq('id', n.id)
      )
    );
  }
}
```

#### `saveChunks(userId, sourceId, chunks, embeddings): Promise<void>`

```typescript
async function saveChunks(
  userId: string,
  sourceId: string,
  chunks: string[],
  embeddings: number[][]
): Promise<void> {
  const toInsert = chunks.map((content, i) => ({
    user_id: userId,
    source_id: sourceId,
    chunk_index: i,
    content,
    embedding: embeddings[i] || null,
  }));

  const { error } = await supabase
    .from('source_chunks')
    .insert(toInsert);

  if (error) throw new PersistenceError('Failed to save chunks', error);
}
```

#### `saveExtractionSession(userId, sessionData): Promise<string>`

Records the extraction for the History tab and analytics:

```typescript
async function saveExtractionSession(
  userId: string,
  data: {
    sourceName: string;
    sourceType: string;
    contentPreview: string;
    extractionMode: string;
    anchorEmphasis: string;
    userGuidance?: string;
    selectedAnchorIds?: string[];
    extractedNodeIds: string[];
    extractedEdgeIds: string[];
    entityCount: number;
    relationshipCount: number;
    durationMs: number;
  }
): Promise<string> {
  const { data: session, error } = await supabase
    .from('extraction_sessions')
    .insert({
      user_id: userId,
      source_name: data.sourceName,
      source_type: data.sourceType,
      source_content_preview: data.contentPreview.substring(0, 500),
      extraction_mode: data.extractionMode,
      anchor_emphasis: data.anchorEmphasis,
      user_guidance: data.userGuidance || null,
      selected_anchor_ids: data.selectedAnchorIds?.length ? data.selectedAnchorIds : null,
      extracted_node_ids: data.extractedNodeIds.length ? data.extractedNodeIds : null,
      extracted_edge_ids: data.extractedEdgeIds.length ? data.extractedEdgeIds : null,
      entity_count: data.entityCount,
      relationship_count: data.relationshipCount,
      extraction_duration_ms: data.durationMs,
    })
    .select('id')
    .single();

  if (error) throw new PersistenceError('Failed to save extraction session', error);
  return session.id;
}
```

---

## 5. The Extraction Pipeline (`hooks/useExtraction.ts`)

This hook orchestrates the entire flow and is designed for reuse by PRD 11 (YouTube pipeline).

```typescript
type ExtractionStep =
  | 'idle'
  | 'saving_source'
  | 'composing_prompt'
  | 'extracting'
  | 'reviewing'        // Pauses here for user interaction
  | 'saving_nodes'
  | 'generating_embeddings'
  | 'chunking_source'
  | 'discovering_connections'
  | 'complete'
  | 'error';

interface PipelineState {
  step: ExtractionStep;
  entities: ReviewEntity[] | null;
  relationships: ExtractedRelationship[] | null;
  sourceId: string | null;
  savedNodes: SavedNode[] | null;
  savedEdgeIds: string[] | null;
  crossConnectionCount: number;
  error: Error | null;
  elapsedMs: number;
  embeddingProgress: { completed: number; total: number } | null;
}

interface UseExtractionReturn {
  state: PipelineState;
  start: (content: string, config: ExtractionConfig, metadata: SourceMetadata) => Promise<void>;
  approveAndSave: (reviewedEntities: ReviewEntity[]) => Promise<void>;
  reExtract: () => Promise<void>;
  reset: () => void;
}
```

**Pipeline flow:**

```
start() called:
  1. step → 'saving_source'
     → saveSource() to knowledge_sources
     → set sourceId

  2. step → 'composing_prompt'
     → buildExtractionPrompt(config)
     → (near-instant, but shown as a step for transparency)

  3. step → 'extracting'
     → extractEntities(content, systemPrompt)
     → set entities and relationships
     → validate and prepare ReviewEntity[] (each entity gets `removed: false`, `edited: false`)

  4. step → 'reviewing'
     → PAUSE — pipeline waits for user to call approveAndSave()

approveAndSave(reviewedEntities) called:
  5. step → 'saving_nodes'
     → saveNodes() with only non-removed entities
     → saveEdges() with matching relationships
     → set savedNodes, savedEdgeIds

  6. step → 'generating_embeddings'
     → generateEmbeddings() for all saved nodes
     → updateNodeEmbeddings()
     → set embeddingProgress during generation

  7. step → 'chunking_source'
     → chunkSourceContent() on the original source content
     → generateEmbeddings() for all chunks
     → saveChunks()

  8. step → 'discovering_connections'
     → discoverCrossConnections(newNodeIds)
     → save discovered edges
     → set crossConnectionCount

  9. step → 'complete'
     → saveExtractionSession() with all metrics
     → pipeline done

At any step, if an error occurs:
  → step → 'error'
  → set error
  → pipeline stops
  → user can call reset() or reExtract()
```

**Elapsed time tracking:** Start a timer on `start()`. Update `elapsedMs` every second via `setInterval`. Stop on 'complete' or 'error'.

**Re-extract:** `reExtract()` returns to step 2 (composing prompt), re-calls Gemini, and re-enters the review state. The source is not re-saved (sourceId is reused).

---

## 6. Interaction & State

### State Management

| State | Location | Persistence |
|---|---|---|
| `activeTab` (quick/youtube/meetings/docs/history) | Local to IngestView | Resets to 'quick' on mount |
| `textareaContent` | Local to QuickCaptureTab | Cleared after extraction starts |
| `advancedOptionsOpen` | Local to QuickCaptureTab | Resets to `false` on mount |
| `extractionMode` | Local to AdvancedOptions | Initialized from SettingsContext |
| `anchorEmphasis` | Local to AdvancedOptions | Initialized from SettingsContext |
| `selectedAnchorIds` | Local to AdvancedOptions | Initially empty (not pre-selected) |
| `customGuidance` | Local to AdvancedOptions | Empty string |
| Pipeline state | `useExtraction` hook | Resets on `reset()` or navigation |
| Reviewed entities | `useExtraction` hook (within PipelineState) | Only during pipeline run |

### Interaction Flows

**Happy path — full extraction:**
1. User pastes text into the textarea.
2. (Optional) User expands Advanced Options, selects a mode, emphasis, anchors, and guidance.
3. User clicks "Extract Knowledge."
4. The Quick Capture area transitions to the Extraction Progress UI.
5. Steps 1–3 run automatically. User sees progress. ~5–10 seconds.
6. Entity Review UI appears (step 4). User reviews, edits labels, removes entities, and examines relationships.
7. User clicks "Save to Graph."
8. Steps 5–8 run automatically. ~10–20 seconds. User sees embedding progress and cross-connection discovery.
9. Extraction Summary appears with stats.
10. User clicks "Ingest Another" to return to the Quick Capture initial state, or "View in Browse" to navigate to Explore.

**Re-extract flow:**
1. During entity review (step 4), user clicks "Re-extract."
2. The QuickCaptureTab's advanced options become accessible again (overlaid or in a panel).
3. User can adjust mode, emphasis, or guidance.
4. Pipeline restarts from step 2 (composing prompt). Source is not re-saved.
5. New Gemini response replaces the previous entities.

**History re-extract:**
1. User clicks "Re-extract" on a history row.
2. The original source content is fetched from `knowledge_sources`.
3. The textarea is populated, advanced options are set to the original session's mode/emphasis.
4. User is back in the Quick Capture state, ready to click "Extract Knowledge" again.

---

## 7. Forward-Compatible Decisions

| Decision | Rationale | Future PRD |
|---|---|---|
| `useExtraction` hook is content-agnostic — accepts content string and config | YouTube pipeline (PRD 11) will call the same hook with transcript content. Meeting paste (PRD 9) will call it with transcript text. Document upload (PRD 9) will call it with extracted file text. The hook doesn't know or care about the source. | PRD 9, PRD 11 |
| `EntityReview.tsx` is a standalone shared component | Used in Quick Capture (this PRD), re-extraction from History (this PRD), and potentially in YouTube batch review (PRD 9) and re-extraction from the Home feed (PRD 6 re-extract button). | PRD 6, PRD 9 |
| `promptBuilder.ts` composes from modular parts | Each part can evolve independently. The base instructions can be tuned without touching profile context. New modes can be added. The builder accepts a config object and returns a string — no side effects, fully testable. | All future extraction use cases |
| `chunkSourceContent()` is a standalone utility | Used here for Quick Capture source, in PRD 9 for documents, in PRD 11 for YouTube transcripts. Same chunking logic everywhere. | PRD 9, PRD 11 |
| `discoverCrossConnections()` is a standalone service | Called after every extraction regardless of source type. Also callable on-demand for re-analysis. The Orientation Engine (PRD 13) may use it to refresh cross-connections. | PRD 11, PRD 13 |
| YouTube/Meetings/Documents tabs exist as styled placeholders | Users can see the full ingest surface from day one. The tabs show what's coming without being broken. PRD 9 fills them in. | PRD 9 |
| `ExtractionConfig` type is exported and reused | YouTube channels store per-channel extraction config (mode, emphasis, anchors) that maps directly to `ExtractionConfig`. The serverless pipeline (PRD 11) constructs this config from the channel settings. | PRD 11 |
| `saveExtractionSession()` tracks all parameters | The History tab can replay any extraction. Feedback ratings enable future prompt quality analysis. Duration tracking enables performance benchmarking. | Analytics, prompt tuning |

---

## 8. Edge Cases & Error Handling

### Empty Textarea

- "Extract Knowledge" button is disabled (40% opacity, cursor: not-allowed) when textarea is empty or whitespace-only.
- No validation toast needed — the disabled state is sufficient.

### Very Short Content (<50 characters)

- Allow extraction to proceed, but Gemini may return 0–2 entities. This is fine — the review UI handles small sets gracefully.
- Consider showing a subtle warning below the textarea: "Short content may produce fewer entities." DM Sans, 11px, `--text-secondary`. Appears when content is <100 characters but >0.

### Very Long Content (>50,000 characters)

- Gemini has a context window limit. Content beyond ~100,000 characters may be truncated by the API.
- Before sending to Gemini, if `content.length > 100000`, truncate to 100,000 characters and append: "\n\n[Content truncated at 100,000 characters. The above is a partial text.]"
- Show a warning in the progress UI: "Content was truncated for extraction. The full text is saved and will be chunked for RAG retrieval."

### Gemini API Failure

- After 3 retries, the pipeline enters the 'error' state.
- The progress UI shows step 3 (Extracting entities) in the failed state (red circle with ×).
- An error message appears below: "Extraction failed: [error message]" — DM Sans, 13px, `--semantic-red-500`.
- Two recovery buttons: "Retry" (restarts from step 3) and "Cancel" (returns to Quick Capture).
- If the error is a rate limit (429): show "Gemini API rate limit reached. Please wait a moment and retry."

### Gemini Returns Invalid JSON

- The response parser catches `JSON.parse` failures.
- Enters error state with message: "Gemini returned an invalid response. This is usually temporary — try re-extracting."
- Log the raw response to console for debugging.

### Gemini Returns 0 Entities

- Not an error — show the review UI with an empty entity list.
- A helpful message: "No entities were extracted from this content. Try a different extraction mode or add custom guidance."
- "Re-extract" button is prominently available.

### Entity Review — All Entities Removed

- If the user unchecks every entity, "Save to Graph" becomes disabled.
- A message appears: "Select at least one entity to save to your graph."

### Embedding Generation Failure

- If embedding generation fails for a specific entity, skip that embedding (the node is saved without an embedding — it won't appear in semantic search but will appear in keyword search and graph traversal).
- Log a warning. Do not halt the pipeline.
- The progress text shows: "Warning: Embedding failed for [entity label], skipping."

### Cross-Connection Discovery Failure

- If the Gemini call for cross-connections fails, the pipeline still completes.
- `crossConnectionCount` is set to 0.
- The summary shows "0 Cross-Connections" — this is acceptable. Cross-connections can be discovered later via re-analysis.

### Duplicate Entity Labels

- During `saveNodes`, the `checkDuplicateNodes` function identifies existing nodes with the same label (case-insensitive).
- Duplicate entities are silently skipped — they are not inserted, and their relationships are remapped to the existing node ID.
- The extraction summary shows the actual number saved (which may be fewer than reviewed).
- A note in the summary if duplicates were found: "N entities matched existing graph nodes and were merged."

### Network Failure Mid-Pipeline

- The pipeline step that was running when the network dropped enters the error state.
- Steps that completed before the failure are persisted (e.g., if source was saved but extraction failed, the source exists in the database).
- "Retry" resumes from the failed step, not from the beginning.
- If the source was saved but extraction never completed, the source shows in the Home feed without entities. This is a valid state (the user can re-extract from History).

### Extraction Session Table Issues

- If `extraction_sessions` table doesn't exist or has schema mismatches, `saveExtractionSession` fails silently — a warning is logged, but the pipeline is marked as complete. The extraction is successful even if the audit trail fails.

### Browser Tab Closed During Pipeline

- The pipeline runs in the React component lifecycle. If the user closes the tab or navigates away, the pipeline is interrupted.
- Source and any already-saved nodes persist in the database.
- Embeddings or cross-connections that weren't generated are simply missing — not corrupt.
- When the user returns to the Ingest view, the pipeline state has reset to 'idle'. They can re-extract from History if needed.

### Concurrent Extractions

- Only one extraction can run at a time. The "Extract Knowledge" button is replaced by the progress UI during extraction.
- There is no queue system in the frontend. If the user wants to extract multiple sources, they do them sequentially.
- The YouTube serverless pipeline (PRD 11) handles concurrency via the database queue, not the frontend.

---

## 9. Acceptance Criteria

After this PRD is complete, the following must be true:

- [ ] **Quick Capture textarea works.** User can paste or type content. The textarea auto-resizes. Placeholder text is visible when empty. "Extract Knowledge" button is disabled when empty, enabled when content exists.
- [ ] **Advanced options expand and collapse.** Clicking "Advanced Extraction Options" reveals the mode selector, emphasis selector, anchor chips, and guidance textarea with a smooth height transition. Chevron rotates. All selectors are functional. Defaults load from SettingsContext.
- [ ] **Extraction pipeline runs end-to-end.** Clicking "Extract Knowledge" triggers the full pipeline: source is saved, prompt is composed, Gemini extracts entities, entity review appears, user approves, nodes are saved with embeddings, source is chunked, cross-connections are discovered.
- [ ] **Progress UI shows current step.** The 8-step progress bar updates in real time. Active steps have accent color with pulse animation. Completed steps show green checkmarks. The status text updates with descriptive messages. Elapsed time counts up.
- [ ] **Entity Review is polished and functional.** Users can toggle entities on/off (removed entities get strikethrough and faded). Users can edit entity labels inline. Users can change entity types via dropdown. Relationships are visible and those referencing removed entities are faded. "Save to Graph" and "Re-extract" buttons work.
- [ ] **Entities appear in the Browse tab after saving.** Navigating to Explore → Browse after extraction shows the newly created entities with correct labels, types, sources, tags, and confidence scores.
- [ ] **Entities appear in the Home feed.** The activity feed on Home shows the new source with entity badges and cross-connections.
- [ ] **Embeddings are generated.** Each saved entity has a 768-dimensional embedding vector. Verified by checking the `embedding` column is non-null for new nodes.
- [ ] **Source is chunked for RAG.** The `source_chunks` table contains ~500-token passages from the source content, each with an embedding. Chunk count is proportional to source length.
- [ ] **Cross-connections are discovered.** If the user has existing graph data, the pipeline finds connections between new entities and existing ones. Cross-connection edges appear in `knowledge_edges` with `weight: 0.8`. The summary shows the count.
- [ ] **Extraction session is recorded.** The `extraction_sessions` table contains a row for the extraction with the correct mode, emphasis, entity count, relationship count, duration, and linked node/edge IDs.
- [ ] **History tab shows past extractions.** Extraction sessions appear in reverse chronological order with source name, type, timestamp, and entity count. "Re-extract" loads the original content and settings.
- [ ] **Re-extract works.** Clicking "Re-extract" during review restarts the Gemini call with the same (or modified) settings. The new response replaces the old entities.
- [ ] **Error handling is graceful.** Gemini failures show a clear error message with retry option. Rate limit errors suggest waiting. Network failures don't corrupt data. Embedding failures are skipped without halting the pipeline.
- [ ] **Design system compliance.** All typography, colors, spacing, and component styling match the design system. The progress UI feels polished and trustworthy. The entity review feels like a curated experience, not a debug panel.
- [ ] **One primary button per view.** "Extract Knowledge" is the only `--accent-500` button. "Save to Graph" uses the secondary (dark) style.
