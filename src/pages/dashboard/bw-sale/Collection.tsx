import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, Search } from "lucide-react";
import { ReceiveBillDialog } from "@/components/bw-sale/ReceiveBillDialog";

export default function Collection() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openDlg, setOpenDlg] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, cRes, iRes] = await Promise.all([
      supabase.from("bw_sale_payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, contact_person, mobile"),
      supabase.from("bw_sales_invoices").select("id, invoice_no, billing_month, month, total_amount, amount"),
    ]);
    setPayments(pRes.data || []);
    setCustomers(cRes.data || []);
    setInvoices(iRes.data || []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => payments.filter(p => {
    const cust = customers.find(c => c.id === p.customer_id);
    const inv = invoices.find(i => i.id === p.invoice_id);
    if (customerFilter !== "all" && p.customer_id !== customerFilter) return false;
    if (statusFilter === "approved" && !p.approved) return false;
    if (statusFilter === "pending" && p.approved) return false;
    if (from && p.payment_date < from) return false;
    if (to && p.payment_date > to) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(cust?.customer_name || "").toLowerCase().includes(s) &&
          !(inv?.invoice_no || "").toLowerCase().includes(s) &&
          !(p.receipt_no || "").toLowerCase().includes(s)) return false;
    }
    return true;
  }), [payments, customers, invoices, customerFilter, statusFilter, from, to, search]);

  const totals = useMemo(() => {
    const received = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);
    const discount = filtered.reduce((s, p) => s + Number(p.discount || 0), 0);
    return { received, discount };
  }, [filtered]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map(p => p.id)) : new Set());
  };
  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const approveSelected = async () => {
    if (selected.size === 0) { toast.error("Select rows"); return; }
    const { error } = await supabase.from("bw_sale_payments")
      .update({ approved: true, approved_at: new Date().toISOString() })
      .in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success(`${selected.size} approved`);
    setSelected(new Set());
    fetchData();
  };

  const deleteSelected = async () => {
    if (selected.size === 0) { toast.error("Select rows"); return; }
    if (!confirm(`Delete ${selected.size} payment(s)?`)) return;
    const { error } = await supabase.from("bw_sale_payments").delete().in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    setSelected(new Set());
    fetchData();
  };

  const approveOne = async (id: string) => {
    const { error } = await supabase.from("bw_sale_payments").update({ approved: true, approved_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Approved"); fetchData(); }
  };

  const deleteOne = async (id: string) => {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("bw_sale_payments").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  const exportCsv = () => {
    const rows = [["Date","Company","Mobile","Invoice","Bill Month","Received","Discount","Receipt","Method","Status"]];
    filtered.forEach(p => {
      const c = customers.find(x => x.id === p.customer_id);
      const i = invoices.find(x => x.id === p.invoice_id);
      rows.push([p.payment_date, c?.customer_name || "", c?.mobile || "", i?.invoice_no || "", i?.billing_month || i?.month || "", String(p.amount || 0), String(p.discount || 0), p.receipt_no || "", p.payment_method || "", p.approved ? "Approved" : "Pending"]);
    });
    const csv = rows.map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bill-collection-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Bill Collection</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv}>CSV</Button>
              <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={deleteSelected}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete ({selected.size})
              </Button>
              <Button size="sm" variant="outline" disabled={selected.size === 0} onClick={approveSelected}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve ({selected.size})
              </Button>
              <Button size="sm" onClick={() => setOpenDlg(true)}><Plus className="h-4 w-4 mr-1" /> Receive Bill</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="POP / Customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All POP / Customer</SelectItem>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="h-9" placeholder="From" value={from} onChange={e => setFrom(e.target.value)} />
            <Input type="date" className="h-9" placeholder="To" value={to} onChange={e => setTo(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={(v) => toggleAll(!!v)} />
                  </TableHead>
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>R.Date</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Bill Month</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center py-8 text-muted-foreground">No records</TableCell></TableRow>
                ) : filtered.map((p, i) => {
                  const cust = customers.find(x => x.id === p.customer_id);
                  const inv = invoices.find(x => x.id === p.invoice_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} /></TableCell>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell className="font-medium">{cust?.customer_name || "—"}</TableCell>
                      <TableCell>{cust?.contact_person || "—"}</TableCell>
                      <TableCell>{cust?.mobile || "—"}</TableCell>
                      <TableCell>
                        {inv ? <Link className="text-primary hover:underline font-mono" to={`/dashboard/bw-sale/invoices/${inv.id}`}>{inv.invoice_no}</Link> : "—"}
                      </TableCell>
                      <TableCell>{inv?.billing_month || inv?.month || "—"}</TableCell>
                      <TableCell className="text-right">৳{Number(p.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{Number(p.discount || 0).toLocaleString()}</TableCell>
                      <TableCell>{p.receipt_no || "—"}</TableCell>
                      <TableCell className="capitalize">{p.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant={p.approved ? "default" : "secondary"}>{p.approved ? "Approved" : "Pending"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {!p.approved && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => approveOne(p.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOne(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {filtered.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={8} className="text-right">মোট ({filtered.length} টি):</TableCell>
                    <TableCell className="text-right">৳{totals.received.toLocaleString()}</TableCell>
                    <TableCell className="text-right">৳{totals.discount.toLocaleString()}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <ReceiveBillDialog open={openDlg} onOpenChange={setOpenDlg} onSaved={fetchData} />
    </div>
  );
}
