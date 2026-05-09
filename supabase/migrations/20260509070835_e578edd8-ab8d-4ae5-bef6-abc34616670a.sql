
CREATE OR REPLACE FUNCTION public.public_payment_gateways()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw jsonb;
  v_out jsonb := '[]'::jsonb;
  v_gw jsonb;
  v_fields jsonb;
  v_safe jsonb;
  v_safe_keys text[] := ARRAY[
    'number','holder_name','instructions',
    'bank_name','account_name','account_number','branch','routing_number','address',
    'merchant_number','brand_key','account','sandbox'
  ];
  k text;
BEGIN
  SELECT setting_value INTO v_raw
    FROM public.system_settings
   WHERE setting_key = 'payment_gateways'
   LIMIT 1;

  IF v_raw IS NULL OR jsonb_typeof(v_raw) <> 'array' THEN
    RETURN v_out;
  END IF;

  FOR v_gw IN SELECT * FROM jsonb_array_elements(v_raw)
  LOOP
    IF COALESCE((v_gw->>'active')::boolean, false)
       AND COALESCE((v_gw->>'show_on_website')::boolean, false) THEN
      v_fields := COALESCE(v_gw->'fields', '{}'::jsonb);
      v_safe := '{}'::jsonb;
      FOREACH k IN ARRAY v_safe_keys LOOP
        IF v_fields ? k THEN
          v_safe := v_safe || jsonb_build_object(k, v_fields->k);
        END IF;
      END LOOP;
      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'name', v_gw->>'name',
        'category', v_gw->>'category',
        'type', v_gw->>'type',
        'active', true,
        'show_on_website', true,
        'color', v_gw->>'color',
        'fields', v_safe
      ));
    END IF;
  END LOOP;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_payment_gateways() TO anon, authenticated;
