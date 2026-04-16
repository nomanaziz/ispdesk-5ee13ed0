
-- Create client_traffic_logs table
CREATE TABLE public.client_traffic_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  username text,
  device_id uuid REFERENCES public.mikrotik_devices(id) ON DELETE SET NULL,
  upload_bytes bigint NOT NULL DEFAULT 0,
  download_bytes bigint NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_client_traffic_logs_client_id ON public.client_traffic_logs(client_id);
CREATE INDEX idx_client_traffic_logs_recorded_at ON public.client_traffic_logs(recorded_at);

-- Enable RLS
ALTER TABLE public.client_traffic_logs ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read
CREATE POLICY "Authenticated users can view traffic logs"
ON public.client_traffic_logs FOR SELECT TO authenticated USING (true);

-- RLS: service role inserts (edge function)
CREATE POLICY "Service role can insert traffic logs"
ON public.client_traffic_logs FOR INSERT TO service_role WITH CHECK (true);

-- Add total_upload and total_download to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_upload bigint NOT NULL DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_download bigint NOT NULL DEFAULT 0;
