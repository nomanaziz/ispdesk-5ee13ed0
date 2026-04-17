import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Printer, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function BwSaleInvoiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("bw_sales_invoices").select("*").eq("id", id).single();
    setInv(data);
    const { data: its } = await supabase.from("bw_invoice_items").select("*").eq("invoice_id", id).order("sort_order");
    setItems(its || []);
    const { data: ps } = await supabase.from("bw_sale_payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false });
    setPayments(ps || []);
    if (data?.customer_id) {
      const { data: c } = await supabase.from("bw_sale_customers").select("*").eq("id", data.customer_id).single();
      setCustomer(c);
    }
  };

  useEffect(() => { load(); }, [id]);

  const approvePayment = async (pid: string) => {
    const { error } = await supabase.from("bw_sale_payments").update({ approved: true, approved_at: new Date().toISOString() }).eq("id", pid);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment approved");
    load();
  };

  const deletePayment = async (pid: string) => {
    if (!confirm("Delete this payment?")) return;
    const { error } = await supabase.from("bw_sale_payments").delete().eq("id", pid);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment deleted");
    load();
  };

  if (!inv) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const total = Number(inv.total_amount || inv.amount || 0);
  const totalApproved = payments.filter(p => p.approved).reduce((s, p) => s + Number(p.amount || 0) + Number(p.discount || 0), 0);
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const due = Math.max(0, total - totalApproved);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
        <CardHeader><CardTitle className="text-base">Bill Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-muted-foreground">Invoice No</div><div className="font-medium">{inv.invoice_no}</div></div>
          <div><div className="text-muted-foreground">Billing Month</div><div>{inv.billing_month || inv.month || "—"}</div></div>
          <div><div className="text-muted-foreground">Customer</div><div className="font-medium">{customer?.customer_name || "—"}</div></div>
          <div><div className="text-muted-foreground">Contact</div><div>{inv.contact_person || customer?.contact_person || "—"}</div></div>
          <div><div className="text-muted-foreground">Mobile</div><div>{customer?.mobile || "—"}</div></div>
          <div><div className="text-muted-foreground">Payment Due</div><div>{inv.payment_due_date || "—"}</div></div>
          <div className="md:col-span-2"><div className="text-muted-foreground">Special Note</div><div>{inv.special_note || "—"}</div></div>
          <div className="md:col-span-4"><div className="text-muted-foreground">Address</div><div>{customer?.address || "—"}</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Service Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">VAT %</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{it.item_name || it.service_name}</TableCell>
                    <TableCell>{it.description || "—"}</TableCell>
                    <TableCell className="text-right">{Number(it.quantity ?? it.bandwidth_mbps)}</TableCell>
                    <TableCell>{it.unit || "Mbps"}</TableCell>
                    <TableCell className="text-right">৳{Number(it.rate).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(it.vat_pct || 0)}%</TableCell>
                    <TableCell>{it.from_date || it.period_start}</TableCell>
                    <TableCell>{it.to_date || it.period_end}</TableCell>
                    <TableCell className="text-right font-semibold">৳{Number(it.amount).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No line items</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span>Discount:</span><span>৳{Number(inv.discount || 0).toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Total:</span><span>৳{total.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Approved Paid:</span><span>৳{totalApproved.toLocaleString()}</span></div>
              <div className="flex justify-between text-base font-semibold text-destructive"><span>Balance Due:</span><span>৳{due.toLocaleString()}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment Information</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No payments yet</TableCell></TableRow>
                ) : payments.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{p.payment_date}</TableCell>
                    <TableCell className="capitalize">{p.payment_method}</TableCell>
                    <TableCell>{p.receipt_no || "—"}</TableCell>
                    <TableCell>{p.description || p.remarks || "—"}</TableCell>
                    <TableCell className="text-right">৳{Number(p.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{Number(p.discount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={p.approved ? "default" : "secondary"}>{p.approved ? "Approved" : "Pending"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {!p.approved && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => approvePayment(p.id)} title="Approve">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePayment(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={5} className="text-right">Total Received:</TableCell>
                    <TableCell className="text-right">৳{totalReceived.toLocaleString()}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
