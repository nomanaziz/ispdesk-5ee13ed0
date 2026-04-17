-- Network Diagram module tables

CREATE TABLE public.network_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'custom',
  parent_id UUID REFERENCES public.network_nodes(id) ON DELETE SET NULL,
  branch_id UUID,
  olt_device_id UUID,
  inventory_item_id UUID,
  serial_number TEXT,
  mac TEXT,
  port_info TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  remarks TEXT,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_network_nodes_parent ON public.network_nodes(parent_id);
CREATE INDEX idx_network_nodes_type ON public.network_nodes(node_type);

CREATE TABLE public.network_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_node_id UUID NOT NULL REFERENCES public.network_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.network_nodes(id) ON DELETE CASCADE,
  connection_type TEXT NOT NULL DEFAULT 'fiber',
  edge_code TEXT,
  color_code TEXT,
  length_m NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_network_edges_source ON public.network_edges(source_node_id);
CREATE INDEX idx_network_edges_target ON public.network_edges(target_node_id);

CREATE TABLE public.network_node_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.network_nodes(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  port_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (node_id, client_id)
);

CREATE INDEX idx_network_node_clients_node ON public.network_node_clients(node_id);
CREATE INDEX idx_network_node_clients_client ON public.network_node_clients(client_id);

CREATE TABLE public.network_node_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.network_nodes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  distributed_by UUID,
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  remarks TEXT
);

CREATE INDEX idx_network_node_items_node ON public.network_node_items(node_id);
CREATE INDEX idx_network_node_items_item ON public.network_node_items(inventory_item_id);

-- Enable RLS
ALTER TABLE public.network_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_node_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_node_items ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users full access — follows existing project pattern)
CREATE POLICY "Auth users can view network_nodes" ON public.network_nodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert network_nodes" ON public.network_nodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update network_nodes" ON public.network_nodes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete network_nodes" ON public.network_nodes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view network_edges" ON public.network_edges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert network_edges" ON public.network_edges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update network_edges" ON public.network_edges FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete network_edges" ON public.network_edges FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view network_node_clients" ON public.network_node_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert network_node_clients" ON public.network_node_clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update network_node_clients" ON public.network_node_clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete network_node_clients" ON public.network_node_clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can view network_node_items" ON public.network_node_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert network_node_items" ON public.network_node_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update network_node_items" ON public.network_node_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete network_node_items" ON public.network_node_items FOR DELETE TO authenticated USING (true);

-- updated_at trigger for network_nodes
CREATE TRIGGER update_network_nodes_updated_at
BEFORE UPDATE ON public.network_nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();