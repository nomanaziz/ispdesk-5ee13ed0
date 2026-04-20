CREATE OR REPLACE FUNCTION public.log_tariff_package_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tariff record;
  v_package_name text;
  v_server_name text;
  v_pops text;
  v_changed jsonb := '[]'::jsonb;
BEGIN
  SELECT name, tariff_type AS type INTO v_tariff FROM public.reseller_tariffs WHERE id = NEW.tariff_id;
  SELECT name INTO v_package_name FROM public.isp_packages WHERE id = NEW.package_id;
  IF NEW.mikrotik_server_id IS NOT NULL THEN
    SELECT name INTO v_server_name FROM public.mikrotik_devices WHERE id = NEW.mikrotik_server_id;
  END IF;
  SELECT string_agg(name, ', ') INTO v_pops
    FROM public.branch_managers WHERE tariff_id = NEW.tariff_id;

  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.package_id::text,'') IS DISTINCT FROM COALESCE(NEW.package_id::text,'') THEN
      v_changed := v_changed || '"package_name"'::jsonb;
    END IF;
    IF COALESCE(OLD.mikrotik_server_id::text,'') IS DISTINCT FROM COALESCE(NEW.mikrotik_server_id::text,'') THEN
      v_changed := v_changed || '"server_name"'::jsonb;
    END IF;
    IF COALESCE(OLD.mikrotik_profile,'') IS DISTINCT FROM COALESCE(NEW.mikrotik_profile,'') THEN
      v_changed := v_changed || '"profile"'::jsonb;
    END IF;
    IF COALESCE(OLD.selling_rate,0) IS DISTINCT FROM COALESCE(NEW.selling_rate,0) THEN
      v_changed := v_changed || '"package_rate"'::jsonb;
    END IF;
    IF COALESCE(OLD.validity_days,0) IS DISTINCT FROM COALESCE(NEW.validity_days,0) THEN
      v_changed := v_changed || '"validity_days"'::jsonb;
    END IF;
    IF COALESCE(OLD.min_activation_days,0) IS DISTINCT FROM COALESCE(NEW.min_activation_days,0) THEN
      v_changed := v_changed || '"min_activation_days"'::jsonb;
    END IF;
    IF COALESCE(OLD.effective_from::text,'') IS DISTINCT FROM COALESCE(NEW.effective_from::text,'') THEN
      v_changed := v_changed || '"effective_from"'::jsonb;
    END IF;
    IF COALESCE(OLD.effective_to::text,'') IS DISTINCT FROM COALESCE(NEW.effective_to::text,'') THEN
      v_changed := v_changed || '"effective_to"'::jsonb;
    END IF;
    IF jsonb_array_length(v_changed) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.reseller_tariff_change_logs(
    tariff_id, tariff_package_id, tariff_name, tariff_type, assigned_pops,
    package_name, server_name, profile, profile_speed,
    package_rate, validity_days, min_activation_days,
    effective_from, effective_to, changed_fields, action, changed_by
  ) VALUES (
    NEW.tariff_id, NEW.id, v_tariff.name, v_tariff.type, v_pops,
    v_package_name, v_server_name, NEW.mikrotik_profile, NULL,
    NEW.selling_rate, NEW.validity_days, NEW.min_activation_days,
    NEW.effective_from, NEW.effective_to, v_changed,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    auth.uid()
  );

  RETURN NEW;
END;
$function$;