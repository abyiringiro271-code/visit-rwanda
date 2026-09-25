import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { supabase } from '@/lib/supabase';
import { formatFRW } from '@/lib/constants';
import AnimatedNumber from '../AnimatedNumber';
import {
  Copy, Check, Link2, UserPlus, Share2, RefreshCw,
  Crown, Gift, TrendingUp, Info, MessageCircle,
} from 'lucide-react';

interface Referral {
  full_name: string;
  phone: string;
  vip_tier: number;
  vip_name: string;
  vip_price: number;
  is_banned: boolean;
  created_at: string;
  commission_earned: number;
}

interface CommissionSummary {
  l1: { count: number; total: number; rate: number };
  l2: { count: number; total: number; rate: number };
  l3: { count: number; total: number; rate: number };
  grand_total: number;
}

const EMPTY_SUMMARY: CommissionSummary = {
  l1: { count: 0, total: 0, rate: 38 },
  l2: { count: 0, total: 0, rate: 2 },
  l3: { count: 0, total: 0, rate: 2 },
  grand_total: 0,
};

export default function TeamPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [refRes, sumRes] = await Promise.all([
      supabase.rpc('get_my_referrals'),
      supabase.rpc('get_my_commission_summary'),
    ]);
    if (!refRes.error && refRes.data) {
      setReferrals((refRes.data as any).referrals || []);
    }
    if (!sumRes.error && sumRes.data) {
      setSummary(sumRes.data as CommissionSummary);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!profile) return null;

  const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;
  const totalReferrals = referrals.length;
  const vipReferrals = referrals.filter((r) => r.vip_tier > 0).length;

  const copyCode = () => {
    navigator.clipboard.writeText(profile.referral_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1800);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  const shareWhatsApp = () => {
    const message = `Join Visit Rwanda and start earning!\nUse my referral code: ${profile.referral_code}\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    await refreshProfile();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <>
      <div className="ambient-glow" aria-hidden="true" />
      <div className="relative space-y-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 animate-fade-in-up stagger-1">
          <div>
            <h2 className="text-2xl font-extrabold text-navy font-display leading-tight">{t('teamTitle')}</h2>
            <p className="text-sm text-navy/50 mt-0.5">{t('teamDesc')}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF7A00 0%, #E56D00 100%)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>

        {/* Referral code hero */}
        <div
          className="relative overflow-hidden rounded-3xl shadow-card animate-fade-in-up stagger-2"
          style={{ background: 'linear-gradient(135deg, #4A7C59 0%, #6B9B7A 50%, #4A7C59 100%)' }}
        >
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5 blur-3xl animate-float-slow" />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-1.5 text-white/85">
                <Share2 className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wide">{t('yourInviteCode')}</span>
              </div>
              <button
                onClick={copyCode}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  codeCopied
                    ? 'bg-emerald-500 text-white shadow-mint-glow'
                    : 'bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 border border-white/25'
                }`}
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {codeCopied ? t('copied') : t('copy')}
              </button>
            </div>

            <p className="text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-wider mt-3 break-all">
              {profile.referral_code}
            </p>

            <button
              onClick={shareWhatsApp}
              className="mt-5 w-full py-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/25 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              {t('shareWhatsApp')}
            </button>
          </div>
        </div>

        {/* Referral link */}
        <div className="bg-white rounded-3xl shadow-card border border-navy/5 overflow-hidden animate-fade-in-up stagger-3">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Link2 className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-navy/50">{t('yourReferralLink')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 min-w-0 px-3.5 py-3 bg-light rounded-2xl text-xs font-mono text-navy/70 border border-navy/5 truncate"
              />
              <button
                onClick={copyLink}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-bold text-white transition-all active:scale-95 flex-shrink-0 ${
                  linkCopied ? 'bg-emerald-500 shadow-mint-glow' : 'bg-[#3B82F6] hover:bg-[#2563EB] shadow-md'
                }`}
              >
                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{linkCopied ? t('copied') : t('copy')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up stagger-4">
          <div className="relative overflow-hidden rounded-3xl p-5 shadow-card border border-navy/5 bg-white hover-lift">
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="relative text-center">
              <p className="text-4xl sm:text-5xl font-extrabold leading-none font-display text-emerald-500">
                <AnimatedNumber value={totalReferrals} />
              </p>
              <p className="text-[11px] font-bold text-navy/50 mt-3 uppercase tracking-wide">{t('totalReferrals')}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl p-5 shadow-card border border-navy/5 bg-white hover-lift">
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#3B82F6]/10 blur-2xl" />
            <div className="relative text-center">
              <p className="text-4xl sm:text-5xl font-extrabold leading-none font-display text-[#3B82F6]">
                <AnimatedNumber value={vipReferrals} />
              </p>
              <p className="text-[11px] font-bold text-navy/50 mt-3 uppercase tracking-wide">{t('activeVip')}</p>
            </div>
          </div>
        </div>

        {/* Commission section header */}
        <div className="flex items-center justify-between animate-fade-in-up stagger-5">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-navy/60" />
            <p className="text-sm font-bold text-navy font-display">{t('commissionEarned')}</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-[11px] font-bold hover:bg-[#3B82F6]/20 transition-all">
            <Info className="w-3 h-3" />
            {t('details')}
          </button>
        </div>

        {/* 3 commission level cards */}
        <div className="grid grid-cols-3 gap-2 animate-fade-in-up stagger-5">
          <LevelCard badge="L1" badgeColor="#3B82F6" title={t('directReferral')} rate={summary.l1.rate} earned={summary.l1.total} count={summary.l1.count} />
          <LevelCard badge="L2" badgeColor="#C98A66" title={t('theirDirectReferral')} rate={summary.l2.rate} earned={summary.l2.total} count={summary.l2.count} />
          <LevelCard badge="L3" badgeColor="#6B9B7A" title={t('level3Indirect')} rate={summary.l3.rate} earned={summary.l3.total} count={summary.l3.count} />
        </div>

        {/* Total earned */}
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-4 border animate-fade-in-up stagger-6"
          style={{ background: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3B82F6]" />
              <span className="text-sm font-bold text-[#3B82F6]">{t('totalEarned')}</span>
            </div>
            <p className="text-xl font-extrabold text-[#3B82F6] font-display">
              <AnimatedNumber value={summary.grand_total} />
              <span className="text-xs font-semibold ml-1.5">FRW</span>
            </p>
          </div>
        </div>

        {/* My Team list */}
        <div className="bg-white rounded-3xl shadow-card border border-navy/5 overflow-hidden animate-fade-in-up">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-navy font-display">{t('myTeam')}</p>
            {totalReferrals > 0 && (
              <span className="text-[10px] font-bold text-[#3B82F6] px-2.5 py-1 rounded-full bg-[#3B82F6]/10">
                {totalReferrals}
              </span>
            )}
          </div>

          {loading ? (
            <p className="px-5 pb-5 text-sm text-navy/40">{t('loading')}</p>
          ) : referrals.length === 0 ? (
            <div className="px-5 pb-5">
              <div className="rounded-2xl bg-light p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-orange-soft flex items-center justify-center mb-3 animate-float">
                  <UserPlus className="w-6 h-6 text-brand-orange" />
                </div>
                <p className="text-sm font-semibold text-navy mb-1">{t('noReferralsYet')}</p>
                <p className="text-xs text-navy/50 max-w-xs mx-auto">{t('noReferralsDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-navy/5 max-h-96 overflow-y-auto">
              {referrals.map((r, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-navy/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center font-bold flex-shrink-0">
                      {r.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{r.full_name || 'Unknown'}</p>
                      <p className="text-xs text-navy/40 truncate">
                        {r.phone || t('noPhone')} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {r.vip_tier > 0 ? (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-brand-gold-soft text-brand-orange flex items-center gap-1">
                          <Crown className="w-3 h-3" /> {r.vip_name || `VIP ${r.vip_tier}`}
                        </span>
                        <span className="text-[10px] font-semibold text-navy/50">
                          Paid {formatFRW(r.vip_price)}
                        </span>
                        {r.commission_earned > 0 && (
                          <span className="text-xs font-bold text-emerald-500">+{formatFRW(r.commission_earned)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-navy/30">No VIP yet</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LevelCard({
  badge, badgeColor, title, rate, earned, count,
}: {
  badge: string; badgeColor: string; title: string;
  rate: number; earned: number; count: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-3 border border-navy/5 bg-white shadow-card hover-lift">
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0"
          style={{ background: badgeColor }}
        >
          {badge}
        </span>
        <span className="text-[10px] font-bold text-navy/60 leading-tight">{title}</span>
      </div>

      <p className="text-[10px] font-bold text-navy/40 uppercase tracking-wide">Rate</p>
      <p className="text-lg font-extrabold text-navy font-display leading-tight mt-0.5">
        {rate}<span className="text-sm text-navy/50 ml-0.5">%</span>
      </p>
      <p className="text-[10px] text-navy/40 leading-snug">per VIP purchase</p>

      <div className="mt-2.5 pt-2.5 border-t border-navy/5">
        <p className="text-[10px] font-bold text-navy/40 uppercase tracking-wide">Earned</p>
        <p className="text-sm font-extrabold text-emerald-500 font-display leading-tight mt-0.5 break-all">
          {earned.toLocaleString()}<span className="text-[10px] text-navy/40 ml-0.5">FRW</span>
        </p>
        <p className="text-[10px] text-navy/40 mt-0.5">
          {count} {count === 1 ? 'purchase' : 'purchases'}
        </p>
      </div>
    </div>
  );
}