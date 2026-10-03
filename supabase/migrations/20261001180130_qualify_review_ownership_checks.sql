DROP POLICY "Customers can rate purchased products after delivery"
  ON public.product_reviews;

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

DROP POLICY "Customers rate couriers for their delivered orders"
  ON public.courier_reviews;

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