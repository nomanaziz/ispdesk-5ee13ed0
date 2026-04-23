import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Receipt, Calendar, CheckCircle2, ShoppingCart, LifeBuoy, Bell, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

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
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">স্বাগতম, {customer?.name} 👋</h1>
          <p className="text-sm text-muted-foreground">
            আপনার ব্যান্ডউইথ একাউন্টের সারসংক্ষেপ
          </p>
        </div>
        {panelActive && (
          <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-700">
            <Sparkles className="h-3 w-3" /> প্যানেল সক্রিয় — {customer?.panel_user_limit} ইউজার
          </Badge>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-3.5 w-3.5" /> মোট বকেয়া</div>
            <div className="text-2xl font-bold mt-1 text-rose-600">{tk(data?.totalDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> এই মাসে পরিশোধ</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{tk(data?.monthlyPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Receipt className="h-3.5 w-3.5" /> শেষ ইনভয়েস</div>
            <div className="text-lg font-semibold mt-1 truncate">{data?.lastInvoice?.invoice_no || "—"}</div>
            <div className="text-xs text-muted-foreground">{tk(data?.lastInvoice?.amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Calendar className="h-3.5 w-3.5" /> পরবর্তী Due</div>
            <div className="text-lg font-semibold mt-1">
              {data?.lastInvoice?.payment_due_date ? new Date(data.lastInvoice.payment_due_date).toLocaleDateString("en-GB") : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent invoices */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> সাম্প্রতিক ইনভয়েস</CardTitle>
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

        {/* Purchase orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> পার্চেজ অর্ডার</CardTitle>
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

        {/* Tickets summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> সাপোর্ট টিকেট</CardTitle>
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

        {/* Notices placeholder */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> নোটিশ ও মেসেজ</CardTitle>
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
