-- Seed support categories
INSERT INTO public.support_categories (name, category_type, status)
SELECT v.name, v.category_type, 'active'
FROM (VALUES
  ('Internet Slow', 'technical'),
  ('Disconnected', 'technical'),
  ('Billing', 'billing'),
  ('New Connection', 'sales'),
  ('অন্যান্য', 'general')
) AS v(name, category_type)
WHERE NOT EXISTS (SELECT 1 FROM public.support_categories sc WHERE sc.name = v.name);

-- Seed billing cycle config
INSERT INTO public.system_settings (setting_key, setting_value)
SELECT 'billing_cycle_config', '{"mode":"monthly_first","grace_days":15}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'billing_cycle_config');

-- Add unique constraint on billing.bill_id for idempotent generation (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_bill_id_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.billing ADD CONSTRAINT billing_bill_id_unique UNIQUE (bill_id);
    EXCEPTION WHEN unique_violation THEN
      -- Skip if duplicates exist
      NULL;
    END;
  END IF;
END $$;