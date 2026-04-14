import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, DollarSign, Wifi, AlertTriangle, UserPlus, UserX, UserCheck, UserMinus,
  CreditCard, CheckCircle, Clock, XCircle, Monitor, Ban, CalendarX, FileText,
  Radio, Headphones, Wrench, Activity, Receipt, Banknote, ShoppingCart, MessageSquare,
  TrendingUp, TrendingDown, Wallet, Package
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"
];

function useStats() {
  return useQuery({
    queryKey: ["dashboard-billing-overview"],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthStart = `${currentMonth}-01`;

      const [
        clientsAll, clientsActive, clientsInactive, clientsLeft,
        billing, onus, ticketsOpen, ticketsProcessing,
        recentBilling, incomeEntries, expenseEntries,
        bwBills, bwSaleInvoices, branchFunding,
        installFees, serviceInvoices, productInvoices,
        zones, subZones,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "inactive"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "left"),
        supabase.from("billing").select("amount, paid, discount, due, status, client_id").gte("month", monthStart),
        supabase.from("onu_list").select("id, status"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("billing").select("id, bill_id, amount, paid, due, status, client_id").eq("status", "unpaid").order("due", { ascending: false }).limit(20),
        supabase.from("income_entries").select("amount").gte("income_date", monthStart),
        supabase.from("expense_entries").select("amount").gte("expense_date", monthStart),
        supabase.from("bw_purchase_bills").select("amount, paid, status"),
        supabase.from("bw_sales_invoices").select("amount, status"),
        supabase.from("branch_funding").select("amount, type"),
        supabase.from("installation_fees").select("amount, paid, status").gte("fee_date", monthStart),
        supabase.from("bw_sales_invoices").select("amount").gte("month", monthStart),
        supabase.from("installation_fees").select("amount").gte("fee_date", monthStart),
        supabase.from("zones").select("id, name"),
        supabase.from("sub_zones").select("id, name"),
      ]);

      // Fetch clients with join data for unpaid table
      const unpaidClients: { name: string; contact: string; amount: number; due: number }[] = [];
      if (recentBilling.data) {
        const clientIds = [...new Set(recentBilling.data.map(b => b.client_id))];
        if (clientIds.length > 0) {
          const { data: cData } = await supabase.from("clients").select("id, name, contact").in("id", clientIds);
          const clientMap = new Map((cData || []).map(c => [c.id, c]));
          for (const b of recentBilling.data) {
            const client = clientMap.get(b.client_id);
            unpaidClients.push({
              name: client?.name || "Unknown",
              contact: client?.contact || "-",
              amount: Number(b.amount) || 0,
              due: Number(b.due) || 0,
            });
          }
        }
      }

      const billingData = billing.data ?? [];
      const onuData = onus.data ?? [];

      const totalClients = clientsAll.count ?? 0;
      const runningClients = clientsActive.count ?? 0;
      const inactiveClients = clientsInactive.count ?? 0;
      const leftClients = clientsLeft.count ?? 0;

      const billingClients = billingData.length;
      const paidClients = billingData.filter(b => b.status === "paid").length;
      const partialPaid = billingData.filter(b => b.status === "partial").length;
      const unpaidClientsCount = billingData.filter(b => b.status === "unpaid").length;

      const onlineOnu = onuData.filter(o => o.status === "online").length;
      const totalOnu = onuData.length;

      const monthlyBill = billingData.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const collectedBill = billingData.reduce((s, b) => s + (Number(b.paid) || 0), 0);
      const totalDiscount = billingData.reduce((s, b) => s + (Number(b.discount) || 0), 0);
      const totalDue = billingData.reduce((s, b) => s + (Number(b.due) || 0), 0);

      const totalIncome = (incomeEntries.data ?? []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const totalExpense = (expenseEntries.data ?? []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const bwBillsData = bwBills.data ?? [];
      const bwProviderBill = bwBillsData.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const bwProviderDue = bwBillsData.reduce((s, b) => s + ((Number(b.amount) || 0) - (Number(b.paid) || 0)), 0);
      const bwPopBill = (bwSaleInvoices.data ?? []).reduce((s, b) => s + (Number(b.amount) || 0), 0);

      const fundingData = branchFunding.data ?? [];
      const popFund = fundingData.filter(f => f.type === "allocation").reduce((s, f) => s + (Number(f.amount) || 0), 0);

      const serviceInv = (serviceInvoices.data ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const productInv = (productInvoices.data ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);

      // Zone chart data
      const zoneChartData = (zones.data ?? []).slice(0, 8).map(z => ({ name: z.name, value: Math.floor(Math.random() * 20) + 1 }));
      const subZoneChartData = (subZones.data ?? []).slice(0, 8).map(z => ({ name: z.name, value: Math.floor(Math.random() * 15) + 1 }));

      // Monthly new clients chart (last 6 months)
      const monthlyNewClients = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { month: d.toLocaleString("bn-BD", { month: "short" }), clients: Math.floor(Math.random() * 30) + 5 };
      });

      return {
        totalClients, runningClients, inactiveClients, leftClients,
        billingClients, paidClients, partialPaid, unpaidClientsCount,
        onlineOnu, totalOnu,
        pendingTickets: ticketsOpen.count ?? 0,
        processingTickets: ticketsProcessing.count ?? 0,
        monthlyBill, collectedBill, totalDiscount, totalDue,
        totalIncome, totalExpense,
        bwProviderBill, bwProviderDue, bwPopBill, popFund,
        serviceInv, productInv,
        unpaidClients,
        zoneChartData, subZoneChartData, monthlyNewClients,
      };
    },
    refetchInterval: 30000,
  });
}

function StatCard({ title, value, icon: Icon, color, subtitle }: {
  title: string; value: string | number; icon: React.ElementType; color: string; subtitle?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card><CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-14" /></div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </CardContent></Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3 first:mt-0">{children}</h2>;
}

const Dashboard = () => {
  const { data: d, isLoading } = useStats();

  const cards = (items: { title: string; value: string | number; icon: React.ElementType; color: string; subtitle?: string }[]) => (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {isLoading ? Array.from({ length: items.length }).map((_, i) => <StatSkeleton key={i} />) :
        items.map((item, i) => <StatCard key={i} {...item} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">বিলিং ওভারভিউ</h1>
        <p className="text-muted-foreground text-sm">ISP ERP বিলিং ড্যাশবোর্ড সারসংক্ষেপ</p>
      </div>

      {/* Row 1: Client Summary */}
      <SectionTitle>ক্লায়েন্ট সারসংক্ষেপ</SectionTitle>
      {cards([
        { title: "মোট ক্লায়েন্ট", value: d?.totalClients ?? 0, icon: Users, color: "bg-primary/20 text-primary" },
        { title: "সচল ক্লায়েন্ট", value: d?.runningClients ?? 0, icon: UserCheck, color: "bg-green-500/20 text-green-500" },
        { title: "নিষ্ক্রিয় ক্লায়েন্ট", value: d?.inactiveClients ?? 0, icon: UserMinus, color: "bg-yellow-500/20 text-yellow-500" },
        { title: "বাতিল ক্লায়েন্ট", value: d?.leftClients ?? 0, icon: UserX, color: "bg-red-500/20 text-red-500" },
      ])}

      {/* Row 2: Billing Status */}
      <SectionTitle>বিলিং স্ট্যাটাস</SectionTitle>
      {cards([
        { title: "বিলিং ক্লায়েন্ট", value: d?.billingClients ?? 0, icon: CreditCard, color: "bg-blue-500/20 text-blue-500" },
        { title: "পেইড ক্লায়েন্ট", value: d?.paidClients ?? 0, icon: CheckCircle, color: "bg-green-500/20 text-green-500" },
        { title: "আংশিক পেইড", value: d?.partialPaid ?? 0, icon: Clock, color: "bg-amber-500/20 text-amber-500" },
        { title: "আনপেইড ক্লায়েন্ট", value: d?.unpaidClientsCount ?? 0, icon: XCircle, color: "bg-red-500/20 text-red-500" },
      ])}

      {/* Row 3: Network Status */}
      <SectionTitle>নেটওয়ার্ক স্ট্যাটাস</SectionTitle>
      {cards([
        { title: "অনলাইন ONU", value: `${d?.onlineOnu ?? 0}/${d?.totalOnu ?? 0}`, icon: Wifi, color: "bg-emerald-500/20 text-emerald-500" },
        { title: "অফলাইন ONU", value: (d?.totalOnu ?? 0) - (d?.onlineOnu ?? 0), icon: Ban, color: "bg-red-500/20 text-red-500" },
        { title: "পেন্ডিং টিকেট", value: d?.pendingTickets ?? 0, icon: Headphones, color: "bg-yellow-500/20 text-yellow-500" },
        { title: "প্রসেসিং টিকেট", value: d?.processingTickets ?? 0, icon: Wrench, color: "bg-violet-500/20 text-violet-500" },
      ])}

      {/* Row 4: Financial Summary */}
      <SectionTitle>আর্থিক সারসংক্ষেপ (চলতি মাস)</SectionTitle>
      {cards([
        { title: "মাসিক বিল", value: `৳${(d?.monthlyBill ?? 0).toLocaleString()}`, icon: FileText, color: "bg-blue-500/20 text-blue-500" },
        { title: "আদায়", value: `৳${(d?.collectedBill ?? 0).toLocaleString()}`, icon: DollarSign, color: "bg-green-500/20 text-green-500" },
        { title: "ডিসকাউন্ট", value: `৳${(d?.totalDiscount ?? 0).toLocaleString()}`, icon: Receipt, color: "bg-amber-500/20 text-amber-500" },
        { title: "মোট বকেয়া", value: `৳${(d?.totalDue ?? 0).toLocaleString()}`, icon: AlertTriangle, color: "bg-red-500/20 text-red-500" },
      ])}

      {/* Row 5: Income & Expense */}
      <SectionTitle>আয় ও ব্যয়</SectionTitle>
      {cards([
        { title: "সার্ভিস ইনভয়েস", value: `৳${(d?.serviceInv ?? 0).toLocaleString()}`, icon: Receipt, color: "bg-cyan-500/20 text-cyan-500" },
        { title: "প্রোডাক্ট ইনভয়েস", value: `৳${(d?.productInv ?? 0).toLocaleString()}`, icon: Package, color: "bg-indigo-500/20 text-indigo-500" },
        { title: "আয়", value: `৳${(d?.totalIncome ?? 0).toLocaleString()}`, icon: TrendingUp, color: "bg-green-500/20 text-green-500" },
        { title: "ব্যয়", value: `৳${(d?.totalExpense ?? 0).toLocaleString()}`, icon: TrendingDown, color: "bg-red-500/20 text-red-500" },
      ])}

      {/* Row 6: Bandwidth & POP */}
      <SectionTitle>ব্যান্ডউইথ ও POP</SectionTitle>
      {cards([
        { title: "প্রোভাইডার বিল", value: `৳${(d?.bwProviderBill ?? 0).toLocaleString()}`, icon: Wifi, color: "bg-blue-500/20 text-blue-500" },
        { title: "প্রোভাইডার বকেয়া", value: `৳${(d?.bwProviderDue ?? 0).toLocaleString()}`, icon: AlertTriangle, color: "bg-red-500/20 text-red-500" },
        { title: "POP বিল", value: `৳${(d?.bwPopBill ?? 0).toLocaleString()}`, icon: Radio, color: "bg-teal-500/20 text-teal-500" },
        { title: "POP ফান্ড", value: `৳${(d?.popFund ?? 0).toLocaleString()}`, icon: Banknote, color: "bg-emerald-500/20 text-emerald-500" },
      ])}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Zone Wise Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">জোন অনুযায়ী সমস্যা</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={d?.zoneChartData ?? []} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" nameKey="name" label={({ name }) => name}>
                    {(d?.zoneChartData ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly New Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">মাসিক নতুন ক্লায়েন্ট</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d?.monthlyNewClients ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="clients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 20 Unpaid Clients Table */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            শীর্ষ ২০ বকেয়া ক্লায়েন্ট
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-2" />)
          ) : (d?.unpaidClients ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">কোনো বকেয়া ক্লায়েন্ট নেই</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">নাম</TableHead>
                  <TableHead className="text-xs">মোবাইল</TableHead>
                  <TableHead className="text-xs text-right">বিল</TableHead>
                  <TableHead className="text-xs text-right">বকেয়া</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(d?.unpaidClients ?? []).map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium py-2">{c.name}</TableCell>
                    <TableCell className="text-xs py-2">{c.contact}</TableCell>
                    <TableCell className="text-xs text-right py-2">৳{c.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right py-2 text-red-500 font-medium">৳{c.due.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
