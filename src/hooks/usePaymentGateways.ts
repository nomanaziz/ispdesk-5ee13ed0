import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentGateway {
  name: string;
  active: boolean;
  fields?: Record<string, any>;
}

const ONLINE = ["SSLCommerz", "bKash Merchant", "Nagad Merchant", "RechargeServer"];
const MANUAL = ["bKash Personal", "Nagad Personal", "Rocket Personal", "Bank Transfer"];

const accountOf = (gw: PaymentGateway) => {
  const f = gw.fields || {};
  return (
    f.account_number ||
    f.merchant_number ||
    f.wallet_number ||
    f.number ||
    f.account_no ||
    f.mobile ||
    ""
  );
};

const labelOf = (name: string) => {
  if (name.startsWith("bKash")) return "বিকাশ" + (name.includes("Merchant") ? " (Merchant)" : "");
  if (name.startsWith("Nagad")) return "নগদ" + (name.includes("Merchant") ? " (Merchant)" : "");
  if (name.startsWith("Rocket")) return "রকেট";
  if (name === "Bank Transfer") return "ব্যাংক";
  return name;
};

export function usePaymentGateways() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-payment-gateways"],
    queryFn: async () => {
      // Use the SECURITY DEFINER RPC so portal (anon) users can read
      // active + website-visible gateways without needing system_settings RLS.
      const { data, error } = await supabase.rpc("public_payment_gateways");
      if (error) {
        console.error("public_payment_gateways RPC failed:", error);
        return [] as PaymentGateway[];
      }
      return ((data as any[]) || []) as PaymentGateway[];
    },
  });

  const all = (data || []).filter((g) => g.active);
  const online = all.filter((g) => ONLINE.includes(g.name));
  const manual = all
    .filter((g) => MANUAL.includes(g.name))
    .map((g) => ({ ...g, account: accountOf(g), label: labelOf(g.name) }));

  return { online, manual, isLoading };
}
