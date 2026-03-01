export const SUPABASE_URL = 'https://ipjuhmohrmfqfbtylfqv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_s930yygEcQ3CnU_V0DB1Wg_e5Z9bYGd';
export const SYNAPSE_APP_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5180'
    : 'https://synapse-v3.vercel.app';
export const EXTRACT_API_URL = `${SYNAPSE_APP_URL}/api/extract`;
