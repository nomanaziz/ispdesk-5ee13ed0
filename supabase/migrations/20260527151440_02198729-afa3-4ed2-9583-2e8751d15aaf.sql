
-- Deduplicate: cancel older active resignations per employee, keep latest
UPDATE public.resignation_requests r
SET status = 'cancelled'
WHERE status IN ('pending','approved')
  AND id NOT IN (
    SELECT DISTINCT ON (employee_id) id
    FROM public.resignation_requests
    WHERE status IN ('pending','approved')
    ORDER BY employee_id, created_at DESC
  );

-- Attendance: self insert/update
CREATE POLICY "Self can insert own attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() AND source = 'self');
CREATE POLICY "Self can update own attendance" ON public.attendance
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND source = 'self');

-- Resignation: single active
CREATE UNIQUE INDEX IF NOT EXISTS one_active_resignation
  ON public.resignation_requests(employee_id)
  WHERE status IN ('pending','approved');

CREATE POLICY "self update pending resignation" ON public.resignation_requests
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');
CREATE POLICY "self delete pending resignation" ON public.resignation_requests
  FOR DELETE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');

-- Requisitions extend
ALTER TABLE public.requisitions
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS item_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'procurement';

CREATE POLICY "Self can insert own requisition" ON public.requisitions
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = current_employee_id() AND request_type = 'employee');
CREATE POLICY "Self can view own requisition" ON public.requisitions
  FOR SELECT TO authenticated
  USING (employee_id = current_employee_id() OR is_admin_or_super(auth.uid()));
CREATE POLICY "Self can update own pending requisition" ON public.requisitions
  FOR UPDATE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');
CREATE POLICY "Self can delete own pending requisition" ON public.requisitions
  FOR DELETE TO authenticated
  USING (employee_id = current_employee_id() AND status = 'pending');
