ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

CREATE TABLE public.customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 80),
  phone text NOT NULL CHECK (char_length(btrim(phone)) BETWEEN 8 AND 30),
  commune text NOT NULL DEFAULT 'Adjamé',
  address text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customer_profiles TO authenticated;
GRANT ALL ON public.customer_profiles TO service_role;

CREATE POLICY "Customers manage their own profile"
  ON public.customer_profiles FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TRIGGER customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders
  ADD COLUMN customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX orders_customer_created_at_idx
  ON public.orders (customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

CREATE POLICY "Customers read their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (customer_id = (SELECT auth.uid()));

CREATE POLICY "Customers read their own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = (SELECT auth.uid())
    )
  );

DROP FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb);

CREATE FUNCTION public.place_market_orders(
  _customer_name text,
  _customer_phone text,
  _commune text,
  _address text,
  _delivery_fee integer,
  _items jsonb,
  _customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_count integer;
  available_count integer;
  vendor_order record;
  order_id uuid;
  order_reference text;
  assigned_courier_id uuid;
  result jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Le panier est vide.';
  END IF;
  IF _delivery_fee < 0 THEN
    RAISE EXCEPTION 'Les frais de livraison sont invalides.';
  END IF;

  WITH requested AS (
    SELECT (item->>'product_id')::uuid AS product_id,
           sum((item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(_items) AS item
    GROUP BY (item->>'product_id')::uuid
  )
  SELECT count(*) INTO requested_count FROM requested;

  PERFORM p.id
  FROM public.products p
  JOIN (
    SELECT (item->>'product_id')::uuid AS product_id
    FROM jsonb_array_elements(_items) AS item
    GROUP BY (item->>'product_id')::uuid
  ) requested ON requested.product_id = p.id
  ORDER BY p.id
  FOR UPDATE OF p;

  WITH requested AS (
    SELECT (item->>'product_id')::uuid AS product_id,
           sum((item->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(_items) AS item
    GROUP BY (item->>'product_id')::uuid
  )
  SELECT count(*) INTO available_count
  FROM requested r
  JOIN public.products p ON p.id = r.product_id
  JOIN public.vendors v ON v.id = p.vendor_id
  WHERE p.is_active
    AND p.stock >= r.quantity
    AND v.status = 'actif'
    AND v.verified;

  IF available_count <> requested_count THEN
    RAISE EXCEPTION 'Un produit n’est plus disponible ou le stock est insuffisant. Corrigez votre panier avant de réessayer.';
  END IF;

  IF _customer_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (user_id, full_name, phone, commune, address)
    VALUES (_customer_id, _customer_name, _customer_phone, _commune, _address)
    ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        commune = EXCLUDED.commune,
        address = EXCLUDED.address;
  END IF;

  FOR vendor_order IN
    WITH requested AS (
      SELECT (item->>'product_id')::uuid AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_items) AS item
      GROUP BY (item->>'product_id')::uuid
    )
    SELECT p.vendor_id,
           v.shop_name,
           sum(p.price::bigint * r.quantity) AS items_total
    FROM requested r
    JOIN public.products p ON p.id = r.product_id
    JOIN public.vendors v ON v.id = p.vendor_id
    GROUP BY p.vendor_id, v.shop_name
    ORDER BY v.shop_name
  LOOP
    IF vendor_order.items_total > 5000000 THEN
      RAISE EXCEPTION 'Le montant de la commande dépasse la limite autorisée.';
    END IF;

    assigned_courier_id := NULL;
    SELECT c.id INTO assigned_courier_id
    FROM public.couriers c
    WHERE c.availability = 'disponible'
      AND EXISTS (
        SELECT 1
        FROM regexp_split_to_table(coalesce(c.zone, ''), '[/,;|]') AS zones(zone)
        WHERE lower(btrim(zones.zone)) = lower(btrim(_commune))
           OR (
             lower(btrim(zones.zone)) = 'abidjan'
             AND lower(btrim(_commune)) <> 'intérieur du pays'
           )
      )
    ORDER BY c.created_at, c.id
    LIMIT 1
    FOR UPDATE OF c SKIP LOCKED;

    order_reference := 'MG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO public.orders (
      reference, customer_name, customer_phone, commune, address,
      items_total, delivery_fee, status, vendor_id, courier_id, customer_id
    )
    VALUES (
      order_reference, _customer_name, _customer_phone, _commune, _address,
      vendor_order.items_total, _delivery_fee, 'nouvelle', vendor_order.vendor_id,
      assigned_courier_id, _customer_id
    )
    RETURNING id INTO order_id;

    WITH requested AS (
      SELECT (item->>'product_id')::uuid AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_items) AS item
      GROUP BY (item->>'product_id')::uuid
    )
    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, line_total
    )
    SELECT order_id, p.id, p.name, r.quantity, p.price, p.price * r.quantity
    FROM requested r
    JOIN public.products p ON p.id = r.product_id
    WHERE p.vendor_id = vendor_order.vendor_id;

    WITH requested AS (
      SELECT (item->>'product_id')::uuid AS product_id,
             sum((item->>'quantity')::integer)::integer AS quantity
      FROM jsonb_array_elements(_items) AS item
      GROUP BY (item->>'product_id')::uuid
    )
    UPDATE public.products p
    SET stock = p.stock - r.quantity
    FROM requested r
    WHERE p.id = r.product_id
      AND p.vendor_id = vendor_order.vendor_id;

    result := result || jsonb_build_array(jsonb_build_object(
      'reference', order_reference,
      'vendor_name', vendor_order.shop_name,
      'items_total', vendor_order.items_total,
      'delivery_fee', _delivery_fee
    ));
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb, uuid)
  TO service_role;