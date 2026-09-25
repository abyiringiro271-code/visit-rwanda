/*
# Create Visit Rwanda account and wallet request data

1. New Tables
- `profiles`: one private profile per signed-in user, including name, phone, referral code, onboarding choices, and the selected membership tier.
- `wallet_requests`: deposit and withdrawal requests owned by one user, with amount, payment reference, destination details, and a pending/reviewed status.

2. Authentication and ownership
- Profiles are linked to Supabase Auth users through `user_id`.
- New profiles are created automatically when an account is registered.
- Referral codes are generated from the public Visit Rwanda prefix and a unique suffix.

3. Security
- Row Level Security is enabled on both tables.
- Signed-in users can only read or edit their own profile.
- Signed-in users can only read or create their own wallet requests.
- Users cannot alter request status, review notes, or ownership fields from the browser.

4. Important notes
- This migration stores requests for manual review; it does not create or promise an automatic payout balance.
- The app should treat all displayed membership figures as informational until an operator verifies the request.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  referral_code text NOT NULL UNIQUE,
  referred_by text,
  vip_tier integer NOT NULL DEFAULT 0 CHECK (vip_tier BETWEEN 0 AND 9),
  telegram_joined boolean NOT NULL DEFAULT false,
  whatsapp_joined boolean NOT NULL DEFAULT false,
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('deposit', 'withdrawal')),
  amount integer NOT NULL CHECK (amount >= 1000 AND amount <= 500000),
  phone text NOT NULL DEFAULT '',
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_requests_select_own" ON public.wallet_requests;
CREATE POLICY "wallet_requests_select_own" ON public.wallet_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_requests_insert_own" ON public.wallet_requests;
CREATE POLICY "wallet_requests_insert_own" ON public.wallet_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_requests_update_own" ON public.wallet_requests;
CREATE POLICY "wallet_requests_update_own" ON public.wallet_requests FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id AND status = 'pending');
DROP POLICY IF EXISTS "wallet_requests_delete_own" ON public.wallet_requests;
CREATE POLICY "wallet_requests_delete_own" ON public.wallet_requests FOR DELETE TO authenticated USING (auth.uid() = user_id AND status = 'pending');

REVOKE UPDATE ON public.wallet_requests FROM authenticated;
GRANT UPDATE (phone, payment_reference) ON public.wallet_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.create_visit_rwanda_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'visitrwanda' || floor(random() * 900000 + 100000)::text
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_visit_rwanda ON auth.users;
CREATE TRIGGER on_auth_user_created_visit_rwanda
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_visit_rwanda_profile();

CREATE INDEX IF NOT EXISTS wallet_requests_user_created_idx ON public.wallet_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON public.profiles (referral_code);
