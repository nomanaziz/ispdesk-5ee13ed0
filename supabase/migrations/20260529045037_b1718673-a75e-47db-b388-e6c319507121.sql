
-- Step 2: BW tenant portal branding
ALTER TABLE public.bw_sale_customers
  ADD COLUMN IF NOT EXISTS portal_slug text,
  ADD COLUMN IF NOT EXISTS portal_logo_url text,
  ADD COLUMN IF NOT EXISTS portal_brand_color text,
  ADD COLUMN IF NOT EXISTS portal_title text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bw_sale_customers_portal_slug
  ON public.bw_sale_customers(lower(portal_slug)) WHERE portal_slug IS NOT NULL;

-- Step 3: POP/reseller portal branding
ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS portal_slug text,
  ADD COLUMN IF NOT EXISTS portal_logo_url text,
  ADD COLUMN IF NOT EXISTS portal_brand_color text,
  ADD COLUMN IF NOT EXISTS portal_title text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_managers_portal_slug
  ON public.branch_managers(lower(portal_slug)) WHERE portal_slug IS NOT NULL;

-- Slug validation (reserved word block)
CREATE OR REPLACE FUNCTION public.validate_portal_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_reserved text[] := ARRAY['admin','api','dashboard','login','logout','portal','r','t','www','app','public','auth','signup','signin','reset-password'];
BEGIN
  IF NEW.portal_slug IS NULL OR NEW.portal_slug = '' THEN
    NEW.portal_slug := NULL;
    RETURN NEW;
  END IF;
  NEW.portal_slug := lower(trim(NEW.portal_slug));
  IF NEW.portal_slug !~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid slug: only lowercase letters, numbers, hyphens (3-32 chars, no leading/trailing hyphen)';
  END IF;
  IF NEW.portal_slug = ANY(v_reserved) THEN
    RAISE EXCEPTION 'Slug "%" is reserved', NEW.portal_slug;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_bw_portal_slug ON public.bw_sale_customers;
CREATE TRIGGER validate_bw_portal_slug BEFORE INSERT OR UPDATE OF portal_slug ON public.bw_sale_customers
  FOR EACH ROW EXECUTE FUNCTION public.validate_portal_slug();

DROP TRIGGER IF EXISTS validate_pop_portal_slug ON public.branch_managers;
CREATE TRIGGER validate_pop_portal_slug BEFORE INSERT OR UPDATE OF portal_slug ON public.branch_managers
  FOR EACH ROW EXECUTE FUNCTION public.validate_portal_slug();

-- Public branding lookups (safe fields only)
CREATE OR REPLACE FUNCTION public.get_tenant_branding_by_slug(_slug text)
RETURNS TABLE(tenant_id uuid, panel_branch_id uuid, customer_name text, portal_logo_url text, portal_brand_color text, portal_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, panel_branch_id, customer_name, portal_logo_url, portal_brand_color, portal_title
  FROM public.bw_sale_customers
  WHERE lower(portal_slug) = lower(trim(_slug))
    AND COALESCE(panel_access_enabled, false) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_reseller_branding_by_slug(_slug text)
RETURNS TABLE(reseller_id uuid, branch_id uuid, name text, portal_logo_url text, portal_brand_color text, portal_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, branch_id, name, portal_logo_url, portal_brand_color, portal_title
  FROM public.branch_managers
  WHERE lower(portal_slug) = lower(trim(_slug))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_branding_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reseller_branding_by_slug(text) TO anon, authenticated;

-- Branding storage bucket
INSERT INTO storage.buckets(id, name, public)
VALUES ('portal-branding','portal-branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "portal_branding_public_read" ON storage.objects;
CREATE POLICY "portal_branding_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portal-branding');

DROP POLICY IF EXISTS "portal_branding_admin_write" ON storage.objects;
CREATE POLICY "portal_branding_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portal-branding' AND public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "portal_branding_admin_update" ON storage.objects;
CREATE POLICY "portal_branding_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'portal-branding' AND public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "portal_branding_admin_delete" ON storage.objects;
CREATE POLICY "portal_branding_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'portal-branding' AND public.is_admin_or_super(auth.uid()));
