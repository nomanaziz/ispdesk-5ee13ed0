import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { FileText, Search, CreditCard, Calendar, Hash } from "lucide-react";

const statusColor: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  due: "bg-rose-100 text-rose-700",
  unpaid: "bg-amber-100 text-amber-700",
};

const PortalInvoices = () => {
  const { customer } = usePortalAuth();
  const [search, setSearch] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["portal-invoices-list", customer?.sub],
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sales_invoices")
        .select("*")
        .eq("customer_id", customer!.sub)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!customer?.sub,
  });

  const filtered =
    invoices?.filter(
      (i) =>
        i.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
        (i.month || "").toLowerCase().includes(search.toLowerCase())
    ) || [];

  const totalAmount = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = filtered.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalDue = filtered.reduce((s, i) => s + (i.due || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Billing Invoices</h1>
            <p className="text-sm text-muted-foreground">Your invoice history & payments</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64 bg-white"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Billed</div>
            <div className="text-lg font-bold">৳{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Paid</div>
            <div className="text-lg font-bold text-emerald-600">৳{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Due</div>
            <div className="text-lg font-bold text-rose-600">৳{totalDue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice cards */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center text-muted-foreground">No invoices found</CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((inv) => {
            const isDue = (inv.due || 0) > 0;
            return (
              <Card key={inv.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    <div className={`w-1.5 ${isDue ? "bg-rose-400" : "bg-emerald-400"}`} />
                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm flex items-center gap-1">
                            <Hash className="h-3 w-3 text-muted-foreground" />{inv.invoice_no}
                          </span>
                          <Badge className={`${statusColor[inv.status] || statusColor.due} border-0 capitalize text-[10px]`}>
                            {inv.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{inv.month || new Date(inv.created_at).toLocaleDateString()}</span>
                          <span>Paid: ৳{(inv.paid_amount || 0).toLocaleString()}</span>
                          {(inv.discount || 0) > 0 && <span>Discount: ৳{inv.discount.toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase">Amount</div>
                          <div className="font-bold">৳{(inv.amount || 0).toLocaleString()}</div>
                        </div>
                        {isDue && (
                          <div className="text-right">
                            <div className="text-[10px] text-muted-foreground uppercase">Due</div>
                            <div className="font-bold text-rose-600">৳{(inv.due || 0).toLocaleString()}</div>
                          </div>
                        )}
                        {isDue && (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600 shadow">
                            <CreditCard className="h-3.5 w-3.5" /> Pay
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalInvoices;
