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
import { Link, Navigate } from "react-router-dom";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useModulePermission } from "@/hooks/useModulePermissions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import KpiCard from "@/components/dashboard/KpiCard";
import MetricTile from "@/components/dashboard/MetricTile";
import ResourceGauge from "@/components/dashboard/ResourceGauge";
import InfoList from "@/components/dashboard/InfoList";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
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
        supabase.from("billing").select("client_id, amount, paid, due, status").eq("status", "unpaid").gte("month", monthStart).order("amount", { ascending: false }).limit(200),
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

      // ─── Extra parallel queries (added) ──────────────────────────────
      const last12Start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
      const last12StartMonth = last12Start.slice(0, 7);
      const todayStart = `${today}T00:00:00`;
      const [
        portalActiveRes, portalInactiveRes,
        ticketsOpenRes, ticketsTodayRes, ticketsResolvedTodayRes,
        ticketsZoneOpenRes, ticketsSubzoneOpenRes,
        zonesRes,
        billing12Res, collect12Res,
        popClientsEnabledRes, popClientsDisabledRes,
        ticketsCategoryMonthRes, ticketsSolverMonthRes,
        employeesRes,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).ilike("billing_status", "Active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).not("billing_status", "ilike", "Active"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["pending", "processing", "open"]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("solved_at", todayStart),
        supabase.from("support_tickets").select("zone_id").in("status", ["pending", "processing", "open"]),
        supabase.from("support_tickets").select("subzone").in("status", ["pending", "processing", "open"]),
        supabase.from("zones").select("id, name"),
        supabase.from("billing").select("amount, paid, due, status, month").gte("month", last12Start),
        supabase.from("bill_collections").select("amount, created_at").eq("status", "approved").gte("created_at", `${last12Start}T00:00:00`),
        supabase.from("clients").select("id", { count: "exact", head: true }).not("branch_id", "is", null).neq("mikrotik_status", "disabled"),
        supabase.from("clients").select("id", { count: "exact", head: true }).not("branch_id", "is", null).eq("mikrotik_status", "disabled"),
        supabase.from("support_tickets").select("subject").gte("created_at", monthStart),
        supabase.from("support_tickets").select("solved_by").gte("solved_at", monthStart).not("solved_by", "is", null),
        supabase.from("employees").select("id, name"),
      ]);

      // ─── Top-Due aggregations ────────────────────────────────────────
      const [
        dueBillingRes, bwInvoicesDueRes, popNegativeRes,
      ] = await Promise.all([
        // All unpaid/partial billing rows (current + carried) — aggregate per client
        supabase.from("billing").select("client_id, amount, paid, due, status").in("status", ["unpaid", "partial"]).limit(5000),
        // Bandwidth sales invoices with due > 0
        supabase.from("bw_sales_invoices").select("customer_id, due, total_amount, paid_amount").gt("due", 0).limit(2000),
        // POPs with negative balance
        supabase.from("branch_managers").select("id, name, balance, branch_id, pop_type").lt("balance", 0).order("balance", { ascending: true }).limit(20),
      ]);

      // Aggregate due per client
      const dueByClient = new Map<string, number>();
      for (const b of dueBillingRes.data ?? []) {
        const cid = (b as any).client_id;
        if (!cid) continue;
        const amt = Number((b as any).amount) || 0;
        const paid = Number((b as any).paid) || 0;
        const dueRaw = (b as any).due;
        const due = dueRaw != null ? Number(dueRaw) : Math.max(0, amt - paid);
        if (due <= 0) continue;
        dueByClient.set(cid, (dueByClient.get(cid) || 0) + due);
      }
      const dueClientIds = [...dueByClient.keys()];
      let dueClientsMeta: any[] = [];
      if (dueClientIds.length) {
        const { data } = await supabase.from("clients")
          .select("id, name, client_id, client_type, phone_number, contact")
          .in("id", dueClientIds);
        dueClientsMeta = data ?? [];
      }
      const buildTopDue = (type: string) => dueClientsMeta
        .filter((c: any) => (c.client_type || "").toLowerCase() === type.toLowerCase())
        .map((c: any) => ({
          id: c.id,
          name: c.name || c.client_id || "Unknown",
          contact: c.phone_number || c.contact || "",
          due: dueByClient.get(c.id) || 0,
        }))
        .filter(x => x.due > 0)
        .sort((a, b) => b.due - a.due)
        .slice(0, 20);
      const topDueHome = buildTopDue("Home");
      const topDueCorporate = buildTopDue("Corporate");
      const totalDueHome = dueClientsMeta
        .filter((c: any) => (c.client_type || "").toLowerCase() === "home")
        .reduce((s, c) => s + (dueByClient.get(c.id) || 0), 0);
      const totalDueCorporate = dueClientsMeta
        .filter((c: any) => (c.client_type || "").toLowerCase() === "corporate")
        .reduce((s, c) => s + (dueByClient.get(c.id) || 0), 0);

      // Bandwidth aggregation
      const dueByBwCustomer = new Map<string, number>();
      for (const inv of bwInvoicesDueRes.data ?? []) {
        const cid = (inv as any).customer_id;
        if (!cid) continue;
        const due = Number((inv as any).due) || 0;
        if (due <= 0) continue;
        dueByBwCustomer.set(cid, (dueByBwCustomer.get(cid) || 0) + due);
      }
      let bwCustomersMeta: any[] = [];
      const bwIds = [...dueByBwCustomer.keys()];
      if (bwIds.length) {
        const { data } = await supabase.from("bw_sale_customers")
          .select("id, customer_name, customer_code, mobile, contact_person")
          .in("id", bwIds);
        bwCustomersMeta = data ?? [];
      }
      const topDueBandwidth = bwCustomersMeta.map((c: any) => ({
        id: c.id,
        name: c.customer_name || c.customer_code || "Unknown",
        contact: c.mobile || c.contact_person || "",
        due: dueByBwCustomer.get(c.id) || 0,
      })).sort((a, b) => b.due - a.due).slice(0, 20);
      const totalDueBandwidth = [...dueByBwCustomer.values()].reduce((s, v) => s + v, 0);

      // POP negative balance
      const topNegativePops = (popNegativeRes.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name || "POP",
        branch_id: p.branch_id,
        pop_type: p.pop_type,
        due: Math.abs(Number(p.balance) || 0),
      }));
      const totalDuePops = topNegativePops.reduce((s, p) => s + p.due, 0);

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

      // ─── Tickets / zone hotspots ──
      const zoneNameMap = new Map<string, string>((zonesRes.data ?? []).map((z: any) => [z.id, z.name]));
      const ticketZoneCounts: Record<string, number> = {};
      for (const t of ticketsZoneOpenRes.data ?? []) {
        const id = (t as any).zone_id || "Unknown";
        const name = (id !== "Unknown" && zoneNameMap.get(id)) || "অজানা";
        ticketZoneCounts[name] = (ticketZoneCounts[name] || 0) + 1;
      }
      const topZoneEntries = Object.entries(ticketZoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const topZone = topZoneEntries[0]?.[0] || "—";

      const ticketSubzoneCounts: Record<string, number> = {};
      for (const t of ticketsSubzoneOpenRes.data ?? []) {
        const id = (t as any).subzone || "অজানা";
        ticketSubzoneCounts[id] = (ticketSubzoneCounts[id] || 0) + 1;
      }
      const topSubzone = Object.entries(ticketSubzoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      // ─── Donut chart data: open tickets by zone & subzone ──
      const zoneDonut = Object.entries(ticketZoneCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name, value]) => ({ name, value }));
      const subzoneDonut = Object.entries(ticketSubzoneCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      // ─── Monthly problem occurrence (by subject) ──
      const categoryCounts: Record<string, number> = {};
      for (const t of ticketsCategoryMonthRes.data ?? []) {
        const k = ((t as any).subject || "অন্যান্য").toString().trim() || "অন্যান্য";
        categoryCounts[k] = (categoryCounts[k] || 0) + 1;
      }
      const monthlyProblemDonut = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      // ─── Most problem solver (by employee) ──
      const empNameMap = new Map<string, string>((employeesRes.data ?? []).map((e: any) => [e.id, e.name]));
      const solverCounts: Record<string, number> = {};
      for (const t of ticketsSolverMonthRes.data ?? []) {
        const id = (t as any).solved_by;
        const name = empNameMap.get(id) || "অজানা";
        solverCounts[name] = (solverCounts[name] || 0) + 1;
      }
      const solverChart = Object.entries(solverCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 12)
        .map(([name, value]) => ({ name, value }));

      // POP enabled/disabled
      const popEnabledClients = popClientsEnabledRes.count ?? 0;
      const popDisabledClients = popClientsDisabledRes.count ?? 0;


      // ─── 12-month trend ──
      const billByMonth: Record<string, { bill: number; due: number }> = {};
      for (const b of billing12Res.data ?? []) {
        const m = String((b as any).month).slice(0, 7);
        if (!billByMonth[m]) billByMonth[m] = { bill: 0, due: 0 };
        billByMonth[m].bill += Number((b as any).amount) || 0;
        const due = (b as any).due != null ? Number((b as any).due) : Math.max(0, (Number((b as any).amount) || 0) - (Number((b as any).paid) || 0));
        billByMonth[m].due += due;
      }
      const collectByMonth: Record<string, number> = {};
      for (const c of collect12Res.data ?? []) {
        const m = String((c as any).created_at).slice(0, 7);
        collectByMonth[m] = (collectByMonth[m] || 0) + (Number((c as any).amount) || 0);
      }
      const monthsArr: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsArr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const trend12 = monthsArr.map(m => ({
        name: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m.slice(5,7)) - 1]} ${m.slice(2,4)}`,
        bill: billByMonth[m]?.bill || 0,
        collect: collectByMonth[m] || 0,
        due: billByMonth[m]?.due || 0,
      }));


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
        // ── New ──
        portalActive: portalActiveRes.count ?? 0,
        portalInactive: portalInactiveRes.count ?? 0,
        ticketsOpen: ticketsOpenRes.count ?? 0,
        ticketsToday: ticketsTodayRes.count ?? 0,
        ticketsResolvedToday: ticketsResolvedTodayRes.count ?? 0,
        topZone, topSubzone,
        topZoneEntries,
        trend12,
        zoneDonut, subzoneDonut, monthlyProblemDonut, solverChart,
        popEnabledClients, popDisabledClients,
        // ── Top due ──
        topDueHome, topDueCorporate, topDueBandwidth, topNegativePops,
        totalDueHome, totalDueCorporate, totalDueBandwidth, totalDuePops,

      };
    },
    refetchInterval: 120000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

// ─── Section heading ──────────────────────────────
function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

// ─── Donut card (zone / subzone / problem type) ──
function DonutCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {total === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">কোনো ডেটা নেই</p>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:w-1/2 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={66} paddingAngle={1}>
                    {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full sm:flex-1 space-y-1 text-[11px] max-h-[160px] overflow-y-auto pr-1">
              {data.map((d, i) => (
                <li key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate text-muted-foreground flex-1" title={d.name}>{d.name}</span>
                  <span className="font-semibold text-foreground tabular-nums">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Ticket / Task tile (compact horizontal) ──
const TICKET_TILE_TONES: Record<string, string> = {
  rose: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  cyan: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};
function TicketTile({ label, value, icon: Icon, tone, to, hint }: { label: string; value: string; icon: any; tone: string; to: string; hint?: string }) {
  const cls = TICKET_TILE_TONES[tone] || TICKET_TILE_TONES.violet;
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-md ${cls}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/60">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium opacity-80 truncate">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
        {hint && <p className="text-[10px] opacity-70 truncate">{hint}</p>}
      </div>
    </Link>
  );
}

// ─── Top-Due list card ─────────────────────────────
const TOP_DUE_TONES: Record<string, { ring: string; text: string; bg: string }> = {
  rose:    { ring: "ring-rose-500/30",    text: "text-rose-600",    bg: "bg-rose-500/10" },
  amber:   { ring: "ring-amber-500/30",   text: "text-amber-600",   bg: "bg-amber-500/10" },
  violet:  { ring: "ring-violet-500/30",  text: "text-violet-600",  bg: "bg-violet-500/10" },
  cyan:    { ring: "ring-cyan-500/30",    text: "text-cyan-600",    bg: "bg-cyan-500/10" },
};
function TopDueListCard({
  title, icon: Icon, tone, total, items, allHref, itemHref,
}: {
  title: string;
  icon: any;
  tone: keyof typeof TOP_DUE_TONES;
  total: number;
  items: { id: string; name: string; contact?: string; due: number }[];
  allHref?: string;
  itemHref?: (it: any) => string;
}) {
  const t = TOP_DUE_TONES[tone];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.bg} ${t.text}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{title}</span>
          <span className={`ml-auto text-[11px] font-bold tabular-nums ${t.text}`}>৳{(total || 0).toLocaleString("en-IN")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">কোনো বকেয়া নেই</p>
        ) : (
          <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
            {items.map((it, i) => {
              const inner = (
                <>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-5 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{it.name}</p>
                    {it.contact && <p className="text-[10px] text-muted-foreground truncate">{it.contact}</p>}
                  </div>
                  <span className={`text-xs font-bold tabular-nums shrink-0 ${t.text}`}>৳{it.due.toLocaleString("en-IN")}</span>
                </>
              );
              const cls = "flex items-center gap-2 py-1.5 px-2 hover:bg-muted/40 rounded transition";
              return itemHref ? (
                <Link key={it.id || i} to={itemHref(it)} className={cls}>{inner}</Link>
              ) : (
                <div key={it.id || i} className={cls}>{inner}</div>
              );
            })}
          </div>
        )}
        {allHref && items.length > 0 && (
          <Link to={allHref} className="mt-2 block text-center text-[11px] text-primary hover:underline">সব দেখুন →</Link>
        )}
      </CardContent>
    </Card>
  );
}

const Dashboard = () => {
  const { isEmployeeOnly, loading: empLoading } = useEmployeeContext();
  const { data: d, isLoading } = useStats();
  const dashPerm = useModulePermission("Dashboard");
  const { canWidget } = useFeatureFlags();
  if (empLoading || dashPerm.loading) return null;
  if (isEmployeeOnly) return <Navigate to="/dashboard/me" replace />;
  // Non-admin without Dashboard module permission → send to their own panel.
  if (!dashPerm.isSuperAdmin && !dashPerm.canRead) {
    return <Navigate to="/dashboard/me" replace />;
  }

  // Date helpers for filter links
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().slice(0, 10);
  const lmDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmStart = `${lmDate.getFullYear()}-${String(lmDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

  const fmt = (n: number | undefined) => `৳${(n ?? 0).toLocaleString("en-IN")}`;
  const num = (n: number | undefined) => (n ?? 0).toLocaleString("en-IN");

  // Deltas
  const joinDelta = d?.lastMonthJoin
    ? (((d.thisMonthJoin - d.lastMonthJoin) / d.lastMonthJoin) * 100)
    : (d?.thisMonthJoin ? 100 : 0);
  const salesDelta = d?.lastMonthSales
    ? (((d.thisMonthSales - d.lastMonthSales) / d.lastMonthSales) * 100)
    : (d?.thisMonthSales ? 100 : 0);

  // Resource gauges
  const onlinePct = d && d.totalOnu > 0 ? (d.onlineOnu / d.totalOnu) * 100 : 0;
  const paidPct = d && d.billingMonthRows > 0 ? (d.paidClients / d.billingMonthRows) * 100 : 0;
  const collectionPct = d && d.totalBillAmount > 0 ? (d.totalPaidAmount / d.totalBillAmount) * 100 : 0;

  const showW = (section: string, key: string) => canWidget(section, key);


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground text-sm">ISP ERP ওভারভিউ</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground text-sm">ISP ERP ওভারভিউ — এক নজরে আপনার পুরো ব্যবসা</p>
        </div>
      </div>

      {/* Hero KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-fr">

        {showW("kpi_top", "kpi_total_clients") && (
          <KpiCard label="মোট ক্লায়েন্ট" value={num(d?.totalClients)} icon={Users} tone="primary" delta={joinDelta} caption="গত মাসের তুলনায়" to="/dashboard/clients/home" />
        )}
        {showW("kpi_top", "kpi_users") && (
          <KpiCard label="অনলাইন ব্যবহারকারী" value={num(d?.onlineOnu)} icon={Wifi} tone="success" to="/dashboard/monitoring/online" />
        )}
        {showW("kpi_top", "kpi_active") && (
          <KpiCard label="সচল ক্লায়েন্ট" value={num(d?.totalActive)} icon={UserCheck} tone="success" to="/dashboard/clients/home?status=active" />
        )}
        {showW("kpi_top", "kpi_earnings") && (
          <KpiCard label="বন্ধ লাইন" value={num(d?.blockedLineCount)} icon={Ban} tone="danger" to="/dashboard/clients/home?mikrotikStatus=disabled" />
        )}
      </div>

      {/* System Overview (left, 2/3) + Support / Operations (right, 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <SectionHeading title="সিস্টেম ওভারভিউ" hint="বর্তমান মাসের মূল মেট্রিক" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {showW("system_overview", "this_month_sales") && <MetricTile label="এই মাসের সেল" value={fmt(d?.thisMonthSales)} icon={TrendingUp} tone="violet" to={`/dashboard/billing/daily-collection?from=${monthStart}&to=${todayStr}`} />}
            {showW("system_overview", "today_sales") && <MetricTile label="আজকের সেল" value={fmt(d?.todaySales)} icon={DollarSign} tone="violet" to={`/dashboard/billing/daily-collection?date=${todayStr}`} />}
            {showW("system_overview", "billing_clients") && <MetricTile label="বিলিং ক্লায়েন্ট" value={num(d?.billingClients)} icon={FileText} tone="violet" to="/dashboard/clients/home?billingStatus=Active" />}
            {showW("system_overview", "expired_clients") && <MetricTile label="মেয়াদোত্তীর্ণ" value={num(d?.totalExpired)} icon={CalendarX} tone="amber" to="/dashboard/clients/home?status=expired" />}
            {showW("system_overview", "portal_active") && <MetricTile label="পোর্টাল অ্যাক্টিভ" value={num(d?.portalActive)} icon={ShieldCheck} tone="emerald" to="/dashboard/clients/home?billingStatus=Active" />}
            {showW("system_overview", "portal_inactive") && <MetricTile label="পোর্টাল ইনঅ্যাক্টিভ" value={num(d?.portalInactive)} icon={UserMinus} tone="rose" to="/dashboard/clients/home?billingStatus=Inactive" />}
            {showW("system_overview", "vip_clients") && <MetricTile label="VIP ক্লায়েন্ট" value={num(d?.vipClients)} icon={Award} tone="amber" to="/dashboard/clients/home?vip=1" />}
            {showW("system_overview", "total_due") && <MetricTile label="বকেয়া" value={fmt(d?.totalDueAmount)} icon={AlertTriangle} tone="rose" to={`/dashboard/billing?paymentStatus=unpaid&month=${currentMonth}`} />}
          </div>
        </div>

        {(showW("system_resource", "onu_gauge") || showW("system_resource", "paid_gauge") || showW("system_resource", "collection_gauge") || showW("system_resource", "sms_balance")) && (
          <div className="space-y-3">
            <SectionHeading title="সিস্টেম রিসোর্স" hint="বর্তমান মাসের অগ্রগতি" />
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {showW("system_resource", "onu_gauge") && <ResourceGauge label="ONU অনলাইন" value={onlinePct} tone="emerald" />}
                  {showW("system_resource", "paid_gauge") && <ResourceGauge label="পেইড ক্লায়েন্ট" value={paidPct} tone="violet" />}
                  {showW("system_resource", "collection_gauge") && <ResourceGauge label="কালেকশন" value={collectionPct} tone="violet" />}
                </div>
                {showW("system_resource", "sms_balance") && (
                <Link to="/dashboard/sms" className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5 hover:bg-muted/60 transition">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">SMS ব্যালেন্স</span>
                  </div>
                  <span className="text-base font-bold tabular-nums text-foreground">{String(d?.smsBalance ?? "0")}</span>
                </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* POP Hero Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {showW("pop_overview", "total_pop") && <MetricTile label="মোট POP" value={num(d?.totalPopMgrs)} icon={Network} tone="violet" to="/dashboard/pop-management" />}
        {showW("pop_overview", "total_pop_clients") && <MetricTile label="মোট POP ক্লায়েন্ট" value={num(d?.popTotalClients)} icon={Users} tone="emerald" to="/dashboard/clients/home" />}
        {showW("pop_overview", "pop_active_clients") && <MetricTile label="সচল POP ক্লায়েন্ট" value={num(d?.popEnabledClients)} icon={UserCheck} tone="violet" to="/dashboard/clients/home?status=active" />}
        {showW("pop_overview", "pop_inactive_clients") && <MetricTile label="নিষ্ক্রিয় POP ক্লায়েন্ট" value={num(d?.popDisabledClients)} icon={UserX} tone="rose" to="/dashboard/clients/home?mikrotikStatus=disabled" />}
      </div>

      {/* Zone / Subzone donuts + Tickets/Tasks column + Monthly Problem donut */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {showW("tickets_overview", "zone_donut") && <DonutCard title="জোন অনুযায়ী সমস্যা" data={d?.zoneDonut || []} />}
        {showW("tickets_overview", "subzone_donut") && <DonutCard title="সাবজোন অনুযায়ী সমস্যা" data={d?.subzoneDonut || []} />}
        <div className="grid grid-cols-2 gap-2">
          {showW("tickets_overview", "pending_tickets") && <TicketTile label="পেন্ডিং টিকেট" value={num(d?.pendingTickets)} icon={ClipboardList} tone="rose" to="/dashboard/support/tickets?status=pending" hint="যেগুলো এখনো শুরু হয়নি" />}
          {showW("tickets_overview", "processing_tickets") && <TicketTile label="প্রসেসিং টিকেট" value={num(d?.processingTickets)} icon={TicketCheck} tone="cyan" to="/dashboard/support/tickets?status=processing" hint="চলমান টিকেট" />}
          {showW("tickets_overview", "pending_tasks") && <TicketTile label="পেন্ডিং টাস্ক" value={num(d?.pendingTasks)} icon={ListTodo} tone="amber" to="/dashboard/tasks?status=pending" hint="অপেক্ষমাণ টাস্ক" />}
          {showW("tickets_overview", "processing_tasks") && <TicketTile label="প্রসেসিং টাস্ক" value={num(d?.processingTasks)} icon={Activity} tone="violet" to="/dashboard/tasks?status=processing" hint="চলমান টাস্ক" />}
        </div>
        {showW("tickets_overview", "monthly_problem_donut") && <DonutCard title="মাসিক সমস্যার ধরন" data={d?.monthlyProblemDonut || []} />}
      </div>


      {/* Most Problem Solver */}
      {showW("tickets_overview", "top_solver_chart") && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-500" />
            সর্বোচ্চ সমস্যা সমাধানকারী
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">এই মাস</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {(d?.solverChart ?? []).length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">এই মাসে কোনো সমাধান হয়নি</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, (d?.solverChart?.length || 0) * 28)}>
              <BarChart data={d?.solverChart || []} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="সমাধান">
                  {(d?.solverChart || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      )}


      {/* Traffic / chart (2/3) + Top Active Users (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              মাসিক নতুন ক্লায়েন্ট
              <span className="ml-auto text-xs font-normal text-muted-foreground">গত ৬ মাস</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d?.newClientChart || []}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="url(#barFill)" radius={[8, 8, 0, 0]} name="নতুন ক্লায়েন্ট" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Downloaders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
              টপ অ্যাক্টিভ ব্যবহারকারী
              <Link to="/dashboard/monitoring/top-users" className="ml-auto text-[11px] font-normal text-primary hover:underline">সব দেখুন →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {(d?.topDownloaders ?? []).length > 0 ? (
              <div className="divide-y divide-border">
                {(d?.topDownloaders ?? []).slice(0, 6).map((dl, i) => {
                  const initials = (dl.client_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <Link key={i} to="/dashboard/monitoring/top-users" className="flex items-center gap-3 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{dl.client_name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatBytes(dl.download)} ↓</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">ডেটা নেই — traffic collection চালু করুন</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Due — by category */}
      {showW("top_due", "top_due_table") && (
      <div className="space-y-3">
        <SectionHeading title="টপ বকেয়া" hint="প্রতি ক্যাটাগরির শীর্ষ ২০ বকেয়াদার" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="হোম বকেয়া" value={fmt(d?.totalDueHome)} icon={Home} tone="rose" to="/dashboard/billing?paymentStatus=unpaid" />
          <MetricTile label="কর্পোরেট বকেয়া" value={fmt(d?.totalDueCorporate)} icon={Building2} tone="amber" to="/dashboard/billing?paymentStatus=unpaid" />
          <MetricTile label="ব্যান্ডউইথ বকেয়া" value={fmt(d?.totalDueBandwidth)} icon={Share2} tone="violet" to="/dashboard/bandwidth/sales/invoices" />
          <MetricTile label="POP নেগেটিভ" value={fmt(d?.totalDuePops)} icon={Network} tone="rose" to="/dashboard/pop-management" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <TopDueListCard
            title="হোম ক্লায়েন্ট — টপ ২০"
            icon={Home}
            tone="rose"
            total={d?.totalDueHome || 0}
            items={d?.topDueHome || []}
            allHref="/dashboard/billing?paymentStatus=unpaid"
            itemHref={(it) => `/dashboard/billing?search=${encodeURIComponent(it.name)}`}
          />
          <TopDueListCard
            title="কর্পোরেট ক্লায়েন্ট — টপ ২০"
            icon={Building2}
            tone="amber"
            total={d?.totalDueCorporate || 0}
            items={d?.topDueCorporate || []}
            allHref="/dashboard/billing?paymentStatus=unpaid"
            itemHref={(it) => `/dashboard/billing?search=${encodeURIComponent(it.name)}`}
          />
          <TopDueListCard
            title="ব্যান্ডউইথ কাস্টমার — টপ ২০"
            icon={Share2}
            tone="violet"
            total={d?.totalDueBandwidth || 0}
            items={d?.topDueBandwidth || []}
            allHref="/dashboard/bandwidth/sales/invoices"
          />
          <TopDueListCard
            title="POP নেগেটিভ ব্যালেন্স — টপ ২০"
            icon={Network}
            tone="cyan"
            total={d?.totalDuePops || 0}
            items={d?.topNegativePops || []}
            allHref="/dashboard/pop-management"
          />
        </div>
      </div>
      )}

      {/* Action required */}
      {showW("action_needed", "action_panel") && (
      <div className="space-y-3">
        <SectionHeading title="অ্যাকশন প্রয়োজন" hint="দ্রুত পদক্ষেপ নিন" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricTile label="ওভারডিউ বিলিং" value={num(d?.overdueBillingCount)} icon={AlertTriangle} tone="rose" to={`/dashboard/billing?paymentStatus=unpaid&month=${currentMonth}`} />
          <MetricTile label="মেয়াদোত্তীর্ণ" value={num(d?.totalExpired)} icon={CalendarX} tone="amber" to="/dashboard/clients/home?status=expired" />
          <MetricTile label="নিষ্ক্রিয়/বাতিল" value={num(d?.inactiveLeftCount)} icon={UserX} tone="rose" to="/dashboard/clients/home?status=inactive" />
          <MetricTile label="গ্রেস/এক্সটেনশন" value={num(d?.extensionGraceCount)} icon={Timer} tone="amber" to="/dashboard/clients/home?status=extended" />
          <MetricTile label="পেন্ডিং টিকেট" value={num(d?.pendingTickets)} icon={ClipboardList} tone="violet" to="/dashboard/support/tickets?status=pending" />
          <MetricTile label="পেন্ডিং টাস্ক" value={num(d?.pendingTasks)} icon={ListTodo} tone="violet" to="/dashboard/tasks?status=pending" />
        </div>
      </div>
      )}

      {/* Finance summary */}
      {showW("financial_summary", "financial_panel") && (
      <div className="space-y-3">
        <SectionHeading title="আর্থিক বিবরণ" hint="বর্তমান মাস" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricTile label="মোট বিল" value={fmt(d?.totalBillAmount)} icon={FileText} tone="violet" to={`/dashboard/billing?month=${currentMonth}`} />
          <MetricTile label="কালেক্টেড" value={fmt(d?.totalPaidAmount)} icon={HandCoins} tone="emerald" to={`/dashboard/billing?paymentStatus=paid&month=${currentMonth}`} />
          <MetricTile label="ডিসকাউন্ট" value={fmt(d?.totalDiscount)} icon={CircleDollarSign} tone="amber" />
          <MetricTile label="বকেয়া" value={fmt(d?.totalDueAmount)} icon={AlertTriangle} tone="rose" to={`/dashboard/billing?paymentStatus=unpaid&month=${currentMonth}`} />
          <MetricTile label="আয়" value={fmt(d?.incTM)} icon={TrendingUp} tone="emerald" />
          <MetricTile label="ব্যয়" value={fmt(d?.expTM)} icon={TrendingDown} tone="rose" />
        </div>
      </div>
      )}

      {/* 12-month trend (2/3) + compact বকেয়া list (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              ১২-মাসের ট্রেন্ড — বিল · কালেকশন · বকেয়া
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={d?.trend12 || []}>
                <defs>
                  <linearGradient id="gBill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 11 }} formatter={(v: any) => `৳${Number(v).toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="bill" stroke="hsl(var(--primary))" fill="url(#gBill)" name="বিল" />
                <Line type="monotone" dataKey="collect" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} name="কালেকশন" />
                <Line type="monotone" dataKey="due" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={false} name="বকেয়া" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              বকেয়া ক্লায়েন্ট
              <Badge variant="secondary" className="ml-2 text-[10px]">{(d?.unpaidList ?? []).length}</Badge>
              <Link to={`/dashboard/billing?paymentStatus=unpaid&month=${currentMonth}`} className="ml-auto text-[11px] font-normal text-primary hover:underline">সব দেখুন →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {(d?.unpaidList ?? []).length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">কোনো বকেয়া নেই</p>
            ) : (
              <div className="divide-y divide-border">
                {(d?.unpaidList ?? []).slice(0, 8).map((u, i) => (
                  <Link key={i} to={`/dashboard/billing?search=${encodeURIComponent(u.client_name)}&month=${currentMonth}`}
                        className="flex items-center justify-between gap-2 py-2 px-2 text-xs hover:bg-muted/40 rounded">
                    <span className="truncate"><span className="text-muted-foreground mr-1.5">{i + 1}.</span>{u.client_name}</span>
                    <span className="text-rose-500 font-semibold tabular-nums shrink-0">৳{u.due.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

