import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserPlus, UserCheck, UserMinus, UserX, Home, ShieldCheck, Clock,
  XCircle, Ban, CalendarX, AlertTriangle, DollarSign, TrendingUp, TrendingDown,
  Wifi, Radio, Pause, Timer, ShieldAlert, CreditCard, Receipt, Banknote,
  Activity, FileText, ArrowDownToLine, ArrowUpFromLine, MessageSquare,
  Package, Truck, Building2, Wallet, CircleDollarSign, HandCoins, Landmark,
  ClipboardList, TicketCheck, ListTodo, Award
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Color Palette ───────────────────────────────
const CARD_STYLES = [
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-lime-600", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-fuchsia-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-white" },
  { bg: "bg-green-600", text: "text-white" },
];

const PIE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats-v3"],
    queryFn: async () => {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const monthStart = `${currentMonth}-01`;
      const today = now.toISOString().slice(0, 10);
      const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStart = lastMonth.toISOString().slice(0, 10);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);

      const [
        clientsAll, clientsActive, clientsInactive, clientsLeft,
        clientsPending, clientsSuspended, clientsExpired, clientsExtended, clientsGrace,
        thisMonthJoin, lastMonthJoin,
        homeClients, homeActive, homeExpired,
        billingThisMonth, billingLastMonth,
        billingToday, billingYesterday,
        incomeThisMonth, expenseThisMonth,
        incomeLastMonth, expenseLastMonth,
        latestBilling, upcomingExpire, latestExpired,
        onlineOnu,
        ticketsPending, ticketsProcessing,
        tasksPending, tasksProcessing,
        topDownloadersMonthly,
        supportTicketsZone,
        newClientsMonthly,
        unpaidClients,
        popCount,
        salaryThisMonth,
        smsBalance,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "inactive"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "left"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "expired"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "extended"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "grace"),
        supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", lastMonthStart).lte("created_at", lastMonthEnd),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("connection_type", "Home"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("connection_type", "Home").eq("status", "active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("connection_type", "Home").eq("status", "expired"),
        supabase.from("billing").select("amount, paid, status").gte("month", monthStart),
        supabase.from("billing").select("amount, paid, status").gte("month", lastMonthStart).lte("month", lastMonthEnd),
        supabase.from("billing").select("paid").eq("status", "paid").gte("pay_date", today),
        supabase.from("billing").select("paid").eq("status", "paid").gte("pay_date", yesterday).lt("pay_date", today),
        supabase.from("income_entries").select("amount").gte("income_date", monthStart),
        supabase.from("expense_entries").select("amount").gte("expense_date", monthStart),
        supabase.from("income_entries").select("amount").gte("income_date", lastMonthStart).lte("income_date", lastMonthEnd),
        supabase.from("expense_entries").select("amount").gte("expense_date", lastMonthStart).lte("expense_date", lastMonthEnd),
        supabase.from("billing").select("bill_id, amount, paid, status, client_id").order("created_at", { ascending: false }).limit(10),
        supabase.from("clients").select("id, client_id, name, monthly_bill, expire_date").eq("status", "active").not("expire_date", "is", null).order("expire_date", { ascending: true }).limit(10),
        supabase.from("clients").select("id, client_id, name, monthly_bill, expire_date").eq("status", "expired").order("expire_date", { ascending: false }).limit(10),
        supabase.from("onu_list").select("id, status"),
        // Tickets
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "processing"),
        // Tasks
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "processing"),
        // Top downloaders this month
        supabase.from("client_traffic_monthly").select("username, total_download, total_upload, client_id").eq("month", monthStart).order("total_download", { ascending: false }).limit(10),
        // Support tickets for zone chart
        supabase.from("support_tickets").select("zone_name, id").gte("created_at", monthStart),
        // New clients per month (last 6 months)
        supabase.from("clients").select("created_at").gte("created_at", new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
        // Unpaid clients
        supabase.from("billing").select("client_id, amount, paid, due, status").eq("status", "unpaid").gte("month", monthStart).order("amount", { ascending: false }).limit(20),
        // POP count
        supabase.from("bw_sale_pops").select("id", { count: "exact", head: true }),
        // Salary this month
        supabase.from("payroll").select("net_pay").gte("created_at", monthStart),
        // SMS balance (system_settings)
        supabase.from("system_settings").select("setting_value").eq("setting_key", "sms_balance").maybeSingle(),
      ]);

      // Fetch client names for latest billing
      const latestInvoices: { bill_id: string; amount: number; client_name: string; status: string }[] = [];
      if (latestBilling.data) {
        const cIds = [...new Set(latestBilling.data.map(b => b.client_id))];
        const { data: cData } = cIds.length > 0 ? await supabase.from("clients").select("id, name").in("id", cIds) : { data: [] };
        const cMap = new Map((cData || []).map(c => [c.id, c.name]));
        for (const b of latestBilling.data) {
          latestInvoices.push({
            bill_id: b.bill_id,
            amount: Number(b.amount) || 0,
            client_name: cMap.get(b.client_id) || "Unknown",
            status: b.status,
          });
        }
      }

      // Fetch client names for unpaid
      const unpaidList: { client_name: string; amount: number; due: number }[] = [];
      if (unpaidClients.data && unpaidClients.data.length > 0) {
        const uIds = [...new Set(unpaidClients.data.map(b => b.client_id))];
        const { data: uData } = await supabase.from("clients").select("id, name").in("id", uIds);
        const uMap = new Map((uData || []).map(c => [c.id, c.name]));
        for (const b of unpaidClients.data) {
          unpaidList.push({
            client_name: uMap.get(b.client_id) || "Unknown",
            amount: Number(b.amount) || 0,
            due: Number(b.due) || Number(b.amount) || 0,
          });
        }
      }

      // Fetch client names for top downloaders
      const topDownloaders: { username: string; download: number; upload: number; client_name: string }[] = [];
      if (topDownloadersMonthly.data && topDownloadersMonthly.data.length > 0) {
        const dlIds = topDownloadersMonthly.data.map(d => d.client_id).filter(Boolean);
        const { data: dlClients } = dlIds.length > 0 ? await supabase.from("clients").select("id, name").in("id", dlIds) : { data: [] };
        const dlMap = new Map((dlClients || []).map(c => [c.id, c.name]));
        for (const d of topDownloadersMonthly.data) {
          topDownloaders.push({
            username: d.username || "—",
            download: Number(d.total_download) || 0,
            upload: Number(d.total_upload) || 0,
            client_name: dlMap.get(d.client_id) || d.username || "—",
          });
        }
      }

      // Zone-wise problem chart
      const zoneProblems: Record<string, number> = {};
      if (supportTicketsZone.data) {
        for (const t of supportTicketsZone.data) {
          const zone = (t as any).zone_name || "Unknown";
          zoneProblems[zone] = (zoneProblems[zone] || 0) + 1;
        }
      }
      const zoneProblemChart = Object.entries(zoneProblems).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

      // Monthly new client chart (last 6 months)
      const monthlyNewClients: Record<string, number> = {};
      if (newClientsMonthly.data) {
        for (const c of newClientsMonthly.data) {
          const m = (c.created_at || "").slice(0, 7);
          monthlyNewClients[m] = (monthlyNewClients[m] || 0) + 1;
        }
      }
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const newClientChart = Object.entries(monthlyNewClients).sort().map(([m, count]) => {
        const [y, mo] = m.split("-");
        return { name: `${monthNames[parseInt(mo) - 1]} ${y.slice(2)}`, count };
      });

      const sum = (arr: any[] | null) => (arr || []).reduce((s, e) => s + (Number(e.amount || e.paid || e.net_pay) || 0), 0);
      const onuData = onlineOnu.data ?? [];
      const billingTM = billingThisMonth.data ?? [];
      const dueCount = billingTM.filter(b => b.status === "unpaid").length;
      const paidCount = billingTM.filter(b => b.status === "paid").length;
      const partialCount = billingTM.filter(b => b.status === "partial").length;

      const totalBillAmount = billingTM.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const totalPaidAmount = billingTM.filter(b => b.status === "paid" || b.status === "partial").reduce((s, b) => s + (Number(b.paid) || 0), 0);
      const totalDueAmount = totalBillAmount - totalPaidAmount;
      const totalDiscount = billingTM.reduce((s, b) => s + (Number((b as any).discount) || 0), 0);

      const thisMonthSales = billingTM.filter(b => b.status === "paid").reduce((s, b) => s + (Number(b.paid) || 0), 0);
      const lastMonthSales = (billingLastMonth.data ?? []).filter(b => b.status === "paid").reduce((s, b) => s + (Number(b.paid) || 0), 0);

      const incTM = sum(incomeThisMonth.data);
      const expTM = sum(expenseThisMonth.data);
      const incLM = sum(incomeLastMonth.data);
      const expLM = sum(expenseLastMonth.data);

      return {
        totalClients: clientsAll.count ?? 0,
        thisMonthJoin: thisMonthJoin.count ?? 0,
        lastMonthJoin: lastMonthJoin.count ?? 0,
        homeClients: homeClients.count ?? 0,
        totalActive: clientsActive.count ?? 0,
        homeActive: homeActive.count ?? 0,
        totalExpired: clientsExpired.count ?? 0,
        homeExpired: homeExpired.count ?? 0,
        pendingClients: clientsPending.count ?? 0,
        leftClients: clientsLeft.count ?? 0,
        extendedClients: clientsExtended.count ?? 0,
        graceClients: clientsGrace.count ?? 0,
        dueClients: dueCount,
        paidClients: paidCount,
        partialClients: partialCount,
        billingClients: billingTM.length,
        suspendClients: clientsSuspended.count ?? 0,
        inactiveClients: clientsInactive.count ?? 0,
        todaySales: sum(billingToday.data),
        yesterdaySales: sum(billingYesterday.data),
        thisMonthSales,
        lastMonthSales,
        thisMonthProfit: incTM - expTM,
        lastMonthProfit: incLM - expLM,
        onlineOnu: onuData.filter(o => o.status === "online").length,
        totalOnu: onuData.length,
        totalPop: popCount.count ?? 0,
        totalBillAmount,
        totalPaidAmount,
        totalDueAmount,
        totalDiscount,
        incTM, expTM,
        paidSalary: sum(salaryThisMonth.data),
        smsBalance: smsBalance.data?.value || "0",
        pendingTickets: ticketsPending.count ?? 0,
        processingTickets: ticketsProcessing.count ?? 0,
        pendingTasks: tasksPending.count ?? 0,
        processingTasks: tasksProcessing.count ?? 0,
        latestInvoices,
        upcomingExpire: (upcomingExpire.data ?? []).map(c => ({
          client_id: c.client_id,
          name: c.name,
          bill: Number(c.monthly_bill) || 0,
          expire: c.expire_date || "",
        })),
        latestExpired: (latestExpired.data ?? []).map(c => ({
          client_id: c.client_id,
          name: c.name,
          bill: Number(c.monthly_bill) || 0,
          expire: c.expire_date || "",
        })),
        topDownloaders,
        zoneProblemChart,
        newClientChart,
        unpaidList,
      };
    },
    refetchInterval: 30000,
  });
}

// ─── Stat Card ────────────────────────────────────
function StatCard({ title, value, icon: Icon, colorIndex }: {
  title: string; value: string | number; icon: React.ElementType; colorIndex: number;
}) {
  const style = CARD_STYLES[colorIndex % CARD_STYLES.length];
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${style.bg} ${style.text} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{title}</p>
            <p className="text-lg sm:text-xl font-bold tracking-tight leading-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-12" /></div>
      </div>
    </CardContent></Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2 first:mt-0">{children}</h2>;
}

const Dashboard = () => {
  const { data: d, isLoading } = useStats();

  const renderCards = (items: { title: string; value: string | number; icon: React.ElementType; colorIndex: number }[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
      {isLoading ? Array.from({ length: items.length }).map((_, i) => <StatSkeleton key={i} />) :
        items.map((item, i) => <StatCard key={i} {...item} />)}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground text-sm">ISP ERP ওভারভিউ</p>
      </div>

      {/* Row 1: Client Overview */}
      <SectionTitle>ক্লায়েন্ট ওভারভিউ</SectionTitle>
      {renderCards([
        { title: "মোট ক্লায়েন্ট", value: d?.totalClients ?? 0, icon: Users, colorIndex: 0 },
        { title: "এই মাসে যোগ", value: d?.thisMonthJoin ?? 0, icon: UserPlus, colorIndex: 1 },
        { title: "গত মাসে যোগ", value: d?.lastMonthJoin ?? 0, icon: UserPlus, colorIndex: 2 },
        { title: "হোম ক্লায়েন্ট", value: d?.homeClients ?? 0, icon: Home, colorIndex: 3 },
        { title: "সচল ক্লায়েন্ট", value: d?.totalActive ?? 0, icon: UserCheck, colorIndex: 4 },
        { title: "হোম অ্যাক্টিভ", value: d?.homeActive ?? 0, icon: Home, colorIndex: 5 },
      ])}

      {/* Row 2: Status Breakdown */}
      <SectionTitle>ক্লায়েন্ট স্ট্যাটাস</SectionTitle>
      {renderCards([
        { title: "মোট এক্সপায়ার্ড", value: d?.totalExpired ?? 0, icon: CalendarX, colorIndex: 0 },
        { title: "হোম এক্সপায়ার্ড", value: d?.homeExpired ?? 0, icon: CalendarX, colorIndex: 3 },
        { title: "পেন্ডিং ক্লায়েন্ট", value: d?.pendingClients ?? 0, icon: Clock, colorIndex: 1 },
        { title: "বাতিল ক্লায়েন্ট", value: d?.leftClients ?? 0, icon: UserX, colorIndex: 0 },
        { title: "এক্সটেন্ডেড", value: d?.extendedClients ?? 0, icon: Timer, colorIndex: 4 },
        { title: "গ্রেস ক্লায়েন্ট", value: d?.graceClients ?? 0, icon: Pause, colorIndex: 5 },
        { title: "সাসপেন্ড", value: d?.suspendClients ?? 0, icon: Ban, colorIndex: 0 },
        { title: "নিষ্ক্রিয়", value: d?.inactiveClients ?? 0, icon: XCircle, colorIndex: 6 },
      ])}

      {/* Row 3: Billing Stats */}
      <SectionTitle>বিলিং স্ট্যাটাস</SectionTitle>
      {renderCards([
        { title: "বিলিং ক্লায়েন্ট", value: d?.billingClients ?? 0, icon: FileText, colorIndex: 1 },
        { title: "পেইড ক্লায়েন্ট", value: d?.paidClients ?? 0, icon: UserCheck, colorIndex: 2 },
        { title: "আংশিক পেইড", value: d?.partialClients ?? 0, icon: CreditCard, colorIndex: 3 },
        { title: "বকেয়া ক্লায়েন্ট", value: d?.dueClients ?? 0, icon: AlertTriangle, colorIndex: 0 },
        { title: "অনলাইন ONU", value: `${d?.onlineOnu ?? 0}/${d?.totalOnu ?? 0}`, icon: Wifi, colorIndex: 2 },
        { title: "মোট POP", value: d?.totalPop ?? 0, icon: Radio, colorIndex: 8 },
      ])}

      {/* Row 4: Sales & Financial */}
      <SectionTitle>বিক্রয় ও আর্থিক</SectionTitle>
      {renderCards([
        { title: "আজকের সেল", value: `৳${(d?.todaySales ?? 0).toLocaleString()}`, icon: DollarSign, colorIndex: 2 },
        { title: "গতকালের সেল", value: `৳${(d?.yesterdaySales ?? 0).toLocaleString()}`, icon: DollarSign, colorIndex: 7 },
        { title: "এই মাসের সেল", value: `৳${(d?.thisMonthSales ?? 0).toLocaleString()}`, icon: CreditCard, colorIndex: 1 },
        { title: "গত মাসের সেল", value: `৳${(d?.lastMonthSales ?? 0).toLocaleString()}`, icon: Receipt, colorIndex: 4 },
        { title: "এই মাসের মুনাফা", value: `৳${(d?.thisMonthProfit ?? 0).toLocaleString()}`, icon: TrendingUp, colorIndex: 2 },
        { title: "গত মাসের মুনাফা", value: `৳${(d?.lastMonthProfit ?? 0).toLocaleString()}`, icon: TrendingDown, colorIndex: 0 },
      ])}

      {/* Row 5: Financial Details */}
      <SectionTitle>আর্থিক বিবরণ</SectionTitle>
      {renderCards([
        { title: "মোট বিল (এই মাস)", value: `৳${(d?.totalBillAmount ?? 0).toLocaleString()}`, icon: FileText, colorIndex: 1 },
        { title: "কালেক্টেড বিল", value: `৳${(d?.totalPaidAmount ?? 0).toLocaleString()}`, icon: HandCoins, colorIndex: 2 },
        { title: "মোট ডিসকাউন্ট", value: `৳${(d?.totalDiscount ?? 0).toLocaleString()}`, icon: CircleDollarSign, colorIndex: 3 },
        { title: "মোট বকেয়া", value: `৳${(d?.totalDueAmount ?? 0).toLocaleString()}`, icon: AlertTriangle, colorIndex: 0 },
        { title: "আয় (এই মাস)", value: `৳${(d?.incTM ?? 0).toLocaleString()}`, icon: TrendingUp, colorIndex: 2 },
        { title: "ব্যয় (এই মাস)", value: `৳${(d?.expTM ?? 0).toLocaleString()}`, icon: TrendingDown, colorIndex: 0 },
        { title: "বেতন পরিশোধ", value: `৳${(d?.paidSalary ?? 0).toLocaleString()}`, icon: Wallet, colorIndex: 4 },
        { title: "SMS ব্যালেন্স", value: d?.smsBalance ?? "0", icon: MessageSquare, colorIndex: 5 },
      ])}

      {/* Row 6: Tickets & Tasks */}
      <SectionTitle>সাপোর্ট ও টাস্ক</SectionTitle>
      {renderCards([
        { title: "পেন্ডিং টিকেট", value: d?.pendingTickets ?? 0, icon: ClipboardList, colorIndex: 3 },
        { title: "প্রক্রিয়াধীন টিকেট", value: d?.processingTickets ?? 0, icon: TicketCheck, colorIndex: 1 },
        { title: "পেন্ডিং টাস্ক", value: d?.pendingTasks ?? 0, icon: ListTodo, colorIndex: 7 },
        { title: "প্রক্রিয়াধীন টাস্ক", value: d?.processingTasks ?? 0, icon: Activity, colorIndex: 9 },
      ])}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {/* Monthly New Clients Chart */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-500" />
              মাসিক নতুন ক্লায়েন্ট
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={d?.newClientChart || []}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="নতুন ক্লায়েন্ট" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Zone Problem Chart */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              জোন ভিত্তিক সমস্যা (এই মাস)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? <Skeleton className="h-48 w-full" /> : (d?.zoneProblemChart?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={d?.zoneProblemChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {(d?.zoneProblemChart || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-12">ডেটা নেই</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Downloaders + Unpaid Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Top Downloaders */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
              মাসিক টপ ডাউনলোডার
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1.5" />) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-1.5">#</TableHead>
                    <TableHead className="text-xs py-1.5">User</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Download</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Upload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.topDownloaders ?? []).length > 0 ? (d?.topDownloaders ?? []).map((dl, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5 font-bold">{i + 1}</TableCell>
                      <TableCell className="text-xs py-1.5">{dl.client_name}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono text-emerald-500">{formatBytes(dl.download)}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono text-blue-500">{formatBytes(dl.upload)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-xs text-center py-4 text-muted-foreground">ডেটা নেই — traffic collection চালু করুন</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Unpaid */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              টপ ২০ বকেয়া ক্লায়েন্ট
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1.5" />) : (
              <div className="max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs py-1.5">#</TableHead>
                      <TableHead className="text-xs py-1.5">নাম</TableHead>
                      <TableHead className="text-xs text-right py-1.5">বিল</TableHead>
                      <TableHead className="text-xs text-right py-1.5">বকেয়া</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.unpaidList ?? []).length > 0 ? (d?.unpaidList ?? []).map((u, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs py-1.5">{i + 1}</TableCell>
                        <TableCell className="text-xs py-1.5">{u.client_name}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right">৳{u.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs py-1.5 text-right text-red-500 font-semibold">৳{u.due.toLocaleString()}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-xs text-center py-4 text-muted-foreground">কোনো বকেয়া নেই</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Latest Invoices */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              সর্বশেষ ইনভয়েস
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1.5" />)
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-1.5">Inv No</TableHead>
                    <TableHead className="text-xs py-1.5">User</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.latestInvoices ?? []).map((inv, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5 font-mono">{inv.bill_id}</TableCell>
                      <TableCell className="text-xs py-1.5">{inv.client_name}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">৳{inv.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(d?.latestInvoices ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-xs text-center py-4 text-muted-foreground">কোনো ইনভয়েস নেই</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Expire */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              আসন্ন মেয়াদোত্তীর্ণ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1.5" />)
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-1.5">Username</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Bill</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Expire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.upcomingExpire ?? []).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">৳{c.bill.toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono">{c.expire}</TableCell>
                    </TableRow>
                  ))}
                  {(d?.upcomingExpire ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-xs text-center py-4 text-muted-foreground">কোনো ডেটা নেই</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Latest Expired */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarX className="h-4 w-4 text-red-500" />
              সর্বশেষ মেয়াদোত্তীর্ণ
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full mb-1.5" />)
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-1.5">Username</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Bill</TableHead>
                    <TableHead className="text-xs text-right py-1.5">Expired</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.latestExpired ?? []).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5">{c.name}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right">৳{c.bill.toLocaleString()}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono text-red-500">{c.expire}</TableCell>
                    </TableRow>
                  ))}
                  {(d?.latestExpired ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-xs text-center py-4 text-muted-foreground">কোনো ডেটা নেই</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
