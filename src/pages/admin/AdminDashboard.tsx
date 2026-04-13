import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, CreditCard, Package, TrendingUp, Clock } from "lucide-react";

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
  <Card>
    <CardContent className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { data: requestCount = 0 } = useQuery({
    queryKey: ["admin-requests-count"],
    queryFn: async () => {
      const { count } = await supabase.from("service_requests").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["admin-customer-count"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: activeCustomers = 0 } = useQuery({
    queryKey: ["admin-active-customers"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "active");
      return count || 0;
    },
  });

  const { data: packageCount = 0 } = useQuery({
    queryKey: ["admin-package-count"],
    queryFn: async () => {
      const { count } = await supabase.from("packages").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
  });

  const { data: paymentCount = 0 } = useQuery({
    queryKey: ["admin-payment-count"],
    queryFn: async () => {
      const { count } = await supabase.from("payments").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">ISP Desk SaaS management overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Requests" value={requestCount} icon={MessageSquare} color="bg-blue-500" />
        <StatCard label="Pending Requests" value={pendingCount} icon={Clock} color="bg-amber-500" />
        <StatCard label="Total Customers" value={customerCount} icon={Users} color="bg-emerald-500" />
        <StatCard label="Active Customers" value={activeCustomers} icon={TrendingUp} color="bg-green-500" />
        <StatCard label="Active Packages" value={packageCount} icon={Package} color="bg-violet-500" />
        <StatCard label="Payments" value={paymentCount} icon={CreditCard} color="bg-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Service Requests</CardTitle></CardHeader>
          <CardContent>
            <RecentRequests />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Customers</CardTitle></CardHeader>
          <CardContent>
            <RecentCustomers />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function RecentRequests() {
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-recent-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  if (requests.length === 0) return <p className="text-sm text-muted-foreground">No requests yet.</p>;

  return (
    <div className="space-y-3">
      {requests.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">{r.isp_name || r.contact_name}</p>
            <p className="text-xs text-muted-foreground">{r.phone} · {r.district}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {r.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentCustomers() {
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-recent-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  if (customers.length === 0) return <p className="text-sm text-muted-foreground">No customers yet.</p>;

  return (
    <div className="space-y-3">
      {customers.map((c: any) => (
        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">{c.isp_name}</p>
            <p className="text-xs text-muted-foreground">{c.subdomain}.ispdesk.com</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {c.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;
