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
  ClipboardList, TicketCheck, ListTodo, Award, Globe, Share2, Network
} from "lucide-react";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { resolveIcons8 } from "@/lib/iconResolver";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// ─── Vuexy-style light-bg color palette ───────────────────────────────
const CARD_STYLES = [
  { bg: "bg-red-500/10", text: "text-red-500" },
  { bg: "bg-blue-500/10", text: "text-blue-500" },
  { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  { bg: "bg-amber-500/10", text: "text-amber-500" },
  { bg: "bg-violet-500/10", text: "text-violet-500" },
  { bg: "bg-pink-500/10", text: "text-pink-500" },
  { bg: "bg-cyan-500/10", text: "text-cyan-500" },
  { bg: "bg-orange-500/10", text: "text-orange-500" },
  { bg: "bg-teal-500/10", text: "text-teal-500" },
  { bg: "bg-indigo-500/10", text: "text-indigo-500" },
  { bg: "bg-rose-500/10", text: "text-rose-500" },
  { bg: "bg-lime-600/10", text: "text-lime-600" },
  { bg: "bg-sky-500/10", text: "text-sky-500" },
  { bg: "bg-fuchsia-500/10", text: "text-fuchsia-500" },
  { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  { bg: "bg-green-600/10", text: "text-green-600" },
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
        corporateClients, corporateActive,
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
        billingActiveClients, freeClients, personalClients, vipClients,
        popManagersAll, popClientsAll, bwResellerUsers, bwResellerParents,
        mikrotikDisabledClients, activeBillingDateClients, currentMonthBilling,
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
        // Home/Corporate counts based on client_type (Home / Corporate)
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "Home"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "Home").eq("status", "active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "Home").eq("status", "expired"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "Corporate"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("client_type", "Corporate").eq("status", "active"),
        supabase.from("billing").select("amount, paid, status").gte("month", monthStart),
        supabase.from("billing").select("amount, paid, status").gte("month", lastMonthStart).lte("month", lastMonthEnd),
        // Today/yesterday sales: read from bill_collections (source of truth — works regardless of billing.status flip)
        supabase.from("bill_collections").select("amount").eq("status", "approved").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
        supabase.from("bill_collections").select("amount").eq("status", "approved").gte("created_at", `${yesterday}T00:00:00`).lte("created_at", `${yesterday}T23:59:59`),
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
        // Billing-type breakdown (case-insensitive via ilike)
        supabase.from("clients").select("id", { count: "exact", head: true }).ilike("billing_status", "Active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).ilike("billing_status", "Free"),
        supabase.from("clients").select("id", { count: "exact", head: true }).ilike("billing_status", "Personal"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_vip", true),
        // POP managers (all + by type)
        supabase.from("branch_managers").select("id, pop_type, status, branch_id"),
        // Clients with branch_id (POP-attached) + status
        supabase.from("clients").select("id, status, branch_id").not("branch_id", "is", null),
        // BW reseller portal users
        supabase.from("bw_reseller_users").select("id, status, reseller_id"),
        // Distinct parent reseller_ids that have sub-users (BW resellers acting as their own resellers)
        supabase.from("bw_reseller_users").select("reseller_id"),
        // MikroTik-disabled clients (router-side state)
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("mikrotik_status", "disabled"),
        // Active clients whose billing date has already passed (in current month)
        supabase.from("clients").select("id, billing_date, expire_date, is_vip, status").ilike("status", "active").eq("is_vip", false),
        // Current-month billing rows for overdue calculation
        supabase.from("billing").select("client_id, status, due, amount, paid").eq("month", currentMonth),
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

      // POP/BW Pop breakdown
      const popMgrs = popManagersAll.data ?? [];
      const totalPopMgrs = popMgrs.length;
      const bwPopMgrs = popMgrs.filter((p: any) => (p.pop_type || "").toLowerCase() === "bandwidth").length;
      const regularPopMgrs = totalPopMgrs - bwPopMgrs;
      const popBranchIds = new Set(popMgrs.map((p: any) => p.branch_id).filter(Boolean));
      const popClientsRows = (popClientsAll.data ?? []).filter((c: any) => popBranchIds.has(c.branch_id));
      const popTotalClients = popClientsRows.length;
      const popActiveClients = popClientsRows.filter((c: any) => c.status === "active").length;
      const popInactiveClients = popTotalClients - popActiveClients;

      // BW Reseller portal users
      const bwUsers = bwResellerUsers.data ?? [];
      const bwTotalUsers = bwUsers.length;
      const bwActiveUsers = bwUsers.filter((u: any) => u.status === "active").length;
      const bwInactiveUsers = bwTotalUsers - bwActiveUsers;
      const bwParentResellers = new Set((bwResellerParents.data ?? []).map((r: any) => r.reseller_id).filter(Boolean)).size;

      // ── Merged-card metrics ─────────────────────────────────────────
      // Today day-of-month for billing_date comparison
      const todayDay = now.getDate();
      const todayDateStr = today; // YYYY-MM-DD

      // Build map of current-month billing rows by client_id
      const billingByClient = new Map<string, { paid: number; due: number; amount: number; status: string }>();
      for (const b of currentMonthBilling.data ?? []) {
        const paid = Number((b as any).paid || 0);
        const amount = Number((b as any).amount || 0);
        const due = (b as any).due != null ? Number((b as any).due) : Math.max(0, amount - paid);
        billingByClient.set((b as any).client_id, { paid, amount, due, status: (b as any).status });
      }

      // Overdue billing: active, billing_date passed, not VIP, current-month due > 0 (or no bill row)
      let overdueBillingCount = 0;
      for (const c of activeBillingDateClients.data ?? []) {
        if ((c as any).is_vip) continue;
        const bd = Number((c as any).billing_date || 0);
        if (!bd || bd > todayDay) continue;
        // Skip if expire_date is in the future (still has time)
        if ((c as any).expire_date && (c as any).expire_date > todayDateStr) continue;
        const b = billingByClient.get((c as any).id);
        if (b) {
          if (b.paid > 0 && b.due <= 0) continue; // paid in full
          overdueBillingCount++;
        } else {
          // No bill row this month yet — count as overdue
          overdueBillingCount++;
        }
      }

      // Blocked line: MikroTik disabled OR status=suspended
      const mikrotikDisabledCount = mikrotikDisabledClients.count ?? 0;
      const blockedLineCount = mikrotikDisabledCount + (clientsSuspended.count ?? 0);

      // Inactive/Left: union of clients.status in (inactive, left)
      const inactiveLeftCount = (clientsInactive.count ?? 0) + (clientsLeft.count ?? 0);

      // Extension/Grace
      const extensionGraceCount = (clientsExtended.count ?? 0) + (clientsGrace.count ?? 0);


      return {
        totalClients: clientsAll.count ?? 0,
        thisMonthJoin: thisMonthJoin.count ?? 0,
        lastMonthJoin: lastMonthJoin.count ?? 0,
        homeClients: homeClients.count ?? 0,
        corporateClients: corporateClients.count ?? 0,
        corporateActive: corporateActive.count ?? 0,
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
        billingClients: billingActiveClients.count ?? 0,
        freeClients: freeClients.count ?? 0,
        personalClients: personalClients.count ?? 0,
        vipClients: vipClients.count ?? 0,
        billingMonthRows: billingTM.length,
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
        smsBalance: smsBalance.data?.setting_value || "0",
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
        totalPopMgrs, bwPopMgrs, regularPopMgrs,
        popTotalClients, popActiveClients, popInactiveClients,
        bwTotalUsers, bwActiveUsers, bwInactiveUsers, bwParentResellers,
        // ── Merged status metrics ──
        overdueBillingCount,
        blockedLineCount,
        mikrotikDisabledCount,
        inactiveLeftCount,
        extensionGraceCount,
      };
    },
    refetchInterval: 120000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// ─── Stat Card ────────────────────────────────────
function StatCard({ title, value, icon: Icon, colorIndex, icons8 }: {
  title: string; value: string | number; icon: React.ElementType; colorIndex: number; icons8?: string;
}) {
  const style = CARD_STYLES[colorIndex % CARD_STYLES.length];
  const resolved = icons8 || resolveIcons8({ title });
  const useIcons8 = hasIcons8Icon(resolved);
  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${style.bg} ${style.text} shrink-0 flex items-center justify-center`}>
            {useIcons8 ? (
              <Icons8Icon name={resolved!} size={28} />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight leading-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{title}</p>
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

function SectionCard({
  title, icon: Icon, tint, children, icons8,
}: {
  title: string;
  icon: React.ElementType;
  tint: string; // e.g. "blue" | "emerald" | "amber" | ...
  children: React.ReactNode;
  icons8?: string;
}) {
  // Map tint name → tailwind classes (must be literal for JIT)
  const tintMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    blue:    { bg: "bg-blue-500/5",    border: "border-blue-500/20",    text: "text-blue-600 dark:text-blue-400",       iconBg: "bg-blue-500/15" },
    emerald: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-500/15" },
    amber:   { bg: "bg-amber-500/5",   border: "border-amber-500/20",   text: "text-amber-600 dark:text-amber-400",     iconBg: "bg-amber-500/15" },
    violet:  { bg: "bg-violet-500/5",  border: "border-violet-500/20",  text: "text-violet-600 dark:text-violet-400",   iconBg: "bg-violet-500/15" },
    cyan:    { bg: "bg-cyan-500/5",    border: "border-cyan-500/20",    text: "text-cyan-600 dark:text-cyan-400",       iconBg: "bg-cyan-500/15" },
    pink:    { bg: "bg-pink-500/5",    border: "border-pink-500/20",    text: "text-pink-600 dark:text-pink-400",       iconBg: "bg-pink-500/15" },
    orange:  { bg: "bg-orange-500/5",  border: "border-orange-500/20",  text: "text-orange-600 dark:text-orange-400",   iconBg: "bg-orange-500/15" },
    teal:    { bg: "bg-teal-500/5",    border: "border-teal-500/20",    text: "text-teal-600 dark:text-teal-400",       iconBg: "bg-teal-500/15" },
  };
  const t = tintMap[tint] || tintMap.blue;
  const useIcons8 = hasIcons8Icon(icons8);
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} p-3 sm:p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md ${t.iconBg} ${t.text} flex items-center justify-center group`}>
          {useIcons8 ? (
            <Icons8Icon name={icons8!} size={22} />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${t.text}`}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

const Dashboard = () => {
  const { data: d, isLoading } = useStats();

  const renderCards = (items: { title: string; value: string | number; icon: React.ElementType; colorIndex: number; icons8?: string }[]) => (
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
      <SectionCard title="ক্লায়েন্ট ওভারভিউ" icon={Users} tint="blue" icons8="people">
        {renderCards([
          { title: "মোট ক্লায়েন্ট", value: d?.totalClients ?? 0, icon: Users, colorIndex: 0, icons8: "people" },
          { title: "এই মাসে যোগ", value: d?.thisMonthJoin ?? 0, icon: UserPlus, colorIndex: 1, icons8: "add-user-male" },
          { title: "গত মাসে যোগ", value: d?.lastMonthJoin ?? 0, icon: UserPlus, colorIndex: 2, icons8: "add-user-male" },
          { title: "হোম ক্লায়েন্ট", value: d?.homeClients ?? 0, icon: Home, colorIndex: 3, icons8: "home" },
          { title: "কর্পোরেট ক্লায়েন্ট", value: d?.corporateClients ?? 0, icon: Building2, colorIndex: 4, icons8: "company" },
          { title: "সচল ক্লায়েন্ট", value: d?.totalActive ?? 0, icon: UserCheck, colorIndex: 5, icons8: "checked" },
          { title: "হোম অ্যাক্টিভ", value: d?.homeActive ?? 0, icon: Home, colorIndex: 6, icons8: "home" },
          { title: "বিলিং ক্লায়েন্ট", value: d?.billingClients ?? 0, icon: FileText, colorIndex: 1, icons8: "documents" },
          { title: "ফ্রি ক্লায়েন্ট", value: d?.freeClients ?? 0, icon: ShieldCheck, colorIndex: 6, icons8: "guarantee" },
          { title: "পার্সোনাল ক্লায়েন্ট", value: d?.personalClients ?? 0, icon: UserCheck, colorIndex: 7, icons8: "checked" },
          { title: "VIP ক্লায়েন্ট", value: d?.vipClients ?? 0, icon: Award, colorIndex: 11, icons8: "trophy" },
        ])}
      </SectionCard>

      {/* Row 2: Status Breakdown */}
      <SectionCard title="ক্লায়েন্ট স্ট্যাটাস" icon={Activity} tint="emerald" icons8="combo-chart">
        {renderCards([
          { title: "মোট এক্সপায়ার্ড", value: d?.totalExpired ?? 0, icon: CalendarX, colorIndex: 0, icons8: "high-priority" },
          { title: "হোম এক্সপায়ার্ড", value: d?.homeExpired ?? 0, icon: CalendarX, colorIndex: 3, icons8: "high-priority" },
          { title: "পেন্ডিং ক্লায়েন্ট", value: d?.pendingClients ?? 0, icon: Clock, colorIndex: 1, icons8: "alarm-clock" },
          { title: "বাতিল ক্লায়েন্ট", value: d?.leftClients ?? 0, icon: UserX, colorIndex: 0, icons8: "cancel" },
          { title: "এক্সটেন্ডেড", value: d?.extendedClients ?? 0, icon: Timer, colorIndex: 4, icons8: "alarm-clock" },
          { title: "গ্রেস ক্লায়েন্ট", value: d?.graceClients ?? 0, icon: Pause, colorIndex: 5, icons8: "alarm-clock" },
          { title: "সাসপেন্ড", value: d?.suspendClients ?? 0, icon: Ban, colorIndex: 0, icons8: "cancel" },
          { title: "নিষ্ক্রিয়", value: d?.inactiveClients ?? 0, icon: XCircle, colorIndex: 6, icons8: "cancel" },
        ])}
      </SectionCard>

      {/* Row 3: Billing Stats */}
      <SectionCard title="বিলিং স্ট্যাটাস" icon={CreditCard} tint="amber" icons8="documents">
        {renderCards([
          { title: "বিলিং ক্লায়েন্ট", value: d?.billingClients ?? 0, icon: FileText, colorIndex: 1, icons8: "documents" },
          { title: "পেইড ক্লায়েন্ট", value: d?.paidClients ?? 0, icon: UserCheck, colorIndex: 2, icons8: "checked" },
          { title: "আংশিক পেইড", value: d?.partialClients ?? 0, icon: CreditCard, colorIndex: 3, icons8: "coins" },
          { title: "বকেয়া ক্লায়েন্ট", value: d?.dueClients ?? 0, icon: AlertTriangle, colorIndex: 0, icons8: "high-priority" },
          { title: "অনলাইন ONU", value: `${d?.onlineOnu ?? 0}/${d?.totalOnu ?? 0}`, icon: Wifi, colorIndex: 2, icons8: "wi-fi-connected" },
          { title: "মোট POP", value: d?.totalPop ?? 0, icon: Radio, colorIndex: 8, icons8: "router-symbol" },
        ])}
      </SectionCard>

      {/* NEW: POP & BW Network */}
      <SectionCard title="POP ও BW নেটওয়ার্ক" icon={Network} tint="cyan" icons8="internet">
        {renderCards([
          { title: "মোট POP ম্যানেজার", value: d?.totalPopMgrs ?? 0, icon: Building2, colorIndex: 6, icons8: "city-buildings" },
          { title: "BW রিসেলার POP", value: d?.bwPopMgrs ?? 0, icon: Share2, colorIndex: 13, icons8: "mac-client" },
          { title: "রেগুলার POP", value: d?.regularPopMgrs ?? 0, icon: Radio, colorIndex: 1, icons8: "router-symbol" },
          { title: "POP মোট ক্লায়েন্ট", value: d?.popTotalClients ?? 0, icon: Users, colorIndex: 9, icons8: "people" },
          { title: "POP অ্যাক্টিভ ক্লায়েন্ট", value: d?.popActiveClients ?? 0, icon: UserCheck, colorIndex: 2, icons8: "checked" },
          { title: "POP ইন-অ্যাক্টিভ", value: d?.popInactiveClients ?? 0, icon: UserX, colorIndex: 0, icons8: "cancel" },
        ])}
      </SectionCard>

      {/* NEW: BW Reseller Portal */}
      <SectionCard title="BW রিসেলার পোর্টাল" icon={Globe} tint="pink" icons8="data-transfer">
        {renderCards([
          { title: "মোট পোর্টাল ইউজার", value: d?.bwTotalUsers ?? 0, icon: Users, colorIndex: 5, icons8: "people" },
          { title: "অ্যাক্টিভ ইউজার", value: d?.bwActiveUsers ?? 0, icon: UserCheck, colorIndex: 2, icons8: "checked" },
          { title: "ইন-অ্যাক্টিভ ইউজার", value: d?.bwInactiveUsers ?? 0, icon: UserX, colorIndex: 0, icons8: "cancel" },
          { title: "সাব-রিসেলার দিয়েছে", value: d?.bwParentResellers ?? 0, icon: Share2, colorIndex: 13, icons8: "mac-client" },
        ])}
      </SectionCard>

      {/* Row 4: Sales & Financial */}
      <SectionCard title="বিক্রয় ও আর্থিক" icon={DollarSign} tint="violet" icons8="profit">
        {renderCards([
          { title: "আজকের সেল", value: `৳${(d?.todaySales ?? 0).toLocaleString()}`, icon: DollarSign, colorIndex: 2, icons8: "coins" },
          { title: "গতকালের সেল", value: `৳${(d?.yesterdaySales ?? 0).toLocaleString()}`, icon: DollarSign, colorIndex: 7, icons8: "coins" },
          { title: "এই মাসের সেল", value: `৳${(d?.thisMonthSales ?? 0).toLocaleString()}`, icon: CreditCard, colorIndex: 1, icons8: "money" },
          { title: "গত মাসের সেল", value: `৳${(d?.lastMonthSales ?? 0).toLocaleString()}`, icon: Receipt, colorIndex: 4, icons8: "money" },
          { title: "এই মাসের মুনাফা", value: `৳${(d?.thisMonthProfit ?? 0).toLocaleString()}`, icon: TrendingUp, colorIndex: 2, icons8: "positive-dynamic" },
          { title: "গত মাসের মুনাফা", value: `৳${(d?.lastMonthProfit ?? 0).toLocaleString()}`, icon: TrendingDown, colorIndex: 0, icons8: "profit" },
        ])}
      </SectionCard>

      {/* Row 5: Financial Details */}
      <SectionCard title="আর্থিক বিবরণ" icon={Landmark} tint="teal" icons8="calculator">
        {renderCards([
          { title: "মোট বিল (এই মাস)", value: `৳${(d?.totalBillAmount ?? 0).toLocaleString()}`, icon: FileText, colorIndex: 1, icons8: "documents" },
          { title: "কালেক্টেড বিল", value: `৳${(d?.totalPaidAmount ?? 0).toLocaleString()}`, icon: HandCoins, colorIndex: 2, icons8: "coins" },
          { title: "মোট ডিসকাউন্ট", value: `৳${(d?.totalDiscount ?? 0).toLocaleString()}`, icon: CircleDollarSign, colorIndex: 3, icons8: "discount" },
          { title: "মোট বকেয়া", value: `৳${(d?.totalDueAmount ?? 0).toLocaleString()}`, icon: AlertTriangle, colorIndex: 0, icons8: "high-priority" },
          { title: "আয় (এই মাস)", value: `৳${(d?.incTM ?? 0).toLocaleString()}`, icon: TrendingUp, colorIndex: 2, icons8: "profit" },
          { title: "ব্যয় (এই মাস)", value: `৳${(d?.expTM ?? 0).toLocaleString()}`, icon: TrendingDown, colorIndex: 0, icons8: "cancel" },
          { title: "বেতন পরিশোধ", value: `৳${(d?.paidSalary ?? 0).toLocaleString()}`, icon: Wallet, colorIndex: 4, icons8: "money" },
          { title: "SMS ব্যালেন্স", value: String(d?.smsBalance ?? "0"), icon: MessageSquare, colorIndex: 5, icons8: "sms" },
        ])}
      </SectionCard>

      {/* Row 6: Tickets & Tasks */}
      <SectionCard title="সাপোর্ট ও টাস্ক" icon={ClipboardList} tint="orange" icons8="online-support">
        {renderCards([
          { title: "পেন্ডিং টিকেট", value: d?.pendingTickets ?? 0, icon: ClipboardList, colorIndex: 3, icons8: "online-support" },
          { title: "প্রক্রিয়াধীন টিকেট", value: d?.processingTickets ?? 0, icon: TicketCheck, colorIndex: 1, icons8: "online-support" },
          { title: "পেন্ডিং টাস্ক", value: d?.pendingTasks ?? 0, icon: ListTodo, colorIndex: 7, icons8: "to-do-list" },
          { title: "প্রক্রিয়াধীন টাস্ক", value: d?.processingTasks ?? 0, icon: Activity, colorIndex: 9, icons8: "tasks" },
        ])}
      </SectionCard>


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
