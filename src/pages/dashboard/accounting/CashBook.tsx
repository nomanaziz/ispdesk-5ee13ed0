import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { exportPDF, exportCSV, fmtMoney } from "@/lib/reportExport";
import { Download, FileText, RotateCcw, Search } from "lucide-react";

type Range = { from: string; to: string };

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStartStr = () => {
  const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
};

export default function CashBook() {
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [applied, setApplied] = useState<Range>({ from: monthStartStr(), to: todayStr() });

  const { data, isLoading } = useQuery({
    queryKey: ["cashbook", applied.from, applied.to],
    queryFn: async () => {
      const f = applied.from, t = applied.to;
      const sum = (rows: any[] | null, key: string) => (rows ?? []).reduce((s, r) => s + Number(r[key] || 0), 0);

      const [billColl, instFee, svcInv, prodInv, bwSale, income, payroll, expense, bwBuy, purchase] = await Promise.all([
        supabase.from("bill_collections").select("amount").gte("created_at", f).lte("created_at", `${t}T23:59:59`),
        supabase.from("installation_fees").select("paid").gte("fee_date", f).lte("fee_date", t),
        supabase.from("service_invoices").select("paid_amount").gte("issued_date", f).lte("issued_date", t),
        supabase.from("product_invoices").select("paid_amount").gte("issued_date", f).lte("issued_date", t),
        supabase.from("bw_sales_invoices").select("paid_amount").gte("issued_date", f).lte("issued_date", t),
        supabase.from("income_entries").select("amount").gte("income_date", f).lte("income_date", t),
        supabase.from("payroll").select("net_salary").eq("status", "paid").gte("paid_at", f).lte("paid_at", `${t}T23:59:59`),
        supabase.from("expense_entries").select("amount").gte("expense_date", f).lte("expense_date", t),
        supabase.from("bw_purchase_bills").select("paid").gte("created_at", f).lte("created_at", `${t}T23:59:59`),
        supabase.from("purchase_bills").select("paid_amount").gte("issued_date", f).lte("issued_date", t).then(r => r, () => ({ data: [] as any[] })),
      ]);

      return {
        debit: {
          collected: sum(billColl.data, "amount"),
          installation: sum(instFee.data, "paid"),
          service: sum(svcInv.data, "paid_amount"),
          product: sum(prodInv.data, "paid_amount"),
          popBill: 0,
          bwPop: sum(bwSale.data, "paid_amount"),
          income: sum(income.data, "amount"),
        },
        credit: {
          salary: sum(payroll.data, "net_salary"),
          expense: sum(expense.data, "amount"),
          bwProvider: sum(bwBuy.data, "paid"),
          withdraw: 0,
          purchase: sum((purchase as any).data, "paid_amount"),
        },
      };
    },
  });

  const debitRows = [
    { label: "Collected Bill", value: data?.debit.collected ?? 0 },
    { label: "Installation Charge", value: data?.debit.installation ?? 0 },
    { label: "Other Service Sales", value: data?.debit.service ?? 0 },
    { label: "Product Sales", value: data?.debit.product ?? 0 },
    { label: "POP Bill", value: data?.debit.popBill ?? 0 },
    { label: "Bandwidth POP Bill", value: data?.debit.bwPop ?? 0 },
    { label: "Income", value: data?.debit.income ?? 0 },
  ];
  const creditRows = [
    { label: "Paid Salary", value: data?.credit.salary ?? 0 },
    { label: "Expense", value: data?.credit.expense ?? 0 },
    { label: "Bandwidth Provider Bill", value: data?.credit.bwProvider ?? 0 },
    { label: "Withdraw", value: data?.credit.withdraw ?? 0 },
    { label: "Purchase Paid Amount", value: data?.credit.purchase ?? 0 },
  ];
  const totalDebit = debitRows.reduce((s, r) => s + r.value, 0);
  const totalCredit = creditRows.reduce((s, r) => s + r.value, 0);
  const cashOnHand = totalDebit - totalCredit;

  const apply = () => setApplied({ from, to });
  const clear = () => { setFrom(monthStartStr()); setTo(todayStr()); setApplied({ from: monthStartStr(), to: todayStr() }); };

  const exportRows = () => {
    const max = Math.max(debitRows.length, creditRows.length);
    const out: any[] = [];
    for (let i = 0; i < max; i++) {
      out.push({
        d_label: debitRows[i]?.label ?? "",
        d_amt: debitRows[i] ? fmtMoney(debitRows[i].value) : "",
        c_label: creditRows[i]?.label ?? "",
        c_amt: creditRows[i] ? fmtMoney(creditRows[i].value) : "",
      });
    }
    out.push({ d_label: "Total", d_amt: fmtMoney(totalDebit), c_label: "Total", c_amt: fmtMoney(totalCredit) });
    out.push({ d_label: "Cash on Hand", d_amt: fmtMoney(cashOnHand), c_label: "", c_amt: "" });
    return out;
  };
  const cols = [
    { key: "d_label", label: "Debit Particular" },
    { key: "d_amt", label: "Taka" },
    { key: "c_label", label: "Credit Particular" },
    { key: "c_amt", label: "Taka" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Cash Book / ক্যাশ বুক</h1>
          <p className="text-muted-foreground text-sm">From {applied.from} to {applied.to}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportPDF("Cash Book", cols, exportRows())}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportCSV("cash_book", cols, exportRows())}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">From Date</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-[170px] h-9" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">To Date</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-[170px] h-9" />
          </div>
          <Button size="sm" onClick={apply}><Search className="w-4 h-4 mr-1" /> Update</Button>
          <Button size="sm" variant="outline" onClick={clear}><RotateCcw className="w-4 h-4 mr-1" /> Clear</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th colSpan={2} className="p-2 text-left border border-border">Debit</th>
                  <th colSpan={2} className="p-2 text-left border border-border">Credit</th>
                </tr>
                <tr className="bg-muted">
                  <th className="p-2 text-left border border-border w-[35%]">Particular</th>
                  <th className="p-2 text-right border border-border w-[15%]">Taka</th>
                  <th className="p-2 text-left border border-border w-[35%]">Particular</th>
                  <th className="p-2 text-right border border-border w-[15%]">Taka</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(debitRows.length, creditRows.length) }).map((_, i) => (
                  <tr key={i} className="even:bg-muted/30">
                    <td className="p-2 border border-border">{debitRows[i]?.label ?? ""}</td>
                    <td className="p-2 border border-border text-right font-mono">{debitRows[i] ? fmtMoney(debitRows[i].value) : ""}</td>
                    <td className="p-2 border border-border">{creditRows[i]?.label ?? ""}</td>
                    <td className="p-2 border border-border text-right font-mono">{creditRows[i] ? fmtMoney(creditRows[i].value) : ""}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-muted">
                  <td className="p-2 border border-border">Total</td>
                  <td className="p-2 border border-border text-right font-mono">{fmtMoney(totalDebit)}</td>
                  <td className="p-2 border border-border">Total</td>
                  <td className="p-2 border border-border text-right font-mono">{fmtMoney(totalCredit)}</td>
                </tr>
                <tr className={`font-bold ${cashOnHand >= 0 ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
                  <td className="p-2 border border-border" colSpan={3}>Cash on Hand (Debit Total − Credit Total)</td>
                  <td className="p-2 border border-border text-right font-mono">{fmtMoney(cashOnHand)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
