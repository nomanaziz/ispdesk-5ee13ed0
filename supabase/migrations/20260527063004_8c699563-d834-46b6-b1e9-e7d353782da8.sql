
-- =====================
-- facility_policies
-- =====================
CREATE TABLE public.facility_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('accommodation','food','overtime_food','custom')),
  mode text NOT NULL,
  trigger_condition text NOT NULL DEFAULT 'always' CHECK (trigger_condition IN ('always','present_only','present_or_overtime','overtime_only','outdoor_only')),
  amount numeric NOT NULL DEFAULT 0,
  company_share numeric NOT NULL DEFAULT 0,
  employee_share numeric NOT NULL DEFAULT 0,
  per_unit text NOT NULL DEFAULT 'month' CHECK (per_unit IN ('day','meal','month')),
  linked_payhead_id uuid REFERENCES public.payheads(id) ON DELETE SET NULL,
  is_deduction boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_policies TO authenticated;
GRANT ALL ON public.facility_policies TO service_role;

ALTER TABLE public.facility_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facility_policies_select_auth" ON public.facility_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "facility_policies_admin_write" ON public.facility_policies
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_facility_policies_updated
  BEFORE UPDATE ON public.facility_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- employee_facilities
-- =====================
CREATE TABLE public.employee_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  facility_policy_id uuid NOT NULL REFERENCES public.facility_policies(id) ON DELETE CASCADE,
  override_amount numeric,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, facility_policy_id, effective_from)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_facilities TO authenticated;
GRANT ALL ON public.employee_facilities TO service_role;

ALTER TABLE public.employee_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_facilities_select_auth" ON public.employee_facilities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "employee_facilities_admin_write" ON public.employee_facilities
  FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE INDEX idx_employee_facilities_emp ON public.employee_facilities(employee_id);

CREATE TRIGGER trg_employee_facilities_updated
  BEFORE UPDATE ON public.employee_facilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- conveyance_bills
-- =====================
CREATE TABLE public.conveyance_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  purpose text,
  transport_mode text NOT NULL CHECK (transport_mode IN ('rickshaw','bus','cng','uber','bike','train','walk','other')),
  fare_amount numeric NOT NULL DEFAULT 0,
  other_amount numeric NOT NULL DEFAULT 0,
  other_note text,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_remark text,
  expense_entry_id uuid REFERENCES public.expense_entries(id) ON DELETE SET NULL,
  submitted_by_user uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conveyance_bills TO authenticated;
GRANT ALL ON public.conveyance_bills TO service_role;

ALTER TABLE public.conveyance_bills ENABLE ROW LEVEL SECURITY;

-- Helper: is the logged-in user this employee?
CREATE OR REPLACE FUNCTION public.is_employee_self(_employee_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE e.id = _employee_id
      AND (
        lower(e.email) = lower(p.email)
        OR lower(e.user_username) = lower(p.email)
      )
  )
$$;

CREATE POLICY "conveyance_bills_select_own_or_admin" ON public.conveyance_bills
  FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()) OR public.is_employee_self(employee_id));

CREATE POLICY "conveyance_bills_insert_own_or_admin" ON public.conveyance_bills
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()) OR public.is_employee_self(employee_id));

CREATE POLICY "conveyance_bills_update_admin_or_pending_own" ON public.conveyance_bills
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_super(auth.uid())
    OR (status = 'pending' AND public.is_employee_self(employee_id))
  )
  WITH CHECK (
    public.is_admin_or_super(auth.uid())
    OR (status = 'pending' AND public.is_employee_self(employee_id))
  );

CREATE POLICY "conveyance_bills_delete_admin" ON public.conveyance_bills
  FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE INDEX idx_conveyance_bills_emp ON public.conveyance_bills(employee_id, bill_date DESC);
CREATE INDEX idx_conveyance_bills_status ON public.conveyance_bills(status);

CREATE TRIGGER trg_conveyance_bills_updated
  BEFORE UPDATE ON public.conveyance_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- Storage bucket for receipts
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('conveyance-receipts', 'conveyance-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "conveyance_receipts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'conveyance-receipts');

CREATE POLICY "conveyance_receipts_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'conveyance-receipts');

CREATE POLICY "conveyance_receipts_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'conveyance-receipts');

CREATE POLICY "conveyance_receipts_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'conveyance-receipts' AND public.is_admin_or_super(auth.uid()));
