import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import { useConfig } from '@/lib/config';
import CommunityLinks from './CommunityLinks';
import { Languages, MessageCircle } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { lang, toggle, t } = useLang();
  const { config } = useConfig();
  const [mode, setMode] = useState<Mode>('signup');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [referral, setReferral] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferral(ref.toLowerCase().trim());
      setMode('signup');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup') {
      if (!fullName.trim()) return setError(t('enterName'));
      if (!phone.trim()) return setError(t('phoneNumber'));
      if (password !== confirm) return setError(t('confirmPassword'));
      if (password.length < 6) return setError(t('atLeast6Chars'));
    } else {
      if (!phone.trim()) return setError(t('phoneNumber'));
    }
    setBusy(true);
    const ref = referral ? referral.toLowerCase().trim() : undefined;
    const result =
      mode === 'signup'
        ? await signUp(fullName, phone, password, ref)
        : await signIn(phone, password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setPassword('');
    setConfirm('');
  };

  const handleForgotPassword = () => {
    const supportPhone = (config.support_phone || '').replace(/[^0-9]/g, '');
    const message = `Hello, I forgot my password for Visit Rwanda.\n\nMy phone number is: ${phone || '(type your number here)'}\n\nPlease send me a new password.`;
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="navy-gradient relative overflow-hidden flex flex-col"
      style={{ minHeight: '100dvh' }}
    >
      <div
        className="pointer-events-none absolute top-[-15%] right-[-10%] w-[320px] h-[320px] rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(circle, #FF7A00 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-15%] left-[-10%] w-[380px] h-[380px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #3DD68C 0%, transparent 70%)' }}
      />

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[10px] sm:text-xs font-semibold hover:bg-white/20 transition-all active:scale-95"
        >
          <Languages className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          {lang === 'en' ? 'Kinyarwanda' : 'English'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden mb-3">
              <img src="/logo.png" alt="Visit Rwanda" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-[24px] sm:text-2xl font-extrabold text-white leading-tight font-display">
              Visit <span className="text-brand-orange">Rwanda</span>
            </h1>
            <p className="hidden min-[380px]:block text-white/55 text-[11px] sm:text-xs mt-1.5 max-w-[280px] mx-auto leading-snug">
              {t('tagline')}
            </p>
          </div>

          <div className="auth-card rounded-3xl shadow-2xl p-4 sm:p-5">
            <div className="flex gap-1 mb-3 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  mode === 'signup' ? 'bg-brand-orange text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t('register')}
              </button>
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  mode === 'signin' ? 'bg-brand-orange text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t('login')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              {mode === 'signup' ? (
                <>
                  <Input label={t('fullName')} value={fullName} onChange={setFullName} placeholder={t('enterName')} />
                  <Input label={t('phoneNumber')} value={phone} onChange={setPhone} placeholder={t('phonePlaceholder')} type="tel" />
                  <Input label={t('password')} value={password} onChange={setPassword} placeholder={t('passwordPlaceholder')} type="password" />
                  <Input label={t('confirmPassword')} value={confirm} onChange={setConfirm} placeholder={t('reenterPassword')} type="password" />
                  <Input label={t('inviteCode')} value={referral} onChange={setReferral} placeholder={t('inviteCodePlaceholder')} />
                </>
              ) : (
                <>
                  <Input label={t('phoneNumber')} value={phone} onChange={setPhone} placeholder={t('phonePlaceholder')} type="tel" />
                  <Input label={t('password')} value={password} onChange={setPassword} placeholder={t('passwordPlaceholder')} type="password" />
                </>
              )}

              {error && (
                <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 animate-scale-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 mt-1 rounded-2xl text-sm font-bold text-white shadow-orange-glow orange-gradient transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? t('pleaseWait') : mode === 'signup' ? t('createAccount') : t('login')}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full mt-2 py-2.5 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 border border-white/10 flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t('forgotPassword')}
                </button>
              )}
            </form>
          </div>

          <CommunityLinks variant="inline" />

          <p className="text-[10px] text-white/35 text-center mt-4">{t('termsConditions')}</p>
        </div>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] sm:text-[11px] font-bold text-white/55 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-4 focus:ring-brand-orange/15 focus:border-brand-orange transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    </div>
  );
}