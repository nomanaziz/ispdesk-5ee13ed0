-- 1) Atomic revert RPC: clears mikrotik_clients transfer/export state AND deletes the POP-created clients row
CREATE OR REPLACE FUNCTION public.revert_mikrotik_client(_mt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mt record;
  v_deleted_client_id uuid;
  v_deleted_username text;
BEGIN
  SELECT * INTO v_mt FROM public.mikrotik_clients WHERE id = _mt_id;
  IF v_mt.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'mikrotik_client not found');
  END IF;

  -- 1a. Delete linked client (preferred path)
  IF v_mt.linked_client_id IS NOT NULL THEN
    DELETE FROM public.clients
     WHERE id = v_mt.linked_client_id
       AND owner_scope = 'pop'
    RETURNING id, username INTO v_deleted_client_id, v_deleted_username;
  END IF;

  -- 1b. Fallback: same username + branch + pop scope
  IF v_deleted_client_id IS NULL AND v_mt.name IS NOT NULL THEN
    DELETE FROM public.clients
     WHERE lower(username) = lower(v_mt.name)
       AND owner_scope = 'pop'
       AND (
         (v_mt.transferred_to_pop_id IS NOT NULL AND branch_id = (
           SELECT branch_id FROM public.branch_managers WHERE id = v_mt.transferred_to_pop_id
         ))
         OR (v_mt.branch_id IS NOT NULL AND branch_id = v_mt.branch_id)
       )
    RETURNING id, username INTO v_deleted_client_id, v_deleted_username;
  END IF;

  -- 2. Reset MT row
  UPDATE public.mikrotik_clients
     SET transferred_to_pop_id = NULL,
         transferred_to_mikrotik_id = NULL,
         transferred_at = NULL,
         linked_client_id = NULL,
         exported = false,
         exported_to = NULL,
         branch_id = NULL
   WHERE id = _mt_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_client_id', v_deleted_client_id,
    'deleted_username', v_deleted_username
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_mikrotik_client(uuid) TO authenticated, anon;

-- 2) DATA REPAIR: clean orphan POP clients in Nahid and Naeem branches that have no MT link
-- (these were created during conversions whose mikrotik_clients rows were already reverted)
DELETE FROM public.clients c
WHERE c.owner_scope = 'pop'
  AND c.branch_id IN (
    '26973cfc-0196-4843-baeb-4ecf2ab94a07',  -- Nahid
    '041f2c59-e866-4501-bfdd-45f040c275a7'   -- Naeem
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.mikrotik_clients mc WHERE mc.linked_client_id = c.id
  );