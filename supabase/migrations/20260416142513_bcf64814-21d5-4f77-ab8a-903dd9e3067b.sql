
CREATE TABLE public.client_traffic_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  username text,
  month date NOT NULL,
  total_upload bigint DEFAULT 0,
  total_download bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, month)
);

ALTER TABLE public.client_traffic_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view traffic monthly"
  ON public.client_traffic_monthly FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can insert traffic monthly"
  ON public.client_traffic_monthly FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update traffic monthly"
  ON public.client_traffic_monthly FOR UPDATE USING (true);

CREATE INDEX idx_traffic_monthly_client_month ON public.client_traffic_monthly(client_id, month);
CREATE INDEX idx_traffic_monthly_month ON public.client_traffic_monthly(month);
