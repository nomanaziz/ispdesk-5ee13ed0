
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_important_link_password(_link_id uuid, _password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _password IS NULL OR length(_password) = 0 THEN
    UPDATE public.important_links SET password_encrypted = NULL WHERE id = _link_id;
    RETURN;
  END IF;

  SELECT value INTO v_key FROM public.app_vault WHERE key = 'link_vault_key';
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Vault key missing';
  END IF;

  UPDATE public.important_links
     SET password_encrypted = extensions.pgp_sym_encrypt(_password, v_key)
   WHERE id = _link_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_important_link_password(_link_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  v_enc bytea;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT password_encrypted INTO v_enc FROM public.important_links WHERE id = _link_id;
  IF v_enc IS NULL THEN RETURN NULL; END IF;

  SELECT value INTO v_key FROM public.app_vault WHERE key = 'link_vault_key';
  RETURN extensions.pgp_sym_decrypt(v_enc, v_key);
END;
$function$;
