import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('vku_supabase_url') || 'https://your-project.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('vku_supabase_key') || 'your-anon-key';

export const isPlaceholderUrl = (url) => !url || url.includes('your-project.supabase.co');

const realClient = isPlaceholderUrl(defaultUrl) ? null : createClient(defaultUrl, defaultKey);

const syncChannel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('vku_survey_sync_channel') : null;

const getRegisteredUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('vku_registered_users') || '{}');
  } catch (e) {
    return {};
  }
};

const saveCloudProfile = (email, role, password) => {
  if (!email) return;
  const local = getRegisteredUsers();
  local[email.toLowerCase()] = { email, role, password };
  localStorage.setItem('vku_registered_users', JSON.stringify(local));
  saveUserRole(email, role);
  if (syncChannel) syncChannel.postMessage({ type: 'PROFILE_UPDATED' });
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
                if (table === 'survey_requests') {
                  const all = await db.survey_requests.toArray();
                  const items = all.filter(i => String(i[field]) === String(val));
                  return { data: items.reverse(), error: null };
                }
                const all = await db.cloud_inspections.toArray();
                const items = all.filter(i => String(i[field]) === String(val));
                return { data: items.reverse(), error: null };
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
            if (table === 'survey_requests') {
              const items = await db.survey_requests.toArray();
              return { data: items.reverse(), error: null };
            }
            if (table === 'inspections') {
              const items = await db.cloud_inspections.toArray();
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
        } else if (table === 'survey_requests') {
          for (const row of rows) {
            const cleanRow = { ...row };
            delete cleanRow.id;
            await db.survey_requests.add(cleanRow);
          }
          if (syncChannel) syncChannel.postMessage({ type: 'REQUEST_ADDED' });
        } else if (table === 'inspections') {
          for (const row of rows) {
            const cleanRow = { ...row };
            delete cleanRow.id;
            await db.cloud_inspections.add(cleanRow);
          }
          if (syncChannel) syncChannel.postMessage({ type: 'INSPECTION_ADDED' });
        }
        return { data: rows, error: null };
      },
      delete() {
        return {
          async eq(field, val) {
            if (table === 'survey_requests') {
              const allLocal = await db.survey_requests.toArray();
              const target = allLocal.find(i => String(i[field]) === String(val));
              if (target && target.id) {
                await db.survey_requests.delete(target.id);
              }
              if (syncChannel) syncChannel.postMessage({ type: 'REQUEST_DELETED' });
            } else if (table === 'inspections') {
              const allLocal = await db.cloud_inspections.toArray();
              const target = allLocal.find(i => String(i[field]) === String(val));
              if (target && target.id) {
                await db.cloud_inspections.delete(target.id);
              }
              if (syncChannel) syncChannel.postMessage({ type: 'INSPECTION_DELETED' });
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
