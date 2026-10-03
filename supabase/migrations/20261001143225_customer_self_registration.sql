GRANT INSERT ON public.user_roles TO authenticated;

CREATE POLICY "Customers can register their own client role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND role = 'client'
  );