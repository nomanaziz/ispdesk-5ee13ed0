import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Entry { date: string; type: "income" | "expense"; source: string; method: string; amount: number; reference?: string; }

export default function PopCashBook() {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const today = new Date();
  const [from, setFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));

  const { data: collections = [] } = useQuery({
    queryKey: ["cb-collections", branchId, from, to],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_collections")
        .select("id, amount, payment_method, transaction_id, created_at, clients!inner(name, branch_id)")
        .eq("clients.branch_id", branchId)
        .gte("created_at", `${from}T00:00:00`)
        .lte("created_at", `${to}T23:59:59`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: incomes = [] } = useQuery({
    queryKey: ["cb-income", branchId, from, to],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase.from("income_entries").select("*").eq("branch_id", branchId).gte("income_date", from).lte("income_date", to).order("income_date");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["cb-expense", branchId, from, to],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_entries").select("*").eq("branch_id", branchId).gte("expense_date", from).lte("expense_date", to).order("expense_date");
      if (error) throw error;
      return data || [];
    },
  });

  const ledger: Entry[] = useMemo(() => {
    const all: Entry[] = [];
    for (const r of collections as any[]) all.push({ date: format(new Date(r.created_at), "yyyy-MM-dd"), type: "income", source: `Bill: ${r.clients?.name || ""}`, method: r.payment_method || "cash", amount: Number(r.amount) || 0, reference: r.transaction_id });
    for (const r of incomes as any[]) all.push({ date: r.income_date, type: "income", source: r.source || "Manual", method: r.payment_method || "cash", amount: Number(r.amount) || 0, reference: r.reference });
    for (const r of expenses as any[]) all.push({ date: r.expense_date, type: "expense", source: r.category || "Expense", method: r.payment_method || "cash", amount: Number(r.amount) || 0, reference: r.reference });
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }, [collections, incomes, expenses]);

  const totalIn = ledger.filter(l => l.type === "income").reduce((s, l) => s + l.amount, 0);
  const totalOut = ledger.filter(l => l.type === "expense").reduce((s, l) => s + l.amount, 0);
  const balance = totalIn - totalOut;

  if (!branchId) return <Card><CardContent className="p-8 text-center text-muted-foreground">Branch assign করা নেই</CardContent></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Cash Book</h1>
          <p className="text-sm text-muted-foreground">Income এবং Expense একসাথে</p>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end gap-2 text-sm">
            <span className="text-muted-foreground">{ledger.length} entries</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">মোট Income</div><div className="text-2xl font-bold text-emerald-600">৳ {totalIn.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">মোট Expense</div><div className="text-2xl font-bold text-rose-600">৳ {totalOut.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Closing Balance</div><div className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>৳ {balance.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ledger ({from} → {to})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>তারিখ</TableHead><TableHead>Type</TableHead><TableHead>Source / Category</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Income</TableHead><TableHead className="text-right">Expense</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">এই date range-এ কোনো entry নেই</TableCell></TableRow>}
              {ledger.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.date}</TableCell>
                  <TableCell><Badge variant={l.type === "income" ? "default" : "destructive"}>{l.type}</Badge></TableCell>
                  <TableCell>{l.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.method}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">{l.type === "income" ? `৳ ${l.amount.toLocaleString()}` : "—"}</TableCell>
                  <TableCell className="text-right font-medium text-rose-600">{l.type === "expense" ? `৳ ${l.amount.toLocaleString()}` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {ledger.length > 0 && (
              <TableBody>
                <TableRow className="font-bold border-t-2">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right text-emerald-600">৳ {totalIn.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-rose-600">৳ {totalOut.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell colSpan={4}>Net Balance</TableCell>
                  <TableCell colSpan={2} className={`text-right ${balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>৳ {balance.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
