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
 *   full  → view + create + edit + delete
 *
 * If a user has multiple roles, the highest permission wins (max).
 * Effective view already merges primary + extra roles and skips disabled rows.
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
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (!appUser?.id) return { byName: {} as Record<string, PermLevel>, byItem: {} as Record<string, PermLevel> };

      const { data, error } = await supabase
        .from("app_user_effective_modules")
        .select("module_group, module_name, permission")
        .eq("user_id", appUser.id);
      if (error) return { byName: {} as Record<string, PermLevel>, byItem: {} as Record<string, PermLevel> };

      const byName: Record<string, PermLevel> = {};
      const byItem: Record<string, PermLevel> = {};
      (data || []).forEach((r: any) => {
        const p = r.permission as PermLevel;
        const itemKey = `${r.module_group}|${r.module_name}`;
        if (!byItem[itemKey] || RANK[p] > RANK[byItem[itemKey]]) byItem[itemKey] = p;
        // legacy: lookup by module_name only (max across groups)
        if (!byName[r.module_name] || RANK[p] > RANK[byName[r.module_name]]) byName[r.module_name] = p;
      });
      return { byName, byItem };
    },
    staleTime: 5 * 60_000,
  });

  const isSuperAdmin = !!superQ.data;
  const byName = modsQ.data?.byName || {};
  const byItem = modsQ.data?.byItem || {};
  const loading = superQ.isLoading || modsQ.isLoading;

  const levelOf = (module: string): PermLevel =>
    isSuperAdmin ? "full" : byName[module] ?? "none";

  const levelOfItem = (group: string, name: string): PermLevel =>
    isSuperAdmin ? "full" : byItem[`${group}|${name}`] ?? "none";

  return {
    loading,
    isSuperAdmin,
    map: byName,
    itemMap: byItem,
    levelOf,
    levelOfItem,
    canRead:   (m: string) => RANK[levelOf(m)] >= RANK.read,
    canWrite:  (m: string) => RANK[levelOf(m)] >= RANK.write,
    canDelete: (m: string) => RANK[levelOf(m)] >= RANK.full,
    canReadItem:   (g: string, n: string) => RANK[levelOfItem(g, n)] >= RANK.read,
    canWriteItem:  (g: string, n: string) => RANK[levelOfItem(g, n)] >= RANK.write,
    canDeleteItem: (g: string, n: string) => RANK[levelOfItem(g, n)] >= RANK.full,
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
