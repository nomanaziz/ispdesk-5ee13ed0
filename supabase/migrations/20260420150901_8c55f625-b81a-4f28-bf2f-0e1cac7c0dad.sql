-- Replace permissive ALL policies with split SELECT (public) + write (authenticated)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['boxes','sub_zones','departments','positions','employees'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select_all" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_insert_auth" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_update_auth" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_delete_auth" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END$$;