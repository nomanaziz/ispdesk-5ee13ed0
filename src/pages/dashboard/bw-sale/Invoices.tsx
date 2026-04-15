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
import { Plus, Eye, Pencil, Trash2, Search, ChevronDown, ChevronUp, DollarSign, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ invoice_no: "", month: "", customer_id: "", contact_person: "", amount: 0, paid_amount: 0, discount: 0, due: 0, status: "unpaid", created_by: "" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      supabase.from("bw_sales_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, contact_person"),
    ]);
    if (iRes.data) setInvoices(iRes.data);
    if (cRes.data) setCustomers(cRes.data);
    setLoading(false);
  }

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + (i.due || 0), 0);
  const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0);
  const paidCount = invoices.filter(i => i.status === "paid").length;
  const dueCount = invoices.filter(i => i.status === "due" || (i.due && i.due > 0 && i.status !== "paid")).length;
  const unpaidCount = invoices.filter(i => i.status === "unpaid").length;

  const filtered = invoices.filter(i =>
    (i.invoice_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (i.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
    customers.find(c => c.id === i.customer_id)?.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditId(null);
    setForm({ invoice_no: "", month: "", customer_id: "", contact_person: "", amount: 0, paid_amount: 0, discount: 0, due: 0, status: "unpaid", created_by: "" });
    setDialogOpen(true);
  }

  function openEdit(inv: any) {
    setEditId(inv.id);
    setForm({
      invoice_no: inv.invoice_no || "", month: inv.month || "", customer_id: inv.customer_id || "",
      contact_person: inv.contact_person || "", amount: inv.amount || 0, paid_amount: inv.paid_amount || 0,
      discount: inv.discount || 0, due: inv.due || 0, status: inv.status || "unpaid", created_by: inv.created_by || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.invoice_no.trim()) { toast.error("Invoice No is required"); return; }
    const payload: any = { ...form };
    if (!payload.customer_id) payload.customer_id = null;
    payload.due = (payload.amount || 0) - (payload.paid_amount || 0) - (payload.discount || 0);

    if (editId) {
      const { error } = await supabase.from("bw_sales_invoices").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Invoice updated");
    } else {
      const { error } = await supabase.from("bw_sales_invoices").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Invoice created");
    }
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this invoice?")) return;
    const { error } = await supabase.from("bw_sales_invoices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchData(); }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const summaryCards = [
    { label: "Total Sales Amount", value: `৳${totalAmount.toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
    { label: "Collected", value: `৳${totalPaid.toLocaleString()}`, icon: CheckCircle, color: "text-green-600" },
    { label: "Due", value: `৳${totalDue.toLocaleString()}`, icon: AlertCircle, color: "text-red-600" },
    { label: "Discount", value: `৳${totalDiscount.toLocaleString()}`, icon: DollarSign, color: "text-orange-600" },
    { label: "Total Invoice", value: invoices.length, icon: FileText, color: "text-purple-600" },
    { label: "Paid Invoice", value: paidCount, icon: CheckCircle, color: "text-green-600" },
    { label: "Due Invoice", value: dueCount, icon: AlertCircle, color: "text-amber-600" },
    { label: "Unpaid Invoice", value: unpaidCount, icon: FileText, color: "text-red-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer" onClick={() => setShowSummary(!showSummary)}>
          <CardTitle className="text-lg">Invoice Summary</CardTitle>
          {showSummary ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardHeader>
        {showSummary && (
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {summaryCards.map(c => (
                <div key={c.label} className="rounded-lg border p-3 text-center">
                  <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-lg font-semibold">{c.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Sales Invoices</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Create Invoice</Button>
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
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : filtered.map((inv, i) => (
                  <TableRow key={inv.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{customers.find(c => c.id === inv.customer_id)?.customer_name || "—"}</TableCell>
                    <TableCell>{inv.contact_person || "—"}</TableCell>
                    <TableCell>{inv.invoice_no}</TableCell>
                    <TableCell>{inv.month || "—"}</TableCell>
                    <TableCell className="text-right">৳{(inv.amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.paid_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.discount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{(inv.due || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "paid" ? "default" : inv.status === "due" ? "secondary" : "destructive"}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inv)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={5} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">৳{totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDiscount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totalDue.toLocaleString()}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} Invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Invoice No *</Label><Input value={form.invoice_no} onChange={e => set("invoice_no", e.target.value)} /></div>
            <div><Label>Month</Label><Input type="month" value={form.month} onChange={e => set("month", e.target.value)} /></div>
            <div>
              <Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={v => { set("customer_id", v); const c = customers.find(x => x.id === v); if (c) set("contact_person", c.contact_person || ""); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => set("amount", Number(e.target.value))} /></div>
            <div><Label>Paid Amount</Label><Input type="number" value={form.paid_amount} onChange={e => set("paid_amount", Number(e.target.value))} /></div>
            <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={e => set("discount", Number(e.target.value))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editId ? "Update" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
