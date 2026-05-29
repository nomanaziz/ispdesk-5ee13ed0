
ALTER TABLE public.notification_providers ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.notification_templates ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.notification_logs ALTER COLUMN tenant_id DROP NOT NULL;

-- Drop unique constraint that conflicts with NULL tenant_id, recreate as partial
ALTER TABLE public.notification_providers DROP CONSTRAINT IF EXISTS notification_providers_tenant_id_channel_key;
CREATE UNIQUE INDEX idx_notif_provider_unique ON public.notification_providers (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), channel);
