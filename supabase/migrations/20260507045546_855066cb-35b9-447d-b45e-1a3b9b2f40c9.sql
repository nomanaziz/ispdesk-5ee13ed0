
-- Extend system_logs
ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS entity_label text,
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded_at timestamptz;

ALTER TABLE public.system_logs
  ALTER COLUMN log_message DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action);
CREATE INDEX IF NOT EXISTS idx_system_logs_entity_type ON public.system_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_branch ON public.system_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_forwarded ON public.system_logs(forwarded) WHERE forwarded = false;

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all logs" ON public.system_logs;
CREATE POLICY "Admins read all logs"
ON public.system_logs FOR SELECT TO authenticated
USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Users read own logs" ON public.system_logs;
CREATE POLICY "Users read own logs"
ON public.system_logs FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated insert logs" ON public.system_logs;
CREATE POLICY "Authenticated insert logs"
ON public.system_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Forwarders table
CREATE TABLE IF NOT EXISTS public.system_log_forwarders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  endpoint_type text NOT NULL DEFAULT 'webhook' CHECK (endpoint_type IN ('webhook','syslog_http')),
  url text NOT NULL,
  auth_header text,
  enabled boolean NOT NULL DEFAULT true,
  min_severity text NOT NULL DEFAULT 'info' CHECK (min_severity IN ('info','warning','error','critical')),
  event_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sent_at timestamptz,
  last_error text,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_system_log_forwarders_updated
BEFORE UPDATE ON public.system_log_forwarders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.system_log_forwarders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage forwarders" ON public.system_log_forwarders;
CREATE POLICY "Admins manage forwarders"
ON public.system_log_forwarders FOR ALL TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

-- Helper function
CREATE OR REPLACE FUNCTION public.log_action(
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _entity_label text DEFAULT NULL,
  _severity text DEFAULT 'info',
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_branch uuid;
BEGIN
  SELECT branch_id INTO v_branch FROM public.profiles WHERE user_id = auth.uid();
  INSERT INTO public.system_logs(
    user_id, action, entity_type, entity_id, entity_label,
    severity, branch_id, metadata, log_message
  ) VALUES (
    auth.uid(), _action, _entity_type, _entity_id, _entity_label,
    _severity, v_branch, _metadata,
    coalesce(_action,'event') || ' ' || coalesce(_entity_type,'') || ' ' || coalesce(_entity_label,'')
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Generic audit trigger
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action text;
  v_label text;
  v_id uuid;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    v_label := coalesce(to_jsonb(NEW)->>'name', to_jsonb(NEW)->>'username', to_jsonb(NEW)->>'title', v_id::text);
    v_meta := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_id := (to_jsonb(NEW)->>'id')::uuid;
    v_label := coalesce(to_jsonb(NEW)->>'name', to_jsonb(NEW)->>'username', to_jsonb(NEW)->>'title', v_id::text);
    v_meta := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_action := 'delete';
    v_id := (to_jsonb(OLD)->>'id')::uuid;
    v_label := coalesce(to_jsonb(OLD)->>'name', to_jsonb(OLD)->>'username', to_jsonb(OLD)->>'title', v_id::text);
    v_meta := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM public.log_action(
    v_action, TG_TABLE_NAME, v_id, v_label,
    CASE WHEN TG_OP = 'DELETE' THEN 'warning' ELSE 'info' END,
    v_meta
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach to critical tables
DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

DROP TRIGGER IF EXISTS trg_audit_branch_managers ON public.branch_managers;
CREATE TRIGGER trg_audit_branch_managers
AFTER INSERT OR UPDATE OR DELETE ON public.branch_managers
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();
