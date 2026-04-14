
-- Add new columns to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS personal_phone text,
  ADD COLUMN IF NOT EXISTS office_phone text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS nid_number text,
  ADD COLUMN IF NOT EXISTS facebook_link text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS permanent_address text,
  ADD COLUMN IF NOT EXISTS working_experience text,
  ADD COLUMN IF NOT EXISTS last_degree text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS passing_year text,
  ADD COLUMN IF NOT EXISTS punch_card_id text,
  ADD COLUMN IF NOT EXISTS default_in_time time,
  ADD COLUMN IF NOT EXISTS default_out_time time,
  ADD COLUMN IF NOT EXISTS zkteco_device_id uuid REFERENCES public.zkteco_devices(id),
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS payroll_template_id uuid REFERENCES public.payroll_templates(id);

-- HR Settings table for employee ID auto-generation config
CREATE TABLE public.hr_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage hr_settings" ON public.hr_settings FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view hr_settings" ON public.hr_settings FOR SELECT TO authenticated USING (true);

-- Seed default employee ID setting
INSERT INTO public.hr_settings (setting_key, setting_value)
VALUES ('employee_id_config', '{"mode": "auto", "prefix": "EMP", "next_number": 1, "padding": 3}');

-- Storage bucket for employee photos
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true);

CREATE POLICY "Anyone can view employee photos" ON storage.objects FOR SELECT USING (bucket_id = 'employee-photos');
CREATE POLICY "Authenticated users can upload employee photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee-photos');
CREATE POLICY "Authenticated users can update employee photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'employee-photos');
CREATE POLICY "Authenticated users can delete employee photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'employee-photos');
