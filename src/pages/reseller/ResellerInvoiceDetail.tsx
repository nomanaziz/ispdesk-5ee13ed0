import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";

const ResellerInvoiceDetail = () => {
  const { id = "" } = useParams();

  const { data } = useQuery({
    queryKey: ["reseller-invoice-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const [inv, items, payments] = await Promise.all([
        supabase
          .from("bw_sales_invoices")
          .select("*, bw_sale_customers(customer_name, customer_code, address, mobile, email)")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("bw_bill_items").select("*").eq("bill_id", id),
        supabase
          .from("bw_sale_collections")
          .select("*")
          .eq("invoice_id", id)
          .order("receive_date", { ascending: false }),
      ]);
      return { inv: inv.data, items: items.data || [], payments: payments.data || [] };
    },
  });

  const inv = data?.inv;
  const due = Number(inv?.due ?? Math.max(0, Number(inv?.amount || 0) - Number(inv?.paid_amount || 0) - Number(inv?.discount || 0)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/reseller/invoices">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoices
          </Link>
        </Button>
        {inv && (
          <Button asChild>
            <Link to={`/reseller/invoices/${inv.id}/print`}>
              <Printer className="h-4 w-4 mr-1" /> Print / PDF
            </Link>
          </Button>
        )}
      </div>

      {!inv && <div className="text-center py-12 text-muted-foreground">Invoice not found</div>}

      {inv && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg">
                  Invoice <span className="font-mono">{inv.invoice_no}</span>
                </CardTitle>
                <Badge variant={due > 0 ? "destructive" : "default"}>{due > 0 ? "Due" : "Paid"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
              <Field label="Customer" v={(inv.bw_sale_customers as any)?.customer_name} />
              <Field label="Customer Code" v={(inv.bw_sale_customers as any)?.customer_code} />
              <Field label="Month" v={inv.month} />
              <Field label="Amount" v={`৳ ${Number(inv.amount || 0).toLocaleString()}`} />
              <Field label="Paid" v={`৳ ${Number(inv.paid_amount || 0).toLocaleString()}`} />
              <Field label="Due" v={`৳ ${due.toLocaleString()}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                        No items
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.items.map((it: any) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.unit || "—"}</TableCell>
                      <TableCell>{it.description || "—"}</TableCell>
                      <TableCell>{it.from_date ? format(new Date(it.from_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{it.to_date ? format(new Date(it.to_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">৳ {Number(it.rate || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">৳ {Number(it.total || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No payments yet
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.receive_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="capitalize">{p.payment_method || "—"}</TableCell>
                      <TableCell>{p.note || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">৳ {Number(p.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const Field = ({ label, v }: { label: string; v?: any }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{v ?? "—"}</div>
  </div>
);

export default ResellerInvoiceDetail;
