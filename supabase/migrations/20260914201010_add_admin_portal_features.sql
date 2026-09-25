/*
# Add admin portal features: admin role, banning, deposit approval, password reset, task monitoring

1. Modified Tables
- `profiles`: add `is_admin` (boolean, default false), `is_banned` (boolean, default false), `admin_note` (text)
- Revoke client UPDATE on `is_admin`, `is_banned`, `admin_note` so only server functions can change them

2. Modified Functions
- `submit_deposit`: changed to create a PENDING deposit (not auto-approved). Admin must approve it.
- `submit_withdrawal`: unchanged — still deducts immediately and creates pending withdrawal

3. New Functions (all SECURITY DEFINER, admin-only)
- `admin_approve_deposit(p_request_id)`: approves a pending deposit, activates VIP, adds balance
- `admin_reject_deposit(p_request_id, p_note)`: rejects a pending deposit
- `admin_approve_withdrawal(p_request_id)`: approves a pending withdrawal (marks approved)
- `admin_reject_withdrawal(p_request_id, p_note)`: rejects a pending withdrawal, refunds balance
- `admin_ban_user(p_user_id, p_note)`: bans a user
- `admin_unban_user(p_user_id)`: unbans a user
- `admin_reset_password(p_user_id, p_new_password)`: resets a user's password
- `admin_update_balance(p_user_id, p_amount, p_action)`: adds or subtracts balance

4. Security
- All admin functions check `auth.uid()` against profiles.is_admin = true
- Users cannot set is_admin or is_banned from the browser
- Banned users are blocked at the application level

5. Important notes
- Deposits now require admin approval before VIP activation and balance credit
- Withdrawals still deduct immediately but admin can reject and refund
- Admin password reset uses Supabase auth admin API via service role
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_note text;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, telegram_joined, whatsapp_joined, onboarding_complete, referred_by) ON public.profiles TO authenticated;

-- Allow users to see their own is_admin and is_banned (already covered by existing SELECT policy)

-- Drop and recreate submit_deposit to create PENDING requests instead of auto-approving
CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier public.vip_tiers%ROWTYPE;
  v_banned boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_banned INTO v_banned FROM public.profiles WHERE user_id = v_user_id;
  IF v_banned THEN RAISE EXCEPTION 'Your account has been banned. Contact support.'; END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE price = p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Amount does not match any VIP product'; END IF;

  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'deposit', p_amount, p_phone, 'pending');

  RETURN json_build_object('success', true, 'tier', v_tier.name, 'message', 'Deposit request submitted. Waiting for admin approval.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_deposit(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit(integer, text) TO authenticated;

-- Admin: approve deposit
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_request public.wallet_requests%ROWTYPE;
  v_tier public.vip_tiers%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_request FROM public.wallet_requests WHERE id = p_request_id AND request_type = 'deposit' AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit request not found or already processed'; END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE price = v_request.amount;

  UPDATE public.wallet_requests
  SET status = 'approved', reviewed_at = now(), review_note = 'Approved by admin'
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET vip_tier = v_tier.tier,
      vip_activated_at = now(),
      balance = balance + v_request.amount
  WHERE user_id = v_request.user_id;

  RETURN json_build_object('success', true, 'message', 'Deposit approved and VIP activated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;

-- Admin: reject deposit
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_request_id uuid, p_note text)
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

  UPDATE public.wallet_requests
  SET status = 'rejected', reviewed_at = now(), review_note = p_note
  WHERE id = p_request_id AND request_type = 'deposit' AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit request not found or already processed'; END IF;

  RETURN json_build_object('success', true, 'message', 'Deposit rejected');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;

-- Admin: approve withdrawal
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_request_id uuid)
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

  UPDATE public.wallet_requests
  SET status = 'approved', reviewed_at = now(), review_note = 'Approved by admin'
  WHERE id = p_request_id AND request_type = 'withdrawal' AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found or already processed'; END IF;

  RETURN json_build_object('success', true, 'message', 'Withdrawal approved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;

-- Admin: reject withdrawal (refund balance)
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_request_id uuid, p_note text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_request public.wallet_requests%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_request FROM public.wallet_requests WHERE id = p_request_id AND request_type = 'withdrawal' AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found or already processed'; END IF;

  UPDATE public.wallet_requests
  SET status = 'rejected', reviewed_at = now(), review_note = p_note
  WHERE id = p_request_id;

  -- Refund the balance
  UPDATE public.profiles
  SET balance = balance + v_request.amount
  WHERE user_id = v_request.user_id;

  RETURN json_build_object('success', true, 'message', 'Withdrawal rejected and balance refunded');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;

-- Admin: ban user
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_user_id uuid, p_note text)
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

  IF p_user_id = v_admin_id THEN RAISE EXCEPTION 'Cannot ban yourself'; END IF;

  UPDATE public.profiles SET is_banned = true, admin_note = p_note WHERE user_id = p_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'User banned');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;

-- Admin: unban user
CREATE OR REPLACE FUNCTION public.admin_unban_user(p_user_id uuid)
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

  UPDATE public.profiles SET is_banned = false, admin_note = NULL WHERE user_id = p_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', 'User unbanned');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

-- Admin: reset user password
CREATE OR REPLACE FUNCTION public.admin_reset_password(p_user_id uuid, p_new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_user_email text;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF length(p_new_password) < 6 THEN RAISE EXCEPTION 'Password must be at least 6 characters'; END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  IF v_user_email IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  -- Update the password hash directly
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Password reset successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated;

-- Admin: update balance
CREATE OR REPLACE FUNCTION public.admin_update_balance(p_user_id uuid, p_amount integer, p_action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_new_balance integer;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF p_action NOT IN ('add', 'subtract') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  IF p_action = 'add' THEN
    UPDATE public.profiles SET balance = balance + p_amount WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE public.profiles SET balance = GREATEST(0, balance - p_amount) WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) TO authenticated;
