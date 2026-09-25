import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { useConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Send, Check, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const { config } = useConfig();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const handleSkip = async (which: 'telegram' | 'whatsapp') => {
    setBusy(true);
    setError(null);
    const field = which === 'telegram' ? 'telegram_joined' : 'whatsapp_joined';
    await supabase.from('profiles').update({ [field]: false }).eq('user_id', profile.user_id);
    await refreshProfile();
    setBusy(false);
  };

  const handleJoin = async (which: 'telegram' | 'whatsapp') => {
    setBusy(true);
    setError(null);
    const field = which === 'telegram' ? 'telegram_joined' : 'whatsapp_joined';
    const { error } = await supabase.from('profiles').update({ [field]: true }).eq('user_id', profile.user_id);
    if (error) setError(t('error'));
    await refreshProfile();
    setBusy(false);
  };

  const handleContinue = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('user_id', profile.user_id);
    if (error) setError(t('error'));
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-light">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl navy-gradient flex items-center justify-center shadow-card mb-3 overflow-hidden">
            <img src="/logo.png" alt="Visit Rwanda" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy font-display">{t('onboardingWelcome')}</h1>
          <p className="text-navy/50 text-sm mt-1">{t('onboardingSubtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-navy/5 p-6 space-y-3">
          <OnboardingCard
            icon={<Send className="w-5 h-5" />}
            title={t('onboardingTelegram')}
            subtitle={t('onboardingTelegramSub')}
            joined={profile.telegram_joined}
            link={config.telegram_link}
            onJoin={() => handleJoin('telegram')}
            onSkip={() => handleSkip('telegram')}
            busy={busy}
            joinLabel={t('onboardingJoin')}
            skipLabel={t('onboardingSkip')}
            joinedLabel={t('onboardingJoined')}
          />

          <OnboardingCard
            icon={<MessageCircle className="w-5 h-5" />}
            title={t('onboardingWhatsapp')}
            subtitle={t('onboardingWhatsappSub')}
            joined={profile.whatsapp_joined}
            link={config.whatsapp_link}
            onJoin={() => handleJoin('whatsapp')}
            onSkip={() => handleSkip('whatsapp')}
            busy={busy}
            joinLabel={t('onboardingJoin')}
            skipLabel={t('onboardingSkip')}
            joinedLabel={t('onboardingJoined')}
          />

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">{error}</div>}

          <button
            onClick={handleContinue}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-orange-glow orange-gradient hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {t('onboardingContinue')} <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-navy/40 text-center">{t('onboardingSkipNote')}</p>
        </div>
      </div>
    </div>
  );
}

function OnboardingCard({
  icon, title, subtitle, joined, link, onJoin, onSkip, busy, joinLabel, skipLabel, joinedLabel,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  joined: boolean; link: string; onJoin: () => void; onSkip: () => void; busy: boolean;
  joinLabel: string; skipLabel: string; joinedLabel: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-navy/5 hover:border-brand-orange/30 transition-all hover-lift">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 text-white ${
        joined ? 'gold-gradient' : 'orange-gradient'
      }`}>
        {joined ? <Check className="w-5 h-5" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-navy">{title}</p>
        <p className="text-xs text-navy/50">{subtitle}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!joined ? (
          <>
            <a href={link} target="_blank" rel="noopener noreferrer"
              onClick={onJoin}
              className="px-3.5 py-2 rounded-xl orange-gradient text-white text-xs font-semibold hover:brightness-110 transition-all">
              {joinLabel}
            </a>
            <button onClick={onSkip} disabled={busy}
              className="px-3 py-2 rounded-xl bg-navy/5 text-navy/50 text-xs font-semibold hover:bg-navy/10 transition-all">
              {skipLabel}
            </button>
          </>
        ) : (
          <span className="text-xs font-semibold text-brand-orange px-2">{joinedLabel}</span>
        )}
      </div>
    </div>
  );
}