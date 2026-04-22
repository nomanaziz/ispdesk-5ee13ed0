-- ============================================
-- 1. MASTER TEMPLATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sms_template_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  content text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom',  -- 'default' or 'custom'
  category text NOT NULL DEFAULT 'general',       -- billing, otp, registration, payment, support, general
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_protected boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_template_master_key ON public.sms_template_master(template_key);
CREATE INDEX IF NOT EXISTS idx_sms_template_master_category ON public.sms_template_master(category);

-- ============================================
-- 2. OVERRIDES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sms_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid NOT NULL REFERENCES public.sms_template_master(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  name text,
  content text,
  is_active boolean,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique override per (master, branch). NULL branch_id is admin-level override.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_template_overrides_unique 
  ON public.sms_template_overrides(master_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_sms_template_overrides_branch ON public.sms_template_overrides(branch_id);

-- ============================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trg_sms_template_master_updated ON public.sms_template_master;
CREATE TRIGGER trg_sms_template_master_updated
  BEFORE UPDATE ON public.sms_template_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sms_template_overrides_updated ON public.sms_template_overrides;
CREATE TRIGGER trg_sms_template_overrides_updated
  BEFORE UPDATE ON public.sms_template_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. PROTECT TRIGGER (cannot delete protected master rows)
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_protected_template_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Protected template cannot be deleted (template_key=%).', OLD.template_key;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_template_delete ON public.sms_template_master;
CREATE TRIGGER trg_protect_template_delete
  BEFORE DELETE ON public.sms_template_master
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_template_delete();

-- ============================================
-- 5. RLS
-- ============================================
ALTER TABLE public.sms_template_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_template_overrides ENABLE ROW LEVEL SECURITY;

-- Master: anyone authenticated can read
DROP POLICY IF EXISTS "Anyone can view master templates" ON public.sms_template_master;
CREATE POLICY "Anyone can view master templates" ON public.sms_template_master
  FOR SELECT USING (true);

-- Master: only admin/super_admin can mutate
DROP POLICY IF EXISTS "Admins can insert master templates" ON public.sms_template_master;
CREATE POLICY "Admins can insert master templates" ON public.sms_template_master
  FOR INSERT WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can update master templates" ON public.sms_template_master;
CREATE POLICY "Admins can update master templates" ON public.sms_template_master
  FOR UPDATE USING (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete master templates" ON public.sms_template_master;
CREATE POLICY "Admins can delete master templates" ON public.sms_template_master
  FOR DELETE USING (public.is_admin_or_super(auth.uid()));

-- Overrides: admin can manage admin-level (branch_id IS NULL); POP scope handled in edge function
DROP POLICY IF EXISTS "Anyone can view overrides" ON public.sms_template_overrides;
CREATE POLICY "Anyone can view overrides" ON public.sms_template_overrides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage admin-level overrides" ON public.sms_template_overrides;
CREATE POLICY "Admins manage admin-level overrides" ON public.sms_template_overrides
  FOR ALL USING (public.is_admin_or_super(auth.uid()) AND branch_id IS NULL)
  WITH CHECK (public.is_admin_or_super(auth.uid()) AND branch_id IS NULL);

-- ============================================
-- 6. EFFECTIVE VIEW (read-time merge)
-- ============================================
CREATE OR REPLACE VIEW public.sms_templates_effective AS
SELECT
  m.id AS master_id,
  m.template_key,
  COALESCE(o.name, m.name) AS name,
  COALESCE(o.content, m.content) AS content,
  m.template_type,
  m.category,
  m.variables,
  m.is_protected,
  COALESCE(o.is_active, m.is_active) AS is_active,
  o.branch_id,
  (o.id IS NOT NULL) AS is_overridden,
  o.id AS override_id,
  m.created_at,
  COALESCE(o.updated_at, m.updated_at) AS updated_at
FROM public.sms_template_master m
LEFT JOIN public.sms_template_overrides o ON o.master_id = m.id;

-- ============================================
-- 7. SEED DEFAULT TEMPLATES
-- ============================================
INSERT INTO public.sms_template_master (template_key, name, content, template_type, category, variables, is_protected, is_active) VALUES
  ('welcome', 'স্বাগতম মেসেজ', 'প্রিয় {UserName}, আমাদের ISP-এ স্বাগতম। আপনার Client ID: {ClientId}, Password: {Password}', 'default', 'registration', '["UserName","ClientId","Password"]'::jsonb, true, true),
  ('bill_reminder', 'বিল রিমাইন্ডার', 'প্রিয় {UserName}, আপনার {Month} মাসের বিল {MonthlyBillAmount} টাকা — শেষ তারিখ {BillingLastDate}। অনুগ্রহ করে সময়মতো পরিশোধ করুন।', 'default', 'billing', '["UserName","Month","MonthlyBillAmount","BillingLastDate"]'::jsonb, true, true),
  ('bill_overdue', 'বকেয়া বিল', 'প্রিয় {UserName}, আপনার {Due} টাকা বকেয়া রয়েছে। দ্রুত পরিশোধ করুন, না হলে সংযোগ বন্ধ হয়ে যাবে।', 'default', 'billing', '["UserName","Due"]'::jsonb, true, true),
  ('payment_received', 'পেমেন্ট গৃহীত', 'ধন্যবাদ {UserName}, {Amount} টাকা পেমেন্ট গৃহীত হয়েছে। বাকি বকেয়া: {Due} টাকা।', 'default', 'payment', '["UserName","Amount","Due"]'::jsonb, true, true),
  ('otp_verify', 'OTP যাচাই', 'আপনার OTP কোড: {OTP} — ৫ মিনিটের জন্য valid। কারো সাথে শেয়ার করবেন না।', 'default', 'otp', '["OTP"]'::jsonb, true, true),
  ('connection_active', 'কানেকশন সক্রিয়', '{UserName}, আপনার ইন্টারনেট কানেকশন এখন সক্রিয়। Username: {Username}, Password: {Password}', 'default', 'registration', '["UserName","Username","Password"]'::jsonb, true, true),
  ('connection_disabled', 'কানেকশন বন্ধ', 'প্রিয় {UserName}, বিল বকেয়া থাকার কারণে আপনার ইন্টারনেট কানেকশন বন্ধ করা হয়েছে। বিল পরিশোধের পর পুনরায় চালু হবে।', 'default', 'billing', '["UserName"]'::jsonb, true, true),
  ('ticket_created', 'টিকেট তৈরি', 'আপনার সাপোর্ট টিকেট #{TicketId} — {Subject} তৈরি হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।', 'default', 'support', '["TicketId","Subject"]'::jsonb, true, true),
  ('ticket_resolved', 'টিকেট সমাধান', 'আপনার টিকেট #{TicketId} সমাধান করা হয়েছে। সেবার জন্য ধন্যবাদ।', 'default', 'support', '["TicketId"]'::jsonb, true, true),
  ('package_change', 'প্যাকেজ পরিবর্তন', 'প্রিয় {UserName}, আপনার ইন্টারনেট প্যাকেজ পরিবর্তন হয়েছে: {OldPackage} → {NewPackage}। ধন্যবাদ।', 'default', 'billing', '["UserName","OldPackage","NewPackage"]'::jsonb, true, true)
ON CONFLICT (template_key) DO NOTHING;