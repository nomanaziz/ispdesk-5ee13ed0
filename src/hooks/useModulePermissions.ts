import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PermLevel = "none" | "read" | "write" | "full";

const RANK: Record<PermLevel, number> = { none: 0, read: 1, write: 2, full: 3 };

/**
 * Loads all effective module permissions for the current user.
 * Super Admin → every module returns 'full' (server-side via is_super_admin RPC).
 *
 * Permission model:
 *   none  → no access
 *   read  → view only
 *   write → view + create + edit
 *   full  → view + create + edit + delete (admin-equivalent for that module)
 *
 * If a user has multiple roles, the highest permission wins (max).
 */
export function useModulePermissions() {
  const { user } = useAuth();

  const superQ = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin", { _auth_uid: user!.id });
      if (error) return false;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });

  const modsQ = useQuery({
    queryKey: ["effective-modules", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // app_users.id is the app-user PK; the view groups by it.
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (!appUser?.id) return {} as Record<string, PermLevel>;

      const { data, error } = await supabase
        .from("app_user_effective_modules")
        .select("module_name, permission")
        .eq("user_id", appUser.id);
      if (error) return {} as Record<string, PermLevel>;

      const map: Record<string, PermLevel> = {};
      (data || []).forEach((r: any) => {
        const cur = map[r.module_name];
        if (!cur || RANK[r.permission as PermLevel] > RANK[cur]) {
          map[r.module_name] = r.permission as PermLevel;
        }
      });
      return map;
    },
    staleTime: 5 * 60_000,
  });

  const isSuperAdmin = !!superQ.data;
  const map = modsQ.data || {};
  const loading = superQ.isLoading || modsQ.isLoading;

  const levelOf = (module: string): PermLevel =>
    isSuperAdmin ? "full" : map[module] ?? "none";

  return {
    loading,
    isSuperAdmin,
    map,
    levelOf,
    canRead:   (m: string) => RANK[levelOf(m)] >= RANK.read,
    canWrite:  (m: string) => RANK[levelOf(m)] >= RANK.write,
    canDelete: (m: string) => RANK[levelOf(m)] >= RANK.full,
  };
}

/** Single-module shortcut. */
export function useModulePermission(module: string) {
  const p = useModulePermissions();
  return {
    loading: p.loading,
    isSuperAdmin: p.isSuperAdmin,
    level: p.levelOf(module),
    canRead:   p.canRead(module),
    canWrite:  p.canWrite(module),
    canDelete: p.canDelete(module),
  };
}
