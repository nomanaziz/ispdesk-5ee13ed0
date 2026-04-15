
CREATE TABLE public.client_request_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.client_requests(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, employee_id)
);

ALTER TABLE public.client_request_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments"
  ON public.client_request_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create assignments"
  ON public.client_request_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assignments"
  ON public.client_request_assignments FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_client_request_assignments_request ON public.client_request_assignments(request_id);
CREATE INDEX idx_client_request_assignments_employee ON public.client_request_assignments(employee_id);
