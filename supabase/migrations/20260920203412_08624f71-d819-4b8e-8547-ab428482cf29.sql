-- 1. Inline admin/staff checks so the SECURITY DEFINER function no longer needs to be callable by signed-in users
DROP POLICY IF EXISTS "Admins manage vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admins manage couriers" ON public.couriers;
DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;

CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

CREATE POLICY "Admins manage couriers" ON public.couriers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));

-- 2. Staff read access (operations team) on the three operational tables
CREATE POLICY "Staff can read vendors" ON public.vendors FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'staff'));

CREATE POLICY "Staff can read couriers" ON public.couriers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'staff'));

CREATE POLICY "Staff can read orders" ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'staff'));

-- 3. Public storefront read of active, verified shops only. Couriers stay private (personal data).
CREATE POLICY "Anyone can read active verified vendors" ON public.vendors FOR SELECT TO anon, authenticated
USING (status = 'actif' AND verified = true);

GRANT SELECT ON public.vendors TO anon;

-- 4. The role-check function is no longer used by policies, so signed-in users must not execute it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;