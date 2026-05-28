import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react";
import CashOnHandBanner from "@/components/accounting/CashOnHandBanner";

const fmt = (n: number) => "৳ " + Number(n || 0).toLocaleString("en-BD");

export default function CapitalDashboard() {
  const { data } = useQuery({
    queryKey: ["capital-dashboard"],
    queryFn: async () => {
      const [contribs, txs, schedule] = await Promise.all([
        supabase.from("capital_contributors" as any).select("type,agreed_amount,status"),
        supabase.from("capital_transactions" as any).select("direction,category,amount,transaction_date"),
        supabase.from("capital_installment_schedule" as any).select("due_date,total_due,paid_amount,status"),
      ]);
      return {
        contribs: (contribs.data ?? []) as any[],
        txs: (txs.data ?? []) as any[],
        schedule: (schedule.data ?? []) as any[],
      };
    },
  });

  const totalIn = (data?.txs ?? []).filter(t => t.direction === "in").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = (data?.txs ?? []).filter(t => t.direction === "out").reduce((s, t) => s + Number(t.amount), 0);
  const interestPaid = (data?.txs ?? []).filter(t => t.category === "interest_pay").reduce((s, t) => s + Number(t.amount), 0);
  const overdueCount = (data?.schedule ?? []).filter(s => s.status === "overdue").length;
  const upcoming = (data?.schedule ?? [])
    .filter(s => ["pending", "partial"].includes(s.status))
    .filter(s => new Date(s.due_date) <= new Date(Date.now() + 30 * 86400000)).length;

  const byType: Record<string, number> = {};
  (data?.contribs ?? []).forEach(c => { byType[c.type] = (byType[c.type] || 0) + Number(c.agreed_amount); });

  return (
    <div className="space-y-4">
      <CashOnHandBanner />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4"/> Total Fund In</div>
          <div className="text-2xl font-bold mt-1">{fmt(totalIn)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingDown className="h-4 w-4"/> Total Fund Out</div>
          <div className="text-2xl font-bold mt-1">{fmt(totalOut)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Wallet className="h-4 w-4"/> Net Capital</div>
          <div className="text-2xl font-bold mt-1">{fmt(totalIn - totalOut)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertCircle className="h-4 w-4"/> Overdue Installments</div>
          <div className="text-2xl font-bold mt-1">{overdueCount}</div>
          <div className="text-xs text-muted-foreground">পরবর্তী ৩০ দিনে: {upcoming}</div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="font-semibold mb-3">Capital Source Breakdown (Agreed)</div>
        <div className="space-y-2">
          {Object.entries(byType).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b pb-1">
              <span>{k}</span><span className="tabular-nums">{fmt(v)}</span>
            </div>
          ))}
          {Object.keys(byType).length === 0 && <div className="text-muted-foreground text-sm">কোনো অবদানকারী যোগ করা হয়নি</div>}
        </div>
        <div className="mt-3 text-sm text-muted-foreground">Interest paid YTD: {fmt(interestPaid)}</div>
      </CardContent></Card>
    </div>
  );
}
