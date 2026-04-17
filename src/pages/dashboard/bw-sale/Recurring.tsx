import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Recurring() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsByRec, setItemsByRec] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [rRes, cRes, iRes] = await Promise.all([
      supabase.from("bw_sale_recurring_invoices").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sale_customers").select("id, customer_name, mobile"),
      supabase.from("bw_sale_recurring_items").select("*"),
    ]);
    setItems(rRes.data || []);
    setCustomers(cRes.data || []);
    const map: Record<string, any[]> = {};
    (iRes.data || []).forEach((it: any) => { (map[it.recurring_id] ||= []).push(it); });
    setItemsByRec(map);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const totals = useMemo(() => {
    let total = 0;
    items.forEach(r => {
      const rows = itemsByRec[r.id] || [];
      total += rows.reduce((s, it) => s + (Number(it.quantity) * Number(it.rate) * (1 + Number(it.vat_pct || 0) / 100)), 0);
    });
    return total;
  }, [items, itemsByRec]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring template?")) return;
    const { error } = await supabase.from("bw_sale_recurring_invoices").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchData(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Recurring Invoices</CardTitle>
          <Button size="sm" onClick={() => nav("/dashboard/bw-sale/recurring/new")}><Plus className="h-4 w-4 mr-1" /> New Recurring</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>POP / Customer</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Repeat Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bill Amount</TableHead>
                  <TableHead className="w-24 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No recurring templates</TableCell></TableRow>
                ) : items.map((r, i) => {
                  const c = customers.find(x => x.id === r.customer_id);
                  const rows = itemsByRec[r.id] || [];
                  const amount = rows.reduce((s, it) => s + (Number(it.quantity) * Number(it.rate) * (1 + Number(it.vat_pct || 0) / 100)), 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <Link to={`/dashboard/bw-sale/pop/${r.customer_id}`} className="text-primary hover:underline">{c?.customer_name || "—"}</Link>
                      </TableCell>
                      <TableCell>{r.start_date || "—"}</TableCell>
                      <TableCell>{r.end_date || "—"}</TableCell>
                      <TableCell className="text-right">{r.repeat_day}</TableCell>
                      <TableCell><Badge variant={r.status === "enabled" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell className="text-right">৳{Math.round(amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7"><Link to={`/dashboard/bw-sale/recurring/${r.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={6} className="text-right">Monthly Total:</TableCell>
                    <TableCell className="text-right">৳{Math.round(totals).toLocaleString()}</TableCell>
                    <TableCell />
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
