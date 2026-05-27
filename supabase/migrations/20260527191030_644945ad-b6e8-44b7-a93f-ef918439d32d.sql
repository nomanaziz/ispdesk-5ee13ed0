
CREATE TABLE public.app_role_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  scope text NOT NULL,
  scope_key text NOT NULL,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, scope, scope_key, feature_key)
);

CREATE INDEX idx_app_role_features_role ON public.app_role_features(role_id, scope, scope_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_role_features TO authenticated;
GRANT ALL ON public.app_role_features TO service_role;

ALTER TABLE public.app_role_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view app_role_features"
  ON public.app_role_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert app_role_features"
  ON public.app_role_features FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can update app_role_features"
  ON public.app_role_features FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can delete app_role_features"
  ON public.app_role_features FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- View: effective features per app_user (max(enabled) across roles).
-- NOTE: app_users currently has a single role_id (no junction table), so we join directly.
CREATE OR REPLACE VIEW public.app_user_effective_features AS
SELECT
  u.id AS user_id,
  f.scope,
  f.scope_key,
  f.feature_key,
  bool_or(f.enabled) AS enabled
FROM public.app_users u
JOIN public.app_role_features f ON f.role_id = u.role_id
GROUP BY u.id, f.scope, f.scope_key, f.feature_key;

GRANT SELECT ON public.app_user_effective_features TO authenticated;
GRANT SELECT ON public.app_user_effective_features TO service_role;
