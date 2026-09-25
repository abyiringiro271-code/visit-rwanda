/*
# Add admin advanced controls: delete account, edit user, product management, system settings

1. New Tables
- `system_settings`: single-row table for global config (withdrawal days, daily withdrawal limit, withdrawal hours)
- `vip_tiers` already exists; admin can now update it via function

2. Modified Tables
- `profiles`: add `withdrawal_day_limit` column for per-user daily withdrawal limit (nullable, uses system default if null)

3. New Functions (all SECURITY DEFINER, admin-only)
- `admin_delete_account(p_user_id)`: deletes a user's profile and auth account
- `admin_update_user(p_user_id, p_full_name, p_phone)`: updates user's name and phone
- `admin_upsert_product(p_tier, p_name, p_price, p_daily_return, p_task_count, p_task_rate)`: creates or updates a VIP product
- `admin_delete_product(p_tier)`: removes a VIP product (only if no users are on that tier)
- `admin_update_settings(p_withdrawal_days, p_daily_withdrawal_limit, p_withdrawal_start_hour, p_withdrawal_end_hour)`: updates system settings
- `get_system_settings()`: returns current settings (callable by authenticated users)
- `admin_set_withdrawal_limit(p_user_id, p_limit)`: sets per-user daily withdrawal limit

4. Security
- All admin functions verify is_admin = true via auth.uid()
- Delete account removes from auth.users (cascades to profiles, wallet_requests, task_completions)
- Product deletion blocked if users are on that tier
*/

CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY DEFAULT 1,
  withdrawal_days text NOT NULL DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
  daily_withdrawal_limit integer NOT NULL DEFAULT 50000,
  withdrawal_start_hour integer NOT NULL DEFAULT 0,
  withdrawal_end_hour integer NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS withdrawal_day_limit integer;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON public.system_settings;
CREATE POLICY "settings_select" ON public.system_settings FOR SELECT TO authenticated USING (true);

-- Admin: delete account
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id = v_admin_id THEN RAISE EXCEPTION 'Cannot delete your own account'; END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'Account deleted');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_account(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_account(uuid) TO authenticated;

-- Admin: update user info
CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_full_name text, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.profiles SET full_name = p_full_name, phone = p_phone WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'User updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) TO authenticated;

-- Admin: upsert product
CREATE OR REPLACE FUNCTION public.admin_upsert_product(
  p_tier integer, p_name text, p_price integer, p_daily_return integer, p_task_count integer, p_task_rate integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_tier < 1 OR p_tier > 99 THEN RAISE EXCEPTION 'Invalid tier number'; END IF;
  IF p_price < 1000 THEN RAISE EXCEPTION 'Price must be at least 1000'; END IF;
  IF p_daily_return < 0 THEN RAISE EXCEPTION 'Daily return cannot be negative'; END IF;
  IF p_task_count < 0 THEN RAISE EXCEPTION 'Task count cannot be negative'; END IF;
  IF p_task_rate < 0 THEN RAISE EXCEPTION 'Task rate cannot be negative'; END IF;

  INSERT INTO public.vip_tiers (tier, name, price, daily_return, task_count, task_rate)
  VALUES (p_tier, p_name, p_price, p_daily_return, p_task_count, p_task_rate)
  ON CONFLICT (tier) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    daily_return = EXCLUDED.daily_return,
    task_count = EXCLUDED.task_count,
    task_rate = EXCLUDED.task_rate;

  RETURN json_build_object('success', true, 'message', 'Product saved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_product(integer, text, integer, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_product(integer, text, integer, integer, integer, integer) TO authenticated;

-- Admin: delete product
CREATE OR REPLACE FUNCTION public.admin_delete_product(p_tier integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_user_count integer;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT count(*) INTO v_user_count FROM public.profiles WHERE vip_tier = p_tier;
  IF v_user_count > 0 THEN RAISE EXCEPTION 'Cannot delete product: % users are on this tier', v_user_count; END IF;

  DELETE FROM public.vip_tiers WHERE tier = p_tier;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'Product deleted');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_product(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(integer) TO authenticated;

-- Admin: update system settings
CREATE OR REPLACE FUNCTION public.admin_update_settings(
  p_withdrawal_days text, p_daily_withdrawal_limit integer, p_withdrawal_start_hour integer, p_withdrawal_end_hour integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_daily_withdrawal_limit < 1000 THEN RAISE EXCEPTION 'Daily limit must be at least 1000'; END IF;
  IF p_withdrawal_start_hour < 0 OR p_withdrawal_start_hour > 23 THEN RAISE EXCEPTION 'Start hour must be 0-23'; END IF;
  IF p_withdrawal_end_hour < 1 OR p_withdrawal_end_hour > 24 THEN RAISE EXCEPTION 'End hour must be 1-24'; END IF;
  IF p_withdrawal_end_hour <= p_withdrawal_start_hour THEN RAISE EXCEPTION 'End hour must be after start hour'; END IF;

  UPDATE public.system_settings SET
    withdrawal_days = p_withdrawal_days,
    daily_withdrawal_limit = p_daily_withdrawal_limit,
    withdrawal_start_hour = p_withdrawal_start_hour,
    withdrawal_end_hour = p_withdrawal_end_hour,
    updated_at = now()
  WHERE id = 1;

  RETURN json_build_object('success', true, 'message', 'Settings updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_settings(text, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_settings(text, integer, integer, integer) TO authenticated;

-- Get system settings (for regular users to check withdrawal availability)
CREATE OR REPLACE FUNCTION public.get_system_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settings public.system_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
  RETURN json_build_object(
    'withdrawal_days', v_settings.withdrawal_days,
    'daily_withdrawal_limit', v_settings.daily_withdrawal_limit,
    'withdrawal_start_hour', v_settings.withdrawal_start_hour,
    'withdrawal_end_hour', v_settings.withdrawal_end_hour
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_system_settings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_system_settings() TO authenticated;

-- Admin: set per-user withdrawal limit
CREATE OR REPLACE FUNCTION public.admin_set_withdrawal_limit(p_user_id uuid, p_limit integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_limit IS NOT NULL AND p_limit < 1000 THEN RAISE EXCEPTION 'Limit must be at least 1000 or null'; END IF;

  UPDATE public.profiles SET withdrawal_day_limit = p_limit WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'Withdrawal limit updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_withdrawal_limit(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_withdrawal_limit(uuid, integer) TO authenticated;

-- Update submit_withdrawal to check system settings
CREATE OR REPLACE FUNCTION public.submit_withdrawal(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_banned boolean;
  v_settings public.system_settings%ROWTYPE;
  v_current_hour integer;
  v_current_day text;
  v_user_limit integer;
  v_today_withdrawn integer;
  v_effective_limit integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000 FRW'; END IF;

  SELECT is_banned, balance, withdrawal_day_limit INTO v_banned, v_balance, v_user_limit FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_banned THEN RAISE EXCEPTION 'Your account has been banned'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Check system settings
  SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;
  v_current_hour := extract(hour from now())::integer;
  v_current_day := lower(to_char(now(), 'dy'));

  IF position(v_current_day IN v_settings.withdrawal_days) = 0 THEN
    RAISE EXCEPTION 'Withdrawals are not available today';
  END IF;

  IF v_current_hour < v_settings.withdrawal_start_hour OR v_current_hour >= v_settings.withdrawal_end_hour THEN
    RAISE EXCEPTION 'Withdrawals are only available between % and % hours', v_settings.withdrawal_start_hour, v_settings.withdrawal_end_hour;
  END IF;

  -- Check daily limit
  v_effective_limit := COALESCE(v_user_limit, v_settings.daily_withdrawal_limit);
  SELECT COALESCE(SUM(amount), 0) INTO v_today_withdrawn
  FROM public.wallet_requests
  WHERE user_id = v_user_id AND request_type = 'withdrawal' AND created_at::date = current_date;

  IF v_today_withdrawn + p_amount > v_effective_limit THEN
    RAISE EXCEPTION 'Daily withdrawal limit exceeded. You can withdraw up to % FRW more today', GREATEST(0, v_effective_limit - v_today_withdrawn);
  END IF;

  UPDATE public.profiles SET balance = balance - p_amount WHERE user_id = v_user_id;

  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'withdrawal', p_amount, p_phone, 'pending');

  RETURN json_build_object('success', true, 'new_balance', v_balance - p_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) TO authenticated;
