-- 1. Track if customer has used their one-time free trial
ALTER TABLE public.bw_sale_customers
  ADD COLUMN IF NOT EXISTS panel_demo_used boolean NOT NULL DEFAULT false;

-- 2. Reset & reseed pricing slabs with cheaper, realistic BDT pricing
--    (admin can edit later through the new admin page)
DELETE FROM public.bw_panel_pricing_slabs;

INSERT INTO public.bw_panel_pricing_slabs (user_limit, monthly_price, display_order, is_active) VALUES
  (100,    500,   1, true),
  (250,    1000,  2, true),
  (500,    1800,  3, true),
  (1000,   3000,  4, true),
  (2000,   5000,  5, true),
  (3000,   7000,  6, true),
  (5000,   10000, 7, true),
  (10000,  18000, 8, true),
  (20000,  30000, 9, true);
