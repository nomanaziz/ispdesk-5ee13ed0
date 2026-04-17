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
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { lineAmount, getMonthRange } from "@/lib/bwSaleProrate";

interface Item {
  item_id: string | null;
  item_name: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_pct: number;
  from_date: string;
  to_date: string;
}

const blankItem = (from: string, to: string): Item => ({
  item_id: null, item_name: "", description: "", unit: "Mbps",
  quantity: 1, rate: 0, vat_pct: 0, from_date: from, to_date: to,
});

export default function BwSaleInvoiceForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [paymentDue, setPaymentDue] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("bw_sale_customers").select("id, customer_name, contact_person").order("customer_name")
      .then(({ data }) => setCustomers(data || []));
    supabase.from("bw_sale_services").select("*").eq("status", "active").order("sort_order")
      .then(({ data }) => setServices(data || []));
    if (!editing) {
      setInvoiceNo(`BW-${Date.now().toString().slice(-8)}`);
      const r = getMonthRange(new Date().toISOString().slice(0, 7));
      setItems([blankItem(r.period_start, r.period_end)]);
    }
  }, [editing]);

  useEffect(() => {
    if (!editing || !id) return;
    (async () => {
      const { data: inv } = await supabase.from("bw_sales_invoices").select("*").eq("id", id).single();
      if (inv) {
        setCustomerId(inv.customer_id || "");
        setContactPerson(inv.contact_person || "");
        setMonth(inv.billing_month || inv.month || new Date().toISOString().slice(0, 7));
        setInvoiceNo(inv.invoice_no);
        setPaymentDue(inv.payment_due_date || "");
        setSpecialNote(inv.special_note || "");
        setRemarks(inv.remarks || inv.notes || "");
        setDiscount(Number(inv.discount || 0));
      }
      const { data: its } = await supabase.from("bw_invoice_items").select("*").eq("invoice_id", id).order("sort_order");
      const r = getMonthRange(inv?.billing_month || inv?.month || new Date().toISOString().slice(0, 7));
      setItems((its || []).map((x: any) => ({
        item_id: x.item_id || x.service_id || null,
        item_name: x.item_name || x.service_name || "",
        description: x.description || "",
        unit: x.unit || "Mbps",
        quantity: Number(x.quantity ?? x.bandwidth_mbps ?? 1),
        rate: Number(x.rate || 0),
        vat_pct: Number(x.vat_pct || 0),
        from_date: x.from_date || x.period_start || r.period_start,
        to_date: x.to_date || x.period_end || r.period_end,
      })));
    })();
  }, [editing, id]);

  const onCustomer = (cid: string) => {
    setCustomerId(cid);
    const c = customers.find(x => x.id === cid);
    if (c) setContactPerson(c.contact_person || "");
  };

  const onMonthChange = (m: string) => {
    setMonth(m);
    const r = getMonthRange(m);
    // refresh from/to defaults for empty rows
    setItems(arr => arr.map(it => ({
      ...it,
      from_date: it.from_date || r.period_start,
      to_date: it.to_date || r.period_end,
    })));
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(arr => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const onPickService = (idx: number, sid: string) => {
    const sv = services.find(s => s.id === sid);
    updateItem(idx, {
      item_id: sid,
      item_name: sv?.name || "",
      unit: sv?.unit || "Mbps",
      rate: Number(sv?.default_rate || 0),
    });
  };

  const removeItem = (idx: number) => setItems(arr => arr.filter((_, i) => i !== idx));
  const addItem = () => {
    const r = getMonthRange(month);
    setItems(arr => [...arr, blankItem(r.period_start, r.period_end)]);
  };

  const computed = useMemo(() => items.map(it => lineAmount({
    quantity: it.quantity, rate: it.rate, fromDate: it.from_date, toDate: it.to_date,
    billingMonth: month, vatPct: it.vat_pct,
  })), [items, month]);

  const subtotal = computed.reduce((s, c) => s + c.subtotal, 0);
  const vatTotal = computed.reduce((s, c) => s + c.vat, 0);
  const grandTotal = Math.max(0, subtotal + vatTotal - Number(discount || 0));

  const save = async () => {
    if (!customerId) { toast.error("Customer required"); return; }
    if (!invoiceNo.trim()) { toast.error("Invoice number required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setLoading(true);
    try {
      const r = getMonthRange(month);
      const headerPayload: any = {
        invoice_no: invoiceNo,
        customer_id: customerId,
        contact_person: contactPerson,
        month,
        billing_month: month,
        period_start: r.period_start,
        period_end: r.period_end,
        payment_due_date: paymentDue || null,
        special_note: specialNote || null,
        remarks: remarks || null,
        amount: grandTotal,
        total_amount: grandTotal,
        discount: Number(discount || 0),
        paid_amount: 0,
        due: grandTotal,
        status: "unpaid",
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

      const itemRows = items.map((it, i) => {
        const c = computed[i];
        return {
          invoice_id: invoiceId,
          item_id: it.item_id,
          service_id: it.item_id, // legacy compatibility
          item_name: it.item_name,
          service_name: it.item_name, // legacy
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          bandwidth_mbps: it.quantity, // legacy
          rate: it.rate,
          vat_pct: it.vat_pct,
          from_date: it.from_date,
          to_date: it.to_date,
          period_start: it.from_date, // legacy
          period_end: it.to_date,     // legacy
          days: c.days,
          total_days_in_month: c.totalDays,
          amount: c.total,
          sort_order: i,
        };
      });
      if (itemRows.length) {
        const { error } = await supabase.from("bw_invoice_items").insert(itemRows as any);
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
        <h1 className="text-2xl font-semibold">{editing ? "Edit" : "Create"} Bandwidth Sale Invoice</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bill Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Invoice No *</Label><Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
          <div><Label>Billing Month *</Label><Input type="month" value={month} onChange={e => onMonthChange(e.target.value)} /></div>
          <div><Label>Payment Due</Label><Input type="date" value={paymentDue} onChange={e => setPaymentDue(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Customer *</Label>
            <Select value={customerId} onValueChange={onCustomer}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Contact Person</Label><Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} /></div>
          <div className="md:col-span-3"><Label>Special Note</Label><Input value={specialNote} onChange={e => setSpecialNote(e.target.value)} placeholder="Visible on the invoice" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Row</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead className="min-w-[160px]">Item</TableHead>
                  <TableHead className="min-w-[160px]">Description</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-24 text-right">Qty</TableHead>
                  <TableHead className="w-28 text-right">Rate</TableHead>
                  <TableHead className="w-20 text-right">VAT %</TableHead>
                  <TableHead className="w-36">From</TableHead>
                  <TableHead className="w-36">To</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const c = computed[idx];
                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={it.item_id || ""} onValueChange={v => onPickService(idx, v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select / type" /></SelectTrigger>
                          <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        {!it.item_id && (
                          <Input className="h-8 mt-1" placeholder="Custom item name" value={it.item_name} onChange={e => updateItem(idx, { item_name: e.target.value })} />
                        )}
                      </TableCell>
                      <TableCell><Input className="h-9" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} /></TableCell>
                      <TableCell><Input className="h-9" value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.rate} onChange={e => updateItem(idx, { rate: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.vat_pct} onChange={e => updateItem(idx, { vat_pct: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input className="h-9" type="date" value={it.from_date} onChange={e => updateItem(idx, { from_date: e.target.value })} /></TableCell>
                      <TableCell><Input className="h-9" type="date" value={it.to_date} onChange={e => updateItem(idx, { to_date: e.target.value })} /></TableCell>
                      <TableCell className="text-right font-semibold">৳{c.total.toLocaleString()}<div className="text-[10px] text-muted-foreground">{c.days}/{c.totalDays}d</div></TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No rows — click "Row" to add</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Remarks</Label>
              <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>৳{vatTotal.toLocaleString()}</span></div>
              <div className="flex justify-between items-center gap-2">
                <span>Discount</span>
                <Input type="number" className="h-8 w-32 text-right" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold text-base"><span>Grand Total</span><span>৳{grandTotal.toLocaleString()}</span></div>
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
