```markdown
## Feature Name: Settings — Profile, Anchors, Extraction

### Overview
Complete the Settings modal with all five functional tabs. Profile reads/writes user identity to Supabase. Anchors lets users manage their high-priority focal nodes. Extraction configures default extraction behavior. Digests shows existing digest profiles read-only. Integrations shows connection status for external services. This PRD also creates the reusable AnchorPicker component and key Supabase service functions used by many future PRDs.

### Prerequisites
- PRD 2 complete: App shell deployed with three-pane layout, nav rail, routing, Settings modal skeleton (5 tabs visible, Profile shows placeholder form), SettingsProvider loading profile/settings/anchors, GraphProvider managing right panel state.

### User Value
- **Who benefits**: The user configuring how Synapse processes their knowledge.
- **Problem solved**: Without profile context, extraction is generic. Without anchor management, users can't focus the AI. Without extraction defaults, every ingestion requires manual configuration.
- **Expected outcome**: User can save their professional identity, promote/demote anchors, and set extraction defaults that persist across sessions and feed into the extraction pipeline (PRD 7).

---

### Context for AI Coding Agent

**Read these documents before starting:**
- `docs/DESIGN-SYSTEM.md` — all visual decisions (colors, typography, spacing, component specs)
- `docs/DATA-MODEL.md` — schemas for `user_profiles`, `extraction_settings`, `knowledge_nodes` (anchor queries), `knowledge_edges` (connection counts)
- `docs/LEGACY-PATTERNS.md` — Section 1 (Prompt Composition System) for how profile and extraction settings feed into prompts
- `docs/BUILD-PLAN.md` — PRD 3 section for forward-compatible decisions
- `docs/synapse-v2-mockup.html` — Settings modal, lines 631–686 for exact layout of all 5 tabs

**Existing Codebase (from PRD 2):**
- `src/components/modals/SettingsModal.tsx` — existing skeleton with 5 tab navigation, only Profile showing placeholder form. **Modify this file.**
- `src/app/providers/SettingsProvider.tsx` — loads profile, extraction settings, and anchors. **Modify to add mutation functions.**
- `src/hooks/useSettings.ts` — hook to consume SettingsContext. Already exists.
- `src/services/supabase.ts` — Supabase client singleton. **Add new service functions here.**
- `src/components/ui/Dot.tsx` — entity type color dot. Already exists.
- `src/components/ui/SectionLabel.tsx` — uppercase section header. Already exists.
- `src/config/entityTypes.ts` — entity type color map. Already exists.
- `src/config/extractionModes.ts` — mode definitions. Already exists (or create if PRD 1 didn't).

---

### Files to Create/Modify

```
src/
├── components/
│   ├── modals/
│   │   └── SettingsModal.tsx                  — MODIFY: replace placeholder tabs with real content
│   └── shared/
│       └── AnchorPicker.tsx                   — CREATE: reusable node search + anchor selection
├── services/
│   └── supabase.ts                            — MODIFY: add profile, anchor, and settings functions
├── app/
│   └── providers/
│       └── SettingsProvider.tsx                — MODIFY: add mutation functions to context
├── config/
│   └── extractionModes.ts                     — CREATE if not exists: mode and emphasis definitions
└── hooks/
    └── useSettings.ts                         — MODIFY: ensure it exposes all new context values
```

---

### Configuration Data

**`src/config/extractionModes.ts`** (create if not already present):
```typescript
export const EXTRACTION_MODES = [
  {
    id: 'comprehensive' as const,
    label: 'Comprehensive',
    description: 'Maximum entity capture, all relationships',
    color: 'var(--e-topic)',     // #0891b2
    colorHex: '#0891b2',
  },
  {
    id: 'strategic' as const,
    label: 'Strategic',
    description: 'High-level concepts, decisions',
    color: 'var(--e-goal)',      // #e11d48
    colorHex: '#e11d48',
  },
  {
    id: 'actionable' as const,
    label: 'Actionable',
    description: 'Actions, goals, blockers, deadlines',
    color: 'var(--e-action)',    // #2563eb
    colorHex: '#2563eb',
  },
  {
    id: 'relational' as const,
    label: 'Relational',
    description: 'Emphasis on connections',
    color: 'var(--e-insight)',   // #7c3aed
    colorHex: '#7c3aed',
  },
] as const;

export type ExtractionMode = typeof EXTRACTION_MODES[number]['id'];

export const ANCHOR_EMPHASIS_LEVELS = [
  {
    id: 'passive' as const,
    label: 'Passive',
    description: 'Minimal anchor bias',
  },
  {
    id: 'standard' as const,
    label: 'Standard',
    description: 'Balanced (recommended)',
  },
  {
    id: 'aggressive' as const,
    label: 'Aggressive',
    description: 'Strong anchor focus',
  },
] as const;

export type AnchorEmphasis = typeof ANCHOR_EMPHASIS_LEVELS[number]['id'];
```

---

### Implementation Guide — Step by Step

#### Step 1: Add Supabase Service Functions

Add these to `src/services/supabase.ts`. These functions are used by Settings now and by Browse (PRD 4), Graph (PRD 5), Ingest (PRD 7), and the right panel Node Detail across the app.

**Profile functions:**
```typescript
// Fetch or create user profile (upsert pattern)
export async function fetchOrCreateProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (data) return data;

  // Profile doesn't exist — create it
  if (error?.code === 'PGRST116' || !data) {
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        professional_context: {},
        personal_interests: {},
        processing_preferences: {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create user profile:', insertError);
      return null;
    }
    return newProfile;
  }

  return null;
}

// Update user profile (partial update)
export async function updateProfile(
  updates: Partial<{
    professional_context: Record<string, string>;
    personal_interests: Record<string, string>;
    processing_preferences: Record<string, string>;
  }>
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return { error: error ? new Error(error.message) : null };
}
```

**Anchor functions:**
```typescript
// Get connection count for a node (edges where node is source or target)
export async function getNodeConnectionCount(nodeId: string): Promise<number> {
  const { count, error } = await supabase
    .from('knowledge_edges')
    .select('*', { count: 'exact', head: true })
    .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

  if (error) return 0;
  return count ?? 0;
}

// Promote a node to anchor
export async function promoteToAnchor(nodeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('knowledge_nodes')
    .update({ is_anchor: true })
    .eq('id', nodeId);

  return { error: error ? new Error(error.message) : null };
}

// Demote an anchor back to regular node
export async function demoteAnchor(nodeId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('knowledge_nodes')
    .update({ is_anchor: false })
    .eq('id', nodeId);

  return { error: error ? new Error(error.message) : null };
}

// Search nodes by label (for anchor picker)
export async function searchNodes(
  query: string,
  limit: number = 20
): Promise<KnowledgeNode[]> {
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('id, label, entity_type, description, is_anchor, created_at')
    .ilike('label', `%${query}%`)
    .order('label')
    .limit(limit);

  if (error) {
    console.error('Node search failed:', error);
    return [];
  }
  return data ?? [];
}
```

**Extraction settings functions:**
```typescript
// Fetch or create extraction settings
export async function fetchOrCreateExtractionSettings(): Promise<ExtractionSettings | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('extraction_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (data) return data;

  // Create default settings
  const { data: newSettings, error } = await supabase
    .from('extraction_settings')
    .insert({
      user_id: user.id,
      default_mode: 'comprehensive',
      default_anchor_emphasis: 'standard',
      settings: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create extraction settings:', error);
    return null;
  }
  return newSettings;
}

// Update extraction settings
export async function updateExtractionSettings(
  updates: Partial<{ default_mode: string; default_anchor_emphasis: string }>
): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('extraction_settings')
    .update(updates)
    .eq('user_id', user.id);

  return { error: error ? new Error(error.message) : null };
}
```

#### Step 2: Update SettingsProvider

Modify `src/app/providers/SettingsProvider.tsx` to expose mutation functions through context so components can update settings and see immediate changes:

```typescript
interface SettingsContextValue {
  // Read
  profile: UserProfile | null;
  extractionSettings: ExtractionSettings | null;
  anchors: KnowledgeNode[];
  loading: boolean;
  
  // Write
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  updateExtractionSettings: (updates: Partial<ExtractionSettings>) => Promise<{ error: Error | null }>;
  promoteToAnchor: (nodeId: string) => Promise<{ error: Error | null }>;
  demoteAnchor: (nodeId: string) => Promise<{ error: Error | null }>;
  
  // Refresh
  refreshAnchors: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshExtractionSettings: () => Promise<void>;
}
```

Each mutation function should:
1. Call the corresponding Supabase service function
2. On success, update the local state optimistically (or refetch)
3. Return the error status so the UI can show feedback

#### Step 3: AnchorPicker Component

**`src/components/shared/AnchorPicker.tsx`**

A modal dialog for searching existing nodes and promoting them to anchors. This is also used by the Ingest view (PRD 7) for selecting focus anchors.

**Props:**
```typescript
interface AnchorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (node: KnowledgeNode) => void;
  excludeIds?: string[];       // IDs to hide (already anchors)
  mode?: 'promote' | 'select'; // 'promote' shows "Make Anchor", 'select' shows "Select"
}
```

**Layout:**
- Modal overlay (same pattern as command palette): fixed position, backdrop blur, centered
- 480px width, `--bg-card` background, `--border-strong` border, 16px radius
- Search input at top: magnifying glass icon + input + ESC badge (same as command palette input styling)
- Results list below: max-height 360px, scrollable
- Each result row:
  - Entity dot (7px, entity type color)
  - Label: DM Sans 13px weight-500
  - Type: DM Sans 10px `--text-secondary`, right-aligned
  - Entity type shown in the entity's color
  - Hover: `--bg-hover` background
  - Click calls `onSelect(node)` and closes
- Empty state when query returns no results: "No matching entities found" in `--text-secondary`
- Minimum 2 characters before searching (show hint: "Type to search entities..." in `--text-placeholder`)

**Search behavior:**
- Debounced input (300ms delay)
- Calls `searchNodes(query)` from `services/supabase.ts`
- Filters out any IDs in `excludeIds` from results
- Shows loading spinner while fetching

**Auto-focus** the search input when modal opens. **Esc** closes the modal.

#### Step 4: Settings Modal — Profile Tab

Replace the placeholder Profile tab in `SettingsModal.tsx` with a real form that reads/writes to Supabase.

**Form structure (matches mockup exactly):**

The v1 codebase has the profile structured as nested JSONB objects (`professional_context.role`, `professional_context.industry`, etc.), but the mockup shows 4 simple text fields. For v2, **keep the same database structure** but present it as a simplified form. Map the fields:

| Form field label | Database column | JSONB path |
|---|---|---|
| "Name" | `user_profiles` — not in schema yet, store in `professional_context.name` or add a display name | Use `professional_context.role` if no name field, or store as top-level. Check what exists in the DB. |
| "Professional Context" | `professional_context` | Serialize all subfields into one text string, or show as a single textarea |
| "Personal Interests" | `personal_interests` | Same — single textarea for `topics` + `learning_goals` combined |
| "Processing Preferences" | `processing_preferences` | Single textarea for `insight_depth` + `relationship_focus` |

**Practical approach:** The mockup shows 4 simple fields. The database has structured JSONB. Use a hybrid: display 4 text inputs, but read/write to the structured JSONB fields. For "Professional Context", concatenate `role`, `industry`, `current_projects` for display and parse them back on save — **or** simplify to a single text field per section and store the user's free-text input as the primary value.

**Recommended mapping (simplest, forward-compatible):**

```typescript
const PROFILE_FIELDS = [
  {
    label: 'Name',
    key: 'display_name' as const,         // Store in professional_context.name or a dedicated field
    placeholder: 'Your name',
    type: 'input' as const,
  },
  {
    label: 'Professional Context',
    key: 'professional_context' as const,
    placeholder: 'Your role, industry, and current focus areas',
    type: 'textarea' as const,
  },
  {
    label: 'Personal Interests',
    key: 'personal_interests' as const,
    placeholder: 'Topics you care about, learning goals',
    type: 'textarea' as const,
  },
  {
    label: 'Processing Preferences',
    key: 'processing_preferences' as const,
    placeholder: 'How you want knowledge extracted (e.g., prioritize actionable insights)',
    type: 'textarea' as const,
  },
];
```

For reading: pull `professional_context.role` + `professional_context.industry` + `professional_context.current_projects` and join them. For writing: save the full text into `professional_context.current_projects` (or restructure — the prompt builder reads the structured fields, so maintain compatibility).

**Better option:** Check what fields exist in the database for the current user. If they have structured fields (`role`, `industry`), display them individually. If the v2 approach is simpler flat text, add a `professional_context.summary` field and use that for the combined view.

**Form behavior:**
- Load from `SettingsContext.profile` on mount
- Track dirty state: "Save" button disabled when no changes (40% opacity)
- "Save" button: `--accent-500` background, white text, 8px radius, 8px 20px padding, DM Sans 12px weight-600
- On save: show loading state (spinner or "Saving..."), then brief success feedback (green check + "Saved" text for 2 seconds), then return to normal state
- Auto-save on blur is a nice-to-have but not required — the mockup shows an explicit Save button

**Styling per field:**
- Label: DM Sans 12px weight-600 `--text-secondary`, 5px margin-bottom
- Input: `--bg-inset` background, `--border-subtle` border, 8px radius, 8px 12px padding, 13px font, `--text-primary` color
- Textarea: same styling as input, `resize: vertical`
- Focus state: `border-color: rgba(214,58,0,0.3)`, `box-shadow: 0 0 0 3px var(--accent-50)`
- 16px gap between fields

#### Step 5: Settings Modal — Anchors Tab

**Structure:**
1. Description paragraph: "Anchors are high-priority nodes that focus AI extraction and serve as gravitational centers." — DM Sans 13px `--text-secondary`, 16px margin-bottom
2. Anchor list: from `SettingsContext.anchors`
3. "Add Anchor" button at bottom

**Each anchor row:**
- Container: `--bg-frame` background, `1px solid rgba(var(--e-anchor), 0.12)` border (anchor color at 12% opacity), 10px radius, 12px 16px padding, 6px margin-bottom
- Left: Entity dot (10px, anchor's entity_type color) + flex column (label DM Sans 13px weight-600, metadata DM Sans 11px `--text-secondary` showing "[type] · [N] connections")
- Right: "Demote" button — transparent background, `1px solid rgba(var(--semantic-red-500), 0.18)` border, `--semantic-red-500` text, DM Sans 10px weight-600, 4px 10px padding, 6px radius

**Connection count:** For each anchor, fetch the count using `getNodeConnectionCount()`. Since this is async, either:
- Fetch all counts in parallel when the Anchors tab mounts
- Or store connection counts in the SettingsProvider alongside anchors

**Demote behavior:**
1. Confirm dialog is optional but nice: "Remove [name] as an anchor?" — or just demote immediately with undo toast
2. Call `demoteAnchor(nodeId)` via SettingsContext
3. Refresh anchors list
4. The demoted node still exists — it just loses anchor status

**"Add Anchor" button:**
- Position: below the anchor list, 12px margin-top
- Style: `2px dashed var(--border-default)` border, transparent background, `--text-secondary` color, DM Sans 12px, 8px 16px padding, 8px radius, flex with Plus icon (14px) and "Add Anchor" label
- Click opens the AnchorPicker modal (from Step 3)
- When user selects a node in the picker, call `promoteToAnchor(nodeId)`, refresh anchors list, close picker

**Empty state:** If no anchors exist, show: centered text "No anchors configured yet", muted description "Anchors focus AI extraction toward your highest-priority topics and projects.", and the "Add Anchor" button below.

#### Step 6: Settings Modal — Extraction Tab

**Structure:**
1. Description paragraph: "Default extraction behavior. Override per-source during ingestion." — DM Sans 13px `--text-secondary`, 16px margin-bottom
2. "DEFAULT MODE" section label
3. 2×2 grid of mode cards
4. "DEFAULT ANCHOR EMPHASIS" section label
5. Row of 3 emphasis cards

**Mode cards (2×2 grid, 6px gap):**

Each card for the 4 modes from `EXTRACTION_MODES` config:
- Container: 12px 14px padding, 8px radius, cursor pointer
- **Selected:** `background: rgba([mode-color], 0.06)`, `border: 1px solid rgba([mode-color], 0.25)`, label in mode color
- **Unselected:** `--bg-frame` background, `--border-subtle` border, label in `--text-primary`
- Label: DM Sans 12px weight-600, 2px margin-bottom
- Description: DM Sans 10px `--text-secondary`, line-height 1.4
- Click: call `updateExtractionSettings({ default_mode: mode.id })` via SettingsContext, update local state immediately (optimistic)

Use the entity-type colors per mode:
| Mode | Color Variable | Hex |
|---|---|---|
| Comprehensive | `--e-topic` | #0891b2 |
| Strategic | `--e-goal` | #e11d48 |
| Actionable | `--e-action` | #2563eb |
| Relational | `--e-insight` | #7c3aed |

**Anchor emphasis cards (flex row, 6px gap):**

Each card for the 3 levels from `ANCHOR_EMPHASIS_LEVELS`:
- Container: `flex: 1`, 10px padding, 8px radius, text-center, cursor pointer
- **Selected:** `background: rgba(var(--e-anchor), 0.06)`, `border: 1px solid rgba(var(--e-anchor), 0.25)`, label in anchor color (`--e-anchor` / `#b45309`)
- **Unselected:** `--bg-frame` background, `--border-subtle` border, label in `--text-primary`
- Label: DM Sans 12px weight-600
- Click: call `updateExtractionSettings({ default_anchor_emphasis: level.id })`, update local state immediately

20px margin-bottom between the mode grid and the emphasis section.

**Save behavior:** Extraction settings auto-save on selection (no explicit save button needed — each click persists to Supabase immediately). Show a brief subtle flash or check indicator on the selected card to confirm the save.

#### Step 7: Settings Modal — Digests Tab

**Structure:**
1. Description paragraph: "Automated intelligence digests from your knowledge graph." — DM Sans 13px `--text-secondary`, 16px margin-bottom
2. List of digest profiles from Supabase, or empty state

**If digest profiles exist** (query `digest_profiles` for current user):
Each profile as a Card component:
- Header row: title (DM Sans 14px weight-600) + frequency badge (uppercase 10px `--text-secondary` weight-600)
- Module tags row: flex-wrap, each module as a small tag (`--bg-inset` background, DM Sans 10px `--text-secondary`, 2px 7px padding, 4px radius)
- 8px gap between cards, 14px 18px padding per card

**If no profiles exist** (most likely for new v2 users):
Styled empty state — "No digests configured yet. Briefings will be available in a future update." in `--text-secondary`, with a Calendar icon in `--text-placeholder` above.

**This tab is read-only for now.** Full digest CRUD comes in PRD 13.

#### Step 8: Settings Modal — Integrations Tab

**Structure:** List of integration cards showing connection status.

**Integration cards:**
```typescript
const INTEGRATIONS = [
  { name: 'Google Gemini API', statusKey: 'gemini', keyDisplay: 'AIza...xxxx' },
  { name: 'Supabase', statusKey: 'supabase', keyDisplay: 'eyJh...xxxx' },
  { name: 'Circleback', statusKey: 'circleback', keyDisplay: 'Webhook active' },
  { name: 'Chrome Extension', statusKey: 'extension', keyDisplay: 'Not installed' },
];
```

Each card:
- Container: `--bg-frame` background, `--border-subtle` border, 8px radius, 12px 16px padding, 6px margin-bottom, flex row with space-between
- Left: name (DM Sans 13px weight-600) + key/status hint (DM Sans 11px `--text-secondary`)
- Right: status dot (6px circle) + status text (DM Sans 11px weight-600)
  - Connected: `--semantic-green-500` dot and text
  - Not connected: `--text-secondary` dot and text

**Status detection logic:**
- Gemini: connected if `VITE_GEMINI_API_KEY` env var is present (`import.meta.env.VITE_GEMINI_API_KEY ? 'Connected' : 'Not configured'`)
- Supabase: always connected (the app wouldn't load otherwise)
- Circleback: check if any `knowledge_sources` exist with `source_type = 'Meeting'` (rough proxy)
- Chrome Extension: always show "Not installed" for now (PRD 14 will update this)

**Key display:** Show first 4 characters + "..." + last 4 characters for actual API keys. Never show the full key.

---

### Design System Compliance Checklist

All components in this PRD must follow these rules:

- [ ] Form inputs: `--bg-inset` (#f0f0f0) background, `--border-subtle` border, 8px radius, 13px DM Sans
- [ ] Focus rings: `box-shadow: 0 0 0 3px var(--accent-50)`, `border-color: rgba(214,58,0,0.3)`
- [ ] Section labels: Cabinet Grotesk 10px weight-700 uppercase `--text-secondary` 0.08em letter-spacing
- [ ] Mode/emphasis cards: entity-type color at 6% bg and 25% border when selected
- [ ] Anchor rows: `--bg-frame` background with anchor-color-tinted border
- [ ] Demote button: semantic red styling (transparent bg, red border at 18%, red text)
- [ ] Save button: `--accent-500` bg, white text, disabled at 40% opacity
- [ ] Integration status: green dot + green text for connected, secondary text for disconnected
- [ ] Card hover transitions: 0.15–0.18s ease
- [ ] All clickable elements have cursor: pointer and visible hover state

---

### Success Criteria

- [ ] Profile tab loads existing profile data from Supabase (or creates a new profile for first-time users)
- [ ] Editing profile fields and clicking Save persists changes to the database
- [ ] Save button shows loading state and success feedback
- [ ] Anchors tab lists all anchor nodes with entity dots, labels, types, and connection counts
- [ ] "Demote" removes anchor status and refreshes the list
- [ ] "Add Anchor" opens a search modal, searching nodes by label, and promoting the selected node
- [ ] Newly promoted anchor appears in the Anchors list and in the right panel Quick Access
- [ ] Extraction tab shows mode grid and emphasis row with the current defaults selected
- [ ] Clicking a mode or emphasis card saves the change immediately
- [ ] Digests tab shows existing profiles or a graceful empty state
- [ ] Integrations tab shows connection status for all 4 services
- [ ] All changes persist across page reloads
- [ ] SettingsContext is updated after every mutation (other views see fresh data)

### Testing Scenarios

- [ ] **New user (empty profile):** First visit creates a blank profile. All fields empty but editable. Saving populates the database.
- [ ] **Existing user:** Profile loads with saved data. Changes overwrite correctly.
- [ ] **Anchor promotion:** Search "Synapse" → see "Synapse Platform" node → click to promote → appears in Anchors list with correct connection count.
- [ ] **Anchor demotion:** Click Demote on an anchor → it disappears from the list → the node still exists in Browse (not deleted, just loses anchor flag).
- [ ] **No search results:** Type "zzzzz" in AnchorPicker → see "No matching entities found" empty state.
- [ ] **Extraction mode switch:** Click "Strategic" → card highlights in Goal color → reload page → Strategic still selected.
- [ ] **Rapid tab switching:** Click between all 5 Settings tabs quickly — no stale state, no flash of wrong content.

### Edge Cases

- Profile JSONB fields might have unexpected shapes from v1 (e.g., `professional_context` might be a string instead of an object in some records). Handle gracefully — if the field isn't the expected type, treat it as empty.
- User might try to promote a node that's already an anchor. The AnchorPicker should exclude current anchor IDs from search results (`excludeIds` prop).
- Connection count queries could be slow for highly connected nodes. Consider caching or batch-fetching counts for all anchors in one query.
- Extraction settings table might not have a row for the user. Use the fetch-or-create pattern (same as profile).

### Out of Scope

- Digest creation/editing (PRD 13)
- Integration setup wizards (future)
- Chrome extension connection handshake (PRD 14)
- Profile field validation beyond basic presence (no email validation, no character limits beyond DB constraints)
- Extraction mode descriptions in tooltip or expandable detail — the short descriptions are sufficient
```
