BEGIN;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price > 0),
  line_total integer NOT NULL CHECK (line_total > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX order_items_product_id_idx ON public.order_items (product_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_items FROM anon, authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

CREATE POLICY "Admins read order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );

CREATE POLICY "Staff read order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'staff'
    )
  );

CREATE POLICY "Vendors read their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.vendor_id = (SELECT public.current_vendor_id())
    )
  );

CREATE POLICY "Couriers read their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.courier_id = (SELECT public.current_courier_id())
    )
  );

CREATE OR REPLACE FUNCTION public.place_market_orders(
  _customer_name text,
  _customer_phone text,
  _commune text,
  _address text,
  _delivery_fee integer,
  _items jsonb
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
    RAISE EXCEPTION 'Un produit n’est plus disponible ou le stock est insuffisant.';
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

    order_reference := 'MG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO public.orders (
      reference, customer_name, customer_phone, commune, address,
      items_total, delivery_fee, status, vendor_id
    )
    VALUES (
      order_reference, _customer_name, _customer_phone, _commune, _address,
      vendor_order.items_total, _delivery_fee, 'nouvelle', vendor_order.vendor_id
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

REVOKE ALL ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb)
  TO service_role;

COMMIT;