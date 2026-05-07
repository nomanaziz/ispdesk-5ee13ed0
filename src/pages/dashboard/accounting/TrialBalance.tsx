import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { exportPDF, exportCSV, fmtMoney } from "@/lib/reportExport";
import { Download, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  expense: "Expense",
  income: "Income",
  liability: "Liabilities",
  equity: "Owner's Equity",
};
const ORDER = ["asset", "expense", "income", "liability", "equity"];
const DEBIT_TYPES = ["asset", "expense"];

export default function TrialBalance() {
  const [tillDate, setTillDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["trial-balance", tillDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("status", "active")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped: Record<string, any[]> = {};
  (accounts ?? []).forEach(a => {
    const t = (a.type || "asset").toLowerCase();
    (grouped[t] ||= []).push(a);
  });

  let totalDebit = 0, totalCredit = 0;
  const sectionTotals: Record<string, { debit: number; credit: number }> = {};
  ORDER.forEach(t => {
    const list = grouped[t] ?? [];
    const isDebit = DEBIT_TYPES.includes(t);
    let d = 0, c = 0;
    list.forEach(a => {
      const bal = Number(a.balance || 0);
      if (isDebit) d += bal; else c += bal;
    });
    sectionTotals[t] = { debit: d, credit: c };
    totalDebit += d; totalCredit += c;
  });

  const exportRows: any[] = [];
  ORDER.forEach(t => {
    const list = grouped[t] ?? [];
    if (!list.length) return;
    const isDebit = DEBIT_TYPES.includes(t);
    exportRows.push({ code: TYPE_LABELS[t], name: "", debit: "", credit: "" });
    list.forEach(a => {
      const bal = Number(a.balance || 0);
      exportRows.push({
        code: a.code, name: a.name,
        debit: isDebit ? fmtMoney(bal) : "",
        credit: !isDebit ? fmtMoney(bal) : "",
      });
    });
    exportRows.push({
      code: "", name: `Total ${TYPE_LABELS[t]}`,
      debit: isDebit ? fmtMoney(sectionTotals[t].debit) : "",
      credit: !isDebit ? fmtMoney(sectionTotals[t].credit) : "",
    });
  });
  exportRows.push({ code: "", name: "Grand Total", debit: fmtMoney(totalDebit), credit: fmtMoney(totalCredit) });
  const cols = [
    { key: "code", label: "Code" },
    { key: "name", label: "Account" },
    { key: "debit", label: "Debit (৳)" },
    { key: "credit", label: "Credit (৳)" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Trial Balance / ট্রায়াল ব্যালেন্স</h1>
          <p className="text-xs text-muted-foreground">Till {tillDate}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportPDF("Trial Balance", cols, exportRows)}>
            <FileText className="w-4 h-4 mr-1" /> Generate PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCSV("trial_balance", cols, exportRows)}>
            <Download className="w-4 h-4 mr-1" /> Generate CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Till Date</label>
            <Input type="date" value={tillDate} onChange={e => setTillDate(e.target.value)} className="w-[180px] h-9" />
          </div>
        </CardContent>
      </Card>

      {totalDebit !== totalCredit && !isLoading && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          ⚠️ Debit and Credit are not equal! Difference: ৳{fmtMoney(Math.abs(totalDebit - totalCredit))}
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="p-2 text-left border border-border w-[15%]">Code</th>
                  <th className="p-2 text-left border border-border">Account Name</th>
                  <th className="p-2 text-right border border-border w-[20%]">Debit (৳)</th>
                  <th className="p-2 text-right border border-border w-[20%]">Credit (৳)</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map(t => {
                  const list = grouped[t] ?? [];
                  if (!list.length) return null;
                  const isDebit = DEBIT_TYPES.includes(t);
                  const st = sectionTotals[t];
                  return (
                    <>
                      <tr key={`h-${t}`} className="bg-muted">
                        <td colSpan={4} className="p-2 border border-border font-bold uppercase text-xs tracking-wider">
                          {TYPE_LABELS[t]}
                        </td>
                      </tr>
                      {list.map(a => {
                        const bal = Number(a.balance || 0);
                        return (
                          <tr key={a.id} className="even:bg-muted/30">
                            <td className="p-2 border border-border font-mono text-xs">{a.code}</td>
                            <td className="p-2 border border-border">{a.name}</td>
                            <td className="p-2 border border-border text-right font-mono">{isDebit ? fmtMoney(bal) : "-"}</td>
                            <td className="p-2 border border-border text-right font-mono">{!isDebit ? fmtMoney(bal) : "-"}</td>
                          </tr>
                        );
                      })}
                      <tr className="font-semibold bg-muted/60">
                        <td colSpan={2} className="p-2 border border-border text-right">Total {TYPE_LABELS[t]}</td>
                        <td className="p-2 border border-border text-right font-mono">{isDebit ? fmtMoney(st.debit) : "-"}</td>
                        <td className="p-2 border border-border text-right font-mono">{!isDebit ? fmtMoney(st.credit) : "-"}</td>
                      </tr>
                    </>
                  );
                })}
                <tr className="font-bold bg-primary/10 text-base">
                  <td colSpan={2} className="p-2 border border-border">Grand Total</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalDebit)}</td>
                  <td className="p-2 border border-border text-right font-mono">৳{fmtMoney(totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
