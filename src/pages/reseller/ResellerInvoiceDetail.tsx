import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";
import { format } from "date-fns";

const ResellerInvoiceDetail = () => {
  const { id = "" } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith("/bw") ? "/bw/invoices" : "/reseller/invoices";
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);

  const { data } = useQuery({
    queryKey: ["reseller-invoice-detail", id, billingId, customer?.session_id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_bw_portal_invoice_detail", {
        _invoice_id: id,
        _customer_id: billingId || null,
        _username: customer?.username || null,
        _user_type: customer?.type || null,
        _session_id: customer?.session_id || null,
      });
      if (error) {
        console.error("get_bw_portal_invoice_detail failed:", error);
        return { inv: null, items: [], payments: [] };
      }
      const payload = (data as any) || {};
      return {
        inv: payload.invoice || null,
        items: (payload.items as any[]) || [],
        payments: (payload.payments as any[]) || [],
      };
    },
  });

  const inv = data?.inv;
  const due = Number(inv?.due ?? Math.max(0, Number(inv?.amount || 0) - Number(inv?.paid_amount || 0) - Number(inv?.discount || 0)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to={base}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoices
          </Link>
        </Button>
        {inv && (
          <Button asChild>
            <Link to={`${base}/${inv.id}/print`}>
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
              <Field label="Customer" v={inv.customer_name} />
              <Field label="Customer Code" v={inv.customer_code} />
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
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Mbps</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
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
                      <TableCell className="font-medium">{it.service_name || it.item_name || "—"}</TableCell>
                      <TableCell className="text-right">{Number(it.bandwidth_mbps || 0)}</TableCell>
                      <TableCell className="text-right">৳ {Number(it.rate || 0).toLocaleString()}</TableCell>
                      <TableCell>{it.period_start ? format(new Date(it.period_start), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{it.period_end ? format(new Date(it.period_end), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right">{it.days || 0}/{it.total_days_in_month || 0}</TableCell>
                      <TableCell className="text-right font-medium">৳ {Number(it.amount || 0).toLocaleString()}</TableCell>
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
