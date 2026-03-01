```markdown
## Feature Name: Chrome Extension — Knowledge Capture

### Overview
A Manifest V3 Chrome extension that provides one-click knowledge capture from YouTube videos and web articles directly into the Synapse knowledge graph. The extension authenticates via Supabase, detects page content type automatically, and saves sources with metadata for backend extraction processing. This is a **separate codebase** in the `extension/` directory with its own build pipeline.

### User Value
- **Who benefits**: Users who discover knowledge-worthy content while browsing — YouTube videos, articles, blog posts, research papers
- **Problem solved**: Without the extension, users must manually copy URLs or text into Synapse's Ingest view. This friction causes valuable content to be lost in the moment of discovery. The extension reduces capture to a single click
- **Expected outcome**: User clicks the extension icon on a YouTube video → transcript + metadata saved to Synapse in under 3 seconds. User highlights text on any page → right-click "Save to Synapse" → content captured. All captures appear in Synapse's activity feed and processing queue for extraction

### Context for AI Coding Agent

**⚠️ CRITICAL: This is a SEPARATE codebase from the main Synapse V2 app.** The extension lives in the `extension/` directory at the project root. It has its own `package.json`, build pipeline (esbuild), and TypeScript configuration. It does NOT use Vite, Tailwind, or the main app's components. It communicates with Supabase directly using the anon key (which respects RLS).

**Existing V1 Implementation:**
There is a complete, working V1 extension in the project knowledge. The V1 source code includes:
- `extension/manifest.json` — Manifest V3 configuration
- `extension/src/popup/Popup.tsx` — React popup with auth, page detection, capture flow
- `extension/src/popup/Login.tsx` — Login form component
- `extension/src/popup/CapturePreview.tsx` — Capture preview with metadata display
- `extension/src/popup/StatusFeedback.tsx` — Success/error feedback states
- `extension/src/content/youtube.ts` — YouTube page content script (extracts video ID, title, channel, transcript)
- `extension/src/content/article.ts` — Article content script (extracts text, title, author, metadata)
- `extension/src/background/service-worker.ts` — Background service worker (handles capture requests, Supabase writes)
- `extension/src/lib/supabase.ts` — Supabase client with Chrome storage adapter for auth persistence
- `extension/src/lib/storage.ts` — Chrome storage wrapper for session/user persistence
- `extension/src/lib/constants.ts` — Supabase URL, anon key, app URL constants
- `extension/package.json` — Dependencies (React 18, Supabase JS, Lucide React, esbuild)
- `extension/esbuild.config.js` — Build pipeline producing `dist/` output

**The V2 extension should preserve the core V1 architecture while improving:**
- Visual design alignment with the V2 design system (light theme, blood orange accents)
- Right-click context menu for "Save to Synapse" on highlighted text
- Recent captures list in the popup
- Connection status indicator
- Clearer error handling and user feedback

**Files to Create (in `extension/` directory):**
- [ ] `extension/manifest.json` — Manifest V3 with context menu permission
- [ ] `extension/package.json` — Dependencies
- [ ] `extension/tsconfig.json` — TypeScript configuration
- [ ] `extension/esbuild.config.js` — Build pipeline
- [ ] `extension/public/popup.html` — Popup HTML shell
- [ ] `extension/public/icons/` — Extension icons (16, 32, 48, 128px)
- [ ] `extension/src/popup/index.tsx` — React entry point
- [ ] `extension/src/popup/Popup.tsx` — Main popup component
- [ ] `extension/src/popup/Login.tsx` — Auth form
- [ ] `extension/src/popup/CapturePreview.tsx` — Content preview and capture
- [ ] `extension/src/popup/RecentCaptures.tsx` — NEW: Recent captures list
- [ ] `extension/src/popup/StatusFeedback.tsx` — Success/error states
- [ ] `extension/src/content/youtube.ts` — YouTube content script
- [ ] `extension/src/content/article.ts` — Article content script
- [ ] `extension/src/background/service-worker.ts` — Background worker
- [ ] `extension/src/lib/supabase.ts` — Supabase client for Chrome
- [ ] `extension/src/lib/storage.ts` — Chrome storage helpers
- [ ] `extension/src/lib/constants.ts` — Configuration constants
- [ ] `extension/src/styles/popup.css` — Popup styles

**Dependencies:**
- `@supabase/supabase-js` ^2.x — Database client with Chrome storage adapter
- `react` ^18.x, `react-dom` ^18.x — Popup UI
- `lucide-react` — Icons
- `esbuild` — Build tool (dev dependency)
- `@types/chrome` — Chrome API types (dev dependency)
- `typescript` ^5.x — (dev dependency)

### Technical Scope

**Affected Components:**
- [ ] Data ingestion layer — extension writes to `knowledge_sources` table
- [ ] Entity extraction — no changes (backend picks up pending sources)
- [ ] Graph database schema — no changes (uses existing `knowledge_sources` table)
- [ ] Visualization — no changes
- [ ] UI/UX — separate extension UI (popup, content scripts)
- [ ] Graph RAG querying — no changes

**Dependencies (PRDs that must be complete):**
- PRD 7 (Ingest + Extraction Pipeline) — the extraction pipeline processes sources saved by the extension
- PRD 1 (Scaffold + Auth) — Supabase auth is used for extension login

---

### Functional Requirements

#### 1. Manifest V3 Configuration

- **FR-1.1**: Manifest V3 with these permissions:
  - `storage` — persist auth session in `chrome.storage.local`
  - `activeTab` — access current tab URL and content
  - `scripting` — inject content scripts on demand
  - `contextMenus` — right-click "Save to Synapse" menu item

- **FR-1.2**: Host permissions:
  - `https://www.youtube.com/*` — YouTube content script
  - `https://*.supabase.co/*` — Supabase API calls

- **FR-1.3**: Content scripts:
  - YouTube: `content-youtube.js` matches `https://www.youtube.com/watch*`, runs at `document_idle`
  - Article: `content-article.js` matches `<all_urls>`, runs at `document_idle`

- **FR-1.4**: Background service worker: `background.js` as ESM module. Handles capture requests, context menu creation, and Supabase writes.

- **FR-1.5**: Extension icons at 16, 32, 48, and 128px. Use a simplified Synapse "S" mark — the gradient square from the V2 design system.

#### 2. Authentication

- **FR-2.1**: On popup open, check for existing session in `chrome.storage.local`. If valid and not expired, proceed to capture view. If expired, attempt refresh via `supabase.auth.refreshSession()`. If no session or refresh fails, show login form.

- **FR-2.2**: Login form: email + password fields, "Sign In" button, error message display. Use the same Supabase auth as the main app (`signInWithPassword`). No sign-up in the extension — users must create accounts via the main app first.

- **FR-2.3**: On successful login, store session tokens (`access_token`, `refresh_token`, `expires_at`) and user info (`id`, `email`) in `chrome.storage.local` via the storage helper.

- **FR-2.4**: Custom Supabase storage adapter that bridges `chrome.storage.local` with Supabase's auth persistence:
```typescript
const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};
```

- **FR-2.5**: Sign out: clear all auth data from `chrome.storage.local`, reset Supabase client, show login form.

#### 3. YouTube Capture

- **FR-3.1**: When the user is on a YouTube watch page (`youtube.com/watch?v=...`), the content script extracts:
  - `videoId` — from URL parameter `v`
  - `title` — from `<title>` or `og:title` meta tag (strip " - YouTube" suffix)
  - `channelName` — from `ytd-video-owner-renderer` or `<link itemprop="name">` or meta tags
  - `channelUrl` — from the channel link element
  - `description` — from `ytd-text-inline-expander` or meta description (first 500 chars)
  - `thumbnailUrl` — construct from `https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`
  - `transcript` — attempt extraction via Innertube API (see FR-3.2)

- **FR-3.2**: **In-browser transcript extraction** (content script, not background):
  1. Attempt to fetch transcript via YouTube's Innertube `get_transcript` endpoint (same approach as Tier 2 in PRD 11, but executed from the page context)
  2. If Innertube fails, try extracting from the transcript panel DOM if the user has it open
  3. If no transcript is available, set `hasTranscript: false` and allow capture of metadata only (the backend Tier 1/2/3 extraction will handle transcript fetching during processing)
  4. The content script sends all extracted data back to the popup via `chrome.runtime.sendMessage`

- **FR-3.3**: The popup shows a **YouTube capture preview**: video thumbnail, title, channel name, transcript availability indicator (green check or amber warning), word count if transcript available.

- **FR-3.4**: "Save to Synapse" button. On click, send data to background service worker, which inserts into `knowledge_sources`:
  ```typescript
  {
    title: videoTitle,
    content: transcript || description,
    source_type: 'YouTube',
    source_url: videoUrl,
    user_id: authenticatedUserId,
    metadata: {
      videoId,
      channelName,
      channelUrl,
      thumbnailUrl,
      hasTranscript,
      extraction_pending: true,
      captured_via: 'chrome_extension',
      captured_at: new Date().toISOString(),
    }
  }
  ```

- **FR-3.5**: If transcript is not available, show a note: "No transcript found — Synapse will attempt extraction during processing." Still allow capture with description/metadata only.

#### 4. Web Article Capture

- **FR-4.1**: On any non-YouTube page, the article content script extracts:
  - `url` — `window.location.href`
  - `title` — `document.title` or `og:title` meta
  - `content` — main article text extracted via heuristics (see FR-4.2)
  - `selectedText` — `window.getSelection().toString()` if user has highlighted text
  - `author` — from `meta[name="author"]` or `meta[property="article:author"]`
  - `publishedDate` — from `meta[property="article:published_time"]`
  - `siteName` — from `og:site_name` or `window.location.hostname`
  - `wordCount` — computed from extracted content

- **FR-4.2**: **Article content extraction heuristics** (in order of preference):
  1. `document.querySelector('article')?.innerText` — semantic article element
  2. `document.querySelector('[role="main"]')?.innerText` — ARIA main content
  3. `document.querySelector('main')?.innerText` — main element
  4. Largest text block heuristic: find the DOM element with the most text content that isn't navigation/header/footer
  5. Fallback: `document.body.innerText` (truncated to 10,000 characters)

- **FR-4.3**: If the user has highlighted text on the page, use the selection as the captured content instead of the full article extraction. Show "Selected text" indicator in the capture preview.

- **FR-4.4**: The popup shows an **article capture preview**: page title, site name, word count, "Full article" or "Selected text (N words)" indicator, first 200 characters of content as preview text.

- **FR-4.5**: "Save to Synapse" button inserts into `knowledge_sources`:
  ```typescript
  {
    title: pageTitle,
    content: selectedText || extractedContent,
    source_type: 'Document',
    source_url: pageUrl,
    user_id: authenticatedUserId,
    metadata: {
      author,
      publishedDate,
      siteName,
      wordCount,
      hasSelection: !!selectedText,
      extraction_pending: true,
      captured_via: 'chrome_extension',
      captured_at: new Date().toISOString(),
    }
  }
  ```

#### 5. Right-Click Context Menu

- **FR-5.1**: Register a context menu item in the background service worker on extension install:
  ```typescript
  chrome.contextMenus.create({
    id: 'save-to-synapse',
    title: 'Save to Synapse',
    contexts: ['selection'],
  });
  ```
  This appears when the user right-clicks on highlighted text.

- **FR-5.2**: On context menu click, the background service worker:
  1. Gets the selected text from `info.selectionText`
  2. Gets the page URL and title from the tab
  3. Checks authentication (session must be valid)
  4. Inserts directly into `knowledge_sources` with `source_type: 'Document'`, the selected text as `content`, and the page URL as `source_url`
  5. Shows a Chrome notification on success: "Saved to Synapse ✓" (requires `notifications` permission, or use `chrome.action.setBadgeText` as a lightweight alternative)

- **FR-5.3**: If not authenticated when context menu is clicked, set badge text to "!" and open the popup for login.

#### 6. Popup UI

- **FR-6.1**: Popup dimensions: 360px wide, variable height (max 500px with scroll). Clean light background (`#f7f7f7`).

- **FR-6.2**: **States flow**: Loading → Login (if unauthenticated) → Capture Preview (if on capturable page) → Success/Error (after capture)

- **FR-6.3**: **Header bar**: Synapse logo mark (gradient "S" square), "Synapse" text (weight-700, 14px), user email (truncated, `--text-secondary`), sign-out icon button.

- **FR-6.4**: **Capture Preview state** (main view when authenticated):
  - Page type indicator: "YouTube Video" or "Web Article" with appropriate icon
  - Content preview card: thumbnail (YouTube) or site favicon + title, metadata row (channel/site, word count), content snippet (2 lines, truncated)
  - Transcript indicator (YouTube only): green "Transcript available" or amber "No transcript — will extract later"
  - "Save to Synapse" primary button: blood orange (`#d63a00`) background, white text, full width
  - "Save & Extract Now" secondary button: subtle outline style. This sends the capture AND triggers immediate extraction via the extraction API endpoint (if available). Falls back to save-only if extraction endpoint fails

- **FR-6.5**: **Recent Captures section** (below capture preview):
  - Shows the last 5 captures from this session (stored in `chrome.storage.local`, keyed by `synapse_recent_captures`)
  - Each entry: small source type icon, title (truncated to 1 line), timestamp ("2m ago"), status dot (green = captured, amber = pending extraction)
  - "Open in Synapse" link at the bottom: opens `SYNAPSE_APP_URL` in a new tab

- **FR-6.6**: **Success state**: Green check icon, "Saved to Synapse" heading, title of captured content, "View in Synapse" link button, auto-dismisses after 3 seconds (returns to capture view for the current page or shows recent captures)

- **FR-6.7**: **Error state**: Red alert icon, error message, "Try Again" button, "Report Issue" link (optional — opens a GitHub issue template or feedback form)

- **FR-6.8**: **Login state**: Synapse logo, "Sign in to Synapse" heading, email input, password input, "Sign In" button (blood orange), error message area. Note below: "Don't have an account? Sign up at [synapse-app-url]" as a link.

#### 7. Styling

- **FR-7.1**: The extension does NOT use Tailwind (no build pipeline for it). Use a plain CSS file (`src/styles/popup.css`) with design system tokens as CSS custom properties:
  ```css
  :root {
    --bg-content: #f7f7f7;
    --bg-card: #ffffff;
    --bg-inset: #f0f0f0;
    --accent-500: #d63a00;
    --accent-50: #fff5f0;
    --text-primary: #1a1a1a;
    --text-body: #3d3d3d;
    --text-secondary: #808080;
    --border-subtle: #e5e5e5;
    --border-default: #d4d4d4;
    --font-display: 'Inter', -apple-system, sans-serif;
    --font-body: 'Inter', -apple-system, sans-serif;
    --radius-sm: 8px;
    --radius-md: 12px;
  }
  ```
  Note: The extension uses system fonts (`Inter` or system stack) rather than Cabinet Grotesk/DM Sans to avoid font loading in the popup. The visual feel should still match the V2 design system — neutral backgrounds, blood orange accents, clean typography.

- **FR-7.2**: No shadows on cards by default. Subtle borders. Hover states on buttons (darken by one shade). Focus-visible rings. The popup should feel like a miniature version of the Synapse UI.

#### 8. Build Pipeline

- **FR-8.1**: esbuild configuration producing `dist/` output:
  - `src/popup/index.tsx` → `dist/popup.js` (React bundle)
  - `src/styles/popup.css` → `dist/popup.css`
  - `src/content/youtube.ts` → `dist/content-youtube.js`
  - `src/content/article.ts` → `dist/content-article.js`
  - `src/background/service-worker.ts` → `dist/background.js` (ESM format)
  - Copy `public/popup.html` → `dist/popup.html`
  - Copy `manifest.json` → `dist/manifest.json`
  - Copy `public/icons/` → `dist/icons/`

- **FR-8.2**: Build commands:
  ```json
  {
    "scripts": {
      "dev": "node esbuild.config.js --watch",
      "build": "node esbuild.config.js",
      "clean": "rm -rf dist/*"
    }
  }
  ```

- **FR-8.3**: To load in Chrome: navigate to `chrome://extensions`, enable Developer Mode, click "Load unpacked", select the `extension/dist/` directory.

#### 9. Constants & Configuration

- **FR-9.1**: `src/lib/constants.ts` exports:
  ```typescript
  export const SUPABASE_URL = 'https://[project].supabase.co';
  export const SUPABASE_ANON_KEY = '[anon-key]';
  export const SYNAPSE_APP_URL = 'https://synapse-v2.vercel.app';
  export const EXTRACT_API_URL = `${SYNAPSE_APP_URL}/api/extract`;
  ```
  These values must be updated per deployment. The anon key is safe to include — it respects RLS policies. **Never include the service role key in extension code.**

- **FR-9.2**: Consider an environment-based approach for switching between local (`http://localhost:5173`) and production URLs. The esbuild config can use `define` to inject `process.env.NODE_ENV` and conditionally set the app URL.

---

### Implementation Guide for AI Agent

#### Step 1: Set up the extension directory

```bash
mkdir -p extension/src/{popup,content,background,lib,styles}
mkdir -p extension/public/icons
cd extension
npm init -y
npm install @supabase/supabase-js react react-dom lucide-react
npm install -D @types/chrome @types/react @types/react-dom esbuild typescript
```

#### Step 2: Create `manifest.json`

```json
{
  "manifest_version": 3,
  "name": "Synapse Knowledge Capture",
  "version": "2.0.0",
  "description": "One-click knowledge capture from YouTube and articles into your Synapse knowledge graph",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://*.supabase.co/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Synapse Capture"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*"],
      "js": ["content-youtube.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["<all_urls>"],
      "js": ["content-article.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

Note the addition of `contextMenus` permission compared to V1.

#### Step 3: Create `esbuild.config.js`

Reference the V1 build config in the project knowledge. Key entries:
- Popup React bundle (TSX → JS)
- CSS bundle
- YouTube content script
- Article content script
- Background service worker (ESM format)
- Copy static files (popup.html, manifest.json, icons)

#### Step 4: Implement `src/lib/` (storage, supabase, constants)

These are largely identical to V1. Key files:

**`constants.ts`** — Update `SYNAPSE_APP_URL` to the V2 deployment URL.

**`storage.ts`** — Chrome storage wrapper. Preserve V1 implementation:
- `saveSession(session)`, `getSession()`
- `saveUser(user)`, `getUser()`
- `clearAuthData()`
- `isSessionExpired(session)` — checks `expires_at` with 60-second buffer

**`supabase.ts`** — Supabase client with Chrome storage adapter. Preserve V1:
- `getSupabase()` — singleton with `chromeStorageAdapter`
- `signIn(email, password)`
- `signOut()`
- `getCurrentSession()` — with refresh fallback from stored tokens
- `getAccessToken()`
- `saveKnowledgeSource(input)` — inserts into `knowledge_sources` with `user_id` and `extraction_pending: true` metadata

#### Step 5: Implement content scripts

**`content/youtube.ts`** — Reference V1 implementation. Key extraction targets:
- Video ID from URL params
- Title from document title or meta tags
- Channel name/URL from page elements or structured data
- Description from video info section
- Transcript attempt via Innertube API (protobuf-encoded params, same as PRD 11 Tier 2)
- Respond to messages: `getYouTubeData` → returns full `YouTubeData` object, `getPageType` → returns `{ type: 'youtube', isYouTube: true }`

**`content/article.ts`** — Reference V1 implementation. Key extraction targets:
- Full article text via semantic elements (`article`, `main`, `[role="main"]`) with fallback to largest text block
- Selected text via `window.getSelection()`
- Author, publish date, site name from meta tags
- Respond to messages: `getArticleData` → returns full `ArticleData` object, `getPageType` → returns `{ type: 'article', isYouTube: false }`
- Guard: if current page is YouTube, don't respond (let youtube.ts handle it)

#### Step 6: Implement background service worker

Reference V1 `service-worker.ts`. Key additions for V2:

**Context menu registration:**
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-synapse',
    title: 'Save to Synapse',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'save-to-synapse') return;

  const { session, user } = await getCurrentSession();
  if (!session || !user) {
    // Set badge to indicate auth needed
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#d63a00' });
    return;
  }

  const selectedText = info.selectionText;
  if (!selectedText || selectedText.length < 10) return;

  try {
    const result = await saveKnowledgeSource({
      title: tab?.title || 'Web Capture',
      content: selectedText,
      sourceType: 'Document',
      sourceUrl: tab?.url || '',
      metadata: {
        siteName: tab?.url ? new URL(tab.url).hostname : undefined,
        hasSelection: true,
        wordCount: selectedText.split(/\s+/).length,
      },
    });

    if (result.id) {
      // Brief success badge
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

      // Store in recent captures
      await addRecentCapture({
        title: tab?.title || 'Web Capture',
        sourceType: 'Document',
        capturedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
  }
});
```

**Recent captures helper (stored in chrome.storage.local):**
```typescript
const RECENT_CAPTURES_KEY = 'synapse_recent_captures';
const MAX_RECENT = 5;

interface RecentCapture {
  title: string;
  sourceType: string;
  capturedAt: string;
}

async function addRecentCapture(capture: RecentCapture): Promise<void> {
  const result = await chrome.storage.local.get(RECENT_CAPTURES_KEY);
  const existing: RecentCapture[] = result[RECENT_CAPTURES_KEY] || [];
  const updated = [capture, ...existing].slice(0, MAX_RECENT);
  await chrome.storage.local.set({ [RECENT_CAPTURES_KEY]: updated });
}

async function getRecentCaptures(): Promise<RecentCapture[]> {
  const result = await chrome.storage.local.get(RECENT_CAPTURES_KEY);
  return result[RECENT_CAPTURES_KEY] || [];
}
```

**Message handler** (preserve V1 pattern):
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureContent') {
    handleCapture(request.data, request.extractNow).then(sendResponse);
    return true; // Keep channel open for async
  }

  if (request.action === 'getRecentCaptures') {
    getRecentCaptures().then(sendResponse);
    return true;
  }
});
```

#### Step 7: Implement popup UI

Reference V1 `Popup.tsx`, `Login.tsx`, `CapturePreview.tsx`, `StatusFeedback.tsx`. Key additions for V2:

**New `RecentCaptures.tsx` component:**
- Fetches recent captures from background service worker via `chrome.runtime.sendMessage({ action: 'getRecentCaptures' })`
- Renders a compact list (small icon, title truncated, relative timestamp)
- "Open in Synapse" link at the bottom

**Updated visual styling** — use the CSS custom properties from FR-7.1 instead of V1's dark theme. The V2 extension should feel like a light, clean miniature Synapse with blood orange accents on interactive elements.

**Content script injection fallback** — V1 includes a retry pattern where if `chrome.tabs.sendMessage` fails (content script not loaded), it injects the script dynamically via `chrome.scripting.executeScript` and retries. Preserve this pattern — it handles cases where the user opens the popup before content scripts have loaded.

#### Step 8: Create popup HTML and CSS

**`public/popup.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=360">
  <link rel="stylesheet" href="popup.css">
  <title>Synapse Capture</title>
</head>
<body>
  <div id="root"></div>
  <script src="popup.js"></script>
</body>
</html>
```

**`src/styles/popup.css`:** Define all design tokens as CSS variables, basic component styles (buttons, inputs, cards), and layout utilities. Keep it under 200 lines — the extension UI is simple.

#### Step 9: Build and test

```bash
cd extension
npm run build
```

Load `extension/dist/` as unpacked extension in Chrome. Test:
1. Click extension icon → should show login
2. Sign in with Supabase credentials → should detect current page
3. Navigate to a YouTube video → should show YouTube capture preview
4. Click "Save to Synapse" → should succeed, show in recent captures
5. Navigate to a web article → should show article capture preview
6. Highlight text, right-click → "Save to Synapse" should appear
7. Click context menu → content should be captured (badge shows ✓)
8. Open Synapse app → captured sources should appear in activity feed

---

### Data Flow

```
User on YouTube/Article page
  → Content script extracts page data
  → Popup displays capture preview
  → User clicks "Save to Synapse"
  → Background service worker:
      1. Verify auth (Supabase session)
      2. Insert into knowledge_sources table:
         - title, content (transcript/text), source_type, source_url
         - metadata.extraction_pending = true
         - metadata.captured_via = 'chrome_extension'
      3. Return source_id to popup
  → Popup shows success state
  → Backend (existing extraction pipeline from PRD 7/11):
      - Picks up sources with extraction_pending = true
      - Runs entity extraction, embeddings, chunking, cross-connections
      - Source appears in Synapse's activity feed and Explore view
```

**Important**: The `metadata.extraction_pending: true` flag is what connects the extension to the backend processing pipeline. The existing extraction system (PRD 7's pipeline or PRD 11's YouTube processor) should check for sources with this flag to initiate processing. If no automatic pickup exists yet, the user can trigger extraction manually from the Ingest view.

---

### Success Metrics

- [ ] Extension installs without errors in Chrome (no manifest issues)
- [ ] Login with existing Supabase credentials succeeds
- [ ] Session persists across popup opens (no re-login required until token expires)
- [ ] YouTube video page: video data extracted correctly (title, channel, transcript status)
- [ ] YouTube capture: source saved to `knowledge_sources` with correct metadata
- [ ] Article page: content extracted correctly (full text or selected text)
- [ ] Article capture: source saved to `knowledge_sources` with correct metadata
- [ ] Right-click "Save to Synapse": works on highlighted text, saves to database
- [ ] Recent captures: shows last 5 captures in popup
- [ ] Captured sources appear in Synapse's Home activity feed
- [ ] Extension visual design matches V2 design system (light theme, blood orange accents)
- [ ] Build pipeline produces valid `dist/` output
- [ ] No console errors during normal operation

### Edge Cases & Considerations

- **YouTube Shorts**: URL pattern is `/shorts/`, not `/watch`. Content script match pattern won't trigger. This is intentional — Shorts are excluded by the main pipeline too (< 90s duration). If a user navigates to a Short, the article content script will activate instead, which is acceptable
- **YouTube premium/restricted content**: Some videos may not have accessible transcripts. The extension handles this gracefully by allowing metadata-only capture
- **Protected pages**: Some pages (Chrome internal pages, PDF viewers, banking sites) block content script injection. Show a clear error: "Cannot access this page" rather than failing silently
- **Very long articles**: Truncate extracted content to 50,000 characters to avoid exceeding Supabase insert limits and Gemini context windows
- **Multiple captures of the same URL**: The `knowledge_sources` table doesn't have a unique constraint on `source_url`. Duplicate captures are allowed — the user might capture different selected text from the same page. The extraction pipeline should handle deduplication at the entity level (PRD 7)
- **Session expiry during capture**: If the session expires between popup open and capture click, the background worker should attempt a silent refresh before failing
- **Chrome extension update flow**: When the extension updates, the service worker restarts. Stored sessions in `chrome.storage.local` survive updates. No migration needed
- **Offline usage**: The extension requires internet connectivity for Supabase writes. If offline, show a clear error. No offline queue (would add significant complexity for minimal benefit)

### Testing Guidance for AI Agent

- [ ] Build the extension without errors: `cd extension && npm run build`
- [ ] Load `dist/` as unpacked extension in Chrome
- [ ] Verify popup opens at correct dimensions (360px wide)
- [ ] Sign in with valid Supabase credentials
- [ ] Navigate to a YouTube video — verify content script detects video data
- [ ] Capture a YouTube video — verify row in `knowledge_sources` table
- [ ] Navigate to an article — verify content extraction
- [ ] Highlight text on a page — verify "Save to Synapse" context menu appears
- [ ] Use context menu — verify capture succeeds with badge feedback
- [ ] Close and reopen popup — verify session persists (no re-login)
- [ ] Sign out and verify login form appears
- [ ] Test on a protected page (e.g., `chrome://settings`) — verify graceful error
- [ ] Verify recent captures list updates after each capture
- [ ] Open Synapse app — verify captured sources appear

### Out of Scope

- Chrome Web Store submission (manual distribution for now — load as unpacked)
- Firefox/Safari/Edge extension ports
- Offline capture queue
- In-extension entity review or extraction preview
- Extension settings page (configure via main Synapse app's Settings → Integrations)
- Real-time sync between extension and main app (main app polls Supabase)
- Screenshot or image capture
- Automatic capture (only manual trigger via click or context menu)
- PDF capture from browser viewer
```
