import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, BookOpen, FileText, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AccountingDashboard() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = `${currentMonth}-01`;

  const { data, isLoading } = useQuery({
    queryKey: ["accounting-dashboard"],
    queryFn: async () => {
      const [incomes, expenses, accounts, journals] = await Promise.all([
        supabase.from("income_entries").select("source, amount, income_date"),
        supabase.from("expense_entries").select("category, amount, expense_date"),
        supabase.from("chart_of_accounts").select("type, balance, status").eq("status", "active"),
        supabase.from("journal_entries").select("id, amount"),
      ]);

      const allIncome = incomes.data ?? [];
      const allExpense = expenses.data ?? [];
      const allAccounts = accounts.data ?? [];

      const monthIncome = allIncome.filter(i => (i.income_date || "") >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
      const monthExpense = allExpense.filter(e => (e.expense_date || "") >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
      const totalIncome = allIncome.reduce((s, e) => s + Number(e.amount), 0);
      const totalExpense = allExpense.reduce((s, e) => s + Number(e.amount), 0);

      const totalAssets = allAccounts.filter(a => a.type === "asset").reduce((s, a) => s + Number(a.balance), 0);
      const totalLiabilities = allAccounts.filter(a => a.type === "liability").reduce((s, a) => s + Number(a.balance), 0);

      // Income by source pie
      const sourceLabels: Record<string, string> = { client_billing: "ক্লায়েন্ট বিলিং", mac_reseller: "ম্যাক রিসেলার", bandwidth_sale: "ব্যান্ডউইথ সেল" };
      const incomeBySource = allIncome.reduce((acc, e) => {
        const key = e.source || "other";
        acc[key] = (acc[key] || 0) + Number(e.amount);
        return acc;
      }, {} as Record<string, number>);
      const pieData = Object.entries(incomeBySource).map(([k, v]) => ({ name: sourceLabels[k] || k, value: v }));

      // Last 6 months bar chart
      const barData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        const m = d.toISOString().slice(0, 7);
        const mStart = `${m}-01`;
        const mEnd = (() => { const x = new Date(`${m}-01`); x.setMonth(x.getMonth() + 1); return x.toISOString().slice(0, 10); })();
        return {
          month: d.toLocaleString("bn-BD", { month: "short" }),
          income: allIncome.filter(e => (e.income_date || "") >= mStart && (e.income_date || "") < mEnd).reduce((s, e) => s + Number(e.amount), 0),
          expense: allExpense.filter(e => (e.expense_date || "") >= mStart && (e.expense_date || "") < mEnd).reduce((s, e) => s + Number(e.amount), 0),
        };
      });

      return { monthIncome, monthExpense, totalIncome, totalExpense, totalAssets, totalLiabilities, totalAccounts: allAccounts.length, totalJournals: (journals.data ?? []).length, pieData, barData };
    },
    refetchInterval: 30000,
  });

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card><CardContent className="p-4 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold">{value}</p></div>
      <div className={`p-2.5 rounded-xl ${color}`}><Icon className="h-5 w-5" /></div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">অ্যাকাউন্টিং ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground text-sm">আর্থিক সারসংক্ষেপ</p>
      </div>

      {isLoading ? <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div> : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard title="চলতি মাসের আয়" value={`৳${(data?.monthIncome ?? 0).toLocaleString()}`} icon={TrendingUp} color="bg-green-500/20 text-green-500" />
            <StatCard title="চলতি মাসের ব্যয়" value={`৳${(data?.monthExpense ?? 0).toLocaleString()}`} icon={TrendingDown} color="bg-red-500/20 text-red-500" />
            <StatCard title="মোট সম্পদ" value={`৳${(data?.totalAssets ?? 0).toLocaleString()}`} icon={Wallet} color="bg-blue-500/20 text-blue-500" />
            <StatCard title="মোট দায়" value={`৳${(data?.totalLiabilities ?? 0).toLocaleString()}`} icon={DollarSign} color="bg-amber-500/20 text-amber-500" />
            <StatCard title="সর্বমোট আয়" value={`৳${(data?.totalIncome ?? 0).toLocaleString()}`} icon={TrendingUp} color="bg-emerald-500/20 text-emerald-500" />
            <StatCard title="সর্বমোট ব্যয়" value={`৳${(data?.totalExpense ?? 0).toLocaleString()}`} icon={TrendingDown} color="bg-rose-500/20 text-rose-500" />
            <StatCard title="অ্যাকাউন্ট সংখ্যা" value={data?.totalAccounts ?? 0} icon={BookOpen} color="bg-primary/20 text-primary" />
            <StatCard title="জার্নাল এন্ট্রি" value={data?.totalJournals ?? 0} icon={FileText} color="bg-violet-500/20 text-violet-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">আয়ের উৎস</CardTitle></CardHeader>
              <CardContent>
                {(data?.pieData ?? []).length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">কোনো ডাটা নেই</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data?.pieData ?? []} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" nameKey="name" label={({ name }) => name}>
                        {(data?.pieData ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">মাসিক আয় vs ব্যয়</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.barData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="income" fill="#10b981" name="আয়" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="ব্যয়" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
