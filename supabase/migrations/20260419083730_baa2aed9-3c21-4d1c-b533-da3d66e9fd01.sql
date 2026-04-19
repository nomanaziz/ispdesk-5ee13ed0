-- Extend clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS present_address TEXT,
  ADD COLUMN IF NOT EXISTS permanent_address TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS nid_front_url TEXT,
  ADD COLUMN IF NOT EXISTS nid_back_url TEXT,
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Update requests table
CREATE TABLE IF NOT EXISTS public.client_update_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('profile','document')),
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_update_requests_status ON public.client_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_client_update_requests_client ON public.client_update_requests(client_id);

ALTER TABLE public.client_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view update requests"
  ON public.client_update_requests FOR SELECT
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins update requests"
  ON public.client_update_requests FOR UPDATE
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins delete requests"
  ON public.client_update_requests FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));

-- No INSERT policy: only service role (edge function) inserts on behalf of portal users.

CREATE TRIGGER trg_client_update_requests_updated_at
  BEFORE UPDATE ON public.client_update_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can read directly; edge function uses service role
CREATE POLICY "Admins read client documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins manage client documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-documents' AND public.is_admin_or_super(auth.uid()))
  WITH CHECK (bucket_id = 'client-documents' AND public.is_admin_or_super(auth.uid()));