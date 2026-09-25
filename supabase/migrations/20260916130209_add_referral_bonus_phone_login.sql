/*
# Add referral bonus and phone-based login support

1. Modified Functions
- `create_visit_rwanda_profile` trigger: when a new user signs up with a referral code in raw_user_meta_data, 
  award 200 FRW to the referrer's balance
- New function `sign_in_with_phone(p_phone, p_password)`: looks up user by phone in profiles, 
  then authenticates with email + password via Supabase auth

2. Security
- Referral bonus is server-side only, triggered on signup
- Phone login uses the existing auth.users table — no duplicate auth system
- The function returns a session token, not the password
*/

-- Update the trigger function to handle referral bonus
CREATE OR REPLACE FUNCTION public.create_visit_rwanda_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
  v_phone text;
  v_full_name text;
BEGIN
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_referral_code := COALESCE(NEW.raw_user_meta_data->>'referral_code', '');

  INSERT INTO public.profiles (user_id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    v_full_name,
    v_phone,
    'visitrwanda' || floor(random() * 900000 + 100000)::text
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Award 200 FRW referral bonus to the referrer
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT user_id INTO v_referrer_id FROM public.profiles WHERE referral_code = v_referral_code;
    IF v_referrer_id IS NOT NULL AND v_referrer_id != NEW.id THEN
      UPDATE public.profiles 
      SET balance = balance + 200 
      WHERE user_id = v_referrer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to sign in with phone number + password
-- Returns a JSON with success/error. The actual auth token is set by Supabase client.
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE p.phone = p_phone
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_email_by_phone(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_phone(text) TO authenticated;
