
ALTER TABLE public.network_nodes
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.network_edges
  ADD COLUMN IF NOT EXISTS core_color text,
  ADD COLUMN IF NOT EXISTS core_no integer,
  ADD COLUMN IF NOT EXISTS cable_type text,
  ADD COLUMN IF NOT EXISTS start_point text,
  ADD COLUMN IF NOT EXISTS end_point text;

CREATE OR REPLACE FUNCTION public.sync_client_to_network_diagram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_node uuid;
  v_lat numeric;
  v_lng numeric;
BEGIN
  -- Try ONU first
  IF NEW.onu_id IS NOT NULL THEN
    SELECT id INTO v_parent
      FROM public.network_nodes
     WHERE node_type = 'onu'
       AND (serial_number = NEW.onu_id::text OR id = NEW.onu_id)
     LIMIT 1;
  END IF;

  -- Fallback: MikroTik / router / switch / OLT
  IF v_parent IS NULL AND NEW.mikrotik_id IS NOT NULL THEN
    SELECT id INTO v_parent
      FROM public.network_nodes
     WHERE node_type IN ('router', 'switch', 'olt')
       AND inventory_item_id = NEW.mikrotik_id
     LIMIT 1;
  END IF;

  -- Parse lat/lng from text
  BEGIN v_lat := NULLIF(NEW.latitude, '')::numeric; EXCEPTION WHEN OTHERS THEN v_lat := NULL; END;
  BEGIN v_lng := NULLIF(NEW.longitude, '')::numeric; EXCEPTION WHEN OTHERS THEN v_lng := NULL; END;

  -- Find existing client node by remarks (we use remarks to store the source client.id)
  SELECT id INTO v_node
    FROM public.network_nodes
   WHERE node_type = 'client' AND remarks = NEW.id::text
   LIMIT 1;

  IF v_node IS NULL THEN
    INSERT INTO public.network_nodes(
      name, node_type, parent_id, latitude, longitude,
      address, status, branch_id, remarks, color, icon
    ) VALUES (
      COALESCE(NEW.name, NEW.username, 'Client'),
      'client', v_parent, v_lat, v_lng,
      NEW.address, COALESCE(NEW.status, 'active'),
      NEW.branch_id, NEW.id::text, '#E11D48', 'home'
    )
    RETURNING id INTO v_node;
  ELSE
    UPDATE public.network_nodes
       SET name      = COALESCE(NEW.name, NEW.username, name),
           parent_id = COALESCE(v_parent, parent_id),
           latitude  = COALESCE(v_lat, latitude),
           longitude = COALESCE(v_lng, longitude),
           address   = COALESCE(NEW.address, address),
           status    = COALESCE(NEW.status, status),
           branch_id = COALESCE(NEW.branch_id, branch_id)
     WHERE id = v_node;
  END IF;

  -- Auto-link edge parent -> client
  IF v_parent IS NOT NULL THEN
    INSERT INTO public.network_edges(
      source_node_id, target_node_id, connection_type,
      cable_type, length_m, color_code, core_color, status
    )
    SELECT v_parent, v_node, 'fiber',
           'drop_cable', NEW.cable_length, '#64748B', NEW.core_color, 'active'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.network_edges
       WHERE source_node_id = v_parent AND target_node_id = v_node
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_client_to_diagram ON public.clients;

CREATE TRIGGER trg_sync_client_to_diagram
AFTER INSERT OR UPDATE OF name, username, address, latitude, longitude,
                          onu_id, mikrotik_id, cable_length, status, branch_id
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_to_network_diagram();
