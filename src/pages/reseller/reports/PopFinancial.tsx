import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search } from "lucide-react";
import { usePopScope } from "@/hooks/usePopScope";

export default function PopFinancial() {
  const { branchId } = usePopScope();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const monthStart = `${month}-01`;
  const nextMonth = (() => { const d = new Date(`${month}-01`); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); })();

  const { data: incomes, isLoading: li } = useQuery({
    queryKey: ["pop-fin-income", branchId, month],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase.from("income_entries").select("*")
        .eq("branch_id", branchId!)
        .gte("income_date", monthStart).lt("income_date", nextMonth)
        .order("income_date", { ascending: false });
      return (data ?? []).map(d => ({ ...d, txn_type: "income" as const, txn_date: d.income_date, txn_amount: Number(d.amount) }));
    },
  });

  const { data: expenses, isLoading: le } = useQuery({
    queryKey: ["pop-fin-expense", branchId, month],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase.from("expense_entries").select("*")
        .eq("branch_id", branchId!)
        .gte("expense_date", monthStart).lt("expense_date", nextMonth)
        .order("expense_date", { ascending: false });
      return (data ?? []).map(d => ({ ...d, txn_type: "expense" as const, txn_date: d.expense_date, txn_amount: Number(d.amount) }));
    },
  });

  const isLoading = li || le;
  const all = [...(incomes ?? []), ...(expenses ?? [])].sort((a, b) => (b.txn_date || "").localeCompare(a.txn_date || ""));

  const filtered = all.filter(t => {
    if (filterType !== "all" && t.txn_type !== filterType) return false;
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIncome = (incomes ?? []).reduce((s, e) => s + e.txn_amount, 0);
  const totalExpense = (expenses ?? []).reduce((s, e) => s + e.txn_amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">আর্থিক লেনদেন রিপোর্ট</h1>
        <p className="text-muted-foreground text-sm">মাসভিত্তিক আর্থিক লেনদেন</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট আয়</p><p className="text-xl font-bold text-green-600">৳{totalIncome.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট ব্যয়</p><p className="text-xl font-bold text-destructive">৳{totalExpense.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">নেট</p><p className={`text-xl font-bold ${totalIncome - totalExpense >= 0 ? "text-green-600" : "text-destructive"}`}>৳{(totalIncome - totalExpense).toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[160px]" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="বিবরণ খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="income">আয়</SelectItem>
            <SelectItem value="expense">ব্যয়</SelectItem>
          </SelectContent>
        </Select>
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
                  <TableHead className="text-xs">পেমেন্ট</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
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
                      <Badge variant="outline" className={t.txn_type === "income" ? "bg-green-500/20 text-green-600" : "bg-destructive/20 text-destructive"}>
                        {t.txn_type === "income" ? "আয়" : "ব্যয়"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-2">{t.description || "-"}</TableCell>
                    <TableCell className="text-xs py-2">{t.payment_method || "-"}</TableCell>
                    <TableCell className={`text-xs py-2 text-right font-medium ${t.txn_type === "income" ? "text-green-600" : "text-destructive"}`}>
                      {t.txn_type === "income" ? "+" : "-"}৳{t.txn_amount.toLocaleString()}
                    </TableCell>
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
