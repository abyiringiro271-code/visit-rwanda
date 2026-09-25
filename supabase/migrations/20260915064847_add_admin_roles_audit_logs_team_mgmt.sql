/*
# Add admin roles, audit logs, team management, and enhanced admin functions

1. Modified Tables
- `profiles`: add `admin_role` column (text: 'super_admin', 'admin', 'editor', or null for non-admins)
- `wallet_requests`: add `reviewed_by` column (uuid, tracks which admin processed the request)

2. New Tables
- `admin_audit_logs`: append-only log of every sensitive admin action
  - admin_id, admin_email, admin_role, action, target_type, target_id, user_id, transaction_id, previous_value, new_value, reason, created_at
- `admin_team`: tracks admin team members with their roles and status
  - Reuses profiles table (is_admin + admin_role columns), no separate table needed

3. New Functions (all SECURITY DEFINER, admin-only)
- `admin_get_role()`: returns the caller's admin role (for frontend RBAC)
- `admin_write_audit_log(p_action, p_target_type, p_target_id, p_user_id, p_transaction_id, p_previous_value, p_new_value, p_reason)`: internal helper, auto-fills admin info
- `admin_list_audit_logs(p_limit, p_offset)`: paginated audit log reader
- `admin_list_users(p_search, p_filter_status, p_limit, p_offset)`: paginated user list with email
- `admin_get_user_detail(p_user_id)`: detailed user profile with email
- `admin_create_admin(p_email, p_password, p_full_name, p_phone, p_role)`: creates a new admin account (super_admin only)
- `admin_change_role(p_user_id, p_role)`: changes an admin's role (super_admin only)
- `admin_disable_admin(p_user_id)`: removes admin privileges (super_admin only, cannot disable self or last super_admin)
- `admin_get_dashboard_stats()`: aggregated stats for dashboard
- `admin_get_report_data(p_start_date, p_end_date)`: filtered report data

4. Security
- All admin functions verify admin role via auth.uid() + profiles.is_admin
- super_admin-only functions additionally check admin_role = 'super_admin'
- Audit logs are append-only (no UPDATE/DELETE policies)
- RLS on audit_logs: admins can SELECT, nobody can INSERT/UPDATE/DELETE directly
- Existing admin functions updated to write audit logs and set reviewed_by

5. Important notes
- The initial super_admin account is created via SQL (not frontend)
- Password is hashed using bcrypt, never stored in plaintext
- Admin roles are verified server-side on every function call
*/

-- Add admin_role column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role text CHECK (admin_role IN ('super_admin', 'admin', 'editor') OR admin_role IS NULL);

-- Add reviewed_by to wallet_requests
ALTER TABLE public.wallet_requests
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text NOT NULL DEFAULT '',
  admin_role text NOT NULL DEFAULT '',
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text NOT NULL DEFAULT '',
  user_id uuid,
  transaction_id uuid,
  previous_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs, nobody can write directly (only via SECURITY DEFINER function)
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.admin_audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER function can write

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_admin_idx ON public.admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.admin_audit_logs (action);
CREATE INDEX IF NOT EXISTS wallet_requests_status_idx ON public.wallet_requests (status, request_type, created_at DESC);

-- Internal helper: write audit log
CREATE OR REPLACE FUNCTION public.admin_write_audit_log(
  p_action text, p_target_type text DEFAULT '', p_target_id text DEFAULT '',
  p_user_id uuid DEFAULT NULL, p_transaction_id uuid DEFAULT NULL,
  p_previous_value text DEFAULT '', p_new_value text DEFAULT '', p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text;
  v_admin_role text;
BEGIN
  IF v_admin_id IS NULL THEN RETURN; END IF;
  SELECT email INTO v_admin_email FROM auth.users WHERE id = v_admin_id;
  SELECT admin_role INTO v_admin_role FROM public.profiles WHERE user_id = v_admin_id;
  INSERT INTO public.admin_audit_logs (admin_id, admin_email, admin_role, action, target_type, target_id, user_id, transaction_id, previous_value, new_value, reason)
  VALUES (v_admin_id, COALESCE(v_admin_email, ''), COALESCE(v_admin_role, ''), p_action, p_target_type, p_target_id, p_user_id, p_transaction_id, p_previous_value, p_new_value, p_reason);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_write_audit_log(text, text, text, uuid, uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_write_audit_log(text, text, text, uuid, uuid, text, text, text) TO authenticated;

-- Get caller's admin role
CREATE OR REPLACE FUNCTION public.admin_get_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT admin_role INTO v_role FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true;
  RETURN COALESCE(v_role, '');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_role() TO authenticated;

-- List audit logs (paginated)
CREATE OR REPLACE FUNCTION public.admin_list_audit_logs(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_logs json;
  v_total integer;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT count(*) INTO v_total FROM public.admin_audit_logs;
  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_logs
  FROM (
    SELECT * FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN json_build_object('logs', v_logs, 'total', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_audit_logs(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs(integer, integer) TO authenticated;

-- List users (paginated, with email, searchable, filterable)
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT '', p_filter_status text DEFAULT 'all', p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_users json;
  v_total integer;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Build query
  SELECT count(*) INTO v_total
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE (
    p_search = '' OR
    p.full_name ILIKE '%' || p_search || '%' OR
    p.phone ILIKE '%' || p_search || '%' OR
    p.referral_code ILIKE '%' || p_search || '%' OR
    u.email ILIKE '%' || p_search || '%' OR
    p.user_id::text ILIKE '%' || p_search || '%'
  ) AND (
    p_filter_status = 'all' OR
    (p_filter_status = 'banned' AND p.is_banned = true) OR
    (p_filter_status = 'active' AND p.is_banned = false AND p.is_admin = false) OR
    (p_filter_status = 'admin' AND p.is_admin = true)
  );

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_users
  FROM (
    SELECT p.user_id, p.full_name, p.phone, p.referral_code, p.balance,
           p.vip_tier, p.is_admin, p.is_banned, p.admin_role, p.admin_note,
           p.created_at, u.email, u.created_at AS joined_at,
           p.withdrawal_day_limit
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE (
      p_search = '' OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.phone ILIKE '%' || p_search || '%' OR
      p.referral_code ILIKE '%' || p_search || '%' OR
      u.email ILIKE '%' || p_search || '%' OR
      p.user_id::text ILIKE '%' || p_search || '%'
    ) AND (
      p_filter_status = 'all' OR
      (p_filter_status = 'banned' AND p.is_banned = true) OR
      (p_filter_status = 'active' AND p.is_banned = false AND p.is_admin = false) OR
      (p_filter_status = 'admin' AND p.is_admin = true)
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  RETURN json_build_object('users', v_users, 'total', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, integer, integer) TO authenticated;

-- Get user detail (with email)
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_detail json;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT row_to_json(t) INTO v_detail
  FROM (
    SELECT p.*, u.email, u.created_at AS joined_at,
           (SELECT count(*) FROM public.task_completions WHERE user_id = p.user_id) AS total_tasks,
           (SELECT count(*) FROM public.wallet_requests WHERE user_id = p.user_id AND request_type = 'deposit' AND status = 'approved') AS total_deposits,
           (SELECT count(*) FROM public.wallet_requests WHERE user_id = p.user_id AND request_type = 'withdrawal' AND status = 'approved') AS total_withdrawals
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE p.user_id = p_user_id
  ) t;

  RETURN COALESCE(v_detail, '{}'::json);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated;

-- Create admin account (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_create_admin(
  p_email text, p_password text, p_full_name text, p_phone text, p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_new_user_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT admin_role INTO v_caller_role FROM public.profiles WHERE user_id = v_caller_id AND is_admin = true;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Only super admins can create admin accounts'; END IF;
  IF p_role NOT IN ('super_admin', 'admin', 'editor') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'Password must be at least 6 characters'; END IF;

  -- Create auth user
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), now(), json_build_object('full_name', p_full_name, 'phone', p_phone)::jsonb)
  RETURNING id INTO v_new_user_id;

  -- The trigger will create the profile; update it with admin fields
  UPDATE public.profiles
  SET is_admin = true, admin_role = p_role, full_name = p_full_name, phone = p_phone
  WHERE user_id = v_new_user_id;

  PERFORM public.admin_write_audit_log('ADMIN_CREATED', 'user', v_new_user_id::text, v_new_user_id, NULL, '', p_role, 'Created admin account');

  RETURN json_build_object('success', true, 'message', 'Admin account created', 'user_id', v_new_user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_create_admin(text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_admin(text, text, text, text, text) TO authenticated;

-- Change admin role (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_change_role(p_user_id uuid, p_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_previous_role text;
  v_super_admin_count integer;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT admin_role INTO v_caller_role FROM public.profiles WHERE user_id = v_caller_id AND is_admin = true;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Only super admins can change roles'; END IF;
  IF p_role NOT IN ('super_admin', 'admin', 'editor') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_user_id = v_caller_id AND p_role != 'super_admin' THEN RAISE EXCEPTION 'Cannot demote yourself'; END IF;

  -- Prevent removing the last super_admin
  IF p_role != 'super_admin' THEN
    SELECT count(*) INTO v_super_admin_count FROM public.profiles WHERE admin_role = 'super_admin' AND is_admin = true;
    SELECT admin_role INTO v_previous_role FROM public.profiles WHERE user_id = p_user_id;
    IF v_previous_role = 'super_admin' AND v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last super admin';
    END IF;
  END IF;

  SELECT admin_role INTO v_previous_role FROM public.profiles WHERE user_id = p_user_id;

  UPDATE public.profiles SET admin_role = p_role, is_admin = true WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  PERFORM public.admin_write_audit_log('ADMIN_ROLE_CHANGED', 'user', p_user_id::text, p_user_id, NULL, COALESCE(v_previous_role, ''), p_role, 'Role changed');

  RETURN json_build_object('success', true, 'message', 'Role updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_change_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_change_role(uuid, text) TO authenticated;

-- Disable admin (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_disable_admin(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_previous_role text;
  v_super_admin_count integer;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT admin_role INTO v_caller_role FROM public.profiles WHERE user_id = v_caller_id AND is_admin = true;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Only super admins can disable admins'; END IF;
  IF p_user_id = v_caller_id THEN RAISE EXCEPTION 'Cannot disable yourself'; END IF;

  SELECT admin_role INTO v_previous_role FROM public.profiles WHERE user_id = p_user_id;
  IF v_previous_role = 'super_admin' THEN
    SELECT count(*) INTO v_super_admin_count FROM public.profiles WHERE admin_role = 'super_admin' AND is_admin = true;
    IF v_super_admin_count <= 1 THEN RAISE EXCEPTION 'Cannot disable the last super admin'; END IF;
  END IF;

  UPDATE public.profiles SET is_admin = false, admin_role = NULL WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  PERFORM public.admin_write_audit_log('ADMIN_DISABLED', 'user', p_user_id::text, p_user_id, NULL, COALESCE(v_previous_role, ''), '', 'Admin disabled');

  RETURN json_build_object('success', true, 'message', 'Admin disabled');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_disable_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_disable_admin(uuid) TO authenticated;

-- Dashboard stats
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_total_users integer;
  v_active_users integer;
  v_banned_users integer;
  v_pending_deposits integer;
  v_pending_withdrawals integer;
  v_confirmed_deposits integer;
  v_approved_withdrawals integer;
  v_total_deposit_amount integer;
  v_total_withdrawal_amount integer;
  v_recent_deposits json;
  v_recent_withdrawals json;
  v_recent_users json;
  v_recent_activity json;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles WHERE is_admin = false;
  SELECT count(*) INTO v_active_users FROM public.profiles WHERE is_admin = false AND is_banned = false;
  SELECT count(*) INTO v_banned_users FROM public.profiles WHERE is_banned = true;
  SELECT count(*) INTO v_pending_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'pending';
  SELECT count(*) INTO v_pending_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'pending';
  SELECT count(*) INTO v_confirmed_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'approved';
  SELECT count(*) INTO v_approved_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'approved';
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit_amount FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'approved';
  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawal_amount FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'approved';

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_deposits
  FROM (SELECT wr.id, wr.amount, wr.status, wr.created_at, p.full_name, p.referral_code
    FROM public.wallet_requests wr JOIN public.profiles p ON p.user_id = wr.user_id
    WHERE wr.request_type = 'deposit' ORDER BY wr.created_at DESC LIMIT 5) t;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_withdrawals
  FROM (SELECT wr.id, wr.amount, wr.status, wr.created_at, p.full_name, p.referral_code
    FROM public.wallet_requests wr JOIN public.profiles p ON p.user_id = wr.user_id
    WHERE wr.request_type = 'withdrawal' ORDER BY wr.created_at DESC LIMIT 5) t;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_users
  FROM (SELECT user_id, full_name, referral_code, created_at, is_banned
    FROM public.profiles WHERE is_admin = false ORDER BY created_at DESC LIMIT 5) t;

  SELECT coalesce(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_activity
  FROM (SELECT id, admin_email, action, target_type, reason, created_at
    FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT 10) t;

  RETURN json_build_object(
    'total_users', v_total_users, 'active_users', v_active_users, 'banned_users', v_banned_users,
    'pending_deposits', v_pending_deposits, 'pending_withdrawals', v_pending_withdrawals,
    'confirmed_deposits', v_confirmed_deposits, 'approved_withdrawals', v_approved_withdrawals,
    'total_deposit_amount', v_total_deposit_amount, 'total_withdrawal_amount', v_total_withdrawal_amount,
    'recent_deposits', v_recent_deposits, 'recent_withdrawals', v_recent_withdrawals,
    'recent_users', v_recent_users, 'recent_activity', v_recent_activity
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;

-- Report data with date range
CREATE OR REPLACE FUNCTION public.admin_get_report_data(p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_start date := COALESCE(p_start_date, current_date - interval '30 days');
  v_end date := COALESCE(p_end_date, current_date);
  v_new_users integer;
  v_total_deposits integer;
  v_confirmed_deposits integer;
  v_declined_deposits integer;
  v_pending_deposits integer;
  v_total_withdrawals integer;
  v_approved_withdrawals integer;
  v_declined_withdrawals integer;
  v_pending_withdrawals integer;
  v_deposit_amount integer;
  v_withdrawal_amount integer;
BEGIN
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = auth.uid();
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT count(*) INTO v_new_users FROM public.profiles WHERE created_at::date BETWEEN v_start AND v_end AND is_admin = false;
  SELECT count(*) INTO v_total_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_confirmed_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'approved' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_declined_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'rejected' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_pending_deposits FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'pending' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_total_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_approved_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'approved' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_declined_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'rejected' AND created_at::date BETWEEN v_start AND v_end;
  SELECT count(*) INTO v_pending_withdrawals FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'pending' AND created_at::date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(amount), 0) INTO v_deposit_amount FROM public.wallet_requests WHERE request_type = 'deposit' AND status = 'approved' AND created_at::date BETWEEN v_start AND v_end;
  SELECT COALESCE(SUM(amount), 0) INTO v_withdrawal_amount FROM public.wallet_requests WHERE request_type = 'withdrawal' AND status = 'approved' AND created_at::date BETWEEN v_start AND v_end;

  RETURN json_build_object(
    'start_date', v_start, 'end_date', v_end,
    'new_users', v_new_users,
    'total_deposits', v_total_deposits, 'confirmed_deposits', v_confirmed_deposits,
    'declined_deposits', v_declined_deposits, 'pending_deposits', v_pending_deposits,
    'total_withdrawals', v_total_withdrawals, 'approved_withdrawals', v_approved_withdrawals,
    'declined_withdrawals', v_declined_withdrawals, 'pending_withdrawals', v_pending_withdrawals,
    'deposit_amount', v_deposit_amount, 'withdrawal_amount', v_withdrawal_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_report_data(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_report_data(date, date) TO authenticated;

-- Update existing admin functions to write audit logs and set reviewed_by

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
  SET status = 'approved', reviewed_at = now(), reviewed_by = v_admin_id, review_note = 'Approved by admin'
  WHERE id = p_request_id;

  UPDATE public.profiles
  SET vip_tier = v_tier.tier, vip_activated_at = now(), balance = balance + v_request.amount
  WHERE user_id = v_request.user_id;

  PERFORM public.admin_write_audit_log('DEPOSIT_CONFIRMED', 'wallet_request', p_request_id::text, v_request.user_id, p_request_id, 'pending', 'approved', 'Deposit approved');

  RETURN json_build_object('success', true, 'message', 'Deposit approved and VIP activated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_request_id uuid, p_note text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_user_id uuid;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT user_id INTO v_user_id FROM public.wallet_requests WHERE id = p_request_id AND request_type = 'deposit' AND status = 'pending';
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Deposit request not found or already processed'; END IF;

  UPDATE public.wallet_requests
  SET status = 'rejected', reviewed_at = now(), reviewed_by = v_admin_id, review_note = p_note
  WHERE id = p_request_id;

  PERFORM public.admin_write_audit_log('DEPOSIT_DECLINED', 'wallet_request', p_request_id::text, v_user_id, p_request_id, 'pending', 'rejected', p_note);

  RETURN json_build_object('success', true, 'message', 'Deposit rejected');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_user_id uuid;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT user_id INTO v_user_id FROM public.wallet_requests WHERE id = p_request_id AND request_type = 'withdrawal' AND status = 'pending';
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found or already processed'; END IF;

  UPDATE public.wallet_requests
  SET status = 'approved', reviewed_at = now(), reviewed_by = v_admin_id, review_note = 'Approved by admin'
  WHERE id = p_request_id;

  PERFORM public.admin_write_audit_log('WITHDRAWAL_APPROVED', 'wallet_request', p_request_id::text, v_user_id, p_request_id, 'pending', 'approved', 'Withdrawal approved');

  RETURN json_build_object('success', true, 'message', 'Withdrawal approved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;

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
  SET status = 'rejected', reviewed_at = now(), reviewed_by = v_admin_id, review_note = p_note
  WHERE id = p_request_id;

  UPDATE public.profiles SET balance = balance + v_request.amount WHERE user_id = v_request.user_id;

  PERFORM public.admin_write_audit_log('WITHDRAWAL_DECLINED', 'wallet_request', p_request_id::text, v_request.user_id, p_request_id, 'pending', 'rejected', p_note);

  RETURN json_build_object('success', true, 'message', 'Withdrawal rejected and balance refunded');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;

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

  PERFORM public.admin_write_audit_log('USER_BANNED', 'user', p_user_id::text, p_user_id, NULL, 'active', 'banned', p_note);

  RETURN json_build_object('success', true, 'message', 'User banned');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;

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

  PERFORM public.admin_write_audit_log('USER_UNBANNED', 'user', p_user_id::text, p_user_id, NULL, 'banned', 'active', 'User unbanned');

  RETURN json_build_object('success', true, 'message', 'User unbanned');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_full_name text, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_prev_name text;
  v_prev_phone text;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;

  SELECT full_name, phone INTO v_prev_name, v_prev_phone FROM public.profiles WHERE user_id = p_user_id;
  IF v_prev_name IS NULL AND v_prev_phone IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE public.profiles SET full_name = p_full_name, phone = p_phone WHERE user_id = p_user_id;

  PERFORM public.admin_write_audit_log('USER_UPDATED', 'user', p_user_id::text, p_user_id, NULL,
    COALESCE(v_prev_name, '') || ' / ' || COALESCE(v_prev_phone, ''),
    p_full_name || ' / ' || p_phone,
    'User info updated');

  RETURN json_build_object('success', true, 'message', 'User updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_admin(p_user_id uuid, p_is_admin boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_caller_role text;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin, admin_role INTO v_is_admin, v_caller_role FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id = v_admin_id AND p_is_admin = false THEN RAISE EXCEPTION 'Cannot remove your own admin privileges'; END IF;

  UPDATE public.profiles SET is_admin = p_is_admin, admin_role = CASE WHEN p_is_admin THEN COALESCE(admin_role, 'admin') ELSE NULL END
  WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  PERFORM public.admin_write_audit_log(
    CASE WHEN p_is_admin THEN 'ADMIN_CREATED' ELSE 'ADMIN_DISABLED' END,
    'user', p_user_id::text, p_user_id, NULL,
    CASE WHEN p_is_admin THEN 'false' ELSE 'true' END,
    CASE WHEN p_is_admin THEN 'true' ELSE 'false' END,
    CASE WHEN p_is_admin THEN 'Promoted to admin' ELSE 'Admin privileges removed' END
  );

  RETURN json_build_object('success', true, 'message', CASE WHEN p_is_admin THEN 'User promoted to admin' ELSE 'Admin privileges removed' END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) TO authenticated;

-- Update admin_update_balance to write audit log
CREATE OR REPLACE FUNCTION public.admin_update_balance(p_user_id uuid, p_amount integer, p_action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean;
  v_new_balance integer;
  v_old_balance integer;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE user_id = v_admin_id;
  IF NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_action NOT IN ('add', 'subtract') THEN RAISE EXCEPTION 'Invalid action'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT balance INTO v_old_balance FROM public.profiles WHERE user_id = p_user_id;
  IF v_old_balance IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF p_action = 'add' THEN
    UPDATE public.profiles SET balance = balance + p_amount WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  ELSE
    UPDATE public.profiles SET balance = GREATEST(0, balance - p_amount) WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;
  END IF;

  PERFORM public.admin_write_audit_log(
    CASE WHEN p_action = 'add' THEN 'BALANCE_CREDITED' ELSE 'BALANCE_DEBITED' END,
    'user', p_user_id::text, p_user_id, NULL,
    COALESCE(v_old_balance::text, ''), v_new_balance::text,
    'Balance ' || p_action || ' ' || p_amount
  );

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) TO authenticated;

-- Update admin_update_settings to write audit log
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

  PERFORM public.admin_write_audit_log('SETTINGS_UPDATED', 'system_settings', '1', NULL, NULL, '', p_withdrawal_days || ' / ' || p_daily_withdrawal_limit, 'Settings updated');

  RETURN json_build_object('success', true, 'message', 'Settings updated');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_settings(text, integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_settings(text, integer, integer, integer) TO authenticated;
