
-- Create divisions table
CREATE TABLE public.divisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage divisions" ON public.divisions FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view divisions" ON public.divisions FOR SELECT TO authenticated USING (true);

-- Add division_id to districts
ALTER TABLE public.districts ADD COLUMN division_id uuid REFERENCES public.divisions(id);

-- Seed 8 divisions
INSERT INTO public.divisions (name, code) VALUES
  ('ঢাকা', 'Dhaka'),
  ('চট্টগ্রাম', 'Chattogram'),
  ('রাজশাহী', 'Rajshahi'),
  ('খুলনা', 'Khulna'),
  ('বরিশাল', 'Barishal'),
  ('সিলেট', 'Sylhet'),
  ('রংপুর', 'Rangpur'),
  ('ময়মনসিংহ', 'Mymensingh');

-- Map districts to divisions
-- Dhaka Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Dhaka') WHERE name IN ('Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi', 'Manikganj', 'Munshiganj', 'Tangail', 'Kishoreganj', 'Madaripur', 'Shariatpur', 'Rajbari', 'Gopalganj', 'Faridpur');

-- Chattogram Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Chattogram') WHERE name IN ('Chattogram', 'Comilla', 'Feni', 'Brahmanbaria', 'Noakhali', 'Lakshmipur', 'Chandpur', 'Cox''s Bazar', 'Khagrachhari', 'Rangamati', 'Bandarban');

-- Rajshahi Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Rajshahi') WHERE name IN ('Rajshahi', 'Chapainawabganj', 'Natore', 'Naogaon', 'Pabna', 'Sirajganj', 'Bogura', 'Joypurhat');

-- Khulna Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Khulna') WHERE name IN ('Khulna', 'Bagerhat', 'Satkhira', 'Jashore', 'Narail', 'Magura', 'Jhenaidah', 'Kushtia', 'Chuadanga', 'Meherpur');

-- Barishal Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Barishal') WHERE name IN ('Barisal', 'Pirojpur', 'Jhalakathi', 'Barguna', 'Patuakhali', 'Bhola');

-- Sylhet Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Sylhet') WHERE name IN ('Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj');

-- Rangpur Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Rangpur') WHERE name IN ('Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon');

-- Mymensingh Division
UPDATE public.districts SET division_id = (SELECT id FROM public.divisions WHERE code = 'Mymensingh') WHERE name IN ('Mymensingh', 'Jamalpur', 'Sherpur', 'Netrokona');
