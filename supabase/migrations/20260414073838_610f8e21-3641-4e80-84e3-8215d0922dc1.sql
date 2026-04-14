
-- Seed Billing Statuses
INSERT INTO public.billing_statuses (name, color, status) VALUES
  ('Left', '#dc3545', 'active'),
  ('Free', '#28a745', 'active'),
  ('Personal', '#fd7e14', 'active'),
  ('Inactive', '#6c757d', 'active'),
  ('Active', '#007bff', 'active')
ON CONFLICT DO NOTHING;

-- Seed Protocol Types
INSERT INTO public.protocol_types (name, status) VALUES
  ('Static', 'active'),
  ('Hotspot', 'active'),
  ('PPPoE', 'active')
ON CONFLICT DO NOTHING;

-- Seed Client Types with descriptions
INSERT INTO public.client_types (name, description, status) VALUES
  ('Corporate', 'Different Type Of Office like: Bank, Bima, Group, Somity, Agent, Dealership etc.', 'active'),
  ('Home', 'Different Type Of Home like: Varatiya, Sthaniyo etc.', 'active')
ON CONFLICT DO NOTHING;

-- Seed Connection Types
INSERT INTO public.connection_types_config (name, status) VALUES
  ('NTTN', 'active'),
  ('Wireless', 'active'),
  ('Optical Fiber', 'active'),
  ('UTP', 'active')
ON CONFLICT DO NOTHING;
