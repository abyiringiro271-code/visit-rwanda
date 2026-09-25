import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Shield, Phone, Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const { signIn, signOut } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || !password) {
      setError('Enter your phone number and password.');
      return;
    }

    setBusy(true);
    const result = await signIn(phone, password);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    // Success — App.tsx will re-render and check is_admin automatically
  };

  return (
    <div className="min-h-screen navy-gradient flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #FF7A00 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #F5B700 0%, transparent 70%)' }} />

      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-[380px] animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <Shield className="w-7 h-7 text-brand-orange" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white font-display">
              Admin <span className="text-brand-orange">Portal</span>
            </h1>
            <p className="text-white/60 text-xs mt-1">Restricted access — admins only</p>
          </div>

          <div className="glass-card rounded-3xl shadow-2xl p-5 border border-white/40">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-navy/60 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    autoComplete="username"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-navy/10 text-sm text-navy placeholder-navy/30 focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all bg-white/80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-navy/60 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-navy/10 text-sm text-navy placeholder-navy/30 focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all bg-white/80"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 flex items-start gap-2 animate-scale-in">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-2xl font-semibold text-white shadow-orange-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 orange-gradient flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {busy ? 'Signing in…' : 'Sign in as Admin'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-navy/5 text-center">
              <a
                href="/"
                className="text-xs text-navy/50 hover:text-navy/80 transition-colors"
                onClick={async (e) => {
                  e.preventDefault();
                  await signOut();
                  window.location.href = '/';
                }}
              >
                ← Back to user app
              </a>
            </div>
          </div>

          <p className="text-[10px] text-white/40 text-center mt-4">
            Authorized personnel only. All actions are logged.
          </p>
        </div>
      </div>
    </div>
  );
}