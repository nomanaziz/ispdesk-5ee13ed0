-- 1. Media servers (FTP / Live TV / Movie)
CREATE TABLE public.media_servers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ftp', -- ftp | live_tv | movie | other
  url TEXT NOT NULL,
  username TEXT,
  password TEXT,
  description TEXT,
  logo_url TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active media servers"
  ON public.media_servers FOR SELECT USING (true);

CREATE POLICY "Admins manage media servers"
  ON public.media_servers FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_media_servers_updated
BEFORE UPDATE ON public.media_servers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Client notices
CREATE TABLE public.client_notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info | warning | success | event
  target_scope TEXT NOT NULL DEFAULT 'all', -- all | branch | zone
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
  attachment_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read client notices"
  ON public.client_notices FOR SELECT USING (true);

CREATE POLICY "Admins manage client notices"
  ON public.client_notices FOR ALL
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER trg_client_notices_updated
BEFORE UPDATE ON public.client_notices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Support ticket messages (threaded conversation)
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'client', -- client | admin | system
  sender_id UUID,
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ticket messages"
  ON public.support_ticket_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ticket messages"
  ON public.support_ticket_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins manage ticket messages"
  ON public.support_ticket_messages FOR UPDATE
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins delete ticket messages"
  ON public.support_ticket_messages FOR DELETE
  USING (public.is_admin_or_super(auth.uid()));