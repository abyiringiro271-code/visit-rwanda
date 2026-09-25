import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { supabase } from '@/lib/supabase';
import { VIP_TIERS, formatFRW } from '@/lib/constants';
import Logo from '../Logo';
import { User as UserIcon, Phone, Crown, Wallet, Calendar, Edit2, Check, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function MePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setPhone(profile.phone);
    }
  }, [profile]);

  const loadRecords = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallet_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRecords(data ?? []);
  }, [profile]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  if (!profile) return null;

  const vip = VIP_TIERS.find((v) => v.tier === profile.vip_tier);

  const handleSave = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, phone: phone })
      .eq('user_id', profile.user_id);
    setBusy(false);
    if (!error) {
      await refreshProfile();
      setEditing(false);
    }
  };

  const totalDeposit = records.filter((r) => r.request_type === 'deposit' && r.status === 'approved').reduce((s, r) => s + r.amount, 0);
  const totalWithdraw = records.filter((r) => r.request_type === 'withdrawal').reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-3xl shadow-card navy-gradient">
        <div className="relative p-5">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <Logo size={64} className="ring-2 ring-white/20" />
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1 rounded-xl bg-white/15 text-white placeholder-white/50 text-sm focus:outline-none border border-white/20"
                  placeholder={t('enterName')}
                />
              ) : (
                <h2 className="text-lg font-extrabold truncate font-display">
                  {profile.full_name || t('notSet')}
                </h2>
              )}
              <p className="text-sm text-white/60 truncate mt-0.5">
                {profile.phone || t('noPhone')}
              </p>
              {vip && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full gold-gradient text-[11px] font-bold">
                  <Crown className="w-3 h-3" /> {vip.name}
                </span>
              )}
            </div>
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={busy}
              className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition-all"
            >
              {editing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          </div>

          {editing && (
            <div className="relative mt-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none border border-white/20"
                  placeholder={t('phoneNumber')}
                />
              </div>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Balance summary */}
      <div className="bg-white rounded-3xl p-5 shadow-card border border-navy/5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="w-11 h-11 mx-auto rounded-2xl bg-brand-orange-soft text-brand-orange flex items-center justify-center mb-2">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-navy/40">{t('balance')}</p>
            <p className="text-xs font-bold text-navy mt-0.5">{formatFRW(profile.balance)}</p>
          </div>
          <div>
            <div className="w-11 h-11 mx-auto rounded-2xl navy-gradient text-white flex items-center justify-center mb-2">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-navy/40">{t('deposit')}</p>
            <p className="text-xs font-bold text-navy mt-0.5">{formatFRW(totalDeposit)}</p>
          </div>
          <div>
            <div className="w-11 h-11 mx-auto rounded-2xl bg-navy/5 text-navy flex items-center justify-center mb-2">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase tracking-wide font-semibold text-navy/40">{t('withdraw')}</p>
            <p className="text-xs font-bold text-navy mt-0.5">{formatFRW(totalWithdraw)}</p>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="bg-white rounded-3xl shadow-card border border-navy/5 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-navy">{t('accountDetails')}</p>
        </div>
        <div className="divide-y divide-navy/5">
          <DetailRow icon={<UserIcon className="w-4 h-4" />} label={t('fullNameLabel')} value={profile.full_name || t('notSet')} />
          <DetailRow icon={<Phone className="w-4 h-4" />} label={t('phoneNumberLabel')} value={profile.phone || t('notSet')} />
          <DetailRow icon={<Crown className="w-4 h-4" />} label={t('vipPlan')} value={vip ? vip.name : t('none')} />
          <DetailRow icon={<Calendar className="w-4 h-4" />} label={t('memberSince')} value={new Date(profile.created_at).toLocaleDateString()} />
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-3xl shadow-card border border-navy/5 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-bold text-navy">{t('transactionHistory')}</p>
        </div>
        {records.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-navy/40">{t('noTransactionsYet')}</p>
        ) : (
          <div className="divide-y divide-navy/5 max-h-72 overflow-y-auto">
            {records.map((r) => {
              const isDeposit = r.request_type === 'deposit';
              const statusLabel = r.status === 'approved' ? t('approved') : r.status === 'pending' ? t('pending') : t('declined');
              return (
                <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                      isDeposit ? 'bg-brand-orange-soft text-brand-orange' : 'bg-navy/5 text-navy'
                    }`}>
                      {isDeposit ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-navy">{isDeposit ? t('deposit') : t('withdraw')}</p>
                      <p className="text-xs text-navy/40">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-navy">{formatFRW(r.amount)}</p>
                    <span className={`text-[11px] font-semibold ${
                      r.status === 'approved' ? 'text-emerald-600'
                      : r.status === 'pending' ? 'text-brand-orange'
                      : 'text-red-600'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-4 rounded-2xl font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all"
      >
        {t('signOut')}
      </button>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-9 h-9 rounded-2xl bg-light text-navy/50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm text-navy/50 flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-navy ml-auto text-right truncate">{value}</span>
    </div>
  );
}