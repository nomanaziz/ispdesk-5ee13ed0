INSERT INTO public.inventory_units (name, short_name, status) VALUES
  ('Meters', 'm', 'active'),
  ('Pcs', 'pcs', 'active'),
  ('Packet', 'pkt', 'active'),
  ('Box', 'box', 'active')
ON CONFLICT DO NOTHING;