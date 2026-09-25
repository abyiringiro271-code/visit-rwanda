/*
# Revoke PUBLIC EXECUTE from all admin SECURITY DEFINER functions

REVOKE ... FROM anon didn't work because the grant was to PUBLIC.
Revoke from PUBLIC, then grant only to authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_unban_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_balance(uuid, integer, text) TO authenticated;
