CREATE POLICY "Public can view divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Public can view districts" ON public.districts FOR SELECT USING (true);
CREATE POLICY "Public can view upazilas" ON public.upazilas FOR SELECT USING (true);