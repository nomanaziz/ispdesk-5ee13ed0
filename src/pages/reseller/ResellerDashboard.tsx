import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Receipt,
  Calendar,
  CheckCircle2,
  ShoppingCart,
  LifeBuoy,
  Bell,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

const ResellerDashboard = () => {
  const { customer } = usePortalAuth();
  const resellerId = customer?.parent_reseller_id || customer?.sub;

  const { data } = useQuery({
    queryKey: ["reseller-dashboard", resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const [invs, orders, tickets, notices] = await Promise.all([
        supabase
          .from("bw_sales_invoices")
          .select("id, invoice_no, amount, paid_amount, due, status, month, created_at")
          .eq("customer_id", resellerId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("bw_purchase_orders")
          .select("id, order_no, total, status, created_at")
          .eq("reseller_id", resellerId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("support_tickets")
          .select("id, ticket_no, subject, status, created_at")
          .eq("source", "bw_reseller")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("client_notices")
          .select("id, title, body, type, created_at")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const lastInv = invs.data?.[0] ?? null;
      const totalDue = (invs.data || []).reduce((s, r) => s + Number(r.due || 0), 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const paidThisMonth = (invs.data || [])
        .filter((r) => new Date(r.created_at) >= monthStart)
        .reduce((s, r) => s + Number(r.paid_amount || 0), 0);
      return {
        lastInv,
        totalDue,
        paidThisMonth,
        openOrders: (orders.data || []).filter((o) => o.status !== "completed").length,
        openTickets: (tickets.data || []).filter((t) => t.status !== "solved").length,
        tickets: tickets.data || [],
        notices: notices.data || [],
      };
    },
  });

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <Card className="bg-gradient-to-r from-[hsl(217_45%_22%)] to-[hsl(217_45%_32%)] text-white border-0">
        <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {customer?.name}</h1>
            <p className="text-white/80 text-sm mt-1">
              Bandwidth Reseller Portal — manage invoices, purchase orders & support
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-white/60 text-xs uppercase">POP Code</div>
              <div className="font-semibold">{customer?.code || "—"}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs uppercase">Username</div>
              <div className="font-semibold">{customer?.username || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          icon={<Wallet className="h-5 w-5" />}
          label="Balance Due"
          value={`৳ ${(data?.totalDue ?? 0).toLocaleString()}`}
          tone="warning"
        />
        <Stat
          icon={<Receipt className="h-5 w-5" />}
          label="Last Invoice"
          value={data?.lastInv?.invoice_no || "—"}
          sub={data?.lastInv ? `৳ ${Number(data.lastInv.amount).toLocaleString()}` : ""}
        />
        <Stat
          icon={<Calendar className="h-5 w-5" />}
          label="Payment Due Date"
          value={data?.lastInv ? format(new Date(data.lastInv.created_at), "dd MMM yyyy") : "—"}
        />
        <Stat
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="This Month Paid"
          value={`৳ ${(data?.paidThisMonth ?? 0).toLocaleString()}`}
          tone="success"
        />
        <Stat
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Purchase Orders"
          value={String(data?.openOrders ?? 0)}
          sub="Open"
        />
        <Stat
          icon={<LifeBuoy className="h-5 w-5" />}
          label="Open Tickets"
          value={String(data?.openTickets ?? 0)}
          tone={data?.openTickets ? "warning" : undefined}
        />
      </div>

      {/* Messages & Notices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.tickets?.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">No tickets</p>
            )}
            {data?.tickets?.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm border-b last:border-0 py-2"
              >
                <div>
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground font-mono">{t.ticket_no}</div>
                </div>
                <Badge variant={t.status === "solved" ? "default" : "secondary"}>
                  {t.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Notices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.notices?.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">No notices</p>
            )}
            {data?.notices?.map((n: any) => (
              <div key={n.id} className="border-b last:border-0 py-2">
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Stat = ({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "warning" | "success";
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            tone === "warning"
              ? "bg-orange-500/10 text-orange-600"
              : tone === "success"
              ? "bg-green-500/10 text-green-600"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-base font-semibold truncate">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ResellerDashboard;
