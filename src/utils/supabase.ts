import { createClient } from '@supabase/supabase-js';

// You can set these in your .env file as EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
// or edit them directly here.
export const DEFAULT_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

let currentUrl = DEFAULT_SUPABASE_URL;
let currentKey = DEFAULT_SUPABASE_ANON_KEY;

export function getSupabaseClient(url = currentUrl, key = currentKey) {
  currentUrl = url;
  currentKey = key;
  return createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = getSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(currentUrl) &&
    !currentUrl.includes('your-project') &&
    Boolean(currentKey) &&
    !currentKey.includes('your-anon-key')
  );
}
