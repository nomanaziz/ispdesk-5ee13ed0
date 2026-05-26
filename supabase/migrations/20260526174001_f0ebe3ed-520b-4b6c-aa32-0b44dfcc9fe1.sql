
-- Extend resign_rules
ALTER TABLE public.resign_rules
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_resign_rules_updated ON public.resign_rules;
CREATE TRIGGER trg_resign_rules_updated
  BEFORE UPDATE ON public.resign_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default rules
INSERT INTO public.resign_rules (name, description, is_active)
SELECT 'All Asset Returned', 'Company asset return confirm', true
WHERE NOT EXISTS (SELECT 1 FROM public.resign_rules WHERE lower(name) = 'all asset returned');

INSERT INTO public.resign_rules (name, description, is_active)
SELECT 'All Salary Paid', 'All pending salary cleared', true
WHERE NOT EXISTS (SELECT 1 FROM public.resign_rules WHERE lower(name) = 'all salary paid');

-- Extend resignations
ALTER TABLE public.resignations
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'resign',
  ADD COLUMN IF NOT EXISTS letter_received_date date,
  ADD COLUMN IF NOT EXISTS resignation_letter_url text,
  ADD COLUMN IF NOT EXISTS good_or_bad_activities text,
  ADD COLUMN IF NOT EXISTS is_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applied_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.resignations
  DROP CONSTRAINT IF EXISTS resignations_type_check;
ALTER TABLE public.resignations
  ADD CONSTRAINT resignations_type_check CHECK (type IN ('resign','terminate'));

DROP TRIGGER IF EXISTS trg_resignations_updated ON public.resignations;
CREATE TRIGGER trg_resignations_updated
  BEFORE UPDATE ON public.resignations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for resignation letters (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resignation-letters', 'resignation-letters', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can read/write their tenant's letters
DROP POLICY IF EXISTS "Authenticated view resignation letters" ON storage.objects;
CREATE POLICY "Authenticated view resignation letters"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resignation-letters');

DROP POLICY IF EXISTS "Authenticated upload resignation letters" ON storage.objects;
CREATE POLICY "Authenticated upload resignation letters"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resignation-letters');

DROP POLICY IF EXISTS "Authenticated update resignation letters" ON storage.objects;
CREATE POLICY "Authenticated update resignation letters"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resignation-letters');

DROP POLICY IF EXISTS "Admins delete resignation letters" ON storage.objects;
CREATE POLICY "Admins delete resignation letters"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resignation-letters' AND public.is_admin_or_super(auth.uid()));
