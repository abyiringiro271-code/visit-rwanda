import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import AuthScreen from '@/components/AuthScreen';
import AdminLogin from '@/components/AdminLogin';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import BannedScreen from '@/components/BannedScreen';
import DepositPage from '@/components/pages/DepositPage';
import { UserX, Home, Wrench } from 'lucide-react';

const AdminPortal = lazy(() => import('@/components/AdminPortal'));

// ─── Maintenance screen shown to non-admins when kill switch is on ────
function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-navy via-navy-light to-navy">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-5">
          <Wrench className="w-10 h-10 text-brand-orange" />
        </div>
        <h1 className="text-2xl font-extrabold text-white font-display mb-2">
          We'll be right back
        </h1>
        <p className="text-sm text-white/70 leading-relaxed mb-6">
          Visit Rwanda is currently under maintenance. We're making things better — please check back shortly.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/15 border border-brand-orange/30">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
          <span className="text-brand-orange text-xs font-semibold">Maintenance in progress</span>
        </div>
      </div>
    </div>
  );
}

function NotAuthorized() {
  const { signOut, profile } = useAuth();

  const handleSwitch = async () => {
    await signOut();
    window.location.reload();
  };

  const handleHome = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-light">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <UserX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-navy font-display mb-2">Not Authorized</h1>
        <p className="text-sm text-navy/60 mb-2">
          You're signed in as <span className="font-semibold text-navy">{profile?.phone || 'a regular user'}</span>.
        </p>
        <p className="text-sm text-navy/60 mb-6">
          This account doesn't have admin access. Sign in with an admin account to continue.
        </p>
        <div className="space-y-2.5">
          <button
            onClick={handleSwitch}
            className="w-full py-3 rounded-2xl orange-gradient text-white font-semibold shadow-orange-glow hover:brightness-110 transition-all"
          >
            Sign in with a different account
          </button>
          <button
            onClick={handleHome}
            className="w-full py-3 rounded-2xl bg-white border border-navy/10 text-navy font-semibold hover:bg-navy/5 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm font-medium">Loading…</div>
      </div>
    );
  }

  if (!user || !profile) return <AdminLogin />;
  if (!profile.is_admin) return <NotAuthorized />;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm font-medium">Loading admin…</div>
      </div>
    }>
      <AdminPortal />
    </Suspense>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Check maintenance mode on mount and every 30 seconds
  useEffect(() => {
    let cancelled = false;

    const checkConfig = async () => {
      const { data, error } = await supabase.rpc('get_app_config');
      if (cancelled) return;
      if (!error && data) {
        setMaintenanceOn((data as any).maintenance_mode === 'true');
      }
      setConfigLoaded(true);
    };

    checkConfig();
    const interval = setInterval(checkConfig, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading || !configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg mb-3 animate-pulse">
            <span className="text-3xl">🇷🇼</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading Visit Rwanda…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Admin route — bypasses maintenance */}
      <Route path="/admin" element={<AdminRoute />} />

      {/* Everything else — admin sees full app, others see maintenance when on */}
      <Route
        path="/*"
        element={
          maintenanceOn && (!profile || !profile.is_admin) ? (
            <MaintenanceScreen />
          ) : !user || !profile ? (
            <AuthScreen />
          ) : profile.is_banned ? (
            <BannedScreen />
          ) : !profile.onboarding_complete ? (
            <Onboarding />
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard isAdmin={profile.is_admin} />} />
              <Route path="/deposit" element={<DepositPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}