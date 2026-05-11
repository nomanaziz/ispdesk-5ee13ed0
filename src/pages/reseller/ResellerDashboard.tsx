import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { callPortal } from "@/lib/portalApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Receipt, CheckCircle2, LifeBuoy,
  Bell, MessageSquare, Mail, TrendingDown, AlertTriangle, Gift,
  Users, UserPlus, BarChart3, Wifi, Banknote,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import MetricTile from "@/components/dashboard/MetricTile";
import AssignedAreasWidget from "@/components/reseller/AssignedAreasWidget";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import PopMobileHome from "./PopMobileHome";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

const ResellerDashboard = () => {
  const { customer } = usePortalAuth();
  const isMobile = useIsMobile();
  const { popId, branchId } = getPopScope(customer);
  const billingId = getBillingCustomerId(customer);

  const { data: company } = useQuery({
    queryKey: ["reseller-company", popId, billingId, branchId],
    enabled: !!popId,
    queryFn: async () => {
      const lastInvs = billingId
        ? await supabase
            .from("bw_sales_invoices")
            .select("amount, paid_amount, due, discount, created_at, status")
            .eq("customer_id", billingId)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [] as any[] };
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const thisMonth = (lastInvs.data || []).filter(
        (r: any) => new Date(r.created_at) >= monthStart,
      );
      const monthlyCharged = thisMonth.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const monthlyPaid = thisMonth.reduce((s: number, r: any) => s + Number(r.paid_amount || 0), 0);
      const monthlyDiscount = thisMonth.reduce((s: number, r: any) => s + Number(r.discount || 0), 0);
      const invoiceDue = (lastInvs.data || []).reduce((s: number, r: any) => s + Number(r.due || 0), 0);

      let fundingDue = 0;
      if (branchId) {
        const { data: funds } = await supabase
          .from("branch_funding")
          .select("due_amount")
          .eq("branch_id", branchId);
        fundingDue = (funds || []).reduce(
          (s: number, r: any) => s + Number(r.due_amount || 0),
          0,
        );
      }

      return {
        smsBalance: 0,
        monthlyCharged,
        monthlyPaid,
        monthlyDiscount,
        totalDue: invoiceDue + fundingDue,
      };
    },
  });

  const isPopManager =
    customer?.type === "reseller" || customer?.type === "reseller_sub";

  const { data: internal } = useQuery({
    queryKey: ["reseller-internal-portal", popId],
    enabled: !!popId && isPopManager,
    queryFn: async () => {
      const res = await callPortal<any>("pop_dashboard_overview", {});
      if (res?.error) throw new Error(res.error);
      return res;
    },
  });

  const COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899"];

  if (isMobile) return <PopMobileHome />;

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

      {/* Row 1 — Company-level KPIs (matches main portal pattern) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="SMS Balance" value={String(company?.smsBalance ?? 0)} icon={Mail} tone="primary" caption="বাকি SMS" />
        <KpiCard label="Remaining Balance" value={tk(internal?.balance)} icon={Wallet} tone="violet" />
        <KpiCard label="Daily Charge" value={tk(internal?.dailyCharged)} icon={TrendingDown} tone="amber" caption="approx per day" />
        <KpiCard label="Approx Rechargeable" value={tk(internal?.approxRechargeable)} icon={Banknote} tone="emerald" caption="বাকি দিনের জন্য" />
        <KpiCard label="Monthly Charged" value={tk(company?.monthlyCharged)} icon={BarChart3} tone="primary" />
        <KpiCard label="Monthly Payment" value={tk(company?.monthlyPaid)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Monthly Discount" value={tk(company?.monthlyDiscount)} icon={Gift} tone="violet" />
        <KpiCard label="Balance Due" value={tk(company?.totalDue)} icon={AlertTriangle} tone={company && company.totalDue > 0 ? "warning" : "primary"} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly New Client (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={internal?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
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

      {/* Row 2 — Internal POP metrics (MetricTile pattern) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="New Client (this month)" value={String(internal?.newThisMonth ?? 0)} icon={UserPlus} tone="emerald" />
        <MetricTile label="Total Client" value={String(internal?.totalClients ?? 0)} icon={Users} tone="violet" hint={`Active ${internal?.activeClients ?? 0}`} />
        <MetricTile label="Online Clients" value={String(internal?.onlineClients ?? 0)} icon={Wifi} tone="teal" />
        <MetricTile label="Monthly Bill" value={tk(internal?.monthlyBillSum)} icon={Receipt} tone="indigo" />
        <MetricTile label="Collected" value={tk(internal?.collected)} icon={CheckCircle2} tone="emerald" />
        <MetricTile label="Discount" value={tk(internal?.totalDiscount)} icon={Gift} tone="pink" />
        <MetricTile label="Total Due" value={tk(internal?.totalDue)} icon={AlertTriangle} tone={internal && internal.totalDue > 0 ? "rose" : "sky"} />
        <MetricTile label="Cash on Hand" value={tk(internal?.cashOnHand)} icon={Banknote} tone="amber" />
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><AssignedAreasWidget /></div>
        <div></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl">
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

        <Card className="rounded-2xl">
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
      <Card className="rounded-2xl">
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

export default ResellerDashboard;
