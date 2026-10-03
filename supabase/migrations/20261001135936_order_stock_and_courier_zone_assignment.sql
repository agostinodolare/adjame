CREATE OR REPLACE FUNCTION private.validate_order_courier_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  courier_zone text;
  courier_availability text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.courier_id IS NOT DISTINCT FROM OLD.courier_id THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent assigner un coursier.';
  END IF;

  IF NEW.courier_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.zone, c.availability
  INTO courier_zone, courier_availability
  FROM public.couriers c
  WHERE c.id = NEW.courier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Le coursier sélectionné est introuvable.';
  END IF;

  IF courier_availability <> 'disponible' THEN
    RAISE EXCEPTION 'Ce coursier n’est pas disponible.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM regexp_split_to_table(coalesce(courier_zone, ''), '[/,;|]') AS zones(zone)
    WHERE lower(btrim(zones.zone)) = lower(btrim(NEW.commune))
       OR (
         lower(btrim(zones.zone)) = 'abidjan'
         AND lower(btrim(NEW.commune)) <> 'intérieur du pays'
       )
  ) THEN
    RAISE EXCEPTION 'La zone de couverture du coursier ne correspond pas à la commune de livraison.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_order_courier_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NOT NULL
       AND NEW.courier_id IS DISTINCT FROM OLD.courier_id
       AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Seuls les administrateurs peuvent assigner un coursier.';
    END IF;
  ELSIF auth.uid() IS NOT NULL
        AND NEW.courier_id IS NOT NULL
        AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent assigner un coursier.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.courier_id IS NOT NULL THEN
      UPDATE public.couriers
      SET availability = 'en livraison'
      WHERE id = NEW.courier_id;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.courier_id IS NOT NULL
     AND OLD.courier_id IS DISTINCT FROM NEW.courier_id
     AND NOT EXISTS (
       SELECT 1
       FROM public.orders o
       WHERE o.courier_id = OLD.courier_id
         AND o.id <> NEW.id
         AND o.status NOT IN ('livree', 'annulee')
     ) THEN
    UPDATE public.couriers
    SET availability = 'disponible'
    WHERE id = OLD.courier_id
      AND availability = 'en livraison';
  END IF;

  IF NEW.courier_id IS NOT NULL
     AND OLD.courier_id IS DISTINCT FROM NEW.courier_id THEN
    UPDATE public.couriers
    SET availability = 'en livraison'
    WHERE id = NEW.courier_id;
  END IF;

  IF NEW.courier_id IS NOT NULL
     AND NEW.status IN ('livree', 'annulee')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NOT EXISTS (
       SELECT 1
       FROM public.orders o
       WHERE o.courier_id = NEW.courier_id
         AND o.id <> NEW.id
         AND o.status NOT IN ('livree', 'annulee')
     ) THEN
    UPDATE public.couriers
    SET availability = 'disponible'
    WHERE id = NEW.courier_id
      AND availability = 'en livraison';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.prevent_busy_courier_from_being_marked_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.availability = 'disponible'
     AND OLD.availability IS DISTINCT FROM NEW.availability
     AND EXISTS (
       SELECT 1
       FROM public.orders o
       WHERE o.courier_id = NEW.id
         AND o.status NOT IN ('livree', 'annulee')
     ) THEN
    RAISE EXCEPTION 'Ce coursier a encore une commande en cours.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_order_courier_assignment()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_order_courier_availability()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_busy_courier_from_being_marked_available()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_order_courier_assignment ON public.orders;
CREATE TRIGGER validate_order_courier_assignment
BEFORE INSERT OR UPDATE OF courier_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.validate_order_courier_assignment();

DROP TRIGGER IF EXISTS sync_order_courier_availability ON public.orders;
CREATE TRIGGER sync_order_courier_availability
AFTER INSERT OR UPDATE OF courier_id, status ON public.orders
FOR EACH ROW EXECUTE FUNCTION private.sync_order_courier_availability();

DROP TRIGGER IF EXISTS prevent_busy_courier_from_being_marked_available ON public.couriers;
CREATE TRIGGER prevent_busy_courier_from_being_marked_available
BEFORE UPDATE OF availability ON public.couriers
FOR EACH ROW EXECUTE FUNCTION private.prevent_busy_courier_from_being_marked_available();

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
      items_total, delivery_fee, status, vendor_id, courier_id
    )
    VALUES (
      order_reference, _customer_name, _customer_phone, _commune, _address,
      vendor_order.items_total, _delivery_fee, 'nouvelle', vendor_order.vendor_id,
      assigned_courier_id
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
      'delivery_fee', _delivery_fee,
      'courier_id', assigned_courier_id
    ));
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_market_orders(text, text, text, text, integer, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.assign_order_courier(
  _order_id uuid,
  _courier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  order_status text;
BEGIN
  SELECT o.status INTO order_status
  FROM public.orders o
  WHERE o.id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable.';
  END IF;

  IF order_status IN ('livree', 'annulee') AND _courier_id IS NOT NULL THEN
    RAISE EXCEPTION 'Impossible d’assigner un coursier à une commande terminée.';
  END IF;

  UPDATE public.orders
  SET courier_id = _courier_id
  WHERE id = _order_id;

  RETURN jsonb_build_object('courier_id', _courier_id);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_order_courier(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_courier(uuid, uuid)
  TO service_role;