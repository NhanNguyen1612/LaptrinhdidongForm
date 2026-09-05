import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const defaultUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('vku_supabase_url') || 'https://your-project.supabase.co';
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('vku_supabase_key') || 'your-anon-key';

export const isPlaceholderUrl = (url) => !url || url.includes('your-project.supabase.co');

const realClient = isPlaceholderUrl(defaultUrl) ? null : createClient(defaultUrl, defaultKey);

const getRegisteredUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('vku_registered_users') || '{}');
  } catch (e) {
    return {};
  }
};

export const registerLocalUser = (email, role, password) => {
  if (!email) return;
  const users = getRegisteredUsers();
  users[email.toLowerCase()] = { email, role, password };
  localStorage.setItem('vku_registered_users', JSON.stringify(users));
  saveUserRole(email, role);
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

export const getUserRoleByEmail = (email) => {
  if (!email) return 'student';
  const roles = getSavedRoles();
  const lower = email.toLowerCase();
  if (roles[lower]) return roles[lower];
  const userObj = getRegisteredUser(email);
  if (userObj?.role) return userObj.role;
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
                const items = await db.cloud_inspections.where(field).equals(val).toArray();
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
        } else if (table === 'inspections') {
          for (const row of rows) {
            await db.cloud_inspections.add(row);
          }
        }
        return { data: rows, error: null };
      },
      delete() {
        return {
          async eq(field, val) {
            if (table === 'inspections') {
              const all = await db.cloud_inspections.toArray();
              const target = all.find(i => i.id === val || i.id === Number(val));
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
