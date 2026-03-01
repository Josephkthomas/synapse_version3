// Chrome storage helpers for auth persistence

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
}

export interface StoredUser {
  id: string;
  email: string;
}

const KEYS = {
  SESSION: 'synapse_session',
  USER: 'synapse_user',
  RECENT_CAPTURES: 'synapse_recent_captures',
} as const;

export async function saveSession(session: StoredSession): Promise<void> {
  await chrome.storage.local.set({ [KEYS.SESSION]: session });
}

export async function getSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get(KEYS.SESSION);
  return (result[KEYS.SESSION] as StoredSession) || null;
}

export async function saveUser(user: StoredUser): Promise<void> {
  await chrome.storage.local.set({ [KEYS.USER]: user });
}

export async function getUser(): Promise<StoredUser | null> {
  const result = await chrome.storage.local.get(KEYS.USER);
  return (result[KEYS.USER] as StoredUser) || null;
}

export async function clearAuthData(): Promise<void> {
  await chrome.storage.local.remove([KEYS.SESSION, KEYS.USER]);
}

export function isSessionExpired(session: StoredSession): boolean {
  // 60-second buffer before actual expiry
  return Date.now() / 1000 > session.expires_at - 60;
}

// ─── Recent Captures ────────────────────────────────────────────────────────

export interface RecentCapture {
  title: string;
  sourceType: 'YouTube' | 'Document';
  capturedAt: string;
  sourceUrl?: string;
}

const MAX_RECENT = 5;

export async function addRecentCapture(capture: RecentCapture): Promise<void> {
  const result = await chrome.storage.local.get(KEYS.RECENT_CAPTURES);
  const existing: RecentCapture[] = result[KEYS.RECENT_CAPTURES] || [];
  const updated = [capture, ...existing].slice(0, MAX_RECENT);
  await chrome.storage.local.set({ [KEYS.RECENT_CAPTURES]: updated });
}

export async function getRecentCaptures(): Promise<RecentCapture[]> {
  const result = await chrome.storage.local.get(KEYS.RECENT_CAPTURES);
  return (result[KEYS.RECENT_CAPTURES] as RecentCapture[]) || [];
}
