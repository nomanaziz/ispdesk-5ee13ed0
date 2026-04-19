-- olt_mac_table: per-OLT MAC snapshot
CREATE TABLE IF NOT EXISTS public.olt_mac_table (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id UUID NOT NULL REFERENCES public.olt_devices(id) ON DELETE CASCADE,
  mac TEXT NOT NULL,
  port TEXT NOT NULL,
  port_type TEXT NOT NULL DEFAULT 'unknown',
  vlan INT,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS olt_mac_table_unique ON public.olt_mac_table (olt_id, mac, port);
CREATE INDEX IF NOT EXISTS olt_mac_table_mac_idx ON public.olt_mac_table (mac);
CREATE INDEX IF NOT EXISTS olt_mac_table_olt_idx ON public.olt_mac_table (olt_id);

ALTER TABLE public.olt_mac_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read olt_mac_table"
  ON public.olt_mac_table FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert olt_mac_table"
  ON public.olt_mac_table FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update olt_mac_table"
  ON public.olt_mac_table FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete olt_mac_table"
  ON public.olt_mac_table FOR DELETE TO authenticated USING (true);

-- olt_ports: port classification
CREATE TABLE IF NOT EXISTS public.olt_ports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id UUID NOT NULL REFERENCES public.olt_devices(id) ON DELETE CASCADE,
  port_name TEXT NOT NULL,
  port_type TEXT NOT NULL DEFAULT 'access_pon',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS olt_ports_unique ON public.olt_ports (olt_id, port_name);

ALTER TABLE public.olt_ports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read olt_ports"
  ON public.olt_ports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert olt_ports"
  ON public.olt_ports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update olt_ports"
  ON public.olt_ports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete olt_ports"
  ON public.olt_ports FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_olt_ports_updated_at
  BEFORE UPDATE ON public.olt_ports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend user_onu_mapping
ALTER TABLE public.user_onu_mapping
  ADD COLUMN IF NOT EXISTS pon_port TEXT,
  ADD COLUMN IF NOT EXISTS match_method TEXT DEFAULT 'unmapped';