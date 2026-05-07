
CREATE TABLE public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verifying','verified','active','failed')),
  is_primary boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_domains_tenant ON public.tenant_domains(tenant_id);
CREATE INDEX idx_tenant_domains_status ON public.tenant_domains(status);

CREATE OR REPLACE FUNCTION public.tenant_domains_normalize()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.domain := lower(trim(NEW.domain));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_domains_normalize
BEFORE INSERT OR UPDATE ON public.tenant_domains
FOR EACH ROW EXECUTE FUNCTION public.tenant_domains_normalize();

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all tenant domains"
ON public.tenant_domains FOR ALL TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Tenant users view own domains"
ON public.tenant_domains FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bw_sale_customers c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = tenant_domains.tenant_id
      AND (c.panel_branch_id = p.branch_id OR lower(c.email) = lower(p.email))
  )
);

CREATE POLICY "Tenant users insert own domains"
ON public.tenant_domains FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bw_sale_customers c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = tenant_domains.tenant_id
      AND (c.panel_branch_id = p.branch_id OR lower(c.email) = lower(p.email))
  )
);

CREATE POLICY "Tenant users update own domains"
ON public.tenant_domains FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bw_sale_customers c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = tenant_domains.tenant_id
      AND (c.panel_branch_id = p.branch_id OR lower(c.email) = lower(p.email))
  )
);

CREATE POLICY "Tenant users delete own domains"
ON public.tenant_domains FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bw_sale_customers c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = tenant_domains.tenant_id
      AND (c.panel_branch_id = p.branch_id OR lower(c.email) = lower(p.email))
  )
);

CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(_domain text)
RETURNS TABLE(tenant_id uuid, panel_branch_id uuid, customer_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.panel_branch_id, c.customer_name
  FROM public.tenant_domains d
  JOIN public.bw_sale_customers c ON c.id = d.tenant_id
  WHERE d.domain = lower(trim(_domain))
    AND d.status IN ('verified','active')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_by_domain(text) TO anon, authenticated;
