import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Loosely typed client: table rows are `any` rather than `never`.
// Proper generated types from `supabase gen types` would be cleaner — deferred post-hackathon.
type Client = SupabaseClient<any, 'public', any>;

let _client: Client | null = null;

export function supabase(): Client {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export const AUDIO_BUCKET = 'audio-recordings';
