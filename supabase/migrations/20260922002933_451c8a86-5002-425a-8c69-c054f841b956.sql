ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS vendors_user_id_key ON public.vendors(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS couriers_user_id_key ON public.couriers(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.vendors WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_courier_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.couriers WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_vendor_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_courier_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_vendor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_courier_id() TO authenticated, service_role;

DROP POLICY IF EXISTS "Vendeur lit sa boutique" ON public.vendors;
CREATE POLICY "Vendeur lit sa boutique" ON public.vendors
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Vendeur modifie sa boutique" ON public.vendors;
CREATE POLICY "Vendeur modifie sa boutique" ON public.vendors
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Livreur lit les boutiques de ses courses" ON public.vendors;
CREATE POLICY "Livreur lit les boutiques de ses courses" ON public.vendors
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.vendor_id = vendors.id AND o.courier_id = public.current_courier_id()
    )
  );

DROP POLICY IF EXISTS "Livreur lit sa fiche" ON public.couriers;
CREATE POLICY "Livreur lit sa fiche" ON public.couriers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Livreur modifie sa fiche" ON public.couriers;
CREATE POLICY "Livreur modifie sa fiche" ON public.couriers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Vendeur lit ses commandes" ON public.orders;
CREATE POLICY "Vendeur lit ses commandes" ON public.orders
  FOR SELECT TO authenticated USING (vendor_id IS NOT NULL AND vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS "Vendeur met a jour ses commandes" ON public.orders;
CREATE POLICY "Vendeur met a jour ses commandes" ON public.orders
  FOR UPDATE TO authenticated
  USING (vendor_id IS NOT NULL AND vendor_id = public.current_vendor_id())
  WITH CHECK (vendor_id IS NOT NULL AND vendor_id = public.current_vendor_id());

DROP POLICY IF EXISTS "Livreur lit ses courses" ON public.orders;
CREATE POLICY "Livreur lit ses courses" ON public.orders
  FOR SELECT TO authenticated USING (courier_id IS NOT NULL AND courier_id = public.current_courier_id());

DROP POLICY IF EXISTS "Livreur met a jour ses courses" ON public.orders;
CREATE POLICY "Livreur met a jour ses courses" ON public.orders
  FOR UPDATE TO authenticated
  USING (courier_id IS NOT NULL AND courier_id = public.current_courier_id())
  WITH CHECK (courier_id IS NOT NULL AND courier_id = public.current_courier_id());