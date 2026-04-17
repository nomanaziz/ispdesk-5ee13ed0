import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calculator, Save, ArrowLeft } from "lucide-react";
import { buildInvoiceItems, getMonthRange, type InvoiceItemDraft } from "@/lib/bwSaleProrate";

export default function BwSaleInvoiceForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemDraft[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("bw_sale_customers").select("id, customer_name, contact_person").order("customer_name").then(({ data }) => setCustomers(data || []));
    if (!editing) {
      const num = `BW-${Date.now().toString().slice(-8)}`;
      setInvoiceNo(num);
    }
  }, [editing]);

  useEffect(() => {
    if (!editing || !id) return;
    (async () => {
      const { data: inv } = await supabase.from("bw_sales_invoices").select("*").eq("id", id).single();
      if (inv) {
        setCustomerId(inv.customer_id || "");
        setContactPerson(inv.contact_person || "");
        setMonth(inv.month || new Date().toISOString().slice(0, 7));
        setInvoiceNo(inv.invoice_no);
        setNotes(inv.notes || "");
        setDiscount(Number(inv.discount || 0));
      }
      const { data: its } = await supabase.from("bw_invoice_items").select("*").eq("invoice_id", id).order("sort_order");
      setItems((its || []).map((x, i) => ({
        subscription_id: x.subscription_id, service_id: x.service_id, service_name: x.service_name,
        bandwidth_mbps: Number(x.bandwidth_mbps), rate: Number(x.rate),
        period_start: x.period_start, period_end: x.period_end,
        days: x.days, total_days_in_month: x.total_days_in_month,
        amount: Number(x.amount), sort_order: i,
      })));
    })();
  }, [editing, id]);

  const onCustomer = (cid: string) => {
    setCustomerId(cid);
    const c = customers.find(x => x.id === cid);
    if (c) setContactPerson(c.contact_person || "");
  };

  const generate = async () => {
    if (!customerId) { toast.error("Select a customer"); return; }
    setLoading(true);
    try {
      const draft = await buildInvoiceItems(customerId, month);
      if (draft.length === 0) toast.warning("No active subscriptions in this month");
      setItems(draft);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItemDraft>) => {
    setItems(arr => arr.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      const recomputed = (Number(merged.bandwidth_mbps) * Number(merged.rate) * Number(merged.days)) / Number(merged.total_days_in_month || 1);
      merged.amount = Math.round(recomputed * 100) / 100;
      return merged;
    }));
  };

  const removeItem = (idx: number) => setItems(arr => arr.filter((_, i) => i !== idx));

  const addBlankItem = () => {
    const r = getMonthRange(month);
    setItems(arr => [...arr, {
      subscription_id: null, service_id: null, service_name: "", bandwidth_mbps: 0, rate: 0,
      period_start: r.period_start, period_end: r.period_end, days: r.total_days, total_days_in_month: r.total_days,
      amount: 0, sort_order: arr.length,
    }]);
  };

  const subtotal = useMemo(() => items.reduce((s, it) => s + Number(it.amount || 0), 0), [items]);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const save = async () => {
    if (!customerId) { toast.error("Customer required"); return; }
    if (!invoiceNo.trim()) { toast.error("Invoice number required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setLoading(true);
    try {
      const r = getMonthRange(month);
      const headerPayload = {
        invoice_no: invoiceNo, customer_id: customerId, contact_person: contactPerson,
        month, period_start: r.period_start, period_end: r.period_end,
        amount: total, total_amount: total, discount: Number(discount || 0),
        paid_amount: 0, due: total, status: "unpaid", notes,
      };

      let invoiceId = id || "";
      if (editing) {
        const { error } = await supabase.from("bw_sales_invoices").update(headerPayload).eq("id", id!);
        if (error) throw error;
        await supabase.from("bw_invoice_items").delete().eq("invoice_id", id!);
      } else {
        const { data, error } = await supabase.from("bw_sales_invoices").insert(headerPayload).select().single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const itemRows = items.map((it, i) => ({
        invoice_id: invoiceId, subscription_id: it.subscription_id, service_id: it.service_id,
        service_name: it.service_name, bandwidth_mbps: it.bandwidth_mbps, rate: it.rate,
        period_start: it.period_start, period_end: it.period_end, days: it.days,
        total_days_in_month: it.total_days_in_month, amount: it.amount, sort_order: i,
      }));
      if (itemRows.length) {
        const { error } = await supabase.from("bw_invoice_items").insert(itemRows);
        if (error) throw error;
      }
      toast.success(editing ? "Invoice updated" : "Invoice created");
      nav(`/dashboard/bw-sale/invoices/${invoiceId}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-semibold">{editing ? "Edit" : "Create"} BW Sale Invoice</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label>Invoice No *</Label><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
          <div><Label>Billing Month *</Label><Input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer *</Label>
            <Select value={customerId} onValueChange={onCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Contact Person</Label><Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={addBlankItem}>+ Manual Row</Button>
            <Button size="sm" onClick={generate} disabled={loading}><Calculator className="h-4 w-4 mr-1" /> Auto-generate from Subscriptions</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="w-28">Mbps</TableHead>
                  <TableHead className="w-32">Rate</TableHead>
                  <TableHead className="w-36">From</TableHead>
                  <TableHead className="w-36">To</TableHead>
                  <TableHead className="w-20">Days</TableHead>
                  <TableHead className="w-20">/Month</TableHead>
                  <TableHead className="text-right w-32">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell><Input value={it.service_name} onChange={e => updateItem(idx, { service_name: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" value={it.bandwidth_mbps} onChange={e => updateItem(idx, { bandwidth_mbps: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" value={it.rate} onChange={e => updateItem(idx, { rate: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="date" value={it.period_start} onChange={e => updateItem(idx, { period_start: e.target.value })} /></TableCell>
                    <TableCell><Input type="date" value={it.period_end} onChange={e => updateItem(idx, { period_end: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" value={it.days} onChange={e => updateItem(idx, { days: Number(e.target.value) })} /></TableCell>
                    <TableCell><Input type="number" value={it.total_days_in_month} onChange={e => updateItem(idx, { total_days_in_month: Number(e.target.value) })} /></TableCell>
                    <TableCell className="text-right font-semibold">৳ {Number(it.amount).toLocaleString()}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>×</Button></TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No items — pick a customer + month, then click Auto-generate.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>৳ {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between items-center gap-2"><span>Discount:</span><Input type="number" className="h-8 w-32 text-right" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
              <div className="flex justify-between border-t pt-2 font-semibold text-base"><span>Total:</span><span>৳ {total.toLocaleString()}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav(-1)}>Cancel</Button>
        <Button onClick={save} disabled={loading}><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Save"} Invoice</Button>
      </div>
    </div>
  );
}
