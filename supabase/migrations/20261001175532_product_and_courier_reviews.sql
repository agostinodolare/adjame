CREATE TABLE public.product_reviews (
  order_item_id uuid PRIMARY KEY REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_reviews_product_id_idx ON public.product_reviews (product_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_reviews FROM anon, authenticated;
GRANT SELECT (order_item_id, product_id, rating) ON public.product_reviews TO anon, authenticated;
GRANT INSERT (order_item_id, product_id, rating) ON public.product_reviews TO authenticated;

CREATE POLICY "Anyone can read product ratings"
  ON public.product_reviews FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Customers can rate purchased products after delivery"
  ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = product_reviews.order_item_id
        AND oi.product_id = product_reviews.product_id
        AND o.customer_id = (SELECT auth.uid())
        AND o.status = 'livree'
    )
  );

CREATE TABLE public.courier_reviews (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX courier_reviews_courier_id_idx ON public.courier_reviews (courier_id);

ALTER TABLE public.courier_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.courier_reviews FROM anon, authenticated;
GRANT SELECT, INSERT ON public.courier_reviews TO authenticated;

CREATE POLICY "Customers read their courier ratings"
  ON public.courier_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = (SELECT auth.uid())
    )
  );

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

CREATE POLICY "Customers rate couriers for their delivered orders"
  ON public.courier_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = courier_reviews.order_id
        AND o.customer_id = (SELECT auth.uid())
        AND o.courier_id = courier_reviews.courier_id
        AND o.status = 'livree'
    )
  );