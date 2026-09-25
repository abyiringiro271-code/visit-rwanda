/*
# Fix deposits/withdrawals flow: pending-only, duplicate prevention, Kinyarwanda message

1. submit_deposit: reject if user already has a pending deposit
2. submit_withdrawal: do NOT deduct balance immediately — create pending request only
3. admin_approve_withdrawal: deduct balance on approval (not on submission)
4. admin_reject_withdrawal: no longer refunds (was never deducted)
5. Duplicate prevention: reject new deposit/withdrawal if user has a pending one
*/

-- Update submit_deposit to prevent duplicates
CREATE OR REPLACE FUNCTION public.submit_deposit(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier public.vip_tiers%ROWTYPE;
  v_banned boolean;
  v_pending_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_banned INTO v_banned FROM public.profiles WHERE user_id = v_user_id;
  IF v_banned THEN RAISE EXCEPTION 'Your account has been banned. Contact support.'; END IF;

  -- Prevent duplicate: check if user already has a pending deposit
  SELECT count(*) INTO v_pending_count
  FROM public.wallet_requests
  WHERE user_id = v_user_id AND request_type = 'deposit' AND status = 'pending';

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending deposit. Please wait for admin to review it first.';
  END IF;

  SELECT * INTO v_tier FROM public.vip_tiers WHERE price = p_amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Amount does not match any VIP product'; END IF;

  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'deposit', p_amount, p_phone, 'pending');

  RETURN json_build_object(
    'success', true,
    'tier', v_tier.name,
    'message', 'Kugirango amafranga aze kuri account balance banza wishyure kuri code, kugirango dukomeze twamamaze Visit Rwanda, nyuma natwe duhembwe.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_deposit(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_deposit(integer, text) TO authenticated;

-- Update submit_withdrawal: do NOT deduct balance, create pending only, prevent duplicates
CREATE OR REPLACE FUNCTION public.submit_withdrawal(p_amount integer, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_banned boolean;
  v_pending_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_banned INTO v_banned FROM public.profiles WHERE user_id = v_user_id;
  IF v_banned THEN RAISE EXCEPTION 'Your account has been banned. Contact support.'; END IF;

  IF p_amount < 1000 THEN RAISE EXCEPTION 'Minimum withdrawal is 1000 FRW'; END IF;

  -- Prevent duplicate: check if user already has a pending withdrawal
  SELECT count(*) INTO v_pending_count
  FROM public.wallet_requests
  WHERE user_id = v_user_id AND request_type = 'withdrawal' AND status = 'pending';

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending withdrawal. Please wait for admin to review it first.';
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Do NOT deduct balance here — admin must approve first
  INSERT INTO public.wallet_requests (user_id, request_type, amount, phone, status)
  VALUES (v_user_id, 'withdrawal', p_amount, p_phone, 'pending');

  RETURN json_build_object('success', true, 'message', 'Withdrawal request submitted. Waiting for admin approval.', 'current_balance', v_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_withdrawal(integer, text) TO authenticated;

-- Update admin_approve_withdrawal: deduct balance on approval
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_request public.wallet_requests%ROWTYPE;
  v_balance integer;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT * INTO v_request FROM public.wallet_requests
  WHERE id = p_request_id AND request_type = 'withdrawal' AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found or already processed'; END IF;

  -- Check if user still has enough balance
  SELECT balance INTO v_balance FROM public.profiles WHERE user_id = v_request.user_id;
  IF v_balance < v_request.amount THEN RAISE EXCEPTION 'User has insufficient balance for this withdrawal'; END IF;

  -- Deduct balance now
  UPDATE public.profiles
  SET balance = balance - v_request.amount
  WHERE user_id = v_request.user_id;

  UPDATE public.wallet_requests
  SET status = 'approved', reviewed_at = now(), review_note = 'Approved by admin'
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'message', 'Withdrawal approved and balance deducted');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;

-- Update admin_reject_withdrawal: no longer refund (was never deducted)
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_request_id uuid, p_note text)
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
  WHERE id = p_request_id AND request_type = 'withdrawal' AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal request not found or already processed'; END IF;

  -- No balance refund needed — balance was never deducted
  RETURN json_build_object('success', true, 'message', 'Withdrawal rejected');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
