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

interface Item {
  item_id: string | null;
  item_name: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_pct: number;
}

const blankItem = (): Item => ({ item_id: null, item_name: "", description: "", unit: "Mbps", quantity: 1, rate: 0, vat_pct: 0 });

export default function RecurringForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [repeatDay, setRepeatDay] = useState(1);
  const [paymentDueDays, setPaymentDueDays] = useState(7);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("enabled");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<Item[]>([blankItem()]);

  useEffect(() => {
    supabase.from("bw_sale_customers").select("id, customer_name").order("customer_name").then(({ data }) => setCustomers(data || []));
    supabase.from("bw_sale_services").select("*").eq("status", "active").order("sort_order").then(({ data }) => setServices(data || []));
  }, []);

  useEffect(() => {
    if (!editing || !id) return;
    (async () => {
      const { data } = await supabase.from("bw_sale_recurring_invoices").select("*").eq("id", id).single();
      if (data) {
        setCustomerId(data.customer_id || "");
        setRepeatDay(data.repeat_day || 1);
        setPaymentDueDays(data.payment_due_days || 7);
        setStart(data.start_date || "");
        setEnd(data.end_date || "");
        setStatus(data.status || "enabled");
        setRemarks(data.remarks || "");
      }
      const { data: its } = await supabase.from("bw_sale_recurring_items").select("*").eq("recurring_id", id).order("sort_order");
      if (its && its.length) {
        setItems(its.map((x: any) => ({
          item_id: x.item_id, item_name: x.item_name, description: x.description || "",
          unit: x.unit || "Mbps", quantity: Number(x.quantity), rate: Number(x.rate), vat_pct: Number(x.vat_pct || 0),
        })));
      }
    })();
  }, [editing, id]);

  const updateItem = (idx: number, patch: Partial<Item>) => setItems(arr => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const onPickService = (idx: number, sid: string) => {
    const sv = services.find(s => s.id === sid);
    updateItem(idx, { item_id: sid, item_name: sv?.name || "", unit: sv?.unit || "Mbps", rate: Number(sv?.default_rate || 0) });
  };
  const removeItem = (idx: number) => setItems(arr => arr.filter((_, i) => i !== idx));
  const addItem = () => setItems(arr => [...arr, blankItem()]);

  const grandTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.quantity) * Number(it.rate) * (1 + Number(it.vat_pct) / 100), 0),
    [items],
  );

  const save = async () => {
    if (!customerId) { toast.error("Customer required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    const payload: any = {
      customer_id: customerId, repeat_day: Number(repeatDay), payment_due_days: Number(paymentDueDays),
      start_date: start, end_date: end || null, status, remarks: remarks || null,
    };
    let recId = id || "";
    if (editing) {
      const { error } = await supabase.from("bw_sale_recurring_invoices").update(payload).eq("id", id!);
      if (error) { toast.error(error.message); return; }
      await supabase.from("bw_sale_recurring_items").delete().eq("recurring_id", id!);
    } else {
      const { data, error } = await supabase.from("bw_sale_recurring_invoices").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      recId = data.id;
    }
    const rows = items.map((it, i) => ({
      recurring_id: recId, item_id: it.item_id, item_name: it.item_name, description: it.description,
      unit: it.unit, quantity: it.quantity, rate: it.rate, vat_pct: it.vat_pct, sort_order: i,
    }));
    if (rows.length) {
      const { error } = await supabase.from("bw_sale_recurring_items").insert(rows);
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editing ? "Updated" : "Created");
    nav("/dashboard/bw-sale/recurring");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <h1 className="text-2xl font-semibold">{editing ? "Edit" : "Create"} Recurring Invoice</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Template</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Repeat Day (1-31)</Label><Input type="number" min={1} max={31} value={repeatDay} onChange={e => setRepeatDay(Number(e.target.value))} /></div>
          <div><Label>Payment Due (days after)</Label><Input type="number" value={paymentDueDays} onChange={e => setPaymentDueDays(Number(e.target.value))} /></div>
          <div /> 
          <div><Label>Start Date *</Label><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
          <div><Label>End Date</Label><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items (template)</CardTitle>
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
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const total = Number(it.quantity) * Number(it.rate) * (1 + Number(it.vat_pct) / 100);
                  return (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={it.item_id || ""} onValueChange={v => onPickService(idx, v)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        {!it.item_id && (
                          <Input className="h-8 mt-1" placeholder="Custom item" value={it.item_name} onChange={e => updateItem(idx, { item_name: e.target.value })} />
                        )}
                      </TableCell>
                      <TableCell><Input className="h-9" value={it.description} onChange={e => updateItem(idx, { description: e.target.value })} /></TableCell>
                      <TableCell><Input className="h-9" value={it.unit} onChange={e => updateItem(idx, { unit: e.target.value })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.rate} onChange={e => updateItem(idx, { rate: Number(e.target.value) })} /></TableCell>
                      <TableCell><Input className="h-9 text-right" type="number" value={it.vat_pct} onChange={e => updateItem(idx, { vat_pct: Number(e.target.value) })} /></TableCell>
                      <TableCell className="text-right font-semibold">৳{Math.round(total).toLocaleString()}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Remarks</Label><Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-t pt-2 font-semibold text-base"><span>Monthly Bill Amount</span><span>৳{Math.round(grandTotal).toLocaleString()}</span></div>
              <p className="text-xs text-muted-foreground">An invoice will be auto-generated each month on day {repeatDay}, payment due {paymentDueDays} days later.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav(-1)}>Cancel</Button>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" /> {editing ? "Update" : "Create"}</Button>
      </div>
    </div>
  );
}
