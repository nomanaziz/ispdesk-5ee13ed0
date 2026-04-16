import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowDown, ArrowUp } from "lucide-react";

interface LedgerRow {
  date: string;
  type: "debit" | "credit";
  description: string;
  amount: number;
  balance: number;
  ref?: string;
}

const PortalLedger = () => {
  const { customer } = usePortalAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["portal-ledger", customer?.sub],
    queryFn: async () => {
      const out: LedgerRow[] = [];

      // Invoices = debits
      const { data: invoices } = await supabase
        .from("bw_sales_invoices")
        .select("invoice_no, amount, paid_amount, created_at, month")
        .eq("customer_id", customer!.sub)
        .order("created_at");

      // Collections = credits
      const { data: collections } = await supabase
        .from("bw_sale_collections")
        .select("amount, receive_date, created_at, payment_method, note")
        .eq("customer_id", customer!.sub)
        .order("receive_date");

      invoices?.forEach((i: any) => {
        out.push({
          date: i.created_at,
          type: "debit",
          description: `Invoice ${i.invoice_no}${i.month ? ` (${i.month})` : ""}`,
          amount: i.amount || 0,
          balance: 0,
          ref: i.invoice_no,
        });
      });
      collections?.forEach((c: any) => {
        out.push({
          date: c.receive_date || c.created_at,
          type: "credit",
          description: `Payment received${c.payment_method ? ` via ${c.payment_method}` : ""}`,
          amount: c.amount || 0,
          balance: 0,
        });
      });

      out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let bal = 0;
      out.forEach((r) => {
        bal += r.type === "debit" ? r.amount : -r.amount;
        r.balance = bal;
      });
      return out.reverse();
    },
    enabled: !!customer?.sub,
  });

  const currentBalance = rows && rows.length > 0 ? rows[0].balance : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">My Ledger</h1>
            <p className="text-sm text-muted-foreground">All transactions and running balance</p>
          </div>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 px-5">
            <div className="text-xs text-muted-foreground">Current Balance</div>
            <div className={`text-xl font-bold ${currentBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              ৳{Math.abs(currentBalance).toLocaleString()} {currentBalance > 0 ? "Due" : "Clear"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-center px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Debit</th>
                  <th className="text-right px-4 py-3">Credit</th>
                  <th className="text-right px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
                ) : !rows || rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No transactions yet</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.description}</td>
                    <td className="px-4 py-3 text-center">
                      {r.type === "debit" ? (
                        <Badge className="bg-rose-100 text-rose-700 border-0 gap-1"><ArrowUp className="h-3 w-3" /> Debit</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1"><ArrowDown className="h-3 w-3" /> Credit</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">
                      {r.type === "debit" ? `৳${r.amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                      {r.type === "credit" ? `৳${r.amount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">৳{Math.abs(r.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLedger;
