import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDate, fmtMoney } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

export default function PopFinancial() {
  const { branchId } = usePopScope();
  const [f, setF] = useState({
    type: "all",
    month: new Date().toISOString().slice(0, 7),
  });
  const [a, setA] = useState(f);

  const monthStart = `${a.month}-01`;
  const nextMonth = (() => { const d = new Date(`${a.month}-01`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); })();

  const { data: incomes = [], isLoading: li } = useQuery({
    queryKey: ["pop-fin-income", branchId, a.month],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase.from("income_entries").select("*")
        .eq("branch_id", branchId!)
        .gte("income_date", monthStart).lt("income_date", nextMonth)
        .order("income_date", { ascending: false });
      return (data ?? []).map(d => ({ ...d, txn_type: "income" as const, txn_date: d.income_date, txn_amount: Number(d.amount) }));
    },
  });

  const { data: expenses = [], isLoading: le } = useQuery({
    queryKey: ["pop-fin-expense", branchId, a.month],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase.from("expense_entries").select("*")
        .eq("branch_id", branchId!)
        .gte("expense_date", monthStart).lt("expense_date", nextMonth)
        .order("expense_date", { ascending: false });
      return (data ?? []).map(d => ({ ...d, txn_type: "expense" as const, txn_date: d.expense_date, txn_amount: Number(d.amount) }));
    },
  });

  const rows = useMemo(() => {
    const all = [...incomes, ...expenses].sort((x, y) => (y.txn_date || "").localeCompare(x.txn_date || ""));
    return (a.type === "all" ? all : all.filter(t => t.txn_type === a.type)).map((t, i) => ({
      id: t.id,
      sn: i + 1,
      date: t.txn_date,
      type: t.txn_type,
      description: t.description || "-",
      payment_method: t.payment_method || "-",
      income: t.txn_type === "income" ? t.txn_amount : 0,
      expense: t.txn_type === "expense" ? t.txn_amount : 0,
    }));
  }, [incomes, expenses, a.type]);

  const totals = useMemo(() => ({
    income: rows.reduce((s, r) => s + r.income, 0),
    expense: rows.reduce((s, r) => s + r.expense, 0),
  }), [rows]);
  const net = totals.income - totals.expense;

  return (
    <ReportLayout
      title="Financial Transaction Report"
      breadcrumb="Report > Financial"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><Label className="text-xs">Month</Label><Input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} className="h-9" /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex justify-end items-end">
              <Button onClick={() => setA({ ...f })} className="h-9">Apply Filters</Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-lg font-bold text-success">৳ {totals.income.toLocaleString()}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="text-lg font-bold text-destructive">৳ {totals.expense.toLocaleString()}</p>
            </div>
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={`text-lg font-bold ${net >= 0 ? "text-success" : "text-destructive"}`}>৳ {net.toLocaleString()}</p>
            </div>
          </div>
        </div>
      }
      columns={[
        { key: "sn", label: "SN" },
        { key: "date", label: "Date", format: fmtDate },
        {
          key: "type", label: "Type",
          format: (v: string) => <Badge variant={v === "income" ? "default" : "destructive"}>{v}</Badge> as any,
        },
        { key: "description", label: "Description" },
        { key: "payment_method", label: "Payment Method" },
        { key: "income", label: "Income", align: "right", format: (v) => v ? fmtMoney(v) : "-" },
        { key: "expense", label: "Expense", align: "right", format: (v) => v ? fmtMoney(v) : "-" },
      ]}
      rows={rows}
      loading={li || le}
      totalsRow={{ sn: "Total", income: fmtMoney(totals.income), expense: fmtMoney(totals.expense) }}
      rowKey={(r) => r.id}
    />
  );
}
