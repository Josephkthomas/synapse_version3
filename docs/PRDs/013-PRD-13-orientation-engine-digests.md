```markdown
## Feature Name: Orientation Engine (Digests)

### Overview
A composable intelligence briefing system built on a meta-agent architecture. Users configure digest profiles that define what knowledge to surface, at what frequency, and where to deliver it. Each digest contains modules (sub-agents) selected from frequency-appropriate templates. A meta-agent orchestrates all modules, generates an executive summary, and renders the output in-app with optional delivery to external channels. This transforms the knowledge graph from a passive repository into a proactive intelligence system.

### User Value
- **Who benefits**: Users with active knowledge graphs (50+ nodes) who want situational awareness without manually querying
- **Problem solved**: The graph accumulates intelligence faster than a human can review. Users miss connections, forget commitments, and lose track of emerging patterns. The Orientation Engine answers "Where do I stand?" automatically
- **Expected outcome**: Users receive a structured briefing (daily/weekly/monthly) synthesizing their knowledge graph into actionable intelligence — project statuses, priority shifts, relationship dynamics, emerging signals — without writing a single query

### Context for AI Coding Agent

**Existing Codebase Patterns:**
- **RAG pipeline**: PRD 8 built `queryGraph(question: string): Promise<RAGResponse>` in `services/gemini.ts`. The forward-compatible decision states this function will be reused by the Orientation Engine. It returns `{ answer, citations, sourceChunks, relatedNodes }`. Each digest module calls this pipeline with a module-specific question
- **Settings modal**: PRD 2 built the Settings modal with tab navigation. PRD 3 implemented Profile, Anchors, and Extraction tabs. The Digests tab currently shows a read-only list or "Coming soon" placeholder. This PRD makes it fully functional
- **Home view Briefings tab**: PRD 6 built the Home view with a Feed/Briefings toggle. The Briefings tab reads from `digest_profiles` and shows status cards. This PRD populates it with real generated digest data
- **Prompt composition**: `utils/promptBuilder.ts` composes modular system prompts. The same pattern applies to module prompts — each module has a system prompt template that gets composed with user profile context and anchor context
- **Design system**: All UI follows `docs/synapse-design-system-SKILL.md`. Cards, badges, toggles, form inputs all use established component patterns
- **Mockup reference**: `docs/synapse-v2-mockup.html` shows the Settings Digests tab with existing digest profile cards (title + frequency + module tags), and the Home Briefings tab with status indicators and preview text

**Database Tables (may need migration):**

The `digest_profiles` and `digest_modules` tables are spec'd in `docs/DATA-MODEL.md` but may not exist yet. This PRD includes migrations. Two additional tables not in the data model are also needed: `digest_channels` and `digest_history`.

**Files to Create/Modify:**
- [ ] `config/digestTemplates.ts` — NEW: Template definitions (18 templates across 3 frequencies)
- [ ] `services/digestEngine.ts` — NEW: Meta-agent orchestration, module execution, digest generation
- [ ] `hooks/useDigestProfiles.ts` — NEW: CRUD hook for digest profiles with modules and channels
- [ ] `components/settings/DigestsTab.tsx` — NEW (or major rewrite): Full digest management UI
- [ ] `components/settings/DigestProfileEditor.tsx` — NEW: Create/edit digest profile modal
- [ ] `components/settings/ModuleSelector.tsx` — NEW: Template selection with drag-and-drop reordering
- [ ] `components/settings/ChannelConfig.tsx` — NEW: Delivery channel configuration
- [ ] `components/home/DigestViewer.tsx` — NEW: In-app digest render with module sections
- [ ] `views/HomeView.tsx` — Modify: Briefings tab shows real data with "View" and "Preview" actions
- [ ] `services/supabase.ts` — Add digest CRUD functions
- [ ] `types/digest.ts` — NEW: TypeScript types for digest system

**Dependencies Already Available:**
- `services/gemini.ts` — `queryGraph()` RAG pipeline
- `utils/promptBuilder.ts` — Modular prompt composition
- `SettingsContext` — User profile and anchor data
- Tailwind CSS 4 with design system tokens
- Lucide React icons

### Technical Scope

**Affected Components:**
- [ ] Data ingestion layer — no changes
- [ ] Entity extraction — no changes
- [x] Graph database schema — NEW tables: `digest_profiles`, `digest_modules`, `digest_channels`, `digest_history` (migrations required)
- [ ] Visualization — no changes
- [x] UI/UX — Settings Digests tab, Home Briefings tab, Digest Viewer modal
- [x] Graph RAG querying — modules call the RAG pipeline with module-specific questions

**Dependencies (PRDs that must be complete):**
- PRD 3 (Settings) — Settings modal structure and Digests tab placeholder
- PRD 6 (Home) — Briefings tab in Home view
- PRD 8 (Ask: Graph RAG) — `queryGraph()` pipeline used by each module

---

### Functional Requirements

#### 1. Database Migrations

- **FR-1.1**: Create `digest_profiles` table if it doesn't exist:

```sql
CREATE TABLE IF NOT EXISTS digest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN DEFAULT true,
  schedule_time TIME DEFAULT '07:00:00',
  schedule_timezone VARCHAR(50) DEFAULT 'UTC',
  density VARCHAR(50) DEFAULT 'standard' CHECK (density IN ('brief', 'standard', 'comprehensive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digest_profiles ENABLE ROW LEVEL SECURITY;
-- Standard RLS policies (SELECT, INSERT, UPDATE, DELETE with auth.uid() = user_id)
```

- **FR-1.2**: Create `digest_modules` table:

```sql
CREATE TABLE IF NOT EXISTS digest_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_profile_id UUID NOT NULL REFERENCES digest_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id VARCHAR(100) NOT NULL,
  custom_context TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digest_modules ENABLE ROW LEVEL SECURITY;
```

- **FR-1.3**: Create `digest_channels` table (NEW — not in original DATA-MODEL):

```sql
CREATE TABLE IF NOT EXISTS digest_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_profile_id UUID NOT NULL REFERENCES digest_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('email', 'telegram', 'slack')),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  density_override VARCHAR(50) CHECK (density_override IN ('brief', 'standard', 'comprehensive', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digest_channels ENABLE ROW LEVEL SECURITY;
```

The `config` JSONB field stores channel-specific settings:
- Email: `{ "recipient_email": "user@example.com" }`
- Telegram: `{ "bot_token": "...", "chat_id": "..." }`
- Slack: `{ "webhook_url": "https://hooks.slack.com/..." }`

- **FR-1.4**: Create `digest_history` table (NEW — not in original DATA-MODEL):

```sql
CREATE TABLE IF NOT EXISTS digest_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_profile_id UUID NOT NULL REFERENCES digest_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  content JSONB NOT NULL,
  module_outputs JSONB NOT NULL,
  executive_summary TEXT,
  density VARCHAR(50),
  generation_duration_ms INTEGER,
  status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'delivered', 'failed')),
  delivery_results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
```

The `content` field stores the fully rendered digest. The `module_outputs` field stores individual module results for cross-digest awareness. The `delivery_results` array tracks success/failure per channel.

**Migration approach:** Provide these as SQL statements that the AI agent should run against Supabase's SQL editor. Include a check-before-create pattern (`IF NOT EXISTS`) to make migrations idempotent. After creating tables, add RLS policies following the standard pattern from `docs/DATA-MODEL.md`.

#### 2. Module Template System

- **FR-2.1**: Define all 18 templates in `config/digestTemplates.ts` as a static configuration:

```typescript
interface DigestTemplate {
  id: string;                          // e.g., 'active_project_status'
  name: string;                        // e.g., 'Active Project Status'
  description: string;                 // One-line description shown in template selector
  frequency: 'daily' | 'weekly' | 'monthly'; // Which digest frequencies this template is valid for
  icon: string;                        // Lucide icon name
  systemPrompt: string;                // The RAG query/instruction for this module
  defaultContext?: string;             // Suggested custom context placeholder
}
```

- **FR-2.2**: **Daily templates** (6):

| Template ID | Name | RAG Query Focus |
|---|---|---|
| `active_project_status` | Active Project Status | Query all Project and Goal entities created or connected in the last 24 hours. Summarize status changes, new connections, and pending actions per project |
| `todays_priorities` | Today's Priorities | Query Action and Decision entities. Identify what requires attention today based on recency, connection density, and urgency signals |
| `people_pulse` | People Pulse | Query Person entities and their recent relationship changes. Who has new connections? Who was mentioned in recent sources? |
| `attention_map` | Attention Map | Analyze source ingestion patterns from the last 24 hours. What topics are receiving the most attention? Where is attention concentrated vs. spread thin? |
| `signals_alerts` | Signals & Alerts | Query Risk, Blocker, and high-connection-growth entities. Surface anything that might need urgent attention |
| `learning_gaps` | Learning & Knowledge Gaps | Identify Topic and Concept entities with many inbound references but sparse descriptions or few connections. What areas deserve deeper exploration? |

- **FR-2.3**: **Weekly templates** (6):

| Template ID | Name | RAG Query Focus |
|---|---|---|
| `weekly_progress` | Weekly Progress Review | Query all entities created this week grouped by source. Summarize what was learned, decided, and accomplished |
| `emerging_themes` | Emerging Themes & Patterns | Identify clusters of new entities that share cross-connections. What themes are emerging across different sources? |
| `relationship_dynamics` | Relationship Dynamics | Analyze Person and Organization entity networks. Who are the most connected people this week? What new organizational relationships formed? |
| `decision_audit` | Decision Audit | Query all Decision entities from this week with their supporting evidence and related risks. Review quality and completeness of decisions made |
| `knowledge_velocity` | Knowledge Velocity | Quantitative analysis: entities created, sources processed, connections discovered, anchor growth. Compare to previous weeks |
| `week_ahead` | Week Ahead Preparation | Based on active projects, pending actions, and scheduled events, what should the user focus on next week? |

- **FR-2.4**: **Monthly templates** (6):

| Template ID | Name | RAG Query Focus |
|---|---|---|
| `strategic_arc` | Strategic Arc Review | Query Goal and Project entities across the full month. How have strategic priorities shifted? What goals are on track vs. drifting? |
| `goal_trajectory` | Goal Trajectory Analysis | Deep dive on Goal entities: progress indicators, supporting/blocking relationships, confidence changes over the month |
| `network_evolution` | Network Evolution | How has the knowledge graph changed structurally? New clusters, bridge nodes, orphaned subgraphs. Quantitative graph metrics |
| `knowledge_portfolio` | Knowledge Portfolio Assessment | Categorize all knowledge by entity type and topic. Where is the portfolio deep? Where is it shallow? What's the distribution of source types? |
| `hypothesis_review` | Hypothesis & Assumption Review | Query Hypothesis entities and their supporting/contradicting evidence accumulated this month. Which hypotheses have strengthened or weakened? |
| `monthly_priorities` | Monthly Priorities Framework | Synthesize the month's learnings into a prioritized framework for the next month. What should receive more attention? What should be deprioritized? |

- **FR-2.5**: Templates are **frequency-filtered** in the UI. When creating a daily digest, only daily templates appear. The `frequency` field on each template controls this. A template cannot be added to a digest of a different frequency.

#### 3. Settings → Digests Tab

- **FR-3.1**: The Digests tab shows a list of the user's existing digest profiles and a "Create New Digest" button. If no digests exist, show an empty state: centered icon (Sparkles or BookOpen), heading "Intelligence Digests", description "Create automated briefings from your knowledge graph. Choose modules, set a schedule, and get proactive intelligence delivered to you.", and a primary "Create Your First Digest" button.

- **FR-3.2**: Each existing digest profile card shows:
  - Title (DM Sans 14px weight-600)
  - Frequency badge (uppercase, 10px, `--bg-inset` background)
  - Active/paused toggle (small switch)
  - Schedule time + timezone (DM Sans 11px `--text-secondary`)
  - Module list as small tags (each tag shows template name, `--bg-inset` background, 10px)
  - Channel indicators (small icons for configured channels)
  - "Edit" and "Preview" buttons (ghost and secondary style respectively)
  - "Delete" action (tertiary destructive, in an overflow menu or confirmed via dialog)

- **FR-3.3**: Clicking "Create New Digest" or "Edit" opens the **Digest Profile Editor** — a modal or full-panel view with a multi-step workflow:

  **Step 1 — Basics:**
  - Title input (text field, placeholder "Daily Morning Brief")
  - Frequency selector (3 options: Daily / Weekly / Monthly — radio-style cards)
  - Schedule time picker (input type="time", default 07:00)
  - Schedule timezone selector (dropdown with common timezones, default to browser timezone)
  - Density selector (Brief / Standard / Comprehensive — similar to Anchor Emphasis from PRD 3)

  **Step 2 — Modules:**
  - Template grid showing available templates filtered by the selected frequency
  - Each template card shows: icon, name, description. Click to add to the selected modules list
  - Selected modules appear in a reorderable list below. Drag-and-drop reordering via mouse or touch (update `sort_order`). Each selected module has a "Remove" button and an optional "Custom Context" text field that expands on click
  - At least one module must be selected to proceed

  **Step 3 — Delivery Channels (optional):**
  - Three channel cards: Email, Telegram, Slack
  - Each card is toggleable (off by default). When enabled, shows configuration fields:
    - **Email**: Recipient email input (defaults to user's auth email)
    - **Telegram**: Bot token + chat ID inputs, with link to setup instructions
    - **Slack**: Webhook URL input, with link to Slack app setup
  - Each channel has an optional density override dropdown (Brief / Standard / Comprehensive / "Use profile default")
  - Channels are optional — a digest with no channels is preview-only (generated in-app but not delivered)

  **Save action:** Creates or updates `digest_profiles`, `digest_modules`, and `digest_channels` rows. On create, navigate back to the digest list.

#### 4. Meta-Agent Orchestration (`services/digestEngine.ts`)

- **FR-4.1**: The digest engine exposes a primary function:

```typescript
interface DigestOutput {
  profileId: string;
  title: string;
  generatedAt: Date;
  executiveSummary: string;
  modules: Array<{
    templateId: string;
    templateName: string;
    content: string;
    citations: Citation[];
    relatedNodes: KnowledgeNode[];
    generationDurationMs: number;
  }>;
  totalDurationMs: number;
}

async function generateDigest(
  profileId: string,
  options?: { densityOverride?: string }
): Promise<DigestOutput>
```

- **FR-4.2**: The generation pipeline:

  1. **Load profile**: Fetch `digest_profiles` row with joined `digest_modules` (ordered by `sort_order`) and `digest_channels`
  2. **Load user context**: Fetch user profile from `user_profiles`, anchors from `knowledge_nodes`
  3. **Load digest history**: Fetch the most recent 3 digest history entries for this profile (for cross-digest awareness — avoid repeating the same information)
  4. **Execute modules sequentially**: For each active module:
     a. Compose the module query by combining the template's `systemPrompt` with: the user's profile context, the module's `custom_context` (if any), the density level (controls output length), and a deduplication instruction referencing recent digest history
     b. Call `queryGraph(moduleQuery)` from `services/gemini.ts` — this runs the full RAG pipeline (embed query → semantic search → keyword search → graph traversal → context assembly → Gemini generation)
     c. Collect the response: `{ answer, citations, sourceChunks, relatedNodes }`
     d. Track duration per module
  5. **Generate executive summary**: After all modules complete, send all module outputs to Gemini with a meta-prompt: "Given these intelligence modules, write a 2–3 sentence executive summary highlighting the most important findings and any cross-module patterns." Use `temperature: 0.3` for a focused summary
  6. **Assemble output**: Combine all module results + executive summary into the `DigestOutput` structure
  7. **Save to history**: Insert into `digest_history` with `content` (the full rendered output), `module_outputs` (individual results for future cross-digest awareness), `executive_summary`, and `generation_duration_ms`

- **FR-4.3**: **Density controls output length.** When composing the module query, append a density instruction:
  - **Brief**: "Respond in 2–3 sentences. Focus only on the single most important finding."
  - **Standard**: "Respond in 1–2 paragraphs. Cover the key findings with enough context to be actionable."
  - **Comprehensive**: "Provide a detailed analysis in 3–4 paragraphs. Include supporting evidence, related entities, and specific recommendations."

- **FR-4.4**: **Cross-digest awareness.** When composing each module query, include a deduplication instruction: "The following topics were covered in recent digests: [list of key themes from recent history]. Focus on new developments, changes, or information not already covered." Extract key themes from `digest_history.module_outputs` using a simple approach (concatenate recent executive summaries and top-cited entity labels).

- **FR-4.5**: **Error handling per module.** If a module's RAG query fails, capture the error and include it in the output: `{ templateId, templateName, content: "This module encountered an error during generation.", error: errorMessage }`. Do not let one module failure abort the entire digest.

#### 5. Preview & In-App Viewing

- **FR-5.1**: **"Preview" button** on digest profile cards triggers `generateDigest(profileId)` and opens the **Digest Viewer** modal/panel showing the result in real-time. During generation, show a progress indicator: "Generating module 2 of 5: People Pulse..." updating as each module completes.

- **FR-5.2**: **Digest Viewer component** (`DigestViewer.tsx`) renders a generated digest:
  - Header: digest title, generated timestamp, frequency badge, density badge
  - Executive Summary section: highlighted card with `--accent-50` background, executive summary text
  - Module sections: each module as a card with template icon + name heading, generated content (rendered as styled prose with paragraph breaks), citation badges below content (clickable — open node detail in right panel), related entity dots
  - Footer: generation duration, "Regenerate" button

- **FR-5.3**: **Home view Briefings tab** integration:
  - Reads from `digest_history` (most recent entry per profile) joined with `digest_profiles`
  - Each briefing card shows:
    - Status indicator: green dot + "Ready" if a history entry exists from the current period (today for daily, this week for weekly, this month for monthly). Gray dot + "Scheduled" if no recent history exists
    - Title, next scheduled time, frequency badge
    - Module names as small tags
    - Preview text: executive summary from the most recent history entry (truncated to 2 lines)
    - "View" button: opens Digest Viewer with the historical entry (no regeneration)
    - "Generate Now" button: triggers `generateDigest()` and opens Digest Viewer
  - "Configure New Digest" dashed-border button: navigates to Settings → Digests tab

#### 6. Delivery Channels (Phase 1 — Foundation Only)

- **FR-6.1**: **Email delivery** is the only channel implemented end-to-end in this PRD. Telegram and Slack channels can be configured in the UI but show a "Coming soon — delivery will be enabled in a future update" indicator. Their configuration is saved to `digest_channels` for future use.

- **FR-6.2**: **Email delivery implementation:** After generating a digest, if the profile has an active email channel:
  1. Render the digest output as HTML email using a simple inline-styled template (compatible with email clients). Structure: header with title + date, executive summary in a highlighted box, each module as a section with heading + content + citation links
  2. Send via a Vercel serverless function `api/digest/send-email.ts` that uses a transactional email service. **Implementation options** (in order of preference):
     - Resend (`npm install resend`) — simple API, good free tier
     - SendGrid — established, but more complex
     - Nodemailer with SMTP — flexible but requires SMTP credentials
  3. The email serverless function follows the same self-contained pattern from PRD 11 (no shared local imports)
  4. Update `digest_history.delivery_results` with success/failure per channel

- **FR-6.3**: **Scheduled delivery** (cron-triggered generation) is NOT implemented in this PRD. Digests are generated on-demand via "Preview" or "Generate Now". A future PRD can add a cron function that checks `digest_profiles.schedule_time` and auto-generates. The schema supports this — `schedule_time`, `schedule_timezone`, and `is_active` are already in `digest_profiles`.

---

### Implementation Guide for AI Agent

#### Step 1: Run database migrations

Execute the SQL from FR-1.1 through FR-1.4 in Supabase's SQL editor. Verify tables exist with `SELECT * FROM digest_profiles LIMIT 1` (should return empty, no error). Verify RLS is enabled. Add RLS policies following the standard pattern.

#### Step 2: Create `config/digestTemplates.ts`

Define all 18 templates as a typed array. Each template needs a carefully crafted `systemPrompt` that works as a RAG query:

```typescript
// config/digestTemplates.ts

export interface DigestTemplate {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  icon: string; // Lucide icon name
  systemPrompt: string;
  defaultContext?: string;
}

export const DIGEST_TEMPLATES: DigestTemplate[] = [
  // ─── DAILY ───
  {
    id: 'active_project_status',
    name: 'Active Project Status',
    description: 'Status updates for all active projects and goals',
    frequency: 'daily',
    icon: 'FolderKanban',
    systemPrompt: `Analyze my knowledge graph for active Project and Goal entities.
For each project, report: current status based on recent connections,
new entities linked in the last 24 hours, pending Action items,
and any Risk or Blocker entities connected to the project.
Organize by project with clear status indicators.`,
  },
  {
    id: 'todays_priorities',
    name: "Today's Priorities",
    description: 'Actions and decisions requiring attention today',
    frequency: 'daily',
    icon: 'ListChecks',
    systemPrompt: `Review Action, Decision, and Goal entities in my knowledge graph.
Identify what requires attention today based on: recency of creation,
connection density (highly connected items are higher priority),
and any explicit urgency signals. Rank the top 5 priorities
with brief justification for each.`,
  },
  // ... (continue for all 18 templates)
];

export function getTemplatesForFrequency(
  frequency: 'daily' | 'weekly' | 'monthly'
): DigestTemplate[] {
  return DIGEST_TEMPLATES.filter(t => t.frequency === frequency);
}

export function getTemplateById(id: string): DigestTemplate | undefined {
  return DIGEST_TEMPLATES.find(t => t.id === id);
}
```

Write thoughtful system prompts for each template. The prompts should be specific enough to produce useful output but general enough to work across different knowledge graphs. Reference entity types from the ontology (Project, Goal, Action, Person, etc.) to guide the RAG pipeline.

#### Step 3: Create `types/digest.ts`

```typescript
// types/digest.ts
import type { KnowledgeNode } from './database';

export interface DigestProfile {
  id: string;
  user_id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  schedule_time: string; // TIME as string "HH:MM:SS"
  schedule_timezone: string;
  density: 'brief' | 'standard' | 'comprehensive';
  created_at: string;
  updated_at: string;
  // Joined
  modules?: DigestModule[];
  channels?: DigestChannel[];
}

export interface DigestModule {
  id: string;
  digest_profile_id: string;
  user_id: string;
  template_id: string;
  custom_context: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DigestChannel {
  id: string;
  digest_profile_id: string;
  user_id: string;
  channel_type: 'email' | 'telegram' | 'slack';
  is_active: boolean;
  config: Record<string, string>;
  density_override: 'brief' | 'standard' | 'comprehensive' | null;
  created_at: string;
}

export interface DigestHistoryEntry {
  id: string;
  digest_profile_id: string;
  user_id: string;
  generated_at: string;
  content: DigestOutput;
  module_outputs: ModuleOutput[];
  executive_summary: string;
  density: string;
  generation_duration_ms: number;
  status: 'generated' | 'delivered' | 'failed';
  delivery_results: DeliveryResult[];
  created_at: string;
}

export interface ModuleOutput {
  templateId: string;
  templateName: string;
  content: string;
  citations: Array<{ id: string; label: string; entityType: string }>;
  relatedNodes: KnowledgeNode[];
  generationDurationMs: number;
  error?: string;
}

export interface DigestOutput {
  profileId: string;
  title: string;
  generatedAt: string;
  executiveSummary: string;
  modules: ModuleOutput[];
  totalDurationMs: number;
}

export interface DeliveryResult {
  channelType: string;
  success: boolean;
  error?: string;
  sentAt?: string;
}
```

#### Step 4: Add Supabase CRUD functions to `services/supabase.ts`

```typescript
// Add to services/supabase.ts

// ─── DIGEST PROFILES ───

export async function fetchDigestProfiles(): Promise<DigestProfile[]> {
  const { data, error } = await supabase
    .from('digest_profiles')
    .select(`
      *,
      modules:digest_modules(*),
      channels:digest_channels(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(p => ({
    ...p,
    modules: (p.modules || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));
}

export async function createDigestProfile(
  profile: Omit<DigestProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'modules' | 'channels'>,
  modules: Array<{ template_id: string; custom_context?: string; sort_order: number }>,
  channels: Array<{ channel_type: string; config: Record<string, string>; density_override?: string }>
): Promise<string> {
  // 1. Insert profile
  const { data: profileData, error: profileError } = await supabase
    .from('digest_profiles')
    .insert(profile)
    .select('id')
    .single();

  if (profileError) throw profileError;
  const profileId = profileData.id;

  // 2. Insert modules with profile FK
  if (modules.length > 0) {
    const moduleRows = modules.map((m, i) => ({
      digest_profile_id: profileId,
      template_id: m.template_id,
      custom_context: m.custom_context || null,
      sort_order: m.sort_order ?? i,
      is_active: true,
    }));

    const { error: modulesError } = await supabase
      .from('digest_modules')
      .insert(moduleRows);

    if (modulesError) throw modulesError;
  }

  // 3. Insert channels
  if (channels.length > 0) {
    const channelRows = channels.map(c => ({
      digest_profile_id: profileId,
      channel_type: c.channel_type,
      config: c.config,
      density_override: c.density_override || null,
      is_active: true,
    }));

    const { error: channelsError } = await supabase
      .from('digest_channels')
      .insert(channelRows);

    if (channelsError) throw channelsError;
  }

  return profileId;
}

export async function deleteDigestProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('digest_profiles')
    .delete()
    .eq('id', profileId);

  if (error) throw error;
  // Modules and channels cascade-delete via FK
}

export async function fetchDigestHistory(
  profileId: string,
  limit: number = 5
): Promise<DigestHistoryEntry[]> {
  const { data, error } = await supabase
    .from('digest_history')
    .select('*')
    .eq('digest_profile_id', profileId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function saveDigestHistory(
  entry: Omit<DigestHistoryEntry, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase
    .from('digest_history')
    .insert(entry);

  if (error) throw error;
}
```

#### Step 5: Implement `services/digestEngine.ts`

This is the core orchestration layer. Key implementation guidance:

```typescript
// services/digestEngine.ts

import { queryGraph } from './gemini';
import { fetchDigestHistory } from './supabase';
import { getTemplateById } from '../config/digestTemplates';
import type { DigestProfile, DigestOutput, ModuleOutput } from '../types/digest';

// Density instruction appended to each module query
const DENSITY_INSTRUCTIONS = {
  brief: 'Respond in 2-3 sentences. Focus on the single most important finding.',
  standard: 'Respond in 1-2 paragraphs. Cover key findings with enough context to be actionable.',
  comprehensive: 'Provide detailed analysis in 3-4 paragraphs. Include evidence, related entities, and recommendations.',
};

export async function generateDigest(
  profile: DigestProfile,
  options?: { densityOverride?: string; onModuleProgress?: (current: number, total: number, name: string) => void }
): Promise<DigestOutput> {
  const startTime = Date.now();
  const density = options?.densityOverride || profile.density;
  const modules = profile.modules?.filter(m => m.is_active) || [];

  // Load recent history for deduplication
  const recentHistory = await fetchDigestHistory(profile.id, 3);
  const recentThemes = recentHistory
    .map(h => h.executive_summary)
    .filter(Boolean)
    .join(' ')
    .substring(0, 500);

  const moduleOutputs: ModuleOutput[] = [];

  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    const template = getTemplateById(mod.template_id);
    if (!template) continue;

    options?.onModuleProgress?.(i + 1, modules.length, template.name);

    const moduleStart = Date.now();

    try {
      // Compose module query
      let query = template.systemPrompt;
      if (mod.custom_context) {
        query += `\n\nAdditional context: ${mod.custom_context}`;
      }
      query += `\n\n${DENSITY_INSTRUCTIONS[density as keyof typeof DENSITY_INSTRUCTIONS] || DENSITY_INSTRUCTIONS.standard}`;
      if (recentThemes) {
        query += `\n\nRecent digest themes (avoid repetition): ${recentThemes}`;
      }

      // Call RAG pipeline
      const result = await queryGraph(query);

      moduleOutputs.push({
        templateId: mod.template_id,
        templateName: template.name,
        content: result.answer,
        citations: result.citations || [],
        relatedNodes: result.relatedNodes || [],
        generationDurationMs: Date.now() - moduleStart,
      });
    } catch (error: any) {
      moduleOutputs.push({
        templateId: mod.template_id,
        templateName: template.name,
        content: 'This module encountered an error during generation.',
        citations: [],
        relatedNodes: [],
        generationDurationMs: Date.now() - moduleStart,
        error: error.message,
      });
    }
  }

  // Generate executive summary
  let executiveSummary = '';
  try {
    const summaryContext = moduleOutputs
      .filter(m => !m.error)
      .map(m => `[${m.templateName}]: ${m.content}`)
      .join('\n\n');

    const summaryResult = await queryGraph(
      `Given these intelligence module outputs, write a 2-3 sentence executive summary highlighting the most important findings and any cross-module patterns:\n\n${summaryContext}`
    );
    executiveSummary = summaryResult.answer;
  } catch {
    executiveSummary = 'Executive summary generation failed. Review individual modules below.';
  }

  return {
    profileId: profile.id,
    title: profile.title,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    modules: moduleOutputs,
    totalDurationMs: Date.now() - startTime,
  };
}
```

#### Step 6: Build the Settings → Digests Tab UI

Follow the design system for all components. Key patterns:

- **Empty state**: Use the pattern from PRD 6 — centered icon, heading, description, CTA button
- **Digest profile cards**: Follow the Card component spec. Subtle border, hover lift, 8px gap between cards
- **Frequency badge**: Uppercase, 10px, `--bg-inset` background, `--text-secondary`, similar to entity type badges but monochrome
- **Module tags**: Small pill-style tags, `--bg-inset` background, 10px DM Sans
- **Profile editor modal**: Use the Settings modal pattern — 680px width, `--bg-card` surface, 16px radius. Multi-step with a simple tab/step indicator at the top (Basics → Modules → Channels)
- **Template cards in selector**: Grid layout, 2 columns. Each card shows icon + name + description. Selected state: `--accent-50` background, `--accent-500` border. Click to toggle selection
- **Drag-and-drop reordering**: Use a simple implementation with `onDragStart`, `onDragOver`, `onDrop` handlers on the module list items. Show a subtle blue drop indicator between items. Update `sort_order` values on drop. No external library needed for a small list.

#### Step 7: Build the Digest Viewer component

- **Container**: Full-width modal or slide-in panel, `--bg-card` background, max-width 720px centered
- **Executive summary card**: `--accent-50` background, `--accent-500` left border (4px), 16px padding. Cabinet Grotesk 13px weight-600 "Executive Summary" heading, DM Sans 13px body text
- **Module sections**: Each module separated by subtle `--border-subtle` divider. Template icon + name as section heading (Cabinet Grotesk 14px weight-600). Content as DM Sans 13px prose. Citations as entity badges below content (reuse Badge component from PRD 4)
- **Progress indicator during generation**: Simple text line "Generating module N of M: [template name]..." with a subtle pulsing dot, positioned at the top of the viewer. Modules appear progressively as they complete (streaming-like feel)

#### Step 8: Update Home view Briefings tab

Modify `views/HomeView.tsx` to replace the placeholder Briefings tab with real data:

- Fetch `digest_profiles` with their most recent `digest_history` entry
- Determine "ready" vs "scheduled" status based on whether a history entry exists for the current period
- Render using the existing Briefings card design from the mockup
- "View" button → opens DigestViewer with the stored history entry
- "Generate Now" button → calls `generateDigest()` and opens DigestViewer

---

### UI/UX Specifications — Design Details

**Settings Digests Tab — Digest Profile Card:**
```
Card component (--bg-card, --border-subtle, hover lift)
Padding: 14px 18px

Row 1: [Title 14px/600] ─── [Frequency badge uppercase 10px] ─── [Active toggle]
Row 2: [Schedule icon 12px] [time + timezone 11px --text-secondary]
Row 3: [Module tag] [Module tag] [Module tag] ... (flex-wrap)
Row 4: [Channel icons 14px --text-secondary] ─── [Edit ghost btn] [Preview secondary btn]
```

**Profile Editor — Template Card (in module selector):**
```
width: 100% (2-column grid)
padding: 12px 14px
border-radius: 8px
border: 1px solid var(--border-subtle)  (selected: var(--accent-500) at 40%)
background: var(--bg-card)              (selected: var(--accent-50))
cursor: pointer
transition: all 0.15s ease

[Icon 16px --text-secondary (selected: --accent-500)]
[Name 12px/600 --text-primary]
[Description 10px/400 --text-secondary, line-height 1.4]
```

**Digest Viewer — Module Section:**
```
padding: 20px 0
border-bottom: 1px solid var(--border-subtle)  (last child: none)

[Template icon 14px --text-secondary] [Template name 14px/600 Cabinet Grotesk]
[Content 13px DM Sans --text-body, margin-top 8px, line-height 1.6]
[Citations: flex-wrap gap-4, margin-top 12px]
  [Badge component per citation]
```

---

### Success Metrics

- [ ] Database tables created with RLS policies
- [ ] Settings → Digests tab shows digest profiles or empty state
- [ ] User can create a new digest profile with title, frequency, schedule, density
- [ ] Template selector shows only frequency-appropriate templates
- [ ] Modules can be added, removed, and reordered via drag-and-drop
- [ ] Delivery channels can be configured (email functional, Telegram/Slack saved but deferred)
- [ ] "Preview" generates a digest in-app using the RAG pipeline
- [ ] Each module produces a meaningful response based on the knowledge graph
- [ ] Executive summary synthesizes cross-module patterns
- [ ] Digest Viewer renders all sections with proper styling
- [ ] Generation progress shows which module is currently executing
- [ ] Failed modules show error state without aborting the digest
- [ ] Home Briefings tab shows real digest data with "View" and "Generate Now"
- [ ] Digest history is saved and viewable
- [ ] Cross-digest deduplication reduces repetitive content across generations
- [ ] Generation time is reasonable (under 60s for a 3-module brief-density digest)

### Edge Cases & Considerations

- **Empty knowledge graph**: Modules will produce generic or empty responses. The executive summary should acknowledge this: "Your knowledge graph has limited data. As you add more sources, digests will become more insightful." Check node count before generation and warn if < 20 nodes
- **Very large knowledge graph (847+ nodes)**: RAG queries per module may be slow. The sequential module execution means a 6-module comprehensive digest could take 2-3 minutes. Show clear progress feedback. Consider parallel execution in a future optimization
- **Module query failures**: Gemini rate limits or context window limits may cause individual modules to fail. FR-4.5 handles this gracefully — failed modules show error state, other modules continue
- **Duplicate modules**: Allow a user to add the same template twice (they might want different custom contexts). The `sort_order` differentiates them
- **Timezone handling**: Store timezone as IANA string (e.g., "Europe/London"). Display schedule times in the user's local timezone. The `Intl` API handles conversion
- **Density affects token usage**: Comprehensive density uses significantly more Gemini tokens per module. Consider showing an estimated token cost or warning for comprehensive + many modules
- **Concurrent digest generation**: Two "Generate Now" clicks should not create duplicate history entries. Disable the button during generation and show progress in the UI
- **Settings modal vs full page**: The digest editor is more complex than other Settings tabs. If the modal feels cramped, consider opening it as a full center-stage panel instead. The mockup shows digests within the Settings modal, so start there

### Testing Guidance for AI Agent

- [ ] Run migrations — verify all 4 tables exist with correct columns
- [ ] Create a digest profile with 3 daily modules — verify all rows saved correctly
- [ ] Edit the profile — change title and reorder modules — verify updates persist
- [ ] Delete a profile — verify modules and channels cascade-delete
- [ ] Preview a digest — verify all modules execute and results display
- [ ] Verify template filtering — daily digest shows only daily templates
- [ ] Test with empty graph (new user) — verify graceful degradation
- [ ] Test with populated graph (847+ nodes) — verify meaningful output
- [ ] Verify Home Briefings tab shows real digest data after generation
- [ ] Test module failure — temporarily break one module query, verify others continue
- [ ] Verify drag-and-drop reordering updates sort_order correctly
- [ ] Test email channel configuration — verify config saves to digest_channels
- [ ] Verify executive summary references cross-module patterns

### Out of Scope

- Scheduled/cron-based digest generation (on-demand only for now — schema supports future cron)
- Telegram and Slack delivery (configuration is saved but actual dispatch is deferred)
- Digest sharing or collaboration
- Custom module creation (users select from templates only)
- Real-time digest streaming (modules complete sequentially, results shown progressively)
- Web search integration within modules (modules use Graph RAG only)
- A/B testing of module prompts
- Analytics on digest engagement (open rates, click-through)
```
