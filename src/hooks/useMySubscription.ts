import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMySubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get profile (branch_id + email)
      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id, email")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) return null;

      // Try branch match first
      let customer: any = null;
      if (profile.branch_id) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("*, current_tier:bw_panel_pricing_slabs(*)")
          .eq("panel_branch_id", profile.branch_id)
          .maybeSingle();
        customer = data;
      }

      // Fallback: email match
      if (!customer && profile.email) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("*, current_tier:bw_panel_pricing_slabs(*)")
          .ilike("email", profile.email)
          .maybeSingle();
        customer = data;
      }

      if (!customer) return { customer: null, invoices: [] };

      const { data: invoices } = await supabase
        .from("bw_sale_invoices")
        .select("id, invoice_no, total_amount, status, due_date, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(6);

      return { customer, invoices: invoices ?? [] };
    },
    refetchOnWindowFocus: false,
  });
}
