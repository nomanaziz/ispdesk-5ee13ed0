import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ProfitLoss() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const monthStart = `${month}-01`;
  const nextMonth = (() => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); })();

  const { data: incomes, isLoading: li } = useQuery({
    queryKey: ["pl-income", month],
    queryFn: async () => {
      const { data } = await supabase.from("income_entries").select("source, amount").gte("income_date", monthStart).lt("income_date", nextMonth);
      return data ?? [];
    },
  });

  const { data: expenses, isLoading: le } = useQuery({
    queryKey: ["pl-expense", month],
    queryFn: async () => {
      const { data } = await supabase.from("expense_entries").select("category, amount").gte("expense_date", monthStart).lt("expense_date", nextMonth);
      return data ?? [];
    },
  });

  const isLoading = li || le;

  const sourceLabels: Record<string, string> = { client_billing: "ক্লায়েন্ট বিলিং", mac_reseller: "ম্যাক রিসেলার", bandwidth_sale: "ব্যান্ডউইথ সেল" };

  const incomeBySource = (incomes ?? []).reduce((acc, e) => {
    const key = e.source || "other";
    acc[key] = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const expenseByCat = (expenses ?? []).reduce((acc, e) => {
    const key = e.category || "Other";
    acc[key] = (acc[key] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalIncome = Object.values(incomeBySource).reduce((s, v) => s + v, 0);
  const totalExpense = Object.values(expenseByCat).reduce((s, v) => s + v, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">লাভ-ক্ষতি বিবরণী</h1>
          <p className="text-muted-foreground text-sm">মাসভিত্তিক আয়-ব্যয় সারসংক্ষেপ</p>
        </div>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[180px]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট আয়</p><p className="text-xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ব্যয়</p><p className="text-xl font-bold text-red-500">৳{totalExpense.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">নিট {netProfit >= 0 ? "লাভ" : "ক্ষতি"}</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>৳{Math.abs(netProfit).toLocaleString()}</p></CardContent></Card>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-green-50 dark:bg-green-950/20"><h3 className="text-sm font-semibold text-green-700 dark:text-green-400">আয় (Income)</h3></div>
              <Table>
                <TableBody>
                  {Object.entries(incomeBySource).map(([src, amt]) => (
                    <TableRow key={src}>
                      <TableCell className="text-xs py-2">{sourceLabels[src] || src}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium text-green-600">৳{amt.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="text-xs py-2">মোট আয়</TableCell>
                    <TableCell className="text-xs py-2 text-right text-green-600">৳{totalIncome.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-red-50 dark:bg-red-950/20"><h3 className="text-sm font-semibold text-red-700 dark:text-red-400">ব্যয় (Expense)</h3></div>
              <Table>
                <TableBody>
                  {Object.entries(expenseByCat).map(([cat, amt]) => (
                    <TableRow key={cat}>
                      <TableCell className="text-xs py-2">{cat}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium text-red-500">৳{amt.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="text-xs py-2">মোট ব্যয়</TableCell>
                    <TableCell className="text-xs py-2 text-right text-red-500">৳{totalExpense.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">নিট {netProfit >= 0 ? "লাভ" : "ক্ষতি"}</span>
            <span className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
              ৳{Math.abs(netProfit).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
