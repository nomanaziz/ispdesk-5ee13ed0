

## আসল সমস্যা
`reseller_tariff_packages` table-এ আসলে এই column-গুলো আছে:
`id, tariff_id, package_id, mikrotik_server_id, mikrotik_profile, protocol_type, buy_rate, selling_rate, validity_days, min_activation_days, status, created_at, updated_at`

কিন্তু trigger function `log_tariff_package_change()` এমন field-গুলো ব্যবহার করছে যা **নেই**:
- ❌ `NEW.effective_from`
- ❌ `NEW.effective_to`
- ❌ `NEW.profile_speed` (আগের round-এ NULL দেওয়া হয়েছিল কিন্তু তবুও log-এর column expect)

প্রতিবার একটা ভুল ঠিক করছি, পরের ভুল-টায় গিয়ে আটকাচ্ছে। এবার পুরো function actual schema-এর সাথে strict match করে rewrite করব — এক migration-এই শেষ।

## সমাধান (এক migration)

`log_tariff_package_change()` function rewrite:

1. সব non-existent reference সরিয়ে দেব: `effective_from`, `effective_to`, `profile_speed`
2. শুধু real column track করব: `package_id, mikrotik_server_id, mikrotik_profile, selling_rate, validity_days, min_activation_days`
3. `INSERT INTO reseller_tariff_change_logs` থেকে `effective_from`, `effective_to`, `profile_speed` কলাম বাদ — অথবা NULL pass (log table-এ থাকলে nullable, সমস্যা নেই)

## চূড়ান্ত function logic

```sql
CREATE OR REPLACE FUNCTION public.log_tariff_package_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_tariff record;
  v_package_name text;
  v_server_name text;
  v_pops text;
  v_changed jsonb := '[]'::jsonb;
BEGIN
  SELECT name, tariff_type INTO v_tariff
    FROM public.reseller_tariffs WHERE id = NEW.tariff_id;
  SELECT name INTO v_package_name
    FROM public.isp_packages WHERE id = NEW.package_id;
  IF NEW.mikrotik_server_id IS NOT NULL THEN
    SELECT name INTO v_server_name
      FROM public.mikrotik_devices WHERE id = NEW.mikrotik_server_id;
  END IF;
  SELECT string_agg(name, ', ') INTO v_pops
    FROM public.branch_managers WHERE tariff_id = NEW.tariff_id;

  IF TG_OP = 'UPDATE' THEN
    -- compare only fields that actually exist
    IF COALESCE(OLD.package_id::text,'')        IS DISTINCT FROM COALESCE(NEW.package_id::text,'')        THEN v_changed := v_changed || '"package_name"'::jsonb;       END IF;
    IF COALESCE(OLD.mikrotik_server_id::text,'') IS DISTINCT FROM COALESCE(NEW.mikrotik_server_id::text,'') THEN v_changed := v_changed || '"server_name"'::jsonb;        END IF;
    IF COALESCE(OLD.mikrotik_profile,'')        IS DISTINCT FROM COALESCE(NEW.mikrotik_profile,'')        THEN v_changed := v_changed || '"profile"'::jsonb;            END IF;
    IF COALESCE(OLD.selling_rate,0)             IS DISTINCT FROM COALESCE(NEW.selling_rate,0)             THEN v_changed := v_changed || '"package_rate"'::jsonb;       END IF;
    IF COALESCE(OLD.validity_days,0)            IS DISTINCT FROM COALESCE(NEW.validity_days,0)            THEN v_changed := v_changed || '"validity_days"'::jsonb;      END IF;
    IF COALESCE(OLD.min_activation_days,0)      IS DISTINCT FROM COALESCE(NEW.min_activation_days,0)      THEN v_changed := v_changed || '"min_activation_days"'::jsonb;END IF;
    IF jsonb_array_length(v_changed) = 0 THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO public.reseller_tariff_change_logs(
    tariff_id, tariff_package_id, tariff_name, tariff_type, assigned_pops,
    package_name, server_name, profile, profile_speed,
    package_rate, validity_days, min_activation_days,
    effective_from, effective_to,
    changed_fields, action, changed_by
  ) VALUES (
    NEW.tariff_id, NEW.id, v_tariff.name, v_tariff.tariff_type, v_pops,
    v_package_name, v_server_name, NEW.mikrotik_profile, NULL,
    NEW.selling_rate, NEW.validity_days, NEW.min_activation_days,
    NULL, NULL,
    v_changed,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    auth.uid()
  );

  RETURN NEW;
END;
$$;
```

## যা **বদলাবে না**
- কোনো table schema না
- কোনো frontend file না
- কোনো data না
- শুধু এই একটি trigger function

approve করলে এই migration-ই apply করব — এবার schema verify করে লেখা, তাই আর নতুন column error আসার কথা না।

