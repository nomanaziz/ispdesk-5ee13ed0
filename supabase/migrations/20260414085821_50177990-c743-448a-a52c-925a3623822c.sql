
-- Create bill_collections table
CREATE TABLE public.bill_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_id UUID REFERENCES public.billing(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  vat NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  note TEXT,
  transaction_id TEXT,
  received_by UUID,
  approved_by UUID,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bill_collections"
  ON public.bill_collections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert bill_collections"
  ON public.bill_collections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update bill_collections"
  ON public.bill_collections FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete bill_collections"
  ON public.bill_collections FOR DELETE TO authenticated USING (true);

-- Alter billing table
ALTER TABLE public.billing
  ADD COLUMN IF NOT EXISTS vat NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Alter clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS speed TEXT;
