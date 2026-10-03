CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  category text NOT NULL DEFAULT 'Divers',
  price integer NOT NULL CHECK (price > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_vendor_created_at_idx
  ON public.products (vendor_id, created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM anon, authenticated;
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE POLICY "Public can read active products from verified shops"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.vendors v
      WHERE v.id = products.vendor_id
        AND v.status = 'actif'
        AND v.verified = true
    )
  );

CREATE POLICY "Vendors can read their products"
  ON public.products FOR SELECT TO authenticated
  USING (vendor_id = (SELECT public.current_vendor_id()));

CREATE POLICY "Vendors can add their products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (vendor_id = (SELECT public.current_vendor_id()));

CREATE POLICY "Vendors can update their products"
  ON public.products FOR UPDATE TO authenticated
  USING (vendor_id = (SELECT public.current_vendor_id()))
  WITH CHECK (vendor_id = (SELECT public.current_vendor_id()));

CREATE POLICY "Vendors can delete their products"
  ON public.products FOR DELETE TO authenticated
  USING (vendor_id = (SELECT public.current_vendor_id()));

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 6291456, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Vendors can upload their product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Vendors can delete their product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.user_id = (SELECT auth.uid())
    )
  );