
CREATE TABLE IF NOT EXISTS public.polling_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text NOT NULL UNIQUE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'offline',
  last_heartbeat timestamptz,
  version text,
  notes text,
  poll_interval_seconds integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_polling_agents_api_key ON public.polling_agents(api_key);
CREATE INDEX IF NOT EXISTS idx_polling_agents_branch ON public.polling_agents(branch_id);

ALTER TABLE public.polling_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage polling agents"
ON public.polling_agents FOR ALL
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Operators view branch polling agents"
ON public.polling_agents FOR SELECT
USING (
  public.has_role(auth.uid(), 'operator')
  AND branch_id = public.get_user_branch(auth.uid())
);

CREATE TRIGGER polling_agents_updated_at
BEFORE UPDATE ON public.polling_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.olt_devices
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.polling_agents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_olt_devices_assigned_agent ON public.olt_devices(assigned_agent_id);
