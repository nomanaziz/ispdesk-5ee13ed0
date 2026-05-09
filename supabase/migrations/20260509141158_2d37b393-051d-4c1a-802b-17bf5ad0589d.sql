
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_started_by uuid,
  ADD COLUMN IF NOT EXISTS sms_notified boolean DEFAULT false;

ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_ticket_assignees REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_assignees;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
