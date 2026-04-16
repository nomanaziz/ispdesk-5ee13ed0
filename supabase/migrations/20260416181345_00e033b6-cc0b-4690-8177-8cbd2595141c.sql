ALTER TABLE public.branch_managers 
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT true;

UPDATE public.branch_managers 
SET username = COALESCE(username, NULLIF(client_code, ''), NULLIF(contact, ''), NULLIF(email, ''), 'reseller_' || substr(id::text, 1, 8))
WHERE username IS NULL;

UPDATE public.branch_managers
SET password = COALESCE(password, '123456')
WHERE password IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS branch_managers_username_unique ON public.branch_managers(username) WHERE username IS NOT NULL;