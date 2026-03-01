import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';
import {
  saveSession,
  getSession,
  saveUser,
  clearAuthData,
  isSessionExpired,
  type StoredSession,
} from './storage';

// ─── Chrome Storage Adapter ─────────────────────────────────────────────────

const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    return (result[key] as string) || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};

// ─── Supabase Singleton ─────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

// ─── Auth Helpers ───────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ userId: string; userEmail: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    throw new Error(error?.message || 'Sign in failed');
  }

  const session: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
  };

  await saveSession(session);
  await saveUser({ id: data.user.id, email: data.user.email ?? email });

  return { userId: data.user.id, userEmail: data.user.email ?? email };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  await clearAuthData();
  _client = null; // Reset singleton so next init gets fresh state
}

export async function getCurrentSession(): Promise<{
  session: StoredSession | null;
  userId: string | null;
  userEmail: string | null;
}> {
  const stored = await getSession();
  if (!stored) return { session: null, userId: null, userEmail: null };

  // Expired — attempt refresh
  if (isSessionExpired(stored)) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: stored.refresh_token,
      });

      if (error || !data.session || !data.user) {
        await clearAuthData();
        return { session: null, userId: null, userEmail: null };
      }

      const refreshed: StoredSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      };

      await saveSession(refreshed);
      await saveUser({ id: data.user.id, email: data.user.email ?? '' });

      return {
        session: refreshed,
        userId: data.user.id,
        userEmail: data.user.email ?? null,
      };
    } catch {
      await clearAuthData();
      return { session: null, userId: null, userEmail: null };
    }
  }

  const user = await import('./storage').then(m => m.getUser());
  return {
    session: stored,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const { session } = await getCurrentSession();
  return session?.access_token ?? null;
}

// ─── Knowledge Source ───────────────────────────────────────────────────────

export interface SaveSourceInput {
  title: string;
  content: string;
  sourceType: 'YouTube' | 'Document';
  sourceUrl: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export async function saveKnowledgeSource(
  input: SaveSourceInput
): Promise<{ id: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('knowledge_sources')
    .insert({
      title: input.title,
      content: input.content.substring(0, 50000), // 50k char max
      source_type: input.sourceType,
      source_url: input.sourceUrl,
      user_id: input.userId,
      metadata: {
        ...input.metadata,
        extraction_pending: true,
        captured_via: 'chrome_extension',
        captured_at: new Date().toISOString(),
      },
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save source');
  }

  return { id: data.id as string };
}
