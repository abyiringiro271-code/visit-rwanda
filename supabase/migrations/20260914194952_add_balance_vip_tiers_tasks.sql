/*
# Add balance, VIP tiers, and task earning system

1. Modified Tables
- `profiles`: add `balance` (default 3000 = welcome bonus), `vip_activated_at`
- Revoke client UPDATE on balance, vip_tier, vip_activated_at, referral_code so only server functions can change them

2. New Tables
- `vip_tiers`: catalog of 9 VIP products (price, daily return, task count, per-task rate)
- `task_completions`: log of each task a user completes, used to enforce the daily limit

3. New Functions (all SECURITY DEFINER, server-controlled)
- `submit_deposit(p_amount, p_phone)`: creates an approved deposit request, activates the matching VIP tier, adds the deposit to the user's balance
- `submit_withdrawal(p_amount, p_phone)`: checks balance and minimum, deducts immediately, creates a pending withdrawal request
- `complete_task()`: validates VIP and daily task limit, awards the per-task rate to the balance, logs the completion

4. Security
- RLS on `vip_tiers` (read-only for authenticated)
- RLS on `task_completions` (owner-scoped CRUD)
- Balance, VIP tier, and activation timestamp are only writable through the SECURITY DEFINER functions
- Users can update their own name, phone, and onboarding flags only
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS balance integer NOT NULL DEFAULT 3000,
  ADD COLUMN IF NOT EXISTS vip_activated_at timestamptz;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, telegram_joined, whatsapp_joined, onboarding_complete, referred_by) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.vip_tiers (
  tier integer PRIMARY KEY,
  name text NOT NULL,
  price integer NOT NULL,
  daily_return integer NOT NULL,
  task_count integer NOT NULL,
  task_rate integer NOT NULL
);

INSERT INTO public.vip_tiers (tier, name, price, daily_return, task_count, task_rate) VALUES
  (1, 'VIP 1', 5000, 500, 5, 100),
  (2, 'VIP 2', 10000, 1000, 10, 100),
  (3, 'VIP 3', 15000, 2000, 15, 133),
  (4, 'VIP 4', 20000, 3000, 20, 150),
  (5, 'VIP 5', 30000, 5000, 25, 200),
  (6, 'VIP 6', 40000, 8000, 40, 200),
  (7, 'VIP 7', 50000, 10000, 50, 200),
  (8, 'VIP 8', 100000, 20000, 100, 200),
  (9, 'VIP 9', 200000, 40000, 200, 200)
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  daily_return = EXCLUDED.daily_return,
  task_count = EXCLUDED.task_count,
  task_rate = EXCLUDED.task_rate;

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vip_tiers_select" ON public.vip_tiers;
CREATE POLICY "vip_tiers_select" ON public.vip_tiers FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_number int NOT NULL,
  earned_amount int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_completions_select_own" ON public.task_completions;
CREATE POLICY "task_completions_select_own" ON public.task_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "task_completions_insert_own" ON public.task_completions;
CREATE POLICY "task_completions_insert_own" ON public.task_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "task_completions_delete_own" ON public.task_completions;
CREATE POLICY "task_completions_delete_own" ON public.task_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS task_completions_user_date_idx ON public.task_completions (user_id, completed_at DESC);

CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier public.vip_tiers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE price = p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Amount does not match any VIP product'; END IF;

  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'deposit', p_amount, p_phone, 'approved');

  UPDATE public.profiles
  SET vip_tier = v_tier.tier,
      vip_activated_at = now(),
      balance = balance + p_amount
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'tier', v_tier.name, 'daily_return', v_tier.daily_return, 'task_count', v_tier.task_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_deposit(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_withdrawal(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000 FRW'; END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  UPDATE public.profiles SET balance = balance - p_amount WHERE user_id = v_user_id;

  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'withdrawal', p_amount, p_phone, 'pending');

  RETURN json_build_object('success', true, 'new_balance', v_balance - p_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_task()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier integer;
  v_completed_today int;
  v_tier_data public.vip_tiers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT vip_tier INTO v_tier FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_tier = 0 THEN RAISE EXCEPTION 'No VIP product active. Buy a product first.'; END IF;

  SELECT * INTO v_tier_data FROM public.vip_tiers WHERE tier = v_tier;

  SELECT count(*) INTO v_completed_today
  FROM public.task_completions
  WHERE user_id = v_user_id AND completed_at::date = current_date;

  IF v_completed_today >= v_tier_data.task_count THEN
    RAISE EXCEPTION 'Daily task limit reached. Come back tomorrow.';
  END IF;

  INSERT INTO public.task_completions (user_id, task_number, earned_amount)
  VALUES (v_user_id, v_completed_today + 1, v_tier_data.task_rate);

  UPDATE public.profiles
  SET balance = balance + v_tier_data.task_rate
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'earned', v_tier_data.task_rate,
    'completed', v_completed_today + 1,
    'total', v_tier_data.task_count,
    'daily_return', v_tier_data.daily_return
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_task() FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_task() TO authenticated;
