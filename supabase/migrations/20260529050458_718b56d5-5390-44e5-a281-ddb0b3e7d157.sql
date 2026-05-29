
-- Providers
CREATE TABLE public.notification_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  provider TEXT NOT NULL,
  sender_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_providers TO authenticated;
GRANT ALL ON public.notification_providers TO service_role;
ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notification providers"
ON public.notification_providers FOR ALL TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_notification_providers_updated
BEFORE UPDATE ON public.notification_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email','whatsapp')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_templates_lookup ON public.notification_templates(tenant_id, category, channel);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates"
ON public.notification_templates FOR ALL TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Staff read templates with module"
ON public.notification_templates FOR SELECT TO authenticated
USING (
  public.is_admin_or_super(auth.uid())
  OR public.user_has_module(auth.uid(), 'NOTIFICATIONS', 'Templates', 'read')
);

CREATE TRIGGER trg_notification_templates_updated
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Logs
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','delivered')),
  provider TEXT,
  provider_message_id TEXT,
  error TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_logs_recent ON public.notification_logs(tenant_id, created_at DESC);
CREATE INDEX idx_notif_logs_recipient ON public.notification_logs(tenant_id, recipient);

GRANT SELECT, INSERT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all logs"
ON public.notification_logs FOR SELECT TO authenticated
USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Staff view logs with module"
ON public.notification_logs FOR SELECT TO authenticated
USING (public.user_has_module(auth.uid(), 'NOTIFICATIONS', 'Logs', 'read'));

CREATE POLICY "Admins insert logs"
ON public.notification_logs FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_super(auth.uid()));
