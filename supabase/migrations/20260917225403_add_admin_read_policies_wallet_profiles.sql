/*
# Allow admins to view all wallet_requests and all profiles

The admin portal lists all deposits/withdrawals with user info via a join.
RLS currently restricts both tables to own-row-only, so admins see nothing.
Add admin SELECT policies that allow is_admin users to read all rows.
*/

-- Admin can see all wallet requests
CREATE POLICY "wallet_requests_select_admin"
  ON public.wallet_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admin can see all profiles (needed for joins in deposit/withdrawal lists)
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.user_id = auth.uid() AND p2.is_admin = true
    )
  );
