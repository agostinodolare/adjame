DROP POLICY "Admins read courier ratings"
  ON public.courier_reviews;

CREATE POLICY "Admins read courier ratings"
  ON public.courier_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles r
      WHERE r.user_id = (SELECT auth.uid())
        AND r.role = 'admin'
    )
  );