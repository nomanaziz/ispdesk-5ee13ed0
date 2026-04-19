import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches pending counts for items shown as red badges in the sidebar.
 * Refetches every 60s so admins see new submissions without manual reload.
 */
export function useSidebarBadges() {
  return useQuery({
    queryKey: ["sidebar-badges"],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      const [newReq, changeReq, updateReq, todayCollect] = await Promise.all([
        supabase
          .from("client_requests")
          .select("id", { count: "exact", head: true })
          .eq("setup_status", "Pending"),
        supabase
          .from("change_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("client_update_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("bill_collections")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayStart),
      ]);

      const map: Record<string, number> = {
        "/dashboard/clients/new-request": newReq.count || 0,
        "/dashboard/clients/change-request": changeReq.count || 0,
        "/dashboard/clients/update-requests": updateReq.count || 0,
        "/dashboard/billing/daily-collection": todayCollect.count || 0,
      };
      return map;
    },
  });
}
