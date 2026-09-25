/*
# Revoke anon EXECUTE from all admin SECURITY DEFINER functions

The security advisor flagged that anon can call admin functions via the REST API.
Each function checks auth.uid() + is_admin internally, but anon should not have
EXECUTE at all — defense in depth.
*/

REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) FROM anon;
