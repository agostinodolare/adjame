ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS additional_image_paths text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.products
  ADD CONSTRAINT products_additional_image_paths_limit
  CHECK (
    cardinality(additional_image_paths) <= 5
    AND array_position(additional_image_paths, NULL) IS NULL
  );
