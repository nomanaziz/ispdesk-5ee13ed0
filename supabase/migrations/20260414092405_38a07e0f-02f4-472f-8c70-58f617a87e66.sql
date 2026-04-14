
-- Alter support_categories
ALTER TABLE public.support_categories
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'for_everyone',
  ADD COLUMN IF NOT EXISTS details text;

-- Alter support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS complain_no text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS solved_at timestamptz,
  ADD COLUMN IF NOT EXISTS solved_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subzone text,
  ADD COLUMN IF NOT EXISTS box text,
  ADD COLUMN IF NOT EXISTS attachments text[];

-- Create support_ticket_assignees
CREATE TABLE public.support_ticket_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, employee_id)
);
ALTER TABLE public.support_ticket_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view ticket assignees" ON public.support_ticket_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create ticket assignees" ON public.support_ticket_assignees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ticket assignees" ON public.support_ticket_assignees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ticket assignees" ON public.support_ticket_assignees FOR DELETE TO authenticated USING (true);

-- Create support_ticket_comments
CREATE TABLE public.support_ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  comment text NOT NULL,
  attachments text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view ticket comments" ON public.support_ticket_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create ticket comments" ON public.support_ticket_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update ticket comments" ON public.support_ticket_comments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete ticket comments" ON public.support_ticket_comments FOR DELETE TO authenticated USING (true);
