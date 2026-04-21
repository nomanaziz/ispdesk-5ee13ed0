-- Delete the orphan funding row (no branch attached)
DELETE FROM public.branch_funding WHERE branch_id IS NULL;

-- Prevent future orphans: branch_id must be present
ALTER TABLE public.branch_funding
  ALTER COLUMN branch_id SET NOT NULL;