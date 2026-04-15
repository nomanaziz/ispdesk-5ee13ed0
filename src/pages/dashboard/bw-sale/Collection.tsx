import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Search } from "lucide-react";

export default function Collection() {
  const [collections, setCollections] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ receive_date: new Date().toISOString().split("T")[0], customer_id: "", invoice_id: "", amount: 0, discount: 0, balance_due: 0, received_by: "", note: "", payment_method: "cash", status: "pending" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [colRes, custRes, invRes] = await Promise.all([
      supabase.from("bw_sale_collections").select("*").order("receive_date", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, contact_person, mobile"),
      supabase.from("bw_sales_invoices").select("id, invoice_no, month, amount"),
    ]);
    if (colRes.data) setCollections(colRes.data);
    if (custRes.data) setCustomers(custRes.data);
    if (invRes.data) setInvoices(invRes.data);
    setLoading(false);
  }

  const filtered = collections.filter(c => {
    const cust = customers.find(x => x.id === c.customer_id);
    return (cust?.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.received_by || "").toLowerCase().includes(search.toLowerCase());
  });

  const totalReceived = filtered.reduce((s, c) => s + (c.amount || 0), 0);
  const totalDiscount = filtered.reduce((s, c) => s + (c.discount || 0), 0);
  const totalDue = filtered.reduce((s, c) => s + (c.balance_due || 0), 0);

  async function handleSave() {
    if (!form.customer_id) { toast.error("Customer required"); return; }
    const payload: any = { ...form };
    if (!payload.invoice_id) payload.invoice_id = null;
    const { error } = await supabase.from("bw_sale_collections").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Collection recorded");
    setDialogOpen(false);
    fetchData();
  }

  async function handleApprove(id: string) {
    const { error } = await supabase.from("bw_sale_collections").update({ status: "approved" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Approved"); fetchData(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("bw_sale_collections").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchData(); }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Bill Collection</CardTitle>
          <Button size="sm" onClick={() => { setForm({ receive_date: new Date().toISOString().split("T")[0], customer_id: "", invoice_id: "", amount: 0, discount: 0, balance_due: 0, received_by: "", note: "", payment_method: "cash", status: "pending" }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Receive Bill
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>R.Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
                ) : filtered.map((c, i) => {
                  const cust = customers.find(x => x.id === c.customer_id);
                  const inv = invoices.find(x => x.id === c.invoice_id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{c.receive_date}</TableCell>
                      <TableCell className="font-medium">{cust?.customer_name || "—"}</TableCell>
                      <TableCell>{cust?.contact_person || "—"}</TableCell>
                      <TableCell>{cust?.mobile || "—"}</TableCell>
                      <TableCell>{inv?.invoice_no || "—"}</TableCell>
                      <TableCell className="text-right">৳{(c.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{(c.discount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{(c.balance_due || 0).toLocaleString()}</TableCell>
                      <TableCell>{c.received_by || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "approved" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {c.status !== "approved" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(c.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={6} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">৳{totalReceived.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDiscount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDue.toLocaleString()}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Receive Bill</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Receive Date</Label><Input type="date" value={form.receive_date} onChange={e => set("receive_date", e.target.value)} /></div>
            <div>
              <Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={v => set("customer_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice</Label>
              <Select value={form.invoice_id} onValueChange={v => set("invoice_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_no}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => set("amount", Number(e.target.value))} /></div>
            <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={e => set("discount", Number(e.target.value))} /></div>
            <div><Label>Balance Due</Label><Input type="number" value={form.balance_due} onChange={e => set("balance_due", Number(e.target.value))} /></div>
            <div><Label>Received By</Label><Input value={form.received_by} onChange={e => set("received_by", e.target.value)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => set("payment_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Note</Label><Input value={form.note} onChange={e => set("note", e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
