-- 1. Drop subscription system (sale side)
DROP TABLE IF EXISTS public.bw_service_change_log CASCADE;
DROP TABLE IF EXISTS public.bw_customer_subscriptions CASCADE;

-- 2. Ensure bw_sales_invoices has needed columns
ALTER TABLE public.bw_sales_invoices
  ADD COLUMN IF NOT EXISTS billing_month text,
  ADD COLUMN IF NOT EXISTS special_note text,
  ADD COLUMN IF NOT EXISTS payment_due_date date,
  ADD COLUMN IF NOT EXISTS remarks text;

-- 3. Ensure bw_invoice_items has manual-row columns
ALTER TABLE public.bw_invoice_items
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.bw_sale_services(id),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Mbps',
  ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vat_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS from_date date,
  ADD COLUMN IF NOT EXISTS to_date date;

-- subscription_id no longer required
ALTER TABLE public.bw_invoice_items
  ALTER COLUMN subscription_id DROP NOT NULL;

-- 4. Payments table for sale side with approval workflow
CREATE TABLE IF NOT EXISTS public.bw_sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.bw_sales_invoices(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.bw_sale_customers(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  receipt_no text,
  description text,
  remarks text,
  paid_by text,
  received_by uuid,
  created_by uuid,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated can manage bw_sale_payments"
    ON public.bw_sale_payments FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Recurring invoice tables
CREATE TABLE IF NOT EXISTS public.bw_sale_recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.bw_sale_customers(id) ON DELETE CASCADE,
  billing_month_template text,
  repeat_day int NOT NULL DEFAULT 1 CHECK (repeat_day BETWEEN 1 AND 31),
  payment_due_days int DEFAULT 7,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'enabled',
  remarks text,
  last_generated_month text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bw_sale_recurring_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id uuid NOT NULL REFERENCES public.bw_sale_recurring_invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.bw_sale_services(id),
  item_name text NOT NULL,
  description text,
  unit text DEFAULT 'Mbps',
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  vat_pct numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bw_sale_recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bw_sale_recurring_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated can manage bw_sale_recurring_invoices"
    ON public.bw_sale_recurring_invoices FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can manage bw_sale_recurring_items"
    ON public.bw_sale_recurring_items FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger for recurring
DROP TRIGGER IF EXISTS update_bw_sale_recurring_invoices_updated_at ON public.bw_sale_recurring_invoices;
CREATE TRIGGER update_bw_sale_recurring_invoices_updated_at
  BEFORE UPDATE ON public.bw_sale_recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Drop the old simple bw_recurring_invoices/bw_sale_recurring (legacy) — keep if exists, but new code uses bw_sale_recurring_invoices
-- (left in place to avoid data loss; legacy table can be removed later)
