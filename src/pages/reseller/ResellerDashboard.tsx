import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Users, TrendingUp, Building2 } from "lucide-react";

const ResellerDashboard = () => {
  const { customer } = usePortalAuth();
  const resellerId = customer?.sub;
  const branchId = customer?.branch_id;

  const { data: stats } = useQuery({
    queryKey: ["reseller-stats", resellerId, branchId],
    enabled: !!resellerId,
    queryFn: async () => {
      const [{ count: clientCount }, { data: tariff }] = await Promise.all([
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("branch_id", branchId ?? ""),
        customer?.tariff_id
          ? supabase.from("reseller_tariffs").select("name, monthly_rate").eq("id", customer.tariff_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      return { clientCount: clientCount ?? 0, tariff: tariff?.data ?? null };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">স্বাগতম, {customer?.name}</h1>
        <p className="text-sm text-muted-foreground">আপনার রিসেলার অ্যাকাউন্টের সারসংক্ষেপ</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="ব্যালেন্স"
          value={`৳ ${(customer?.balance ?? 0).toLocaleString()}`}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="মোট ক্লায়েন্ট"
          value={String(stats?.clientCount ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="ট্যারিফ প্ল্যান"
          value={stats?.tariff?.name ?? "—"}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="ব্রাঞ্চ"
          value={branchId ? "Assigned" : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">অ্যাকাউন্ট তথ্য</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <Info label="ইউজারনেম" value={customer?.username} />
          <Info label="রিসেলার কোড" value={customer?.code} />
          <Info label="ইমেইল" value={customer?.email} />
          <Info label="মোবাইল" value={customer?.mobile} />
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </CardContent>
  </Card>
);

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{value || "—"}</div>
  </div>
);

export default ResellerDashboard;
