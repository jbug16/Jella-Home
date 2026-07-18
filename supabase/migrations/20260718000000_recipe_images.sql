-- Recipe cover images: a nullable image_path on recipes plus a private Storage
-- bucket with household-scoped access. Object keys are "{household_id}/{uuid}.{ext}"
-- so the first folder segment is the owning household. Access is granted through
-- the existing private.is_household_member helper (see 20260716233000_private_membership_fn).

-- ---------------------------------------------------------------------------
-- recipes: optional cover image object key (not a URL).
-- ---------------------------------------------------------------------------
ALTER TABLE public.recipes
  ADD COLUMN image_path text NULL;

-- ---------------------------------------------------------------------------
-- Private bucket for recipe images. 5 MB cap; common web image types only.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Access check for a recipe-image object. Parses the leading household folder
-- from the object key and defers to household membership. Exception-safe so a
-- non-UUID prefix (e.g. from another bucket) simply denies instead of erroring
-- while this permissive policy is evaluated across storage.objects rows.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_recipe_image(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  household uuid;
BEGIN
  BEGIN
    household := ((storage.foldername(object_name))[1])::uuid;
  EXCEPTION
    WHEN others THEN
      RETURN false;
  END;

  IF household IS NULL THEN
    RETURN false;
  END IF;

  RETURN private.is_household_member(household);
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_recipe_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_recipe_image(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage RLS: household members get full CRUD on their own recipe images.
-- ---------------------------------------------------------------------------
CREATE POLICY recipe_images_select_member
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_insert_member
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND public.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_update_member
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_access_recipe_image(name)
  )
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND public.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_delete_member
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_access_recipe_image(name)
  );
