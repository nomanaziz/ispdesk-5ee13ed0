CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  title text,
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notes_owner ON public.user_notes(owner_type, owner_id, created_at DESC);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- Admin users: can manage their own notes (owner_type='admin' and owner_id=auth.uid())
CREATE POLICY "Admins can view own notes"
  ON public.user_notes FOR SELECT
  TO authenticated
  USING (owner_type = 'admin' AND owner_id = auth.uid()::text);

CREATE POLICY "Admins can insert own notes"
  ON public.user_notes FOR INSERT
  TO authenticated
  WITH CHECK (owner_type = 'admin' AND owner_id = auth.uid()::text);

CREATE POLICY "Admins can update own notes"
  ON public.user_notes FOR UPDATE
  TO authenticated
  USING (owner_type = 'admin' AND owner_id = auth.uid()::text);

CREATE POLICY "Admins can delete own notes"
  ON public.user_notes FOR DELETE
  TO authenticated
  USING (owner_type = 'admin' AND owner_id = auth.uid()::text);

-- Portal users go through edge function with service role; no direct anon/authenticated access for non-admin owner_types

-- Updated-at trigger
CREATE TRIGGER trg_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();