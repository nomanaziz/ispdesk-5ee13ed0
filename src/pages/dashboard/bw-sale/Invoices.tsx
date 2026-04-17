import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Eye, Pencil, Trash2, Search, ChevronDown, ChevronUp, DollarSign, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function Invoices() {
  const nav = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsByInvoice, setItemsByInvoice] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [iRes, cRes, itRes] = await Promise.all([
      supabase.from("bw_sales_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, contact_person"),
      supabase.from("bw_invoice_items").select("*").order("sort_order"),
    ]);
    setInvoices(iRes.data || []);
    setCustomers(cRes.data || []);
    const map: Record<string, any[]> = {};
    (itRes.data || []).forEach((it: any) => {
      (map[it.invoice_id] ||= []).push(it);
    });
    setItemsByInvoice(map);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const totals = useMemo(() => {
    const amount = invoices.reduce((s, i) => s + Number(i.total_amount || i.amount || 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paid_amount || 0), 0);
    const discount = invoices.reduce((s, i) => s + Number(i.discount || 0), 0);
    const due = invoices.reduce((s, i) => s + Math.max(0, Number(i.total_amount || i.amount || 0) - Number(i.paid_amount || 0) - Number(i.discount || 0)), 0);
    return { amount, paid, discount, due };
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

  const summaryCards = [
    { label: "Total Invoiced", value: `৳${Math.round(totals.amount).toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
    { label: "Collected", value: `৳${Math.round(totals.paid).toLocaleString()}`, icon: CheckCircle, color: "text-green-600" },
    { label: "Due", value: `৳${Math.round(totals.due).toLocaleString()}`, icon: AlertCircle, color: "text-red-600" },
    { label: "Discount", value: `৳${Math.round(totals.discount).toLocaleString()}`, icon: DollarSign, color: "text-orange-600" },
    { label: "Total Invoices", value: invoices.length, icon: FileText, color: "text-purple-600" },
    { label: "Paid", value: paidCount, icon: CheckCircle, color: "text-green-600" },
    { label: "With Due", value: dueCount, icon: AlertCircle, color: "text-amber-600" },
    { label: "Avg Items/Inv", value: invoices.length ? Math.round(Object.values(itemsByInvoice).reduce((s, a) => s + a.length, 0) / invoices.length) : 0, icon: FileText, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-4">
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
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : filtered.map((inv) => {
                  const its = itemsByInvoice[inv.id] || [];
                  const amount = Number(inv.total_amount || inv.amount || 0);
                  const due = Math.max(0, amount - Number(inv.paid_amount || 0));
                  const isOpen = expanded === inv.id;
                  return (
                    <>
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(isOpen ? null : inv.id)}>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell><Link to={`/dashboard/bw-sale/invoices/${inv.id}`} className="text-primary hover:underline font-mono">{inv.invoice_no}</Link></TableCell>
                        <TableCell className="font-medium">{customers.find(c => c.id === inv.customer_id)?.customer_name || "—"}</TableCell>
                        <TableCell>{inv.month || "—"}</TableCell>
                        <TableCell className="text-right">{its.length}</TableCell>
                        <TableCell className="text-right">৳{Math.round(amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right">৳{Math.round(Number(inv.paid_amount || 0)).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">৳{Math.round(due).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={due > 0 ? "destructive" : "default"}>{due > 0 ? "Due" : "Paid"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link to={`/dashboard/bw-sale/invoices/${inv.id}`}><Eye className="h-3.5 w-3.5" /></Link></Button>
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link to={`/dashboard/bw-sale/invoices/${inv.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={10} className="py-2">
                            {its.length === 0 ? <div className="text-xs text-muted-foreground px-4">No line items</div> : (
                              <div className="px-4">
                                <div className="text-xs font-semibold mb-2">Service Breakdown</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="h-8">Service</TableHead>
                                      <TableHead className="h-8 text-right">Mbps</TableHead>
                                      <TableHead className="h-8 text-right">Rate</TableHead>
                                      <TableHead className="h-8">Period</TableHead>
                                      <TableHead className="h-8 text-right">Days</TableHead>
                                      <TableHead className="h-8 text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {its.map(it => (
                                      <TableRow key={it.id}>
                                        <TableCell className="py-1">{it.service_name}</TableCell>
                                        <TableCell className="py-1 text-right">{Number(it.bandwidth_mbps)}</TableCell>
                                        <TableCell className="py-1 text-right">৳{Number(it.rate).toLocaleString()}</TableCell>
                                        <TableCell className="py-1">{it.period_start} → {it.period_end}</TableCell>
                                        <TableCell className="py-1 text-right">{it.days}/{it.total_days_in_month}</TableCell>
                                        <TableCell className="py-1 text-right font-semibold">৳{Math.round(Number(it.amount)).toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
