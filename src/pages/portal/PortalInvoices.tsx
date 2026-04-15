import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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

  const filtered = invoices?.filter(i =>
    i.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
    (i.month || "").toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalAmount = filtered.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = filtered.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalDiscount = filtered.reduce((s, i) => s + (i.discount || 0), 0);
  const totalDue = filtered.reduce((s, i) => s + (i.due || 0), 0);

  const statusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>;
      case "due": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Due</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Billing Invoices</CardTitle>
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-primary">SN</TableHead>
                  <TableHead className="text-primary">Bill No</TableHead>
                  <TableHead className="text-primary">Bill Month</TableHead>
                  <TableHead className="text-primary text-right">Bill Amount</TableHead>
                  <TableHead className="text-primary text-right">Paid Amount</TableHead>
                  <TableHead className="text-primary text-right">Discount</TableHead>
                  <TableHead className="text-primary text-right">Due</TableHead>
                  <TableHead className="text-primary text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : filtered.map((inv, idx) => (
                  <TableRow key={inv.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                    <TableCell>{inv.month || "-"}</TableCell>
                    <TableCell className="text-right">৳{(inv.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.discount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.due || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-center">{statusBadge(inv.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right">৳{totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDiscount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDue.toLocaleString()}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalInvoices;
