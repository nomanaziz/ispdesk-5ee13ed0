import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";

const PaymentTracking = () => {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, packages(name)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Payment Tracking</h1>
          <p className="text-sm text-muted-foreground">Track customer payments and transactions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.transaction_id || "—"}</TableCell>
                  <TableCell>৳{p.amount}</TableCell>
                  <TableCell>{p.payment_method || "—"}</TableCell>
                  <TableCell>{(p as any).packages?.name || "—"}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{isLoading ? "Loading..." : "No payments yet."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTracking;
