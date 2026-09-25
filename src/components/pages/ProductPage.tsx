import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { supabase } from '@/lib/supabase';
import { VIP_TIERS, formatFRW } from '@/lib/constants';
import { Check, Crown, TrendingUp, ListTodo, Coins, Loader2 } from 'lucide-react';

export default function ProductPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!profile) return null;

  const handleBuy = async (tier: number) => {
    setBusy(tier);
    setMsg(null);
    const { data, error } = await supabase.rpc('purchase_vip', { p_tier: tier });
    setBusy(null);
    if (error) {
      setMsg({ type: 'error', text: error.message || t('vipPurchaseInsufficient') });
      return;
    }
    if (data) {
      setMsg({ type: 'success', text: `${(data as any).tier} ${t('vipPurchaseSuccess')}` });
      await refreshProfile();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-navy font-display">{t('vipProducts')}</h2>
        <p className="text-sm text-navy/50 mt-0.5">{t('choosePlan')}</p>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-card border border-navy/5 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-navy/50 font-semibold uppercase tracking-wide">{t('walletBalance')}</p>
          <p className="text-xl font-extrabold text-navy mt-0.5 font-display">{formatFRW(profile.balance)}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-brand-orange-soft flex items-center justify-center">
          <Coins className="w-6 h-6 text-brand-orange" />
        </div>
      </div>

      {profile.vip_tier > 0 && (
        <div className="rounded-3xl p-4 text-white shadow-card gold-gradient relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-5 h-5" />
              <span className="font-bold font-display">
                {t('yourActivePlan')}: {VIP_TIERS.find((v) => v.tier === profile.vip_tier)?.name}
              </span>
            </div>
            <p className="text-sm opacity-90">
              {t('daily')}: {formatFRW(VIP_TIERS.find((v) => v.tier === profile.vip_tier)?.daily ?? 0)}
            </p>
          </div>
        </div>
      )}

      {msg && (
        <div className={`text-sm rounded-2xl px-4 py-3 animate-scale-in ${
          msg.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {VIP_TIERS.map((vip) => {
          const isActive = profile.vip_tier === vip.tier;
          const canAfford = profile.balance >= vip.price;
          return (
            <div
              key={vip.tier}
              className={`bg-white rounded-3xl shadow-card overflow-hidden border-2 transition-all hover-lift ${
                isActive ? 'border-brand-orange/40 ring-4 ring-brand-orange/5' : 'border-navy/5'
              }`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${vip.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-navy font-display">{vip.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-orange-soft text-brand-orange text-[10px] font-bold uppercase tracking-wide">
                          {t('active')}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-extrabold text-navy mt-1 font-display">{formatFRW(vip.price)}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${vip.color} flex items-center justify-center text-white shadow-md`}>
                    <Crown className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Feature icon={<TrendingUp className="w-4 h-4" />} label={t('daily')} value={formatFRW(vip.daily)} />
                  <Feature icon={<ListTodo className="w-4 h-4" />} label={t('tasks')} value={`${vip.tasks}${t('perDay')}`} />
                  <Feature icon={<Coins className="w-4 h-4" />} label={t('perTask')} value={formatFRW(vip.rate)} />
                </div>

                {!isActive && (
                  <button
                    onClick={() => handleBuy(vip.tier)}
                    disabled={busy !== null || !canAfford}
                    className={`mt-4 w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      canAfford
                        ? 'orange-gradient text-white shadow-orange-glow hover:brightness-110 active:scale-[0.98]'
                        : 'bg-navy/5 text-navy/40'
                    } disabled:opacity-60`}
                  >
                    {busy === vip.tier ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t('vipPurchaseSubmitting')}</>
                    ) : canAfford ? (
                      <>{t('buyNow')}</>
                    ) : (
                      <>{t('needMore')} {formatFRW(vip.price - profile.balance)} {t('more')}</>
                    )}
                  </button>
                )}

                {isActive && (
                  <div className="mt-4 pt-4 border-t border-navy/5 text-center">
                    <span className="text-xs font-bold uppercase tracking-wide text-brand-orange">✓ {t('active')}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl p-5 bg-brand-orange-soft border border-brand-orange/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl orange-gradient flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div className="text-xs text-navy/80 space-y-1.5">
            <p className="font-bold text-navy text-sm">{t('howItWorks')}</p>
            <p>1. {t('howItWorksStep1')}</p>
            <p>2. {t('howItWorksStep2')}</p>
            <p>3. {t('howItWorksStep3')}</p>
            <p>4. {t('howItWorksStep4')}</p>
            <p>5. {t('howItWorksStep5')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-light rounded-2xl p-2.5 text-center">
      <div className="flex items-center justify-center text-navy/40 mb-1">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className="text-xs font-bold text-navy mt-0.5">{value}</p>
    </div>
  );
}