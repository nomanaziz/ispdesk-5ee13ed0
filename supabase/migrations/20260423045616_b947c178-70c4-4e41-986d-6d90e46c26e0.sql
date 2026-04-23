ALTER TABLE public.client_notices
  ADD COLUMN IF NOT EXISTS audience_groups text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_pop_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_bw_pop_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_client_ids uuid[] DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_client_notices_audience_groups ON public.client_notices USING GIN(audience_groups);
CREATE INDEX IF NOT EXISTS idx_client_notices_target_pop_ids ON public.client_notices USING GIN(target_pop_ids);
CREATE INDEX IF NOT EXISTS idx_client_notices_target_bw_pop_ids ON public.client_notices USING GIN(target_bw_pop_ids);
CREATE INDEX IF NOT EXISTS idx_client_notices_target_client_ids ON public.client_notices USING GIN(target_client_ids);