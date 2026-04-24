import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Wallet, BookOpen, FileText, DollarSign,
  CalendarDays, Banknote, Receipt, Filter, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

type Preset = "today" | "week" | "month" | "last_month" | "custom";

function getRange(preset: Preset, customFrom: string, customTo: string) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: fmt(start), to: fmt(now) };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(start), to: fmt(end) };
    }
    case "custom":
      return { from: customFrom, to: customTo };
    case "month":
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fmt(start), to: fmt(now) };
    }
  }
}

const tk = (n: number | null | undefined) =>
  `৳${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

export default function AccountingDashboard() {
  const [preset, setPreset] = useState<Preset>("month");
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const range = useMemo(() => getRange(preset, from, to), [preset, from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["accounting-dashboard", range.from, range.to],
    queryFn: async () => {
      const [
        incomes, expenses, billing, vendorBills,
        accounts, journals, recentInc, recentExp,
      ] = await Promise.all([
        supabase.from("income_entries").select("source, amount, income_date, category, payment_method")
          .gte("income_date", range.from).lte("income_date", range.to),
        supabase.from("expense_entries").select("category, amount, expense_date, payment_method")
          .gte("expense_date", range.from).lte("expense_date", range.to),
        // Receivables — outstanding (any time)
        supabase.from("billing").select("amount, paid, due, status"),
        // Payables — outstanding vendor bills
        supabase.from("purchase_bills").select("amount, paid, due, status"),
        supabase.from("chart_of_accounts").select("type, balance, status").eq("status", "active"),
        supabase.from("journal_entries").select("id"),
        supabase.from("income_entries").select("amount, income_date, category, source")
          .order("income_date", { ascending: false }).limit(10),
        supabase.from("expense_entries").select("amount, expense_date, category, description")
          .order("expense_date", { ascending: false }).limit(10),
      ]);

      const allIncome = (incomes.data ?? []) as any[];
      const allExpense = (expenses.data ?? []) as any[];
      const allBilling = (billing.data ?? []) as any[];
      const allVendor = (vendorBills.data ?? []) as any[];

      const totalIncome = allIncome.reduce((s, e) => s + Number(e.amount || 0), 0);
      const totalExpense = allExpense.reduce((s, e) => s + Number(e.amount || 0), 0);
      const profit = totalIncome - totalExpense;

      const receivables = allBilling.reduce((s, b) => s + Math.max(Number(b.due || 0), 0), 0);
      const payables = allVendor.reduce((s, b) => s + Math.max(Number(b.due || 0), 0), 0);

      // Cash by payment method = income(+) − expense(−)
      const methodMap = new Map<string, number>();
      for (const e of allIncome) {
        const k = (e.payment_method || "Cash").toString();
        methodMap.set(k, (methodMap.get(k) || 0) + Number(e.amount || 0));
      }
      for (const e of allExpense) {
        const k = (e.payment_method || "Cash").toString();
        methodMap.set(k, (methodMap.get(k) || 0) - Number(e.amount || 0));
      }
      const cashByMethod = Array.from(methodMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

      // Income by category (horizontal bar)
      const incCat = new Map<string, number>();
      for (const e of allIncome) {
        const k = (e.category || e.source || "Uncategorized").toString();
        incCat.set(k, (incCat.get(k) || 0) + Number(e.amount || 0));
      }
      const incomeByCategory = Array.from(incCat.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Expense by category
      const expCat = new Map<string, number>();
      for (const e of allExpense) {
        const k = (e.category || "Uncategorized").toString();
        expCat.set(k, (expCat.get(k) || 0) + Number(e.amount || 0));
      }
      const expenseByCategory = Array.from(expCat.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Pie of income source (legacy)
      const sourceLabels: Record<string, string> = {
        client_billing: "ক্লায়েন্ট বিলিং", mac_reseller: "ম্যাক রিসেলার",
        bandwidth_sale: "ব্যান্ডউইথ সেল", panel_subscription: "প্যানেল সাবস্ক্রিপশন",
        bill_collection: "বিল কালেকশন",
      };
      const incomeBySource = allIncome.reduce((acc: Record<string, number>, e: any) => {
        const k = e.source || "other";
        acc[k] = (acc[k] || 0) + Number(e.amount || 0);
        return acc;
      }, {});
      const pieData = Object.entries(incomeBySource).map(([k, v]) => ({
        name: sourceLabels[k] || k, value: v as number,
      }));

      // Last 6 months bar
      const barData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return {
          month: d.toLocaleString("en-US", { month: "short" }),
          income: 0, expense: 0,
          _key: d.toISOString().slice(0, 7),
        };
      });
      // For monthly chart we need all-time data; do a quick second fetch is overkill — use the in-range data as approximation
      for (const e of allIncome) {
        const k = (e.income_date || "").slice(0, 7);
        const row = barData.find((r) => r._key === k);
        if (row) row.income += Number(e.amount || 0);
      }
      for (const e of allExpense) {
        const k = (e.expense_date || "").slice(0, 7);
        const row = barData.find((r) => r._key === k);
        if (row) row.expense += Number(e.amount || 0);
      }

      const allAccounts = (accounts.data ?? []) as any[];

      return {
        totalIncome, totalExpense, profit,
        receivables, payables,
        cashByMethod,
        incomeByCategory, expenseByCategory,
        pieData, barData,
        totalAssets: allAccounts.filter(a => a.type === "asset").reduce((s, a) => s + Number(a.balance || 0), 0),
        totalLiabilities: allAccounts.filter(a => a.type === "liability").reduce((s, a) => s + Number(a.balance || 0), 0),
        totalAccounts: allAccounts.length,
        totalJournals: (journals.data ?? []).length,
        recentInc: (recentInc.data ?? []) as any[],
        recentExp: (recentExp.data ?? []) as any[],
      };
    },
    refetchInterval: 30000,
  });

  // Big colored band card (like reference)
  const BandCard = ({
    title, value, sub, tone, icon: Icon,
  }: { title: string; value: string; sub: string; tone: "blue" | "teal" | "purple" | "rose" | "amber"; icon: any }) => {
    const toneMap: Record<string, string> = {
      blue: "from-sky-500 to-sky-600",
      teal: "from-teal-500 to-teal-600",
      purple: "from-violet-500 to-violet-600",
      rose: "from-rose-500 to-rose-600",
      amber: "from-amber-500 to-amber-600",
    };
    return (
      <div className={cn("rounded-lg p-4 text-white shadow-sm bg-gradient-to-br", toneMap[tone])}>
        <div className="flex items-center justify-between text-xs/none opacity-90">
          <span className="font-medium">{title}</span>
          <Icon className="h-4 w-4 opacity-80" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] opacity-80">
          <span>{sub}</span>
          <span className="opacity-70">Filtered Transactions</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Accounting Dashboard</h1>
            <p className="text-xs text-muted-foreground">আর্থিক সারসংক্ষেপ — {range.from} → {range.to}</p>
          </div>
        </div>

        {/* Range filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={preset} onValueChange={(v: Preset) => setPreset(v)}>
            <SelectTrigger className="w-[180px] gap-2"><Filter className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">আজ</SelectItem>
              <SelectItem value="week">গত ৭ দিন</SelectItem>
              <SelectItem value="month">এই মাস</SelectItem>
              <SelectItem value="last_month">গত মাস</SelectItem>
              <SelectItem value="custom">কাস্টম</SelectItem>
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
            </>
          )}
        </div>
      </div>

      {/* KPI Row 1 — Income / Expense / Profit */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BandCard title="Total Income" value={tk(data?.totalIncome)} sub={range.from.slice(0, 7)} tone="blue" icon={ArrowUpRight} />
          <BandCard title="Total Expense" value={tk(data?.totalExpense)} sub={range.from.slice(0, 7)} tone="teal" icon={ArrowDownRight} />
          <BandCard title="Total Profit" value={tk(data?.profit)} sub={range.from.slice(0, 7)} tone="purple" icon={TrendingUp} />
        </div>
      )}

      {/* KPI Row 2 — Receivables / Payables / Upcoming */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BandCard title="Expected Payments from Customers" value={tk(data?.receivables)} sub={range.from.slice(0, 7)} tone="blue" icon={Receipt} />
          <BandCard title="Expected Payments to Vendors" value={tk(-(data?.payables || 0))} sub={range.from.slice(0, 7)} tone="teal" icon={Receipt} />
          <BandCard title="Total Upcoming" value={tk((data?.receivables || 0) - (data?.payables || 0))} sub={range.from.slice(0, 7)} tone="purple" icon={CalendarDays} />
        </div>
      )}

      {/* KPI Row 3 — Cash by method */}
      {!isLoading && (data?.cashByMethod || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data!.cashByMethod.slice(0, 8).map((c) => (
            <BandCard
              key={c.name}
              title={c.name}
              value={tk(c.value)}
              sub={range.from.slice(0, 7)}
              tone={c.value >= 0 ? "blue" : "rose"}
              icon={Banknote}
            />
          ))}
        </div>
      )}

      {/* Income vs Expense by Category */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-center">Income by Category</CardTitle></CardHeader>
            <CardContent>
              {(data?.incomeByCategory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">কোনো আয় নেই</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, (data?.incomeByCategory.length || 1) * 28)}>
                  <BarChart data={data?.incomeByCategory} layout="vertical" margin={{ left: 60, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                    <Tooltip formatter={(v: any) => tk(v as number)} />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v: any) => Number(v).toLocaleString()} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-center">Expense by Category</CardTitle></CardHeader>
            <CardContent>
              {(data?.expenseByCategory ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">কোনো ব্যয় নেই</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, (data?.expenseByCategory.length || 1) * 28)}>
                  <BarChart data={data?.expenseByCategory} layout="vertical" margin={{ left: 60, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
                    <Tooltip formatter={(v: any) => tk(v as number)} />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" formatter={(v: any) => Number(v).toLocaleString()} style={{ fontSize: 10 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Latest tables */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white text-center py-2 font-semibold tracking-wide text-sm">
              LATEST INCOMES
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentInc ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No data</td></tr>
                  ) : data!.recentInc.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-xs">{r.income_date}</td>
                      <td className="px-3 py-2 text-xs text-primary">{r.category || r.source || "Uncategorized"}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium">{Number(r.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white text-center py-2 font-semibold tracking-wide text-sm">
              LATEST EXPENSES
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-right px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentExp ?? []).length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-6 text-muted-foreground">No data</td></tr>
                  ) : data!.recentExp.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-xs">{r.expense_date}</td>
                      <td className="px-3 py-2 text-xs text-primary">{r.category || "Uncategorized"}</td>
                      <td className="px-3 py-2 text-xs text-right font-medium">{Number(r.amount || 0).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Lower charts (existing pie + monthly) */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">আয়ের উৎস</CardTitle></CardHeader>
            <CardContent>
              {(data?.pieData ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">কোনো ডাটা নেই</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data?.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" nameKey="name" label={({ name }) => name}>
                      {(data?.pieData ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => tk(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">গত ৬ মাসের আয় vs ব্যয়</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => tk(v as number)} />
                  <Bar dataKey="income" fill="#10b981" name="আয়" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="ব্যয়" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom mini stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat icon={Wallet} title="মোট সম্পদ" value={tk(data?.totalAssets)} tone="bg-blue-500/15 text-blue-600" />
          <MiniStat icon={DollarSign} title="মোট দায়" value={tk(data?.totalLiabilities)} tone="bg-amber-500/15 text-amber-600" />
          <MiniStat icon={BookOpen} title="অ্যাকাউন্ট সংখ্যা" value={String(data?.totalAccounts ?? 0)} tone="bg-primary/15 text-primary" />
          <MiniStat icon={FileText} title="জার্নাল এন্ট্রি" value={String(data?.totalJournals ?? 0)} tone="bg-violet-500/15 text-violet-600" />
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, title, value, tone }: { icon: any; title: string; value: string; tone: string }) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{title}</p>
          <p className="text-base font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
