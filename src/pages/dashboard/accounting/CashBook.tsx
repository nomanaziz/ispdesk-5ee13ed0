import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function CashBook() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const monthStart = `${month}-01`;
  const nextMonth = (() => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); })();

  const { data: incomes, isLoading: li } = useQuery({
    queryKey: ["cashbook-income", month],
    queryFn: async () => {
      const { data } = await supabase.from("income_entries").select("*").gte("income_date", monthStart).lt("income_date", nextMonth).order("income_date");
      return data ?? [];
    },
  });

  const { data: expenses, isLoading: le } = useQuery({
    queryKey: ["cashbook-expense", month],
    queryFn: async () => {
      const { data } = await supabase.from("expense_entries").select("*").gte("expense_date", monthStart).lt("expense_date", nextMonth).order("expense_date");
      return data ?? [];
    },
  });

  const isLoading = li || le;
  const totalIn = (incomes ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ক্যাশ বুক</h1>
          <p className="text-muted-foreground text-sm">মাসভিত্তিক ক্যাশ ইন/আউট</p>
        </div>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[180px]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ক্যাশ ইন</p><p className="text-xl font-bold text-green-600">৳{totalIn.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ক্যাশ আউট</p><p className="text-xl font-bold text-red-500">৳{totalOut.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ক্যাশ ব্যালেন্স</p><p className="text-xl font-bold">৳{(totalIn - totalOut).toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">ক্যাশ ইন (আয়)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">বিবরণ</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                    (incomes ?? []).length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">কোনো এন্ট্রি নেই</TableCell></TableRow> :
                    (incomes ?? []).map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs py-2">{e.income_date}</TableCell>
                        <TableCell className="text-xs py-2">{e.description || "-"}</TableCell>
                        <TableCell className="text-xs py-2 text-right text-green-600 font-medium">৳{Number(e.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && (incomes ?? []).length > 0 && (
                    <TableRow className="font-bold"><TableCell colSpan={2} className="text-xs py-2">মোট</TableCell><TableCell className="text-xs py-2 text-right text-green-600">৳{totalIn.toLocaleString()}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-500">ক্যাশ আউট (ব্যয়)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">বিবরণ</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow> :
                    (expenses ?? []).length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">কোনো এন্ট্রি নেই</TableCell></TableRow> :
                    (expenses ?? []).map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs py-2">{e.expense_date}</TableCell>
                        <TableCell className="text-xs py-2">{e.description || "-"}</TableCell>
                        <TableCell className="text-xs py-2 text-right text-red-500 font-medium">৳{Number(e.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  {!isLoading && (expenses ?? []).length > 0 && (
                    <TableRow className="font-bold"><TableCell colSpan={2} className="text-xs py-2">মোট</TableCell><TableCell className="text-xs py-2 text-right text-red-500">৳{totalOut.toLocaleString()}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
