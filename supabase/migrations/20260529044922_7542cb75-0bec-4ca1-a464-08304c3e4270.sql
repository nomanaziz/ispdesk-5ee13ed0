
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.id, b.tenant_id FROM public.clients c LEFT JOIN public.branches b ON b.id = c.branch_id WHERE c.uid IS NULL LOOP
    UPDATE public.clients SET uid = public.generate_global_uid('CLI', r.tenant_id) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.bw_sale_customers WHERE uid IS NULL LOOP
    UPDATE public.bw_sale_customers SET uid = public.generate_global_uid('BWC', r.id) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT e.id, b.tenant_id FROM public.employees e LEFT JOIN public.branches b ON b.id = e.branch_id WHERE e.uid IS NULL LOOP
    UPDATE public.employees SET uid = public.generate_global_uid('EMP', r.tenant_id) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT bm.id, b.tenant_id FROM public.branch_managers bm LEFT JOIN public.branches b ON b.id = bm.branch_id WHERE bm.uid IS NULL LOOP
    UPDATE public.branch_managers SET uid = public.generate_global_uid('RSL', r.tenant_id) WHERE id = r.id;
  END LOOP;
END $$;
