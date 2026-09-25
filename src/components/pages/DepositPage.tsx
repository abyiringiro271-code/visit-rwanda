import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { useConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, ArrowRight, Phone, Check, Copy } from 'lucide-react';

type Step = 1 | 2 | 3;

export default function DepositPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { t } = useLang();
  const { config } = useConfig();
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (profile) setPhone(profile.phone || '');
  }, [profile]);

  if (!profile) return null;

  const amt = parseInt(amount);
  const amountValid = amt >= 1000 && amt <= 500000;

  const handleNext = () => {
    if (step === 1) {
      if (!amountValid) {
        setError(t('depositStep1Desc'));
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      setError(null);
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
    else navigate('/');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(`${config.momo_code}${amt}#`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      setError(t('withdrawValidPhone'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('submit_deposit', {
      p_amount: amt,
      p_phone: phone,
    });
    setBusy(false);
    if (error) {
      const m = error.message.includes('pending') ? t('depositAlreadyPending') : (error.message || t('error'));
      setError(m);
      return;
    }
    setSuccess(true);
    await refreshProfile();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-light flex flex-col animate-fade-in">
        <Header onBack={() => navigate('/')} label={t('depositTitle')} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 flex items-center justify-center mb-5">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-navy font-display mb-2">{t('depositSuccessTitle')}</h2>
            <p className="text-sm text-navy/60 mb-6 leading-relaxed">{t('depositSuccessMsg')}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-2xl font-bold text-white orange-gradient shadow-orange-glow text-base"
            >
              {t('depositBackToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light flex flex-col" style={{ minHeight: '100dvh' }}>
      <Header onBack={handleBack} label={t('depositTitle')} />

      <div className="max-w-lg mx-auto w-full px-5 pt-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-navy/50 uppercase tracking-wide">
            {t('depositStepLabel')} {step} {t('depositStepOf')}
          </p>
          <p className="text-xs font-bold text-brand-orange uppercase tracking-wide">
            {step === 1 ? t('amount') : step === 2 ? t('depositStep2Title') : t('confirm')}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full flex-1 transition-all duration-300 ${
                s <= step ? 'bg-brand-orange' : 'bg-navy/10'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-6 flex flex-col">

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy font-display leading-tight">
                {t('depositStep1Title')}
              </h2>
              <p className="text-sm text-navy/50 mt-2">{t('depositStep1Desc')}</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-navy/5">
              <label className="block text-[11px] font-bold text-navy/50 uppercase tracking-wide mb-2">
                {t('depositStep1AmountLabel')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t('depositStep1AmountPlaceholder')}
                  autoFocus
                  className="w-full px-5 py-5 rounded-2xl border-2 border-navy/10 text-2xl font-extrabold text-navy placeholder-navy/20 focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 bg-light text-center"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-navy/40">
                  FRW
                </span>
              </div>

              <p className="text-[11px] font-bold text-navy/50 uppercase tracking-wide mt-5 mb-2">
                {t('depositStep1QuickAmounts')}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[5000, 10000, 20000, 30000, 50000, 100000].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      amount === String(a)
                        ? 'border-brand-orange bg-brand-orange-soft text-brand-orange'
                        : 'border-navy/10 bg-light text-navy/60 hover:border-navy/20'
                    }`}
                  >
                    {(a / 1000)}k
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy font-display leading-tight">
                {t('depositStep2Title')} {amt.toLocaleString()} FRW
              </h2>
              <p className="text-sm text-navy/50 mt-2">{t('depositStep2Desc')}</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-navy/5 space-y-4">
              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">1</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-navy/50 uppercase tracking-wide mb-2">{t('depositStep2Hint1')}</p>
                  <div className="bg-light rounded-2xl px-4 py-3.5 flex items-center justify-between gap-2">
                    <code className="font-mono font-extrabold text-brand-orange text-base truncate">
                      {config.momo_code}{amt}#
                    </code>
                    <button
                      onClick={copyCode}
                      className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-navy/50 hover:text-brand-orange transition-colors flex-shrink-0 shadow-sm"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">2</div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-navy/50 uppercase tracking-wide mb-2">{t('depositStep2Hint2')}</p>
                  <div className="bg-light rounded-2xl px-4 py-3.5">
                    <p className="font-extrabold text-navy text-base">{config.momo_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">3</div>
                <div className="flex-1 pt-1.5">
                  <p className="text-sm font-bold text-navy">{t('depositStep2Hint3')}</p>
                  <p className="text-xs text-navy/50 mt-0.5">{t('depositStep2Hint3Sub')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy font-display leading-tight">
                {t('depositStep3Title')}
              </h2>
              <p className="text-sm text-navy/50 mt-2">{t('depositStep3Desc')}</p>
            </div>

            <div className="bg-white rounded-3xl p-5 shadow-card border border-navy/5">
              <label className="block text-[11px] font-bold text-navy/50 uppercase tracking-wide mb-2">
                {t('depositStep3Phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy/30" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phonePlaceholder')}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-navy/10 text-base font-bold text-navy focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 bg-light"
                />
              </div>
              <p className="text-xs text-navy/50 mt-3">{t('depositStep3PhoneHint')}</p>
            </div>

            <div className="bg-brand-orange-soft border-2 border-brand-orange/20 rounded-3xl p-5 flex items-center justify-between">
              <span className="text-sm font-bold text-navy/70">{t('depositStep3Amount')}</span>
              <span className="text-xl font-extrabold text-navy font-display">{amt.toLocaleString()} FRW</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm rounded-2xl px-4 py-3 bg-red-50 text-red-600 border border-red-100 mt-4 animate-scale-in">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-4" />

        <div className="pt-5 space-y-2 flex-shrink-0">
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !amountValid}
              className="w-full py-4 rounded-2xl font-bold text-white orange-gradient shadow-orange-glow active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-base"
            >
              {t('next')} <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={busy || !phone.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white orange-gradient shadow-orange-glow active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-base"
            >
              {busy ? t('depositSubmitting') : <><Check className="w-5 h-5" /> {t('depositStep3Confirm')}</>}
            </button>
          )}

          {step > 1 && (
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-2xl font-semibold text-navy/60 hover:text-navy text-sm transition-all"
            >
              ← {t('back')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <header className="sticky top-0 z-30 navy-gradient shadow-md flex-shrink-0">
      <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <p className="text-white font-bold text-base font-display">{label}</p>
      </div>
    </header>
  );
}