import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { ShieldBan, LogOut } from 'lucide-react';

export default function BannedScreen() {
  const { profile, signOut } = useAuth();
  const { t } = useLang();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 navy-gradient">
      <div className="w-full max-w-md text-center animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <ShieldBan className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white font-display mb-2">{t('bannedTitle')}</h1>
        <p className="text-white/60 text-sm mb-5">{t('bannedDesc')}</p>
        {profile?.admin_note && (
          <div className="glass-card rounded-2xl p-4 border border-white/10 mb-5">
            <p className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-1">{t('bannedReason')}</p>
            <p className="text-sm text-white/90">{profile.admin_note}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="px-6 py-3 rounded-2xl orange-gradient text-white text-sm font-semibold shadow-orange-glow hover:brightness-110 transition-all inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> {t('signOut')}
        </button>
      </div>
    </div>
  );
}