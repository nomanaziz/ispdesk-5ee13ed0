
-- Create app_roles table
CREATE TABLE public.app_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  redirect_url TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view app_roles"
  ON public.app_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert app_roles"
  ON public.app_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update app_roles"
  ON public.app_roles FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete app_roles"
  ON public.app_roles FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Create app_role_modules table for permissions
CREATE TABLE public.app_role_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.app_roles(id) ON DELETE CASCADE,
  module_group TEXT NOT NULL,
  module_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  permission TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_group, module_name)
);

ALTER TABLE public.app_role_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view app_role_modules"
  ON public.app_role_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert app_role_modules"
  ON public.app_role_modules FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update app_role_modules"
  ON public.app_role_modules FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete app_role_modules"
  ON public.app_role_modules FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Create app_users table
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.app_roles(id) ON DELETE SET NULL,
  auth_user_id UUID,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view app_users"
  ON public.app_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert app_users"
  ON public.app_users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update app_users"
  ON public.app_users FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete app_users"
  ON public.app_users FOR DELETE TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_app_roles_updated_at
  BEFORE UPDATE ON public.app_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
