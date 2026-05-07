import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMySubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, email")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) return { customer: null, history: [] as any[] };

      let customer: any = null;
      if (profile.branch_id) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("*, current_tier:bw_panel_pricing_slabs(*)")
          .eq("panel_branch_id", profile.branch_id)
          .maybeSingle();
        customer = data;
      }
      if (!customer && profile.email) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("*, current_tier:bw_panel_pricing_slabs(*)")
          .ilike("email", profile.email)
          .maybeSingle();
        customer = data;
      }

      if (!customer) return { customer: null, history: [] as any[] };

      const { data: history } = await supabase
        .from("bw_panel_subscriptions")
        .select("id, period_start, period_end, monthly_price, paid_amount, status, payment_method, created_at")
        .eq("customer_id", customer.id)
        .order("period_start", { ascending: false })
        .limit(8);

      return { customer, history: history ?? [] };
    },
    refetchOnWindowFocus: false,
  });
}
