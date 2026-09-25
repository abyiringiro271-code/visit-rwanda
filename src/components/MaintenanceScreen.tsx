import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { Wrench, LogOut, RefreshCw } from 'lucide-react';

export default function MaintenanceScreen() {
  const { profile, signOut } = useAuth();
  const { t } = useLang();

  return (
    <div
      className="min-h-screen navy-gradient flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      <div
        className="pointer-events-none absolute top-[-10%] right-[-5%] w-[380px] h-[380px] rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(circle, #FF7A00 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-15%] left-[-10%] w-[440px] h-[440px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #3DD68C 0%, transparent 70%)' }}
      />

      <div className="relative max-w-md w-full text-center animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center mb-6">
          <Wrench className="w-10 h-10 text-brand-orange animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display leading-tight mb-3">
          {t('maintenanceTitle')}
        </h1>

        <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto mb-6">
          {t('maintenanceDesc')}
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange" />
          </span>
          <span className="text-white/70 text-xs font-semibold">{t('maintenanceInProgress')}</span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-2xl orange-gradient text-white text-sm font-bold shadow-orange-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('maintenanceCheckAgain')}
          </button>

          {profile && (
            <button
              onClick={signOut}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {t('maintenanceSignOut')}
            </button>
          )}
        </div>

        <p className="text-white/30 text-[11px] mt-6">{t('maintenanceThanks')}</p>
      </div>
    </div>
  );
}