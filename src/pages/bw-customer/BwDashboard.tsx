import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet, Receipt, Calendar, CheckCircle2, ShoppingCart, LifeBuoy,
  Bell, MessageSquare, Sparkles, AlertTriangle, FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import KpiCard from "@/components/dashboard/KpiCard";
import MetricTile from "@/components/dashboard/MetricTile";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function BwDashboard() {
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);

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
          .select("id, order_no, status, total, created_at")
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

  const panelActive = !!customer?.panel_access_enabled
    && customer?.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <Card className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground border-0">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{customer?.name}</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">
              Bandwidth Customer Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="text-primary-foreground/60 text-xs uppercase">Customer Code</div>
              <div className="font-semibold">{customer?.code || "—"}</div>
            </div>
            {panelActive && (
              <Badge className="bg-emerald-500/20 text-emerald-50 border-emerald-300/40 border gap-1">
                <Sparkles className="h-3 w-3" /> Panel Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
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
        <MetricTile label="Service Orders" value={String(data?.purchaseOrders?.length ?? 0)} icon={ShoppingCart} tone="indigo" to="/bw/purchase-orders" />
        <MetricTile label="Open Tickets" value={String(data?.openTickets ?? 0)} icon={LifeBuoy} tone="rose" to="/bw/tickets" />
        <MetricTile label="Settings" value="⚙" icon={FileText} tone="cyan" to="/bw/settings" />
        {panelActive && (
          <MetricTile label="My Panel" value="→" icon={Sparkles} tone="emerald" to="/bw-panel/dashboard" hint="Open" />
        )}
      </div>

      {/* Recent invoices + Tickets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Receipt className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">সাম্প্রতিক ইনভয়েস</CardTitle>
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
              <div className="text-sm text-muted-foreground text-center py-6">কোনো ইনভয়েস নেই</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">সার্ভিস অর্ডার</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.purchaseOrders || []).map((po: any) => (
              <Link
                key={po.id}
                to="/bw/purchase-orders"
                className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-muted/50 text-sm"
              >
                <div>
                  <div className="font-medium">{po.order_no}</div>
                  <div className="text-xs text-muted-foreground">{new Date(po.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{tk(po.total)}</div>
                  <Badge variant="outline" className="text-[10px]">{po.status}</Badge>
                </div>
              </Link>
            ))}
            {(!data?.purchaseOrders || data.purchaseOrders.length === 0) && (
              <div className="text-sm text-muted-foreground text-center py-6">কোনো পার্চেজ অর্ডার নেই</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <LifeBuoy className="h-4 w-4 text-rose-500" />
            <CardTitle className="text-base">সাপোর্ট টিকেট</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{data?.openTickets || 0}</div>
                <div className="text-xs text-muted-foreground">খোলা টিকেট</div>
              </div>
              <Link to="/bw/tickets">
                <Badge variant="secondary">মোট: {data?.ticketCount || 0}</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">নোটিশ ও মেসেজ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-6 flex flex-col items-center gap-2">
              <MessageSquare className="h-8 w-8 opacity-30" />
              আপাতত কোনো নোটিশ নেই
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
