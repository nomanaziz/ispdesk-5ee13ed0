-- Add owner scope columns to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS owner_scope text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;

-- Constraint: only allow known scopes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_owner_scope_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_owner_scope_check
      CHECK (owner_scope IN ('admin','pop','reseller'));
  END IF;
END $$;

-- Backfill: any client with a branch_id is POP-owned
UPDATE public.clients
   SET owner_scope = 'pop'
 WHERE branch_id IS NOT NULL
   AND owner_scope = 'admin';

-- Indexes for fast scoped queries
CREATE INDEX IF NOT EXISTS idx_clients_owner_scope ON public.clients(owner_scope);
CREATE INDEX IF NOT EXISTS idx_clients_created_by_admin ON public.clients(created_by_admin);