-- 1. app_user_extra_roles: remove unrestricted ALL, restrict writes to admins
DROP POLICY IF EXISTS "Authenticated can manage extra roles" ON public.app_user_extra_roles;

CREATE POLICY "Admins can insert extra roles"
  ON public.app_user_extra_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update extra roles"
  ON public.app_user_extra_roles FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete extra roles"
  ON public.app_user_extra_roles FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 2. sms_templates / sms_groups: drop permissive ALL policy
DROP POLICY IF EXISTS "Authenticated users can manage sms_templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Authenticated users can manage sms_groups" ON public.sms_groups;

-- 3. zkteco_device_users: drop permissive ALL, keep SELECT, add admin-only writes
DROP POLICY IF EXISTS "Authenticated can manage device users" ON public.zkteco_device_users;

CREATE POLICY "Admins can insert device users"
  ON public.zkteco_device_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update device users"
  ON public.zkteco_device_users FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete device users"
  ON public.zkteco_device_users FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- 4. conveyance-receipts storage bucket: make private + scope SELECT
UPDATE storage.buckets SET public = false WHERE id = 'conveyance-receipts';

DROP POLICY IF EXISTS "conveyance_receipts_public_read" ON storage.objects;

-- Files are stored at path "{auth_user_id}/..."; allow self-read or admins
CREATE POLICY "conveyance_receipts_self_or_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'conveyance-receipts'
    AND (
      public.is_admin_or_super(auth.uid())
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );