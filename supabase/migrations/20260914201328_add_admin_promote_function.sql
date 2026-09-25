/*
# Add admin promote/demote function

1. New Function
- `admin_set_admin(p_user_id, p_is_admin)`: allows an existing admin to promote or demote another user

2. Security
- Only existing admins (is_admin = true) can call this function
- Cannot demote yourself (prevents locking out all admins)
*/

CREATE OR REPLACE FUNCTION public.admin_set_admin(p_user_id uuid, p_is_admin boolean)
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

  IF p_user_id = v_admin_id AND p_is_admin = false THEN
    RAISE EXCEPTION 'Cannot remove your own admin privileges';
  END IF;

  UPDATE public.profiles SET is_admin = p_is_admin WHERE user_id = p_user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  RETURN json_build_object('success', true, 'message', CASE WHEN p_is_admin THEN 'User promoted to admin' ELSE 'Admin privileges removed' END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(uuid, boolean) TO authenticated;
