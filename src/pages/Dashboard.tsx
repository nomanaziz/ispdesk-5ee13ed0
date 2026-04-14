import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, Wifi, Clock, FileText, UserPlus, AlertTriangle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function useStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthStart = `${currentMonth}-01`;

      const [clients, billing, onus, tickets, recentClients, recentBilling, recentRequests] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("billing").select("amount, paid, status").gte("month", monthStart),
        supabase.from("onu_list").select("id, status", { count: "exact" }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("clients").select("id, name, client_id, created_at, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("billing").select("id, bill_id, amount, paid, status, month, client_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("client_requests").select("id, name, contact, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      const totalClients = clients.count ?? 0;
      const billingData = billing.data ?? [];
      const monthlyRevenue = billingData.reduce((s, b) => s + (Number(b.paid) || 0), 0);
      const monthlyBilled = billingData.reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const unpaidCount = billingData.filter(b => b.status === "unpaid").length;

      const onuData = onus.data ?? [];
      const totalOnu = onuData.length;
      const onlineOnu = onuData.filter(o => o.status === "online").length;

      const pendingTickets = tickets.count ?? 0;

      return {
        totalClients,
        monthlyRevenue,
        monthlyBilled,
        unpaidCount,
        totalOnu,
        onlineOnu,
        pendingTickets,
        recentClients: recentClients.data ?? [],
        recentBilling: recentBilling.data ?? [],
        recentRequests: recentRequests.data ?? [],
      };
    },
    refetchInterval: 30000,
  });
}

function StatCard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(d: string) {
  try { return format(new Date(d), "dd MMM, hh:mm a"); } catch { return d; }
}

const statusColor: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paid: "bg-green-500/20 text-green-400",
  unpaid: "bg-red-500/20 text-red-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  inactive: "bg-gray-500/20 text-gray-400",
  approved: "bg-blue-500/20 text-blue-400",
};

const Dashboard = () => {
  const { data, isLoading } = useStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground text-sm">ISP ERP সারসংক্ষেপ</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="মোট গ্রাহক"
              value={data?.totalClients ?? 0}
              subtitle="সকল সক্রিয় ও নিষ্ক্রিয়"
              icon={Users}
              color="bg-primary/20 text-primary"
            />
            <StatCard
              title="মাসিক আদায়"
              value={`৳${(data?.monthlyRevenue ?? 0).toLocaleString()}`}
              subtitle={`বিল: ৳${(data?.monthlyBilled ?? 0).toLocaleString()} | বকেয়া: ${data?.unpaidCount ?? 0}`}
              icon={DollarSign}
              color="bg-green-500/20 text-green-400"
            />
            <StatCard
              title="ONU স্ট্যাটাস"
              value={`${data?.onlineOnu ?? 0}/${data?.totalOnu ?? 0}`}
              subtitle="অনলাইন / মোট"
              icon={Wifi}
              color="bg-blue-500/20 text-blue-400"
            />
            <StatCard
              title="পেন্ডিং টিকেট"
              value={data?.pendingTickets ?? 0}
              subtitle="ওপেন সাপোর্ট টিকেট"
              icon={AlertTriangle}
              color="bg-yellow-500/20 text-yellow-400"
            />
          </>
        )}
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Clients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              সাম্প্রতিক গ্রাহক
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : data?.recentClients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">কোনো গ্রাহক নেই</p>
            ) : (
              data?.recentClients.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.client_id} • {formatDate(c.created_at)}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[c.status] || ""}>{c.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Billing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-400" />
              সাম্প্রতিক বিলিং
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : data?.recentBilling.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">কোনো বিল নেই</p>
            ) : (
              data?.recentBilling.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{b.bill_id}</p>
                    <p className="text-xs text-muted-foreground">৳{Number(b.amount).toLocaleString()} • পেমেন্ট: ৳{Number(b.paid ?? 0).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[b.status] || ""}>{b.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Connection Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-yellow-400" />
              নতুন কানেকশন রিকোয়েস্ট
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : data?.recentRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">কোনো রিকোয়েস্ট নেই</p>
            ) : (
              data?.recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.contact} • {formatDate(r.created_at)}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[r.status] || ""}>{r.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
