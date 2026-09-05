import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('vku_supabase_url') || 'https://your-project.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('vku_supabase_key') || 'your-anon-key';

export const isPlaceholderUrl = (url) => !url || url.includes('your-project.supabase.co');

const realClient = isPlaceholderUrl(defaultUrl) ? null : createClient(defaultUrl, defaultKey);

export const supabase = {
  auth: {
    async signUp({ email, password }) {
      if (realClient) {
        return await realClient.auth.signUp({ email, password });
      }
      return { data: { user: { id: 'demo-' + Date.now(), email } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      if (realClient) {
        return await realClient.auth.signInWithPassword({ email, password });
      }
      return { data: { user: { id: 'demo-user-' + email.split('@')[0], email } }, error: null };
    },
    async getSession() {
      if (realClient) {
        return await realClient.auth.getSession();
      }
      const savedUser = localStorage.getItem('vku_current_demo_user');
      return { data: { session: savedUser ? { user: JSON.parse(savedUser) } : null } };
    },
    async signOut() {
      if (realClient) {
        return await realClient.auth.signOut();
      }
      localStorage.removeItem('vku_current_demo_user');
      return { error: null };
    }
  },
  from(table) {
    if (realClient) {
      return realClient.from(table);
    }
    return {
      select() {
        return {
          eq(field, val) {
            return {
              async order() {
                const items = await db.offline_inspections.where(field).equals(val).toArray();
                return { data: items, error: null };
              },
              async single() {
                return { data: { role: val.includes('teacher') ? 'teacher' : 'student' }, error: null };
              }
            };
          },
          async order() {
            const items = await db.offline_inspections.toArray();
            return { data: items, error: null };
          }
        };
      },
      async insert(rows) {
        if (table === 'inspections') {
          for (const row of rows) {
            await db.offline_inspections.add(row);
          }
        }
        return { data: rows, error: null };
      },
      delete() {
        return {
          async eq(field, val) {
            if (table === 'inspections') {
              const all = await db.offline_inspections.toArray();
              const target = all.find(i => i.id === val || i.id === Number(val));
              if (target && target.id) {
                await db.offline_inspections.delete(target.id);
              }
            }
            return { error: null };
          }
        };
      }
    };
  }
};

export function updateSupabaseConfig(url, key) {
  if (url) localStorage.setItem('vku_supabase_url', url);
  if (key) localStorage.setItem('vku_supabase_key', key);
  window.location.reload();
}
