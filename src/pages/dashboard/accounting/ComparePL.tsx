import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { exportPDF, exportCSV, fmtMoney } from "@/lib/reportExport";
import { Download, FileText, Search, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const lastMonthStart = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1); return d.toISOString().slice(0, 10); };
const lastMonthEnd = () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); };

type Filters = { from1: string; to1: string; from2: string; to2: string };

export default function ComparePL() {
  const [from1, setFrom1] = useState(monthStart());
  const [to1, setTo1] = useState(todayStr());
  const [from2, setFrom2] = useState(lastMonthStart());
  const [to2, setTo2] = useState(lastMonthEnd());
  const [f, setF] = useState<Filters>({ from1: monthStart(), to1: todayStr(), from2: lastMonthStart(), to2: lastMonthEnd() });

  const { data, isLoading } = useQuery({
    queryKey: ["compare-pl", f],
    queryFn: async () => {
      const fetch = async (kind: "income" | "expense", from: string, to: string) => {
        const tbl = kind === "income" ? "income_entries" : "expense_entries";
        const dateCol = kind === "income" ? "income_date" : "expense_date";
        const { data } = await supabase.from(tbl).select(`account_id, amount, source, category`).gte(dateCol, from).lte(dateCol, to);
        return data ?? [];
      };
      const [accts, i1, i2, e1, e2] = await Promise.all([
        supabase.from("chart_of_accounts").select("id,name,type,code"),
        fetch("income", f.from1, f.to1),
        fetch("income", f.from2, f.to2),
        fetch("expense", f.from1, f.to1),
        fetch("expense", f.from2, f.to2),
      ]);
      return { accounts: accts.data ?? [], i1, i2, e1, e2 };
    },
  });

  const aggregate = (rows: any[], kind: "income" | "expense") => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const key = r.account_id || (kind === "income" ? (r.source || "Other Income") : (r.category || "Other Expense"));
      map.set(key, (map.get(key) ?? 0) + Number(r.amount || 0));
    });
    return map;
  };

  const accounts = data?.accounts ?? [];
  const acctById = new Map(accounts.map(a => [a.id, a]));
  const labelFor = (key: string) => acctById.get(key)?.name ?? key;

  const inc1 = aggregate(data?.i1 ?? [], "income");
  const inc2 = aggregate(data?.i2 ?? [], "income");
  const exp1 = aggregate(data?.e1 ?? [], "expense");
  const exp2 = aggregate(data?.e2 ?? [], "expense");

  const incomeKeys = Array.from(new Set([...inc1.keys(), ...inc2.keys()]));
  const expenseKeys = Array.from(new Set([...exp1.keys(), ...exp2.keys()]));

  const totalInc1 = Array.from(inc1.values()).reduce((s, v) => s + v, 0);
  const totalInc2 = Array.from(inc2.values()).reduce((s, v) => s + v, 0);
  const totalExp1 = Array.from(exp1.values()).reduce((s, v) => s + v, 0);
  const totalExp2 = Array.from(exp2.values()).reduce((s, v) => s + v, 0);
  const profit1 = totalInc1 - totalExp1;
  const profit2 = totalInc2 - totalExp2;
  const change = profit1 - profit2;
  const changePct = profit2 !== 0 ? (change / Math.abs(profit2)) * 100 : 0;

  const apply = () => setF({ from1, to1, from2, to2 });
  const clear = () => {
    setFrom1(monthStart()); setTo1(todayStr()); setFrom2(lastMonthStart()); setTo2(lastMonthEnd());
    setF({ from1: monthStart(), to1: todayStr(), from2: lastMonthStart(), to2: lastMonthEnd() });
  };

  const buildExportRows = () => {
    const rows: any[] = [];
    const pushSection = (title: string, keys: string[], m1: Map<string, number>, m2: Map<string, number>) => {
      rows.push({ p: title, a: "", b: "", c: "", d: "" });
      keys.forEach(k => {
        const v1 = m1.get(k) ?? 0, v2 = m2.get(k) ?? 0;
        const ch = v1 - v2; const pct = v2 !== 0 ? (ch / Math.abs(v2)) * 100 : 0;
        rows.push({ p: labelFor(k), a: fmtMoney(v1), b: fmtMoney(v2), c: fmtMoney(ch), d: pct.toFixed(2) + "%" });
      });
    };
    pushSection("Income", incomeKeys, inc1, inc2);
    rows.push({ p: "Total Income", a: fmtMoney(totalInc1), b: fmtMoney(totalInc2), c: fmtMoney(totalInc1 - totalInc2), d: "" });
    pushSection("Expense", expenseKeys, exp1, exp2);
    rows.push({ p: "Total Expense", a: fmtMoney(totalExp1), b: fmtMoney(totalExp2), c: fmtMoney(totalExp1 - totalExp2), d: "" });
    rows.push({ p: "Net Profit", a: fmtMoney(profit1), b: fmtMoney(profit2), c: fmtMoney(change), d: changePct.toFixed(2) + "%" });
    return rows;
  };
  const cols = [
    { key: "p", label: "Particular" },
    { key: "a", label: `${f.from1} to ${f.to1}` },
    { key: "b", label: `${f.from2} to ${f.to2}` },
    { key: "c", label: "Change" },
    { key: "d", label: "Change %" },
  ];

  const renderRow = (key: string, m1: Map<string, number>, m2: Map<string, number>) => {
    const v1 = m1.get(key) ?? 0, v2 = m2.get(key) ?? 0;
    const ch = v1 - v2; const pct = v2 !== 0 ? (ch / Math.abs(v2)) * 100 : 0;
    return (
      <tr key={key} className="even:bg-muted/30">
        <td className="p-2 border border-border pl-6">{labelFor(key)}</td>
        <td className="p-2 border border-border text-right font-mono">{fmtMoney(v1)}</td>
        <td className="p-2 border border-border text-right font-mono">{fmtMoney(v2)}</td>
        <td className={`p-2 border border-border text-right font-mono ${ch >= 0 ? "text-green-600" : "text-destructive"}`}>{fmtMoney(ch)}</td>
        <td className={`p-2 border border-border text-right font-mono ${ch >= 0 ? "text-green-600" : "text-destructive"}`}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Compare Profit &amp; Loss / লাভ-ক্ষতি তুলনা</h1>
          <p className="text-muted-foreground text-sm">Period vs Compare Period</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportPDF("Compare Profit Loss", cols, buildExportRows())}>
            <FileText className="w-4 h-4 mr-1" /> Generate PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCSV("compare_pl", cols, buildExportRows())}>
            <Download className="w-4 h-4 mr-1" /> Generate CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1"><label className="text-xs font-medium">From Date</label><Input type="date" value={from1} onChange={e => setFrom1(e.target.value)} className="w-[160px] h-9" /></div>
          <div className="flex flex-col gap-1"><label className="text-xs font-medium">To Date</label><Input type="date" value={to1} onChange={e => setTo1(e.target.value)} className="w-[160px] h-9" /></div>
          <div className="flex flex-col gap-1"><label className="text-xs font-medium">Compare From</label><Input type="date" value={from2} onChange={e => setFrom2(e.target.value)} className="w-[160px] h-9" /></div>
          <div className="flex flex-col gap-1"><label className="text-xs font-medium">Compare To</label><Input type="date" value={to2} onChange={e => setTo2(e.target.value)} className="w-[160px] h-9" /></div>
          <Button size="sm" onClick={apply}><Search className="w-4 h-4 mr-1" /> Update</Button>
          <Button size="sm" variant="outline" onClick={clear}><RotateCcw className="w-4 h-4 mr-1" /> Clear</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Net Profit For Date</p>
          <p className={`text-2xl font-bold ${profit1 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{fmtMoney(profit1)}</p>
          <p className="text-xs text-muted-foreground mt-1">{f.from1} → {f.to1}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Net Profit For Compare Date</p>
          <p className={`text-2xl font-bold ${profit2 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{fmtMoney(profit2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{f.from2} → {f.to2}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Change In Net Profit</p>
          <p className={`text-2xl font-bold flex items-center gap-2 ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
            {change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            ৳{fmtMoney(change)}
          </p>
          <p className={`text-xs mt-1 ${change >= 0 ? "text-green-600" : "text-destructive"}`}>{changePct.toFixed(2)}%</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-2 text-left border border-border">Particular</th>
                  <th className="p-2 text-right border border-border w-[18%]">{f.from1} → {f.to1}</th>
                  <th className="p-2 text-right border border-border w-[18%]">{f.from2} → {f.to2}</th>
                  <th className="p-2 text-right border border-border w-[15%]">Change</th>
                  <th className="p-2 text-right border border-border w-[12%]">Change %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-muted"><td colSpan={5} className="p-2 border border-border font-bold uppercase text-xs tracking-wider">Income</td></tr>
                {incomeKeys.length === 0 ? (
                  <tr><td colSpan={5} className="p-3 text-center text-muted-foreground border border-border">No income entries</td></tr>
                ) : incomeKeys.map(k => renderRow(k, inc1, inc2))}
                <tr className="font-semibold bg-muted/60">
                  <td className="p-2 border border-border">Total Income</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalInc1)}</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalInc2)}</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalInc1 - totalInc2)}</td>
                  <td className="p-2 border border-border" />
                </tr>

                <tr className="bg-muted"><td colSpan={5} className="p-2 border border-border font-bold uppercase text-xs tracking-wider">Expense</td></tr>
                {expenseKeys.length === 0 ? (
                  <tr><td colSpan={5} className="p-3 text-center text-muted-foreground border border-border">No expense entries</td></tr>
                ) : expenseKeys.map(k => renderRow(k, exp1, exp2))}
                <tr className="font-semibold bg-muted/60">
                  <td className="p-2 border border-border">Total Expense</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalExp1)}</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalExp2)}</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalExp1 - totalExp2)}</td>
                  <td className="p-2 border border-border" />
                </tr>

                <tr className="font-bold bg-primary/10 text-base">
                  <td className="p-2 border border-border">Net Profit</td>
                  <td className={`p-2 border border-border text-right font-mono ${profit1 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{fmtMoney(profit1)}</td>
                  <td className={`p-2 border border-border text-right font-mono ${profit2 >= 0 ? "text-green-600" : "text-destructive"}`}>৳{fmtMoney(profit2)}</td>
                  <td className={`p-2 border border-border text-right font-mono ${change >= 0 ? "text-green-600" : "text-destructive"}`}>৳{fmtMoney(change)}</td>
                  <td className={`p-2 border border-border text-right font-mono ${change >= 0 ? "text-green-600" : "text-destructive"}`}>{changePct.toFixed(2)}%</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
