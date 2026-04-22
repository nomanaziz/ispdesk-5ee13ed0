
ALTER TABLE public.sms_template_master
  ADD COLUMN IF NOT EXISTS created_by_branch uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sms_template_master_created_by_branch
  ON public.sms_template_master(created_by_branch);

DROP VIEW IF EXISTS public.sms_templates_effective;
CREATE VIEW public.sms_templates_effective AS
SELECT
  m.id            AS master_id,
  m.template_key,
  COALESCE(o.name, m.name)       AS name,
  COALESCE(o.content, m.content) AS content,
  m.template_type,
  m.category,
  m.variables,
  m.is_protected,
  COALESCE(o.is_active, m.is_active) AS is_active,
  o.branch_id,
  (o.id IS NOT NULL) AS is_overridden,
  m.created_by_branch
FROM public.sms_template_master m
LEFT JOIN public.sms_template_overrides o ON o.master_id = m.id;
