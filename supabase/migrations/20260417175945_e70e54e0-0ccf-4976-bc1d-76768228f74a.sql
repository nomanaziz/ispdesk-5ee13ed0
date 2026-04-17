-- Public payment requests table for QuickPay submissions
CREATE TABLE public.public_payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL,
  trx_id TEXT,
  sender_number TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ppr_status ON public.public_payment_requests(status);
CREATE INDEX idx_ppr_client ON public.public_payment_requests(client_id);
CREATE INDEX idx_ppr_created ON public.public_payment_requests(created_at DESC);

ALTER TABLE public.public_payment_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can submit a payment request
CREATE POLICY "Anyone can submit payment requests"
ON public.public_payment_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Authenticated users (admins) can view all
CREATE POLICY "Authenticated can view payment requests"
ON public.public_payment_requests
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users (admins) can update (approve/reject)
CREATE POLICY "Authenticated can update payment requests"
ON public.public_payment_requests
FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users (admins) can delete
CREATE POLICY "Authenticated can delete payment requests"
ON public.public_payment_requests
FOR DELETE
TO authenticated
USING (true);