/*
# Reset all users and create new admin

## What this does
1. Truncates all app tables
2. Creates a one-time SECURITY DEFINER function to insert a new admin user into auth.users
3. Creates the admin profile with super_admin role
4. Drops the helper function

## New Admin Credentials
- Email: admin@visitrwanda.rw
- Password: Admin@2025
- Phone: 0780000000
- Name: Admin
- Role: super_admin
*/

-- Step 1: Clear all app tables
TRUNCATE public.admin_audit_logs;
TRUNCATE public.wallet_requests;
TRUNCATE public.task_completions;
TRUNCATE public.profiles;

-- Step 2: Create a one-time helper function to insert into auth.users
CREATE OR REPLACE FUNCTION public._create_admin_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  IF v_existing_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_existing_id;
    DELETE FROM auth.sessions WHERE user_id = v_existing_id;
    DELETE FROM auth.refresh_tokens WHERE user_id = v_existing_id;
    DELETE FROM auth.users WHERE id = v_existing_id;
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    false
  )
  RETURNING id INTO v_user_id;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    v_user_id::text,
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$;

-- Step 3: Call it to create the admin
DO $$
DECLARE
  v_admin_id uuid;
  v_count int;
BEGIN
  SELECT public._create_admin_user('admin@visitrwanda.rw', 'Admin@2025', 'Admin', '0780000000') INTO v_admin_id;

  -- Check if trigger already created a profile
  SELECT count(*) INTO v_count FROM public.profiles WHERE user_id = v_admin_id;

  IF v_count > 0 THEN
    UPDATE public.profiles
    SET is_admin = true,
        admin_role = 'super_admin',
        onboarding_complete = true,
        balance = 3000
    WHERE user_id = v_admin_id;
  ELSE
    INSERT INTO public.profiles (user_id, full_name, phone, referral_code, is_admin, admin_role, onboarding_complete, balance)
    VALUES (v_admin_id, 'Admin', '0780000000', 'visitrwanda000001', true, 'super_admin', true, 3000);
  END IF;
END $$;

-- Step 4: Drop the helper function
DROP FUNCTION public._create_admin_user(text, text, text, text);
