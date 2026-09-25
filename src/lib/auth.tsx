import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
  user_id: string;
  full_name: string;
  phone: string;
  referral_code: string;
  referred_by: string | null;
  vip_tier: number;
  balance: number;
  vip_activated_at: string | null;
  telegram_joined: boolean;
  whatsapp_joined: boolean;
  onboarding_complete: boolean;
  is_admin: boolean;
  is_banned: boolean;
  admin_note: string | null;
  admin_role: 'super_admin' | 'admin' | 'editor' | null;
  withdrawal_day_limit: number | null;
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (fullName: string, phone: string, password: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Supabase Auth requires an email internally. We generate a deterministic
// one from the phone number so users never see or type an email.
function phoneToSyntheticEmail(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  return `${clean}@visitrwanda.app`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load failed', error);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        (async () => {
          await loadProfile(newSession.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // ─── SIGNUP: phone-only. Referral handling is done by the DB trigger. ─
  const signUp = useCallback(async (
    fullName: string,
    phone: string,
    password: string,
    referralCode?: string,
  ) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return { error: 'Phone number is required.' };
    if (!/^[0-9+\s-]{8,}$/.test(trimmedPhone)) return { error: 'Invalid phone number.' };

    const syntheticEmail = phoneToSyntheticEmail(trimmedPhone);

    const { error } = await supabase.auth.signUp({
      email: syntheticEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: trimmedPhone,
          referral_code: referralCode ? referralCode.toLowerCase().trim() : '',
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        return { error: 'This phone number is already registered. Please sign in.' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  // ─── SIGNIN: phone-only ───────────────────────────────────────────────
  const signIn = useCallback(async (phone: string, password: string) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return { error: 'Phone number is required.' };

    let email: string | null = null;

    const { data, error: rpcError } = await supabase.rpc('get_email_by_phone', {
      p_phone: trimmedPhone,
    });

    if (!rpcError && data) {
      email = data as string;
    }

    if (!email) {
      email = phoneToSyntheticEmail(trimmedPhone);
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        return { error: 'Incorrect phone number or password.' };
      }
      return { error: error.message };
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}