import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const EMPLOYEE_ROLE_ID = "33333333-3333-3333-3333-333333333333";

export interface EmployeeContext {
  appUser: any | null;
  employee: any | null;
  primaryRoleId: string | null;
  primaryRoleName: string | null;
  extraRoleIds: string[];
  extraRoleNames: string[];
  widgetPermissions: string[];
  /** Logged-in app_user has Employee as primary role */
  isEmployee: boolean;
  /** Pure employee: Employee primary role AND no extra roles */
  isEmployeeOnly: boolean;
  isAdminUser: boolean;
  loading: boolean;
}

/**
 * Resolves the currently logged in auth user → app_users row → linked employee,
 * primary role, extra roles, and dashboard widget permissions.
 */
export function useEmployeeContext(): EmployeeContext {
  const { user, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["employee-context", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: appUser } = await supabase
        .from("app_users" as any)
        .select("id, username, status, employee_id, role_id, auth_user_id, email, full_name, purpose, access_expires_at, user_type, created_at, updated_at, app_roles(id,name), employees(id, employee_id, name, email, phone, address, department_id, position_id, joining_date, salary, status, image_url, branch_id, default_shift_id, weekly_off_days, has_user_access, user_username, user_permissions)")
        .eq("auth_user_id", user!.id)
        .maybeSingle();

      if (!appUser) {
        return { appUser: null, employee: null, primaryRole: null, extraRoles: [], widgetPermissions: [] };
      }

      const au: any = appUser;
      const [{ data: extras }, { data: widgets }] = await Promise.all([
        supabase.from("app_user_extra_roles" as any).select("role_id, app_roles(id,name)").eq("user_id", au.id),
        supabase.from("dashboard_widget_permissions" as any).select("widget_key").eq("app_user_id", au.id),
      ]);

      return {
        appUser: au,
        employee: au.employees || null,
        primaryRole: au.app_roles || null,
        extraRoles: (extras as any[] | null)?.map((e) => e.app_roles).filter(Boolean) ?? [],
        widgetPermissions: (widgets as any[] | null)?.map((w) => w.widget_key) ?? [],
      };
    },
  });

  const primaryRoleId = data?.primaryRole?.id ?? null;
  const primaryRoleName = data?.primaryRole?.name ?? null;
  const extraRoleIds = (data?.extraRoles ?? []).map((r: any) => r.id);
  const extraRoleNames = (data?.extraRoles ?? []).map((r: any) => r.name);
  const isEmployee = primaryRoleId === EMPLOYEE_ROLE_ID;

  return {
    appUser: data?.appUser ?? null,
    employee: data?.employee ?? null,
    primaryRoleId,
    primaryRoleName,
    extraRoleIds,
    extraRoleNames,
    widgetPermissions: data?.widgetPermissions ?? [],
    isEmployee,
    isEmployeeOnly: isEmployee && extraRoleIds.length === 0 && !isAdmin,
    isAdminUser: isAdmin,
    loading: isLoading,
  };
}
