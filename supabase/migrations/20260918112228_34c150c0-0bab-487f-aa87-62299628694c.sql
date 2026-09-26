CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_bootstrap_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shop_name text NOT NULL,
  category text NOT NULL DEFAULT 'Divers',
  phone text,
  stall text,
  status text NOT NULL DEFAULT 'actif',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  zone text NOT NULL DEFAULT 'Abidjan',
  availability text NOT NULL DEFAULT 'disponible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage couriers" ON public.couriers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER couriers_updated_at BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  commune text NOT NULL DEFAULT 'Adjamé',
  address text,
  items_total integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'nouvelle',
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.vendors (id, name, shop_name, category, phone, stall, status, verified) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Awa Koné', 'Chez Awa Créations', 'Femme', '+225 07 01 02 03 04', 'Allée B - 14', 'actif', true),
  ('11111111-1111-4111-8111-111111111102', 'Ibrahim Bamba', 'Bamba Shoes', 'Chaussures', '+225 05 11 22 33 44', 'Allée C - 06', 'actif', true),
  ('11111111-1111-4111-8111-111111111103', 'Serge Kouassi', 'Adjamé Digital', 'Téléphones', '+225 01 44 55 66 77', 'Forum - 21', 'actif', false),
  ('11111111-1111-4111-8111-111111111104', 'Fatou Traoré', 'Fatou Kids', 'Enfant', '+225 07 88 99 00 11', 'Allée D - 03', 'suspendu', false);

INSERT INTO public.couriers (id, name, phone, zone, availability) VALUES
  ('22222222-2222-4222-8222-222222222201', 'Yao Modeste', '+225 07 12 34 56 78', 'Adjamé / Plateau', 'en livraison'),
  ('22222222-2222-4222-8222-222222222202', 'Aboubakar Sanogo', '+225 05 23 45 67 89', 'Yopougon', 'en livraison'),
  ('22222222-2222-4222-8222-222222222203', 'Marie Gbagbo', '+225 01 34 56 78 90', 'Cocody / Abobo', 'disponible'),
  ('22222222-2222-4222-8222-222222222204', 'Koffi Éric', '+225 07 45 67 89 01', 'Marcory / Treichville', 'hors ligne');

INSERT INTO public.orders (reference, customer_name, customer_phone, commune, address, items_total, delivery_fee, status, vendor_id, courier_id, created_at) VALUES
  ('MG-1041', 'Aya Diomandé', '+225 07 77 11 22 33', 'Cocody', 'Angré 7e tranche, près de la pharmacie', 17000, 1500, 'en_livraison', '11111111-1111-4111-8111-111111111102', '22222222-2222-4222-8222-222222222201', now() - interval '2 hours'),
  ('MG-1042', 'Moussa Camara', '+225 05 66 22 33 44', 'Yopougon', 'Niangon Sud, rue des écoles', 79500, 2000, 'en_livraison', '11111111-1111-4111-8111-111111111103', '22222222-2222-4222-8222-222222222202', now() - interval '1 hour'),
  ('MG-1043', 'Estelle N''Guessan', '+225 01 55 33 44 55', 'Plateau', 'Avenue Chardy, immeuble Alpha 2000', 8500, 1000, 'confirmee', '11111111-1111-4111-8111-111111111101', NULL, now() - interval '35 minutes'),
  ('MG-1044', 'Bakary Touré', '+225 07 22 44 55 66', 'Abobo', 'Abobo Baoulé, carrefour Sogefiha', 25500, 1500, 'nouvelle', '11111111-1111-4111-8111-111111111102', NULL, now() - interval '12 minutes'),
  ('MG-1045', 'Sandrine Koua', '+225 05 99 88 77 66', 'Marcory', 'Zone 4, rue du Canal', 12000, 1500, 'livree', '11111111-1111-4111-8111-111111111101', '22222222-2222-4222-8222-222222222204', now() - interval '1 day'),
  ('MG-1046', 'Pascal Yao', '+225 01 11 22 33 44', 'Treichville', 'Avenue 16, rue 21', 34000, 1500, 'annulee', '11111111-1111-4111-8111-111111111103', NULL, now() - interval '2 days');