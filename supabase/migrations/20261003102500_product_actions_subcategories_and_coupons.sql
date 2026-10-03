ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_subcategory_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_subcategory_check
      CHECK (subcategory IS NULL OR char_length(btrim(subcategory)) BETWEEN 1 AND 80);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.product_actions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  liked boolean NOT NULL DEFAULT false,
  favorite boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id),
  CHECK (liked OR favorite)
);

ALTER TABLE public.product_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_actions TO authenticated;
GRANT ALL ON public.product_actions TO service_role;

DROP POLICY IF EXISTS "Users read their own product actions" ON public.product_actions;
CREATE POLICY "Users read their own product actions"
  ON public.product_actions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users create their own product actions" ON public.product_actions;
CREATE POLICY "Users create their own product actions"
  ON public.product_actions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update their own product actions" ON public.product_actions;
CREATE POLICY "Users update their own product actions"
  ON public.product_actions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users delete their own product actions" ON public.product_actions;
CREATE POLICY "Users delete their own product actions"
  ON public.product_actions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS product_actions_updated_at ON public.product_actions;
CREATE TRIGGER product_actions_updated_at
  BEFORE UPDATE ON public.product_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE
    CHECK (code ~ '^[A-Z0-9_-]{3,40}$'),
  discount_type text NOT NULL
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL
    CHECK (discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 100)),
  valid_from timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > valid_from)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

DROP POLICY IF EXISTS "Admins read coupons" ON public.coupons;
CREATE POLICY "Admins read coupons"
  ON public.coupons FOR SELECT TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins create coupons" ON public.coupons;
CREATE POLICY "Admins create coupons"
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP POLICY IF EXISTS "Admins update coupons" ON public.coupons;
CREATE POLICY "Admins update coupons"
  ON public.coupons FOR UPDATE TO authenticated
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

DROP TRIGGER IF EXISTS coupons_updated_at ON public.coupons;
CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  discount_amount integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, customer_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupon_redemptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid,
  ADD COLUMN IF NOT EXISTS discount_total integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_coupon_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_discount_total_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_discount_total_check
      CHECK (discount_total >= 0 AND discount_total <= items_total);
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.place_market_orders_with_coupon(
  text, text, text, text, integer, jsonb, uuid, text
);

CREATE FUNCTION public.place_market_orders_with_coupon(
  _customer_name text,
  _customer_phone text,
  _commune text,
  _address text,
  _delivery_fee integer,
  _items jsonb,
  _customer_id uuid,
  _coupon_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  coupon_record public.coupons%ROWTYPE;
  base_orders jsonb;
  result jsonb := '[]'::jsonb;
  total_items integer;
  total_discount integer := 0;
  allocated_discount integer := 0;
  order_count integer;
  order_index integer := 0;
  order_discount integer;
  order_entry record;
  redemption_inserted integer;
BEGIN
  IF NULLIF(btrim(_coupon_code), '') IS NOT NULL THEN
    IF _customer_id IS NULL THEN
      RAISE EXCEPTION 'Connectez-vous avec un compte client pour utiliser un bon d’achat.';
    END IF;

    SELECT * INTO coupon_record
    FROM public.coupons
    WHERE code = upper(btrim(_coupon_code))
    FOR UPDATE;

    IF NOT FOUND OR NOT coupon_record.is_active
       OR coupon_record.valid_from > now()
       OR (coupon_record.expires_at IS NOT NULL AND coupon_record.expires_at <= now()) THEN
      RAISE EXCEPTION 'Ce code promo est invalide ou expiré.';
    END IF;

    INSERT INTO public.coupon_redemptions (coupon_id, customer_id)
    VALUES (coupon_record.id, _customer_id)
    ON CONFLICT (coupon_id, customer_id) DO NOTHING;
    GET DIAGNOSTICS redemption_inserted = ROW_COUNT;
    IF redemption_inserted = 0 THEN
      RAISE EXCEPTION 'Vous avez déjà utilisé ce code promo.';
    END IF;
  END IF;

  base_orders := public.place_market_orders(
    _customer_name,
    _customer_phone,
    _commune,
    _address,
    _delivery_fee,
    _items,
    _customer_id
  );

  IF coupon_record.id IS NOT NULL THEN
    SELECT COALESCE(sum((item->>'items_total')::integer), 0)::integer,
           count(*)::integer
    INTO total_items, order_count
    FROM jsonb_array_elements(base_orders) AS item;

    IF total_items <= 0 OR order_count = 0 THEN
      RAISE EXCEPTION 'Le code promo ne peut pas être appliqué à ce panier.';
    END IF;

    IF coupon_record.discount_type = 'percentage' THEN
      total_discount := floor(total_items::numeric * coupon_record.discount_value / 100)::integer;
    ELSE
      total_discount := least(total_items, coupon_record.discount_value);
    END IF;
    IF total_discount <= 0 THEN
      RAISE EXCEPTION 'Le montant du panier est trop faible pour appliquer ce code promo.';
    END IF;

    FOR order_entry IN
      SELECT item.value, item.ordinality
      FROM jsonb_array_elements(base_orders) WITH ORDINALITY AS item(value, ordinality)
      ORDER BY item.ordinality
    LOOP
      order_index := order_index + 1;
      IF order_index = order_count THEN
        order_discount := total_discount - allocated_discount;
      ELSE
        order_discount := floor(
          total_discount::numeric * (order_entry.value->>'items_total')::integer / total_items
        )::integer;
        allocated_discount := allocated_discount + order_discount;
      END IF;

      UPDATE public.orders
      SET coupon_id = coupon_record.id,
          discount_total = order_discount
      WHERE reference = order_entry.value->>'reference';

      result := result || jsonb_build_array(
        order_entry.value || jsonb_build_object(
          'discount_total', order_discount,
          'coupon_code', coupon_record.code
        )
      );
    END LOOP;

    UPDATE public.coupon_redemptions
    SET discount_amount = total_discount
    WHERE coupon_id = coupon_record.id
      AND customer_id = _customer_id;
  ELSE
    SELECT COALESCE(
      jsonb_agg(item.value || jsonb_build_object('discount_total', 0, 'coupon_code', NULL)
        ORDER BY item.ordinality),
      '[]'::jsonb
    )
    INTO result
    FROM jsonb_array_elements(base_orders) WITH ORDINALITY AS item(value, ordinality);
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.place_market_orders_with_coupon(
  text, text, text, text, integer, jsonb, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_market_orders_with_coupon(
  text, text, text, text, integer, jsonb, uuid, text
) TO service_role;
