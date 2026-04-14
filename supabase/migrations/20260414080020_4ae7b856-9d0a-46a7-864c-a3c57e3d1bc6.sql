
-- 1. Alter client_requests table
ALTER TABLE public.client_requests
  ADD COLUMN IF NOT EXISTS customer_type text,
  ADD COLUMN IF NOT EXISTS connection_type_id uuid REFERENCES public.connection_types_config(id),
  ADD COLUMN IF NOT EXISTS otc_charge numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS physical_connectivity text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS setup_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS setup_by uuid,
  ADD COLUMN IF NOT EXISTS setup_time timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS schedule_date date,
  ADD COLUMN IF NOT EXISTS monthly_bill numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_date integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subzone_id uuid REFERENCES public.sub_zones(id),
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Alter clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS remote_address text,
  ADD COLUMN IF NOT EXISTS mac_address text,
  ADD COLUMN IF NOT EXISTS protocol_type text,
  ADD COLUMN IF NOT EXISTS profile text,
  ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS mikrotik_status text,
  ADD COLUMN IF NOT EXISTS server_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS nid_number text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS latitude text,
  ADD COLUMN IF NOT EXISTS longitude text,
  ADD COLUMN IF NOT EXISTS road_number text,
  ADD COLUMN IF NOT EXISTS house_number text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id),
  ADD COLUMN IF NOT EXISTS cable_length numeric,
  ADD COLUMN IF NOT EXISTS fiber_code text,
  ADD COLUMN IF NOT EXISTS core_count integer,
  ADD COLUMN IF NOT EXISTS core_color text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS device_serial text,
  ADD COLUMN IF NOT EXISTS vendor text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS expire_date date,
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS billing_start_month text,
  ADD COLUMN IF NOT EXISTS reference_by text,
  ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_by text,
  ADD COLUMN IF NOT EXISTS affiliator_id uuid REFERENCES public.affiliates(id),
  ADD COLUMN IF NOT EXISTS left_date date,
  ADD COLUMN IF NOT EXISTS left_reason text;

-- 3. Create client_schedulers table
CREATE TABLE public.client_schedulers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  scheduler_type text NOT NULL DEFAULT 'package_scheduler',
  previous_info text,
  schedule_info text,
  remarks text,
  schedule_date date,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_schedulers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client_schedulers"
  ON public.client_schedulers FOR ALL TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view client_schedulers"
  ON public.client_schedulers FOR SELECT TO authenticated
  USING (true);

-- 4. Create portal_categories table
CREATE TABLE public.portal_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage portal_categories"
  ON public.portal_categories FOR ALL TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view portal_categories"
  ON public.portal_categories FOR SELECT TO authenticated
  USING (true);

-- 5. Create portal_servers table
CREATE TABLE public.portal_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.portal_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  url text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage portal_servers"
  ON public.portal_servers FOR ALL TO authenticated
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view portal_servers"
  ON public.portal_servers FOR SELECT TO authenticated
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_schedulers_client_id ON public.client_schedulers(client_id);
CREATE INDEX IF NOT EXISTS idx_client_schedulers_schedule_date ON public.client_schedulers(schedule_date);
CREATE INDEX IF NOT EXISTS idx_portal_servers_category_id ON public.portal_servers(category_id);
CREATE INDEX IF NOT EXISTS idx_clients_box_id ON public.clients(box_id);
CREATE INDEX IF NOT EXISTS idx_clients_affiliator_id ON public.clients(affiliator_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_connection_type_id ON public.client_requests(connection_type_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_subzone_id ON public.client_requests(subzone_id);
