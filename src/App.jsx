import React, { useState, useEffect } from 'react';
import { supabase, getUserRoleByEmail } from './supabaseClient';
import { db } from './db';
import Login from './components/Login';
import StudentForm from './components/StudentForm';
import TeacherDashboard from './components/TeacherDashboard';
import { LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkUserSession();

    const handleOnline = async () => {
      setIsOnline(true);
      await triggerAutoSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      let detectedRole = getUserRoleByEmail(session.user.email);
      const savedRole = localStorage.getItem('vku_current_user_role_' + session.user.email);
      if (savedRole) detectedRole = savedRole;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (profile?.role) detectedRole = profile.role;

      setRole(detectedRole);
    }
    setLoading(false);
  };

  const triggerAutoSync = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const offlineItems = await db.offline_inspections.toArray();
      if (offlineItems.length > 0) {
        for (const item of offlineItems) {
          const { id, ...cleanPayload } = item;
          const { error } = await supabase.from('inspections').insert([cleanPayload]);
          if (!error) {
            await db.offline_inspections.delete(id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLoginSuccess = (userObj, userRole) => {
    setUser(userObj);
    setRole(userRole);
    if (navigator.onLine) triggerAutoSync();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('student');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 font-medium">
        Đang khởi động ứng dụng...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg">VKU Field Survey</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
              role === 'teacher' ? 'bg-amber-400 text-amber-950' : 'bg-blue-700 text-blue-100'
            }`}>
              {role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Wifi size={14} /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-300 font-medium">
                  <WifiOff size={14} /> Offline
                </span>
              )}
              {syncing && <RefreshCw size={14} className="animate-spin text-white" />}
            </div>

            <div className="hidden sm:block text-right">
              <span className="block text-xs text-blue-200">{user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-blue-800 rounded-lg text-blue-100 hover:text-white transition"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {role === 'student' ? <StudentForm user={user} /> : <TeacherDashboard />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        VKU Field Survey PWA &copy; 2026 — Offline-First Architecture
      </footer>
    </div>
  );
}
