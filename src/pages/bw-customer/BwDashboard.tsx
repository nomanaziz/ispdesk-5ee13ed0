import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Receipt, Calendar, CheckCircle2, ShoppingCart, LifeBuoy, Bell, MessageSquare,
  Sparkles, AlertTriangle, FileText, Server, Users, Wifi, Wallet, TrendingUp,
  Rocket, Settings as SettingsIcon, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import KpiCard from "@/components/dashboard/KpiCard";
import MetricTile from "@/components/dashboard/MetricTile";
import { useLanguage } from "@/contexts/LanguageContext";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function BwDashboard() {
  const { customer } = usePortalAuth();
  const { t } = useLanguage();
  const billingId = getBillingCustomerId(customer);

  const panelActive = !!customer?.panel_access_enabled
    && customer?.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();
  const expiresAt = customer?.panel_subscription_expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : 0;

  const { data } = useQuery({
    queryKey: ["bw-dashboard", billingId],
    enabled: !!billingId,
    queryFn: async () => {
      const [invRes, poRes, tkRes] = await Promise.all([
        supabase
          .from("bw_sales_invoices")
          .select("id, invoice_no, amount, paid_amount, due, payment_due_date, status, created_at")
          .eq("customer_id", billingId!)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("bw_purchase_orders")
          .select("id, order_no, status, total, created_at, request_type, effective_date")
          .eq("reseller_id", billingId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("support_tickets")
          .select("id, status")
          .eq("client_id", billingId!),
      ]);

      const invoices = invRes.data || [];
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const thisMonth = invoices.filter((i: any) => new Date(i.created_at) >= monthStart);
      const monthlyPaid = thisMonth.reduce((s: number, i: any) => s + Number(i.paid_amount || 0), 0);
      const totalDue = invoices.reduce((s: number, i: any) => s + Number(i.due || 0), 0);
      const lastInvoice = invoices[0] || null;

      const tickets = tkRes.data || [];
      const openTickets = tickets.filter((t: any) => ["open", "pending"].includes(t.status)).length;

      return {
        invoices,
        purchaseOrders: poRes.data || [],
        monthlyPaid,
        totalDue,
        lastInvoice,
        openTickets,
        ticketCount: tickets.length,
      };
    },
  });

  // Subscribed services chips — placeholder list until package metadata is wired.
  const services = ["Internet", "FNN", "GGC", "BDX"];

  return (
    <div className="space-y-5">
      {/* ====== Section 1: Relationship with Admin (always visible) ====== */}
      <Card className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0">
        <CardContent className="p-6 flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              {t("আমার অ্যাকাউন্ট", "My Account")}
            </div>
            <h1 className="text-2xl font-bold">{customer?.name}</h1>
            <p className="text-primary-foreground/80 text-sm">
              {customer?.contact_person || "—"} · {customer?.mobile || customer?.email || "—"}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {services.map((s) => (
                <Badge key={s} className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/30 border text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">Customer Code</div>
              <div className="font-semibold">{customer?.code || "—"}</div>
            </div>
            <div>
              <div className="text-primary-foreground/60 text-xs uppercase">Status</div>
              <div className="font-semibold">{panelActive ? "Panel Active" : "Billing Only"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs — dues / paid / next due */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Due" value={tk(data?.totalDue)} icon={AlertTriangle} tone={(data?.totalDue || 0) > 0 ? "danger" : "success"} />
        <KpiCard label="This Month Paid" value={tk(data?.monthlyPaid)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Last Invoice" value={data?.lastInvoice?.invoice_no || "—"} icon={Receipt} tone="primary" caption={tk(data?.lastInvoice?.amount)} />
        <KpiCard
          label="Next Due Date"
          value={data?.lastInvoice?.payment_due_date ? new Date(data.lastInvoice.payment_due_date).toLocaleDateString("en-GB") : "—"}
          icon={Calendar}
          tone="warning"
        />
      </div>

      {/* Quick navigation */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricTile label="Invoices" value={String(data?.invoices?.length ?? 0)} icon={Receipt} tone="violet" to="/bw/invoices" />
        <MetricTile label="Service Orders" value={String(data?.purchaseOrders?.length ?? 0)} icon={ShoppingCart} tone="indigo" to="/bw/service-orders" />
        <MetricTile label="Open Tickets" value={String(data?.openTickets ?? 0)} icon={LifeBuoy} tone="rose" to="/bw/tickets" />
        <MetricTile label="Settings" value="⚙" icon={SettingsIcon} tone="cyan" to="/bw/settings" />
      </div>

      {/* Recent invoices + Service orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("সাম্প্রতিক ইনভয়েস", "Recent Invoices")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.invoices || []).slice(0, 5).map((inv: any) => (
              <Link
                key={inv.id}
                to={`/bw/invoices`}
                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 text-sm"
              >
                <div>
                  <div className="font-medium">{inv.invoice_no}</div>
                  <div className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{tk(inv.amount)}</div>
                  <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[10px]">
                    {inv.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {(!data?.invoices || data.invoices.length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-6">{t("কোনো ইনভয়েস নেই", "No invoices")}</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("সার্ভিস অর্ডার", "Service Orders")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.purchaseOrders || []).map((po: any) => (
              <Link
                key={po.id}
                to="/bw/service-orders"
                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 text-sm"
              >
                <div>
                  <div className="font-medium">{po.order_no}</div>
                  <div className="text-xs text-muted-foreground">
                    {po.request_type ? `${po.request_type} · ` : ""}
                    {new Date(po.created_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{tk(po.total)}</div>
                  <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                </div>
              </Link>
            ))}
            {(!data?.purchaseOrders || data.purchaseOrders.length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-6">{t("কোনো অর্ডার নেই", "No service orders")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ====== Section 2: My Panel (only when active), else Promo ====== */}
      {panelActive ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                {t("আমার প্যানেল", "My Panel")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(`${customer?.panel_user_limit || 0} ইউজার • ${daysLeft} দিন বাকি`,
                   `${customer?.panel_user_limit || 0} users • ${daysLeft} days left`)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/bw/panel/clients" className="gap-1">
                {t("ক্লায়েন্ট দেখুন", "View Clients")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Clients" value="—" icon={Users} tone="violet" caption="Coming soon" />
            <KpiCard label="Online Now" value="—" icon={Wifi} tone="success" />
            <KpiCard label="MikroTik Servers" value="—" icon={Server} tone="primary" />
            <KpiCard label="Daily Collection" value={tk(0)} icon={Wallet} tone="warning" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricTile label="Add Client" value="+" icon={Users} tone="emerald" to="/bw/panel/clients/add" />
            <MetricTile label="MikroTik" value="→" icon={Server} tone="indigo" to="/bw/panel/mikrotik" />
            <MetricTile label="Billing" value="→" icon={Receipt} tone="violet" to="/bw/panel/billing" />
            <MetricTile label="Online" value="→" icon={Wifi} tone="teal" to="/bw/panel/monitoring/online" />
            <MetricTile label="Send SMS" value="→" icon={MessageSquare} tone="sky" to="/bw/panel/sms/send" />
            <MetricTile label="Income" value="→" icon={TrendingUp} tone="amber" to="/bw/panel/accounting/income" />
          </div>
        </>
      ) : (
        <Card className="rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">{t("নিজস্ব প্যানেল আনলক করুন", "Unlock Your Own Panel")}</h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  {t(
                    "নিজের MikroTik, ক্লায়েন্ট, বিলিং, কর্মচারী এবং হিসাব ম্যানেজ করুন। প্যানেল সক্রিয় হলে এখানে সব মেনু চালু হয়ে যাবে।",
                    "Manage your own MikroTik, clients, billing, employees and accounts. All menus appear here once your panel is active.",
                  )}
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/bw/settings"><Sparkles className="h-4 w-4 mr-1.5" /> {t("প্যানেল সক্রিয় করুন", "Activate Panel")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tickets + Notices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <LifeBuoy className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base">{t("সাপোর্ট টিকেট", "Support Tickets")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{data?.openTickets || 0}</div>
                <div className="text-xs text-muted-foreground">{t("খোলা টিকেট", "Open tickets")}</div>
              </div>
              <Link to="/bw/tickets">
                <Badge variant="secondary">{t("মোট", "Total")}: {data?.ticketCount || 0}</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("নোটিশ ও মেসেজ", "Notices & Messages")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-6 flex flex-col items-center gap-2">
              <MessageSquare className="h-8 w-8 opacity-30" />
              {t("আপাতত কোনো নোটিশ নেই", "No notices right now")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
