import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

export default function Transactions() {
  const [search, setSearch] = useState("");

  const { data: incomes, isLoading: li } = useQuery({
    queryKey: ["income-entries-txn"],
    queryFn: async () => {
      const { data } = await supabase.from("income_entries").select("*").order("income_date", { ascending: false }).limit(200);
      return (data ?? []).map(d => ({ ...d, txn_type: "income" as const, txn_date: d.income_date, txn_amount: Number(d.amount) }));
    },
  });

  const { data: expenses, isLoading: le } = useQuery({
    queryKey: ["expense-entries-txn"],
    queryFn: async () => {
      const { data } = await supabase.from("expense_entries").select("*").order("expense_date", { ascending: false }).limit(200);
      return (data ?? []).map(d => ({ ...d, txn_type: "expense" as const, txn_date: d.expense_date, txn_amount: Number(d.amount) }));
    },
  });

  const isLoading = li || le;
  const all = [...(incomes ?? []), ...(expenses ?? [])].sort((a, b) => (b.txn_date || "").localeCompare(a.txn_date || ""));

  const filtered = all.filter(t => {
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase()) && !t.reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIncome = (incomes ?? []).reduce((s, e) => s + e.txn_amount, 0);
  const totalExpense = (expenses ?? []).reduce((s, e) => s + e.txn_amount, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="লেনদেন" description="সকল আয় ও ব্যয়ের লেনদেন" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="মোট আয়" value={`৳${totalIncome.toLocaleString()}`} icons8="profit" />
        <StatCard label="মোট ব্যয়" value={`৳${totalExpense.toLocaleString()}`} icons8="high-priority" />
        <StatCard label="নেট" value={`৳${(totalIncome - totalExpense).toLocaleString()}`} icons8="calculator" />
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="বিবরণ খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">ধরন</TableHead>
                  <TableHead className="text-xs">বিবরণ</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
                  <TableHead className="text-xs">রেফারেন্স</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো লেনদেন নেই</TableCell></TableRow>
                ) : filtered.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs py-2">{i + 1}</TableCell>
                    <TableCell className="text-xs py-2">{t.txn_date}</TableCell>
                    <TableCell className="text-xs py-2">
                      <Badge variant="outline" className={t.txn_type === "income" ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"}>
                        {t.txn_type === "income" ? "আয়" : "ব্যয়"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-2">{t.description || "-"}</TableCell>
                    <TableCell className={`text-xs py-2 text-right font-medium ${t.txn_type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {t.txn_type === "income" ? "+" : "-"}৳{t.txn_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs py-2">{t.reference || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
