import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Printer } from "lucide-react";

export default function BwSaleInvoiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("bw_sales_invoices").select("*").eq("id", id).single();
      setInv(data);
      const { data: its } = await supabase.from("bw_invoice_items").select("*").eq("invoice_id", id).order("sort_order");
      setItems(its || []);
      if (data?.customer_id) {
        const { data: c } = await supabase.from("bw_sale_customers").select("*").eq("id", data.customer_id).single();
        setCustomer(c);
      }
    })();
  }, [id]);

  if (!inv) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const due = Number(inv.total_amount || inv.amount || 0) - Number(inv.paid_amount || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="text-2xl font-semibold">Invoice {inv.invoice_no}</h1>
          <Badge variant={due > 0 ? "destructive" : "default"}>{due > 0 ? "Due" : "Paid"}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to={`/dashboard/bw-sale/invoices/${id}/edit`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link></Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bill To</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-muted-foreground">Customer</div><div className="font-medium">{customer?.customer_name || "—"}</div></div>
          <div><div className="text-muted-foreground">Contact</div><div>{inv.contact_person || customer?.contact_person || "—"}</div></div>
          <div><div className="text-muted-foreground">Mobile</div><div>{customer?.mobile || "—"}</div></div>
          <div><div className="text-muted-foreground">Billing Month</div><div>{inv.month || "—"}</div></div>
          <div><div className="text-muted-foreground">Period</div><div>{inv.period_start} → {inv.period_end}</div></div>
          <div className="md:col-span-3"><div className="text-muted-foreground">Address</div><div>{customer?.address || "—"}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Service Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Mbps</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{it.service_name}</TableCell>
                  <TableCell className="text-right">{Number(it.bandwidth_mbps)}</TableCell>
                  <TableCell className="text-right">৳ {Number(it.rate).toLocaleString()}</TableCell>
                  <TableCell>{it.period_start} → {it.period_end}</TableCell>
                  <TableCell className="text-right">{it.days}/{it.total_days_in_month}</TableCell>
                  <TableCell className="text-right font-semibold">৳ {Number(it.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No line items</TableCell></TableRow>}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>৳ {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>৳ {Number(inv.discount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total:</span><span>৳ {Number(inv.total_amount || inv.amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Paid:</span><span>৳ {Number(inv.paid_amount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between text-base font-semibold text-destructive"><span>Due:</span><span>৳ {due.toLocaleString()}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
