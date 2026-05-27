import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Scope = "bulk_action" | "dashboard_widget";

interface FeatureRow {
  scope: string;
  scope_key: string;
  feature_key: string;
  enabled: boolean;
}

/**
 * সব effective features load করে।
 * - Super Admin → সব true
 * - কোনো role-এ ওই scope+scope_key-এ কোনো row insert না হলে → default true (পুরনো behavior; admin setup করার আগ পর্যন্ত কিছু hide হবে না)
 * - row insert হওয়ার পর শুধু enabled=true গুলোই দেখাবে
 */
export function useFeatureFlags() {
  const { user } = useAuth();

  const superQ = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_super_admin", { _auth_uid: user!.id });
      return data === true;
    },
    staleTime: 5 * 60_000,
  });

  const featQ = useQuery({
    queryKey: ["effective-features", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: appUser } = await supabase
        .from("app_users")
        .select("id")
        .eq("auth_user_id", user!.id)
        .maybeSingle();
      if (!appUser?.id) return [] as FeatureRow[];
      const { data } = await supabase
        .from("app_user_effective_features" as any)
        .select("scope, scope_key, feature_key, enabled")
        .eq("user_id", appUser.id);
      return (data as any as FeatureRow[]) || [];
    },
    staleTime: 60_000,
  });

  const isSuperAdmin = !!superQ.data;
  const rows = featQ.data || [];

  // Group: scope|scope_key → Map<feature_key, enabled>
  const groupMap = new Map<string, Map<string, boolean>>();
  for (const r of rows) {
    const k = `${r.scope}|${r.scope_key}`;
    if (!groupMap.has(k)) groupMap.set(k, new Map());
    groupMap.get(k)!.set(r.feature_key, r.enabled);
  }

  const can = (scope: Scope, scopeKey: string, featureKey: string): boolean => {
    if (isSuperAdmin) return true;
    const g = groupMap.get(`${scope}|${scopeKey}`);
    if (!g) return true; // not configured yet → don't hide
    return g.get(featureKey) === true;
  };

  return {
    loading: superQ.isLoading || featQ.isLoading,
    isSuperAdmin,
    can,
    canBulk:   (scopeKey: string, key: string) => can("bulk_action", scopeKey, key),
    canWidget: (scopeKey: string, key: string) => can("dashboard_widget", scopeKey, key),
  };
}
