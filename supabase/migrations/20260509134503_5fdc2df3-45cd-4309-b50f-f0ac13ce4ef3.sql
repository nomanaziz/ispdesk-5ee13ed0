-- Create public client-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-photos', 'client-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "client-photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-photos');

-- Authenticated insert/update/delete
CREATE POLICY "client-photos auth insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'client-photos');

CREATE POLICY "client-photos auth update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'client-photos');

CREATE POLICY "client-photos auth delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-photos');