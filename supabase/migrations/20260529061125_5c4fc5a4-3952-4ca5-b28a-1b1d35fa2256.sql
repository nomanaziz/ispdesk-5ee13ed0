
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS original_profile text;

ALTER TABLE public.branch_managers
  ADD COLUMN IF NOT EXISTS suspension_mode text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS block_profile_name text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'branch_managers_suspension_mode_chk') THEN
    ALTER TABLE public.branch_managers
      ADD CONSTRAINT branch_managers_suspension_mode_chk
      CHECK (suspension_mode IN ('inherit','disable','block_profile'));
  END IF;
END $$;
