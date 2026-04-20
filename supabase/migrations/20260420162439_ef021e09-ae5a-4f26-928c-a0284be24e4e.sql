
-- Departments
CREATE POLICY "departments_insert_anon" ON public.departments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "departments_update_anon" ON public.departments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "departments_delete_anon" ON public.departments FOR DELETE TO anon USING (true);

-- Positions (Designations)
CREATE POLICY "positions_insert_anon" ON public.positions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "positions_update_anon" ON public.positions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "positions_delete_anon" ON public.positions FOR DELETE TO anon USING (true);

-- Boxes
CREATE POLICY "boxes_insert_anon" ON public.boxes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "boxes_update_anon" ON public.boxes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "boxes_delete_anon" ON public.boxes FOR DELETE TO anon USING (true);

-- Sub-zones
CREATE POLICY "sub_zones_insert_anon" ON public.sub_zones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sub_zones_update_anon" ON public.sub_zones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sub_zones_delete_anon" ON public.sub_zones FOR DELETE TO anon USING (true);

-- Zones (missing CRUD policies entirely for non-admins)
CREATE POLICY "zones_insert_auth" ON public.zones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "zones_update_auth" ON public.zones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "zones_delete_auth" ON public.zones FOR DELETE TO authenticated USING (true);

CREATE POLICY "zones_insert_anon" ON public.zones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "zones_update_anon" ON public.zones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "zones_delete_anon" ON public.zones FOR DELETE TO anon USING (true);
