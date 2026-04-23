-- Add parent_id for hierarchical (sub-category) support
ALTER TABLE public.inventory_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent_id ON public.inventory_categories(parent_id);

-- Seed networking categories + sub-categories (idempotent via NOT EXISTS)
DO $$
DECLARE
  v_parent uuid;
  v_sub uuid;
BEGIN
  -- Helper: insert parent if missing
  -- UTP Cable
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'UTP Cable', 'Unshielded-Twisted-Pair (UTP) Cable', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='UTP Cable' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='UTP Cable' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('Cat 5 Cable','Ethernet Cable Cat 5'),
    ('Cat 6 Cable','Ethernet Cable Cat 6'),
    ('Cat 6a Cable','Ethernet Cable Cat 6a (shielded)')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Fiber Optic Cable
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Fiber Optic Cable', 'Fiber Optic Cable', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Fiber Optic Cable' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Fiber Optic Cable' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('2 Core Fiber Optic Cable','2 Core Fiber Optic Cable'),
    ('4 Core Fiber Optic Cable','4 Core Fiber Optic Cable'),
    ('6 Core Fiber Optic Cable','6 Core Fiber Optic Cable'),
    ('12 Core Fiber Optic Cable','12 Core Fiber Optic Cable'),
    ('16 Core Fiber Optic Cable','16 Core Fiber Optic Cable'),
    ('24 Core Fiber Optic Cable','24 Core Fiber Optic Cable'),
    ('Drop Cable (1 Core)','FTTH Drop Cable')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Server
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Server', 'Bandwidth Management Server', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Server' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Server' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('MikroTik Router','MikroTik router'),
    ('Cisco','Cisco Router/Server')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Switch
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Switch', 'Network Switch', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Switch' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Switch' AND parent_id IS NULL LIMIT 1;

  -- Manageable Switch (sub of Switch, has its own children)
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'Manageable Switch','Managed switches', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Manageable Switch' AND parent_id=v_parent);
  SELECT id INTO v_sub FROM public.inventory_categories WHERE name='Manageable Switch' AND parent_id=v_parent LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_sub, 'active' FROM (VALUES
    ('8 Port Managed Switch','8 Port Managed Switch'),
    ('24 Port Managed Switch','24 Port Managed Switch')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_sub);

  -- Unmanaged Switch (sub of Switch)
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'Unmanaged Switch','Unmanageable Switch', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Unmanaged Switch' AND parent_id=v_parent);
  SELECT id INTO v_sub FROM public.inventory_categories WHERE name='Unmanaged Switch' AND parent_id=v_parent LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_sub, 'active' FROM (VALUES
    ('5 Port Unmanaged Switch','5 Port Unmanaged Switch'),
    ('8 Port Unmanaged Switch','8 Port Unmanaged Switch'),
    ('16 Port Unmanaged Switch','16 Port Unmanaged Switch')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_sub);

  -- OLT
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'OLT', 'Optical Line Termination', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='OLT' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='OLT' AND parent_id IS NULL LIMIT 1;

  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'GEPON OLT','GEPON OLT', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='GEPON OLT' AND parent_id=v_parent);
  SELECT id INTO v_sub FROM public.inventory_categories WHERE name='GEPON OLT' AND parent_id=v_parent LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_sub, 'active' FROM (VALUES
    ('4 Port GEPON OLT','4 Port GEPON OLT'),
    ('8 Port GEPON OLT','8 Port GEPON OLT'),
    ('16 Port GEPON OLT','16 Port GEPON OLT')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_sub);

  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'EPON OLT','EPON OLT', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='EPON OLT' AND parent_id=v_parent);
  SELECT id INTO v_sub FROM public.inventory_categories WHERE name='EPON OLT' AND parent_id=v_parent LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_sub, 'active' FROM (VALUES
    ('4 Port EPON OLT','4 Port EPON OLT'),
    ('8 Port EPON OLT','8 Port EPON OLT'),
    ('16 Port EPON OLT','16 Port EPON OLT')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_sub);

  -- ONU
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'ONU', 'Optical Network Units', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='ONU' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='ONU' AND parent_id IS NULL LIMIT 1;

  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'EPON ONU','EPON ONU', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='EPON ONU' AND parent_id=v_parent);
  SELECT id INTO v_sub FROM public.inventory_categories WHERE name='EPON ONU' AND parent_id=v_parent LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_sub, 'active' FROM (VALUES
    ('Single Port EPON ONU','Single Port EPON ONU'),
    ('Dual Port EPON ONU','Dual Port EPON ONU')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_sub);

  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT 'GEPON ONU','GEPON ONU', v_parent, 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='GEPON ONU' AND parent_id=v_parent);

  -- Router (WiFi)
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Router', 'WiFi Router', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Router' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Router' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('1 Antenna Wireless Router','1 Antenna Wireless Router'),
    ('2 Antenna Wireless Router','2 Antenna Wireless Router'),
    ('3 Antenna Wireless Router','3 Antenna Wireless Router'),
    ('4 Antenna Wireless Router','4 Antenna Wireless Router'),
    ('Dual Band WiFi Router','Dual Band 2.4/5GHz WiFi Router')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Equipment
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Equipment', 'Network Service Equipment', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Equipment' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Equipment' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('Ethernet Crimp Tool','Ethernet Crimp Tool'),
    ('Fiber Cleaver','Fiber Cleaver'),
    ('Fusion Splicer','Fusion Splicer Machine'),
    ('OTDR','Optical Time Domain Reflectometer'),
    ('Power Meter','Optical Power Meter'),
    ('Visual Fault Locator','VFL Pen')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- PON Module
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'PON Module', 'PON Module', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='PON Module' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='PON Module' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('EPON OLT PON Module','EPON OLT PON Module'),
    ('GPON OLT PON Module','GPON OLT PON Module'),
    ('SFP Module','SFP Transceiver Module')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Splitter
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Splitter', 'Fiber Optic Cable FTTH Splitter', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Splitter' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Splitter' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('1*2 Optical Fiber Splitter','1*2 Optical Fiber Splitter'),
    ('1*4 Optical Fiber Splitter','1*4 Optical Fiber Splitter'),
    ('1*8 Optical Fiber Splitter','1*8 Optical Fiber Splitter'),
    ('1*16 Optical Fiber Splitter','1*16 Optical Fiber Splitter'),
    ('1*32 Optical Fiber Splitter','1*32 Optical Fiber Splitter'),
    ('1*64 Optical Fiber Splitter','1*64 Optical Fiber Splitter')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);

  -- Connectors & Accessories (extra)
  INSERT INTO public.inventory_categories (name, description, status)
  SELECT 'Connectors & Accessories', 'Networking connectors and accessories', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name='Connectors & Accessories' AND parent_id IS NULL);
  SELECT id INTO v_parent FROM public.inventory_categories WHERE name='Connectors & Accessories' AND parent_id IS NULL LIMIT 1;
  INSERT INTO public.inventory_categories (name, description, parent_id, status)
  SELECT x.n, x.d, v_parent, 'active' FROM (VALUES
    ('RJ45 Connector','RJ45 8P8C Connector'),
    ('Fast Connector (SC/APC)','Fiber Fast Connector SC/APC'),
    ('Patch Cord','Fiber/UTP Patch Cord'),
    ('Pigtail','Fiber Pigtail SC/APC'),
    ('Cable Tie','Cable Tie / Zip Tie'),
    ('Splice Box','Fiber Splice Closure / Box')
  ) AS x(n,d)
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_categories WHERE name=x.n AND parent_id=v_parent);
END $$;