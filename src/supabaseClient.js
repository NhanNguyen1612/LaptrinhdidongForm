import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('vku_supabase_url') || 'https://your-project.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('vku_supabase_key') || 'your-anon-key';

export const isPlaceholderUrl = (url) => !url || url.includes('your-project.supabase.co');

const realClient = isPlaceholderUrl(defaultUrl) ? null : createClient(defaultUrl, defaultKey);

const CLOUD_INSPECTIONS_ENDPOINT = 'https://api.restful-api.dev/objects/ff808181a067127101a06f5c15de1544';
const CLOUD_PROFILES_ENDPOINT = 'https://api.restful-api.dev/objects/ff808181a067127101a06f5a63741541';

const getRegisteredUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('vku_registered_users') || '{}');
  } catch (e) {
    return {};
  }
};

const fetchCloudProfiles = async () => {
  try {
    const res = await fetch(CLOUD_PROFILES_ENDPOINT);
    if (!res.ok) return getRegisteredUsers();
    const json = await res.json();
    const remote = json?.data?.profiles || {};
    const local = getRegisteredUsers();
    const merged = { ...local, ...remote };
    localStorage.setItem('vku_registered_users', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return getRegisteredUsers();
  }
};

const saveCloudProfile = async (email, role, password) => {
  if (!email) return;
  const local = getRegisteredUsers();
  local[email.toLowerCase()] = { email, role, password };
  localStorage.setItem('vku_registered_users', JSON.stringify(local));
  saveUserRole(email, role);

  try {
    const remote = await fetchCloudProfiles();
    remote[email.toLowerCase()] = { email, role, password };
    await fetch(CLOUD_PROFILES_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'VKU_PROFILES_INDEX',
        data: { profiles: remote }
      })
    });
  } catch (e) {
    console.warn(e);
  }
};

export const registerLocalUser = (email, role, password) => {
  saveCloudProfile(email, role, password);
};

export const getRegisteredUser = (email) => {
  if (!email) return null;
  const users = getRegisteredUsers();
  return users[email.toLowerCase()] || null;
};

const getSavedRoles = () => {
  try {
    return JSON.parse(localStorage.getItem('vku_user_roles') || '{}');
  } catch (e) {
    return {};
  }
};

export const saveUserRole = (email, role) => {
  if (!email) return;
  const roles = getSavedRoles();
  roles[email.toLowerCase()] = role;
  localStorage.setItem('vku_user_roles', JSON.stringify(roles));
};

export const getUserRoleByEmail = (identifier) => {
  if (!identifier) return 'student';
  const roles = getSavedRoles();
  const lower = identifier.toLowerCase();
  if (roles[lower]) return roles[lower];

  const cleanId = lower.replace(/^user-|^demo-|^demo-user-/, '');
  for (const key in roles) {
    const keyLower = key.toLowerCase();
    if (keyLower === cleanId || keyLower.includes(cleanId) || cleanId.includes(keyLower)) {
      return roles[key];
    }
  }

  const users = getRegisteredUsers();
  for (const emailKey in users) {
    const emailLower = emailKey.toLowerCase();
    if (emailLower === cleanId || emailLower.includes(cleanId) || cleanId.includes(emailLower)) {
      return users[emailKey].role;
    }
  }

  if (lower.includes('teacher') || lower.includes('giangvien')) return 'teacher';
  return 'student';
};

const fetchCloudInspections = async () => {
  try {
    const res = await fetch(CLOUD_INSPECTIONS_ENDPOINT);
    if (!res.ok) throw new Error('Cloud fetch failed');
    const json = await res.json();
    return json?.data?.inspections || [];
  } catch (e) {
    return await db.cloud_inspections.toArray();
  }
};

const saveCloudInspections = async (items) => {
  try {
    await fetch(CLOUD_INSPECTIONS_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'VKU_SURVEY_INDEX',
        data: { inspections: items }
      })
    });
  } catch (e) {
    console.warn(e);
  }
};

export const supabase = {
  auth: {
    async signUp({ email, password }) {
      if (realClient) {
        return await realClient.auth.signUp({ email, password });
      }
      return { data: { user: { id: 'user-' + email.split('@')[0], email } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      if (realClient) {
        return await realClient.auth.signInWithPassword({ email, password });
      }
      await fetchCloudProfiles();
      const registered = getRegisteredUser(email);
      if (!registered) {
        return {
          data: { user: null },
          error: new Error('Tài khoản chưa được đăng ký! Vui lòng chọn "Chưa có tài khoản? Đăng ký ngay" phía dưới.')
        };
      }
      if (password && registered.password && registered.password !== password) {
        return {
          data: { user: null },
          error: new Error('Mật khẩu không chính xác! Vui lòng kiểm tra lại.')
        };
      }
      return { data: { user: { id: 'user-' + email.split('@')[0], email } }, error: null };
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
                if (table === 'profiles') {
                  return { data: [], error: null };
                }
                const items = await fetchCloudInspections();
                const filtered = items.filter(item => item[field] === val);
                return { data: filtered.reverse(), error: null };
              },
              async single() {
                if (table === 'profiles') {
                  const role = getUserRoleByEmail(val);
                  return { data: { role }, error: null };
                }
                return { data: null, error: null };
              }
            };
          },
          async order() {
            if (table === 'inspections') {
              const items = await fetchCloudInspections();
              return { data: items.reverse(), error: null };
            }
            return { data: [], error: null };
          }
        };
      },
      async insert(rows) {
        if (table === 'profiles') {
          for (const row of rows) {
            if (row.email && row.role) {
              saveUserRole(row.email, row.role);
            }
          }
        } else if (table === 'inspections') {
          const current = await fetchCloudInspections();
          const newItems = rows.map((r, index) => ({
            id: r.id || Date.now() + index,
            ...r
          }));
          const updated = [...current, ...newItems];
          await saveCloudInspections(updated);
          for (const item of newItems) {
            try { await db.cloud_inspections.add(item); } catch (e) {}
          }
        }
        return { data: rows, error: null };
      },
      delete() {
        return {
          async eq(field, val) {
            if (table === 'inspections') {
              const current = await fetchCloudInspections();
              const updated = current.filter(i => i.id !== val && i.id !== Number(val));
              await saveCloudInspections(updated);
              const allLocal = await db.cloud_inspections.toArray();
              const target = allLocal.find(i => i.id === val || i.id === Number(val));
              if (target && target.id) {
                await db.cloud_inspections.delete(target.id);
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
