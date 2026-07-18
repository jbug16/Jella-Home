-- Move can_access_recipe_image out of the API-exposed public schema.
-- Fixes Security Advisor: anon/authenticated SECURITY DEFINER RPC exposure
-- (same treatment as private.is_household_member). Storage policies still call
-- it; authenticated retains EXECUTE for RLS evaluation.

CREATE OR REPLACE FUNCTION private.can_access_recipe_image(object_name text)
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

REVOKE ALL ON FUNCTION private.can_access_recipe_image(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access_recipe_image(text) FROM anon;
GRANT EXECUTE ON FUNCTION private.can_access_recipe_image(text) TO authenticated;

-- Storage policies depend on the public function; drop them before dropping it.
DROP POLICY IF EXISTS recipe_images_select_member ON storage.objects;
DROP POLICY IF EXISTS recipe_images_insert_member ON storage.objects;
DROP POLICY IF EXISTS recipe_images_update_member ON storage.objects;
DROP POLICY IF EXISTS recipe_images_delete_member ON storage.objects;

DROP FUNCTION IF EXISTS public.can_access_recipe_image(text);

CREATE POLICY recipe_images_select_member
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND private.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_insert_member
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND private.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_update_member
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND private.can_access_recipe_image(name)
  )
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND private.can_access_recipe_image(name)
  );

CREATE POLICY recipe_images_delete_member
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND private.can_access_recipe_image(name)
  );
