import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export default function CashOnHandBanner() {
  const { data } = useQuery({
    queryKey: ["cash-on-hand"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cash_on_hand", { _as_of: new Date().toISOString().slice(0, 10) });
      if (error) throw error;
      return Number(data ?? 0);
    },
    refetchInterval: 30000,
  });
  const v = data ?? 0;
  const negative = v < 0;
  return (
    <div className={`flex items-center justify-between rounded-md border p-3 ${negative ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-muted/30"}`}>
      <div className="flex items-center gap-2">
        {negative ? <AlertTriangle className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
        <span className="text-sm font-medium">
          {negative ? "⚠ Cash on Hand ঋণাত্মক — আগে fund add করুন" : "Cash on Hand"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tabular-nums">৳ {v.toLocaleString("en-BD")}</span>
        {negative && (
          <Link to="/dashboard/accounting/capital/transactions" className="text-xs underline">
            এখন fund add করুন
          </Link>
        )}
      </div>
    </div>
  );
}
