import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, Search, FileText, CheckCircle, AlertCircle, DollarSign, Wallet } from "lucide-react";
import { ReceiveBillDialog } from "@/components/bw-sale/ReceiveBillDialog";

export default function Invoices() {
  const nav = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      supabase.from("bw_sales_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, contact_person"),
    ]);
    setInvoices(iRes.data || []);
    setCustomers(cRes.data || []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const totals = useMemo(() => {
    const amount = invoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const due = Math.max(0, amount - paid);
    return { amount, paid, due };
  }, [invoices]);

  const paidCount = invoices.filter(i => i.status === "paid").length;
  const dueCount = invoices.filter(i => Number(i.total_amount || i.amount || 0) - Number(i.paid_amount || 0) > 0).length;

  const filtered = invoices.filter(i =>
    (i.invoice_no || "").toLowerCase().includes(search.toLowerCase()) ||
    (customers.find(c => c.id === i.customer_id)?.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice and all line items?")) return;
    const { error } = await supabase.from("bw_sales_invoices").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  const cards = [
    { label: "Total Invoiced", value: `৳${Math.round(totals.amount).toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
    { label: "Collected", value: `৳${Math.round(totals.paid).toLocaleString()}`, icon: CheckCircle, color: "text-green-600" },
    { label: "Due", value: `৳${Math.round(totals.due).toLocaleString()}`, icon: AlertCircle, color: "text-red-600" },
    { label: "Total Invoices", value: invoices.length, icon: FileText, color: "text-purple-600" },
    { label: "Paid", value: paidCount, icon: CheckCircle, color: "text-green-600" },
    { label: "With Due", value: dueCount, icon: AlertCircle, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-3 text-center">
              <c.icon className={`h-5 w-5 mx-auto mb-1 ${c.color}`} />
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Sales Invoices</CardTitle>
          <Button size="sm" onClick={() => nav("/dashboard/bw-sale/invoices/new")}><Plus className="h-4 w-4 mr-1" /> Create Invoice</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoice no / customer..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Bill No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Bill Month</TableHead>
                  <TableHead>Payment Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : filtered.map((inv) => {
                  const amount = Number(inv.total_amount || inv.amount || 0);
                  const paid = Number(inv.paid_amount || 0);
                  const due = Math.max(0, amount - paid);
                  const status = due <= 0 ? "paid" : (paid > 0 ? "partial" : "due");
                  return (
                    <TableRow key={inv.id}>
                      <TableCell><Link to={`/dashboard/bw-sale/invoices/${inv.id}`} className="text-primary hover:underline font-mono">{inv.invoice_no}</Link></TableCell>
                      <TableCell className="font-medium">{customers.find(c => c.id === inv.customer_id)?.customer_name || "—"}</TableCell>
                      <TableCell>{inv.billing_month || inv.month || "—"}</TableCell>
                      <TableCell>{inv.payment_due_date || "—"}</TableCell>
                      <TableCell className="text-right">৳{Math.round(amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{Math.round(paid).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{Math.round(Number(inv.discount || 0)).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">৳{Math.round(due).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={status === "paid" ? "default" : status === "partial" ? "secondary" : "destructive"}>
                          {status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Due"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {due > 0 && (
                            <Button variant="default" size="sm" className="h-7 px-2 text-xs" onClick={() => setPayOpen(true)}>
                              <Wallet className="h-3.5 w-3.5 mr-1" /> Pay
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link to={`/dashboard/bw-sale/invoices/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link to={`/dashboard/bw-sale/invoices/${inv.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ReceiveBillDialog open={payOpen} onOpenChange={setPayOpen} onSaved={fetchData} />
    </div>
  );
}
