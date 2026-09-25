import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { useConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { formatFRW, WITHDRAWAL_AMOUNTS, VIP_TIERS } from '@/lib/constants';
import CommunityLinks from '../CommunityLinks';
import {
  ArrowDownToLine, ArrowUpFromLine, Phone,
  Calendar, Clock, CheckCircle2, AlertCircle, X, Crown, Zap,
} from 'lucide-react';

type Tab = 'home' | 'product' | 'task' | 'team' | 'me';

const DAY_TO_NUMBER: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const DAY_TO_KEY: Record<string, any> = {
  mon: 'dayMonday', tue: 'dayTuesday', wed: 'dayWednesday',
  thu: 'dayThursday', fri: 'dayFriday', sat: 'daySaturday', sun: 'daySunday',
};

function getScheduleCode(vipTier: number, config: any): string | null {
  if (vipTier >= 1 && vipTier <= 3) return config.withdraw_day_vip_1_3;
  if (vipTier >= 4 && vipTier <= 6) return config.withdraw_day_vip_4_6;
  if (vipTier >= 7 && vipTier <= 8) return config.withdraw_day_vip_7_8;
  return null;
}

export default function HomePage({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const { config } = useConfig();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedWithdrawAmount, setSelectedWithdrawAmount] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadRecords();
  }, [profile]);

  const loadRecords = useCallback(async () => {
    const { data } = await supabase
      .from('wallet_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecords(data ?? []);
  }, []);

  if (!profile) return null;

  const activeVip = VIP_TIERS.find((v) => v.tier === profile.vip_tier);
  const firstName = profile.full_name?.split(' ')[0] || '';

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const scheduleCode = getScheduleCode(profile.vip_tier, config);
  const allowedDayNum = scheduleCode ? DAY_TO_NUMBER[scheduleCode] : null;
  const dayLabel = scheduleCode ? t(DAY_TO_KEY[scheduleCode]) : '';
  const startHour = parseInt(config.withdraw_start_hour) || 7;
  const endHour = parseInt(config.withdraw_end_hour) || 17;
  const isRightDay = allowedDayNum !== null && currentDay === allowedDayNum;
  const isRightHour = currentHour >= startHour && currentHour < endHour;
  const eligible = profile.vip_tier > 0 && isRightDay && isRightHour;

  let statusTitle = '';
  let statusSubtitle = '';
  if (profile.vip_tier === 0) {
    statusTitle = t('noVips');
    statusSubtitle = t('noVipsDesc');
  } else if (eligible) {
    statusTitle = t('withdrawAvailable');
    statusSubtitle = t('withdrawApprovalNote');
  } else if (!isRightDay) {
    statusTitle = `${t('withdrawOpensOn')} ${dayLabel}`;
    statusSubtitle = `${startHour}:00 – ${endHour}:00`;
  } else if (currentHour < startHour) {
    statusTitle = t('withdrawOpensAt');
    statusSubtitle = `${startHour}:00 – ${endHour}:00`;
  } else {
    statusTitle = t('withdrawClosedForToday');
    statusSubtitle = `${startHour}:00 – ${endHour}:00`;
  }

  const handleWithdraw = async () => {
    if (!selectedWithdrawAmount || !phone.trim()) {
      setMsg({ type: 'error', text: t('withdrawValidPhone') });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc('submit_withdrawal', { p_amount: selectedWithdrawAmount, p_phone: phone });
    setBusy(false);
    if (error) {
      const m = error.message.includes('Insufficient') ? t('withdrawInsufficient')
        : error.message.includes('Minimum') ? t('withdrawMinAmount')
        : error.message.includes('pending') ? t('withdrawAlreadyRequested')
        : error.message.includes('only available on') ? error.message
        : error.message.includes(':00') ? error.message
        : error.message.includes('VIP plan') ? t('noVips')
        : error.message || t('withdrawSomethingWrong');
      setMsg({ type: 'error', text: m });
      return;
    }
    if (data) {
      setMsg({ type: 'success', text: (data as any).message || t('withdrawSuccess') });
      setSelectedWithdrawAmount(null);
      setPhone('');
      await refreshProfile();
      await loadRecords();
    }
  };

  const totalDeposit = records.filter((r) => r.request_type === 'deposit' && r.status === 'approved').reduce((s, r) => s + r.amount, 0);
  const totalWithdraw = records.filter((r) => r.request_type === 'withdrawal').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="w-full space-y-5 md:space-y-6 animate-fade-in">

      {/* ═══════════ HERO ═══════════ */}
      <div className="hero-gradient rounded-2xl p-5 md:p-7">
        <div className="md:flex md:items-center md:justify-between md:gap-8">
          <div className="min-w-0 md:flex-shrink-0">
            <p className="text-white/65 text-xs font-medium mb-3">
              {t('welcomeBack')}{firstName && `, ${firstName}`}
            </p>
            <p className="text-white/55 text-[11px] font-bold uppercase tracking-widest mb-1">
              {t('currentBalance')}
            </p>
            <p className="text-white font-extrabold font-display leading-none flex items-baseline gap-2">
              <span className="text-[36px] md:text-[44px]">{profile.balance.toLocaleString()}</span>
              <span className="text-base font-semibold text-white/60">FRW</span>
            </p>
          </div>

          <div className="mt-5 md:mt-0 md:w-2/3 md:flex-shrink-0">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button
                onClick={() => navigate('/deposit')}
                className="py-4 md:py-6 rounded-xl md:rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                }}
              >
                <ArrowDownToLine className="w-5 h-5" />
                {t('deposit')}
              </button>
              <button
                onClick={() => { setShowWithdraw(true); setMsg(null); }}
                className="py-4 md:py-6 rounded-xl md:rounded-2xl font-bold text-sm md:text-base border-2 flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98] transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF7A00 0%, #E56D00 100%)',
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                <ArrowUpFromLine className="w-5 h-5" />
                {t('withdraw')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ COLORFUL STAT TILES ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label={t('totalDeposit')}
          value={formatFRW(totalDeposit)}
          icon={<ArrowDownToLine className="w-4 h-4" />}
          bg="linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)"
          fg="#1D4ED8"
        />
        <MiniStat
          label={t('totalWithdrawal')}
          value={formatFRW(totalWithdraw)}
          icon={<ArrowUpFromLine className="w-4 h-4" />}
          bg="linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)"
          fg="#BE123C"
        />
        <MiniStat
          label={t('activePlan')}
          value={activeVip ? activeVip.name : '—'}
          icon={<Crown className="w-4 h-4" />}
          bg="linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
          fg="#B45309"
        />
        <MiniStat
          label={t('perTaskShort')}
          value={activeVip ? formatFRW(activeVip.rate) : '—'}
          icon={<Zap className="w-4 h-4" />}
          bg="linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)"
          fg="#047857"
        />
      </div>

      {/* ═══════════ COMMUNITY LINKS ═══════════ */}
      <CommunityLinks />

      {/* ═══════════ TWO CARDS SIDE-BY-SIDE ═══════════ */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white rounded-2xl p-6 border border-navy/5">
          <p className="text-base font-bold text-navy font-display mb-4">{t('whatIsHMA')}</p>
          <div className="space-y-3.5 text-sm text-navy/65 leading-relaxed">
            <p>{t('whatIsHMADesc1')}</p>
            <p>{t('whatIsHMADesc2')}</p>
            <p>{t('whatIsHMADesc3')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-navy/5">
          <p className="text-base font-bold text-navy font-display mb-5">{t('howToStart')}</p>
          <div className="space-y-5">
            <StepRow n={1} text={t('step1')} />
            <StepRow n={2} text={t('step2')} />
            <StepRow n={3} text={t('step3')} />
            <StepRow n={4} text={t('step4')} />
          </div>
        </div>
      </div>

      {/* ═══════════ RECENT TRANSACTIONS ═══════════ */}
      <div className="bg-white rounded-2xl border border-navy/5 overflow-hidden">
        <p className="px-6 pt-5 pb-3 text-sm font-semibold text-navy font-display">{t('recentTransactions')}</p>
        {records.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-navy/40">{t('noTransactionsYet')}</p>
        ) : (
          <div className="divide-y divide-navy/5">
            {records.map((r) => {
              const isDeposit = r.request_type === 'deposit';
              const statusColor = r.status === 'approved'
                ? 'text-emerald-600'
                : r.status === 'pending'
                ? 'text-amber-600'
                : 'text-red-500';
              const statusLabel = r.status === 'approved' ? t('approved') : r.status === 'pending' ? t('pending') : t('declined');
              return (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">{isDeposit ? t('deposit') : t('withdraw')}</p>
                    <p className="text-xs text-navy/40 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-navy">{formatFRW(r.amount)}</p>
                    <p className={`text-[11px] font-medium mt-0.5 ${statusColor}`}>{statusLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════ WITHDRAW MODAL ═══════════ */}
      {showWithdraw && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setShowWithdraw(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between border-b border-navy/5 z-10">
              <p className="text-base font-bold text-navy font-display">{t('withdrawTitle')}</p>
              <button
                onClick={() => setShowWithdraw(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-navy/40 hover:bg-navy/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className={`rounded-xl p-3.5 flex items-start gap-3 ${
                eligible ? 'bg-emerald-50' : 'bg-amber-50'
              }`}>
                {eligible ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {statusTitle}
                  </p>
                  <p className={`text-xs mt-0.5 ${eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {statusSubtitle}
                  </p>
                  {profile.vip_tier > 0 && scheduleCode && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1 font-medium ${eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                        <Calendar className="w-3 h-3" /> {dayLabel}
                      </span>
                      <span className={`inline-flex items-center gap-1 font-medium ${eligible ? 'text-emerald-700' : 'text-amber-700'}`}>
                        <Clock className="w-3 h-3" /> {startHour}:00 – {endHour}:00
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-navy/60 mb-2">
                  {t('withdrawSelectAmountLabel')}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {WITHDRAWAL_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setSelectedWithdrawAmount(amt)}
                      disabled={!eligible}
                      className={`py-2.5 px-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        selectedWithdrawAmount === amt
                          ? 'border-navy bg-navy text-white'
                          : 'border-navy/10 bg-white text-navy/70 hover:border-navy/25'
                      }`}
                    >
                      {(amt / 1000)}k
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy/60 mb-2">
                  {t('withdrawPhoneLabel')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('withdrawPhonePlaceholder')}
                    disabled={!eligible}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-navy/15 text-sm text-navy focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5 transition-all bg-white disabled:opacity-50"
                  />
                </div>
              </div>

              {msg && (
                <div className={`text-sm rounded-xl px-4 py-3 ${
                  msg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {msg.text}
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={busy || !selectedWithdrawAmount || !eligible}
                className="w-full py-3.5 rounded-xl font-semibold bg-navy text-white hover:bg-navy-light active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? t('withdrawSubmitting') : !eligible ? t('withdrawClosedTitle') : t('withdrawSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label, value, icon, bg, fg,
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; fg: string;
}) {
  return (
    <div className="rounded-2xl p-4 border border-navy/5 flex items-center gap-3"
      style={{ background: bg }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.6)', color: fg }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide truncate" style={{ color: fg, opacity: 0.75 }}>
          {label}
        </p>
        <p className="text-sm font-bold truncate mt-0.5" style={{ color: fg }}>{value}</p>
      </div>
    </div>
  );
}

function StepRow({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-navy/5 text-navy/50 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
        {n}
      </div>
      <p className="text-sm text-navy/60 leading-relaxed">{text}</p>
    </div>
  );
}