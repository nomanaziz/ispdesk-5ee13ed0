
-- Enhance sms_gateways
ALTER TABLE public.sms_gateways
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password text,
  ADD COLUMN IF NOT EXISTS sms_type text NOT NULL DEFAULT 'english',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Enhance sms_log
ALTER TABLE public.sms_log
  ADD COLUMN IF NOT EXISTS sms_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.sms_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_count integer NOT NULL DEFAULT 1;

-- Enhance sms_groups
ALTER TABLE public.sms_groups
  ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'manual';

-- Enhance sms_templates
ALTER TABLE public.sms_templates
  ADD COLUMN IF NOT EXISTS variables text;

-- RLS policies for sms_gateways
ALTER TABLE public.sms_gateways ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_gateways' AND policyname = 'Authenticated users can manage sms_gateways') THEN
    CREATE POLICY "Authenticated users can manage sms_gateways" ON public.sms_gateways FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS policies for sms_log
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_log' AND policyname = 'Authenticated users can manage sms_log') THEN
    CREATE POLICY "Authenticated users can manage sms_log" ON public.sms_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS policies for sms_groups
ALTER TABLE public.sms_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_groups' AND policyname = 'Authenticated users can manage sms_groups') THEN
    CREATE POLICY "Authenticated users can manage sms_groups" ON public.sms_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS policies for sms_templates
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sms_templates' AND policyname = 'Authenticated users can manage sms_templates') THEN
    CREATE POLICY "Authenticated users can manage sms_templates" ON public.sms_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
