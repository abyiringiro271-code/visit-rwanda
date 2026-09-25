import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { supabase } from '@/lib/supabase';
import { VIP_TIERS, TASK_IMAGES, formatFRW } from '@/lib/constants';
import { Loader2, Check, Lock, Sparkles, Image as ImageIcon, Coins, Zap } from 'lucide-react';
import AnimatedNumber from '../AnimatedNumber';

export default function TaskPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalTaskEarnings, setTotalTaskEarnings] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [justEarned, setJustEarned] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
      .gte('completed_at', today + 'T00:00:00')
      .lte('completed_at', today + 'T23:59:59');
    setCompletedToday(count ?? 0);

    const { data } = await supabase
      .from('task_completions')
      .select('earned_amount')
      .eq('user_id', profile.user_id);
    const sum = (data ?? []).reduce((acc, r) => acc + (r.earned_amount || 0), 0);
    setTotalTaskEarnings(sum);
  }, [profile]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (!profile) return null;

  const vip = VIP_TIERS.find((v) => v.tier === profile.vip_tier);
  const noVip = profile.vip_tier === 0;
  const tasksDone = completedToday >= (vip?.tasks ?? 0);
  const progress = vip ? (completedToday / vip.tasks) * 100 : 0;

  const handleCompleteTask = async () => {
    if (noVip || tasksDone) return;
    setBusy(true);
    setMsg(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const { data, error } = await supabase.rpc('complete_task');
    setLoading(false);
    setBusy(false);
    if (error) {
      const m = error.message.includes('limit')
        ? t('dailyLimitReached')
        : error.message.includes('No VIP')
        ? t('buyVipFirst')
        : t('couldNotComplete');
      setMsg({ type: 'error', text: m });
      return;
    }
    if (data) {
      const earned = (data as any).earned;
      setJustEarned(earned);
      setMsg({ type: 'success', text: `${t('justEarnedPrefix')} ${formatFRW(earned)}` });
      setCompletedToday((c) => c + 1);
      setTotalTaskEarnings((t) => t + earned);
      setCurrentImage((i) => (i + 1) % TASK_IMAGES.length);
      await refreshProfile();
      setTimeout(() => setJustEarned(null), 2500);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (noVip) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h2 className="text-2xl font-extrabold text-navy font-display">{t('tasks')}</h2>
        <div className="bg-white rounded-3xl p-8 shadow-card border border-navy/5 text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-navy/5 flex items-center justify-center mb-4 animate-float">
            <Lock className="w-8 h-8 text-navy/30" />
          </div>
          <h3 className="text-lg font-bold text-navy mb-1 font-display">{t('noVipActive')}</h3>
          <p className="text-sm text-navy/50 max-w-xs mx-auto">{t('noVipActiveDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative flex flex-col animate-fade-in" style={{ minHeight: 'calc(100dvh - 200px)' }}>

        <div className="flex items-center justify-between mb-3 flex-shrink-0 animate-fade-in-up stagger-1">
          <div>
            <h2 className="text-xl font-extrabold text-navy font-display leading-tight">{t('tasks')}</h2>
            <p className="text-xs text-navy/50 mt-0.5">
              {vip?.name} · {formatFRW(vip?.rate ?? 0)} {t('perTask')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">{t('todayProgress')}</p>
            <p className="text-lg font-extrabold text-brand-orange font-display leading-none">
              {completedToday}<span className="text-navy/30 text-sm"> / {vip?.tasks}</span>
            </p>
          </div>
        </div>

        <div className="mb-3 flex-shrink-0 animate-fade-in-up stagger-2">
          <div className="h-2 bg-white rounded-full overflow-hidden border border-navy/5">
            <div
              className="h-full rounded-full transition-all duration-700 orange-gradient-live animate-gradient-x"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white shadow-card flex-shrink-0 mb-3 animate-fade-in-up stagger-3 hover-lift"
          style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #E56D00 100%)' }}
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-3xl animate-float-slow" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{t('taskEarnings')}</p>
              <p className="text-[32px] font-extrabold leading-none font-display mt-2">
                <AnimatedNumber value={totalTaskEarnings} />
                <span className="text-sm font-semibold ml-2 text-white/70">FRW</span>
              </p>
              <p className="text-[11px] text-white/70 mt-2">{t('taskEarningsDesc')}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0 animate-float">
              <Coins className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-navy/5 overflow-hidden flex-1 flex flex-col min-h-[200px] animate-fade-in-up stagger-4">
          <div className="relative flex-1 bg-navy/5 min-h-[140px]">
            <img
              src={TASK_IMAGES[currentImage].url}
              alt={TASK_IMAGES[currentImage].label}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out"
              style={{ transform: loading ? 'scale(1.08)' : 'scale(1)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-white">
              <Sparkles className="w-4 h-4 text-brand-gold flex-shrink-0 animate-float" />
              <span className="text-sm font-semibold font-display truncate">{TASK_IMAGES[currentImage].label}</span>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-navy/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-fade-in">
                <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
                <p className="text-sm font-semibold text-white">{t('loadingTask')}</p>
              </div>
            )}
            {justEarned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="orange-gradient text-white px-6 py-3 rounded-2xl shadow-orange-glow flex items-center gap-2 animate-bounce-in">
                  <Check className="w-5 h-5" />
                  <span className="font-bold font-display">+{justEarned} FRW</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 flex-shrink-0 space-y-3">
            {msg && (
              <div className={`text-xs rounded-xl px-3 py-2 text-center animate-scale-in ${
                msg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {msg.text}
              </div>
            )}

            <button
              onClick={handleCompleteTask}
              disabled={busy || tasksDone || loading}
              className={`w-full py-3.5 rounded-2xl font-bold text-white orange-gradient shadow-orange-glow active:scale-[0.97] transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
                !busy && !tasksDone && !loading ? 'animate-pulse-glow' : ''
              }`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('loadingTask')}</>
              ) : tasksDone ? (
                <><Check className="w-4 h-4" /> {t('allDoneToday')}</>
              ) : (
                <><Zap className="w-4 h-4" /> {t('completeTask')} · +{formatFRW(vip?.rate ?? 0)}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}