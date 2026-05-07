
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add credential columns to important_links
ALTER TABLE public.important_links
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password_encrypted bytea,
  ADD COLUMN IF NOT EXISTS notes text;

-- Private secrets table (no RLS access, only SECURITY DEFINER funcs touch it)
CREATE TABLE IF NOT EXISTS public.app_vault (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.app_vault ENABLE ROW LEVEL SECURITY;
-- No policies = no direct access from anon/auth

-- Seed a vault key on first run
INSERT INTO public.app_vault (key, value)
SELECT 'link_vault_key', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.app_vault WHERE key = 'link_vault_key');

-- Set encrypted password (admin/super_admin/operator only)
CREATE OR REPLACE FUNCTION public.set_important_link_password(_link_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
     SET password_encrypted = pgp_sym_encrypt(_password, v_key)
   WHERE id = _link_id;
END;
$$;

-- Get decrypted password (admin/super_admin/operator only)
CREATE OR REPLACE FUNCTION public.get_important_link_password(_link_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN pgp_sym_decrypt(v_enc, v_key);
END;
$$;

REVOKE ALL ON FUNCTION public.set_important_link_password(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_important_link_password(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_important_link_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_important_link_password(uuid) TO authenticated;

-- Hide password_encrypted from direct SELECT by revoking column-level access (clients should use RPC)
-- Note: RLS still controls row access; we just don't want plaintext via PostgREST
