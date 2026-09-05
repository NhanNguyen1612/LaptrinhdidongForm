import { createClient } from '@supabase/supabase-js';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('vku_supabase_url') || 'https://your-project.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('vku_supabase_key') || 'your-anon-key';

export let supabase = createClient(defaultUrl, defaultKey);

export function updateSupabaseConfig(url, key) {
  if (url) localStorage.setItem('vku_supabase_url', url);
  if (key) localStorage.setItem('vku_supabase_key', key);
  supabase = createClient(url, key);
}
