import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Receipt, Calendar, CheckCircle2, ShoppingCart, LifeBuoy,
  Bell, MessageSquare, Mail, TrendingDown, AlertTriangle, Gift,
  Users, UserPlus, BarChart3, Wifi, Banknote,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const ResellerDashboard = () => {
  const { customer } = usePortalAuth();
  const { popId, branchId } = getPopScope(customer);
  const billingId = getBillingCustomerId(customer);

  // ============ Company-level data (between POP and main company) ============
  const { data: company } = useQuery({
    queryKey: ["reseller-company", popId, billingId],
    enabled: !!popId,
    queryFn: async () => {
      const [pop, lastInvs] = await Promise.all([
        supabase
          .from("branch_managers")
          .select("balance")
          .eq("id", popId!)
          .maybeSingle(),
        billingId
          ? supabase
              .from("bw_sales_invoices")
              .select("amount, paid_amount, due, discount, created_at, status")
              .eq("customer_id", billingId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const thisMonth = (lastInvs.data || []).filter(
        (r: any) => new Date(r.created_at) >= monthStart,
      );
      const monthlyCharged = thisMonth.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const monthlyPaid = thisMonth.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
      const monthlyDiscount = thisMonth.reduce((s: number, r: any) => s + Number(r.discount || 0), 0);
      const totalDue = (lastInvs.data || []).reduce((s: number, r: any) => s + Number(r.due || 0), 0);
      return {
        balance: Number(pop.data?.balance || 0),
        smsBalance: 0,
        monthlyCharged,
        monthlyPaid,
        monthlyDiscount,
        totalDue,
      };
    },
  });

  // ============ Internal POP data ============
  const { data: internal } = useQuery({
    queryKey: ["reseller-internal", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthIso = monthStart.toISOString();

      const [allClients, billing, collections, zonesQ, newClients, tickets, notices] =
        await Promise.all([
          supabase.from("clients").select("id, status, billing_status, monthly_bill, zone_id, name, expire_date")
            .eq("branch_id", branchId!),
          supabase.from("billing").select("amount, paid, due, discount, created_at, client_id")
            .eq("branch_id", branchId!).gte("created_at", monthIso),
          supabase.from("bill_collections").select("amount, created_at, client_id")
            .gte("created_at", monthIso),
          supabase.from("zones").select("id, name").eq("status", "active"),
          supabase.from("clients").select("created_at, status").eq("branch_id", branchId!)
            .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString()),
          supabase.from("support_tickets").select("id, ticket_no, subject, status, created_at")
            .order("created_at", { ascending: false }).limit(5),
          supabase.from("client_notices").select("id, title, body, created_at")
            .eq("active", true).order("created_at", { ascending: false }).limit(5),
        ]);

      const clients = allClients.data || [];
      const totalClients = clients.length;
      const activeClients = clients.filter((c: any) => c.status === "Active").length;
      const onlineClients = clients.filter((c: any) => c.billing_status === "online").length;
      const monthlyBillSum = clients.reduce((s: number, c: any) => s + Number(c.monthly_bill || 0), 0);

      // Daily charge calculation
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const remainingDays = daysInMonth - today.getDate() + 1;
      const dailyCharged = monthlyBillSum / daysInMonth;
      const approxRechargeable = dailyCharged * remainingDays;

      // Billing aggregates this month
      const billed = (billing.data || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const collected = (billing.data || []).reduce((s: number, b: any) => s + Number(b.paid || 0), 0)
        + (collections.data || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const totalDue = (billing.data || []).reduce((s: number, b: any) => s + Number(b.due || 0), 0);
      const totalDiscount = (billing.data || []).reduce((s: number, b: any) => s + Number(b.discount || 0), 0);

      // New clients this month
      const newThisMonth = (newClients.data || [])
        .filter((c: any) => new Date(c.created_at) >= monthStart).length;

      // Monthly new client trend (last 6 months)
      const monthly: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        const next = new Date(d); next.setMonth(next.getMonth() + 1);
        const count = (newClients.data || []).filter((c: any) => {
          const cd = new Date(c.created_at);
          return cd >= d && cd < next;
        }).length;
        monthly.push({ month: d.toLocaleString("en-US", { month: "short" }), count });
      }

      // Zone-wise client distribution
      const zoneMap: Record<string, { name: string; count: number }> = {};
      (zonesQ.data || []).forEach((z: any) => (zoneMap[z.id] = { name: z.name, count: 0 }));
      clients.forEach((c: any) => {
        if (c.zone_id && zoneMap[c.zone_id]) zoneMap[c.zone_id].count++;
      });
      const zoneChart = Object.values(zoneMap).filter((z) => z.count > 0).slice(0, 6);

      // Top unpaid clients
      const unpaidByClient: Record<string, { name: string; due: number }> = {};
      (billing.data || []).forEach((b: any) => {
        const due = Number(b.due || 0);
        if (due <= 0) return;
        const c = clients.find((x: any) => x.id === b.client_id);
        if (!c) return;
        if (!unpaidByClient[b.client_id]) unpaidByClient[b.client_id] = { name: c.name, due: 0 };
        unpaidByClient[b.client_id].due += due;
      });
      const topUnpaid = Object.values(unpaidByClient).sort((a, b) => b.due - a.due).slice(0, 10);

      return {
        totalClients,
        activeClients,
        onlineClients,
        monthlyBillSum,
        dailyCharged,
        approxRechargeable,
        billed,
        collected,
        totalDue,
        totalDiscount,
        newThisMonth,
        monthly,
        zoneChart,
        topUnpaid,
        cashOnHand: collected,
        paidSalary: 0,
        tickets: tickets.data || [],
        notices: notices.data || [],
      };
    },
  });

  const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899"];

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <Card className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{customer?.name}</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              POP Manager Dashboard
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">POP Code</div>
              <div className="font-semibold">{customer?.code || "—"}</div>
            </div>
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">Username</div>
              <div className="font-semibold">{customer?.username || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 1 — Company-level (POP ↔ main company relationship) */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          মূল কোম্পানির সাথে সম্পর্ক
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <Stat icon={<Mail className="h-5 w-5" />} label="SMS Balance" value={String(company?.smsBalance ?? 0)} sub="বাকি SMS" />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Remaining Balance" value={tk(company?.balance)} tone="primary" />
          <Stat icon={<TrendingDown className="h-5 w-5" />} label="Daily Charge" value={tk(internal?.dailyCharged)} sub="approx per day" />
          <Stat icon={<Banknote className="h-5 w-5" />} label="Approximate Rechargeable" value={tk(internal?.approxRechargeable)} sub="বাকি দিনের জন্য" />
          <Stat icon={<BarChart3 className="h-5 w-5" />} label="Monthly Charged" value={tk(company?.monthlyCharged)} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Monthly Payment" value={tk(company?.monthlyPaid)} tone="success" />
          <Stat icon={<Gift className="h-5 w-5" />} label="Monthly Discount" value={tk(company?.monthlyDiscount)} />
          <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Balance Due" value={tk(company?.totalDue)} tone={company && company.totalDue > 0 ? "warning" : undefined} />
        </div>
      </div>

      {/* Row 2 — Internal POP info */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          আমার কোম্পানি (Internal)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <Stat icon={<UserPlus className="h-5 w-5" />} label="New Client (this month)" value={String(internal?.newThisMonth ?? 0)} tone="success" />
          <Stat icon={<Users className="h-5 w-5" />} label="Total Client" value={String(internal?.totalClients ?? 0)} sub={`Active ${internal?.activeClients ?? 0}`} />
          <Stat icon={<Wifi className="h-5 w-5" />} label="Online Clients" value={String(internal?.onlineClients ?? 0)} tone="success" />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Monthly Bill" value={tk(internal?.monthlyBillSum)} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Collected" value={tk(internal?.collected)} tone="success" />
          <Stat icon={<Gift className="h-5 w-5" />} label="Discount" value={tk(internal?.totalDiscount)} />
          <Stat icon={<AlertTriangle className="h-5 w-5" />} label="Total Due" value={tk(internal?.totalDue)} tone={internal && internal.totalDue > 0 ? "warning" : undefined} />
          <Stat icon={<Banknote className="h-5 w-5" />} label="Cash on Hand" value={tk(internal?.cashOnHand)} />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly New Client (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={internal?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Zone-wise Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {(internal?.zoneChart || []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No zone data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={internal?.zoneChart || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={(e) => e.name}
                  >
                    {(internal?.zoneChart || []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Top 10 Unpaid Clients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {!(internal?.topUnpaid || []).length && (
              <p className="text-sm text-muted-foreground text-center py-4">No outstanding dues</p>
            )}
            {internal?.topUnpaid?.map((u, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span className="font-medium truncate">{i + 1}. {u.name}</span>
                <Badge variant="destructive" className="font-mono">{tk(u.due)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Notices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!(internal?.notices || []).length && (
              <p className="text-sm text-muted-foreground text-center py-4">No notices</p>
            )}
            {internal?.notices?.map((n: any) => (
              <div key={n.id} className="border-b last:border-0 py-2">
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tickets summary */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
          <MessageSquare className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Recent Support Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {!(internal?.tickets || []).length && (
            <p className="text-sm text-muted-foreground text-center py-4">No tickets</p>
          )}
          {internal?.tickets?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
              <div>
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground font-mono">{t.ticket_no}</div>
              </div>
              <Badge variant={t.status === "solved" ? "default" : "secondary"}>{t.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const Stat = ({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "warning" | "success" | "primary";
}) => (
  <Card>
    <CardContent className="p-3.5">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            tone === "warning"
              ? "bg-orange-500/10 text-orange-600"
              : tone === "success"
              ? "bg-green-500/10 text-green-600"
              : tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-base font-semibold truncate">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ResellerDashboard;
