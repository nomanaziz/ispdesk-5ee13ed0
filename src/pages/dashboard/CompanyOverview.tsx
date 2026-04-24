import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, UserCheck, UserX, Wallet, Receipt, Radio, Wifi,
  Building2, Activity, TrendingUp, AlertCircle, Network,
} from "lucide-react";
import { Link } from "react-router-dom";

interface CompanyInfo {
  name: string;
  logo_url: string;
}

const defaults: CompanyInfo = { name: "", logo_url: "" };

function StatCard({
  label, value, icon: Icon, accent = "primary", to,
}: { label: string; value: string | number; icon: any; accent?: string; to?: string }) {
  const card = (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg bg-${accent}/10 shrink-0`}>
          <Icon className={`h-5 w-5 text-${accent}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-xl font-bold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default function CompanyOverview() {
  const { value: company } = useSystemSetting<CompanyInfo>("company_info", defaults);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["company-overview-stats"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        totalClients, activeClients, inactiveClients, leftClients,
        popManagers, bwResellerUsers,
        billPaid, billPending,
        todayCol, monthCol,
        onlineClients,
        bwSalePops,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "inactive"),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "left"),
        supabase.from("branch_managers").select("id", { count: "exact", head: true }),
        supabase.from("bw_reseller_users").select("id", { count: "exact", head: true }),
        supabase.from("billing").select("id", { count: "exact", head: true }).eq("status", "paid").gte("created_at", monthStart.toISOString()),
        supabase.from("billing").select("id", { count: "exact", head: true }).neq("status", "paid").gte("created_at", monthStart.toISOString()),
        supabase.from("bill_collections").select("amount").gte("created_at", todayStart.toISOString()),
        supabase.from("bill_collections").select("amount").gte("created_at", monthStart.toISOString()),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      const sumAmt = (rows: any) => (rows.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

      // Top BW resellers by sub-user count
      const { data: bwResellers } = await supabase
        .from("branch_managers")
        .select("id, name, company_name")
        .eq("pop_type", "bandwidth")
        .limit(50);

      let topBw: { name: string; users: number }[] = [];
      if (bwResellers && bwResellers.length) {
        const counts = await Promise.all(
          bwResellers.map(r =>
            supabase.from("bw_reseller_users").select("id", { count: "exact", head: true }).eq("reseller_id", r.id)
              .then(res => ({ name: r.company_name || r.name, users: res.count || 0 }))
          )
        );
        topBw = counts.sort((a, b) => b.users - a.users).slice(0, 5);
      }

      return {
        totalClients: totalClients.count || 0,
        activeClients: activeClients.count || 0,
        inactiveClients: inactiveClients.count || 0,
        leftClients: leftClients.count || 0,
        popManagers: popManagers.count || 0,
        bwResellerUsers: bwResellerUsers.count || 0,
        billPaid: billPaid.count || 0,
        billPending: billPending.count || 0,
        todayCollection: sumAmt(todayCol),
        monthCollection: sumAmt(monthCol),
        onlineClients: (onlineClients as any).count || 0,
        topBw,
      };
    },
  });

  const fmt = (n: number) => `৳ ${n.toLocaleString("en-IN")}`;
  const title = company.name ? `${company.name} — কোম্পানি ওভারভিউ` : "কোম্পানি ওভারভিউ";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-md object-contain border bg-card" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            পুরা কোম্পানির এক নজরে সারসংক্ষেপ {isLoading && "• লোড হচ্ছে..."}
          </p>
        </div>
      </div>

      {/* Quick Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="আজকের কালেকশন" value={fmt(stats?.todayCollection || 0)} icon={Wallet} accent="primary" to="/dashboard/billing/daily-collection" />
        <StatCard label="চলতি মাসের কালেকশন" value={fmt(stats?.monthCollection || 0)} icon={TrendingUp} accent="primary" />
        <StatCard label="অনলাইন ক্লায়েন্ট" value={stats?.onlineClients ?? 0} icon={Activity} accent="primary" to="/dashboard/monitoring/online" />
        <StatCard label="বকেয়া বিল" value={stats?.billPending ?? 0} icon={AlertCircle} accent="destructive" to="/dashboard/billing" />
      </div>

      {/* Client Stats */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">ক্লায়েন্ট পরিসংখ্যান</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="মোট হোম ক্লায়েন্ট" value={stats?.totalClients ?? 0} icon={Users} to="/dashboard/clients" />
          <StatCard label="সক্রিয়" value={stats?.activeClients ?? 0} icon={UserCheck} accent="primary" />
          <StatCard label="নিষ্ক্রিয়" value={stats?.inactiveClients ?? 0} icon={UserX} accent="muted-foreground" />
          <StatCard label="চলে গেছে" value={stats?.leftClients ?? 0} icon={UserX} accent="destructive" to="/dashboard/clients/left" />
        </div>
      </div>

      {/* Reseller Stats */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">রিসেলার ও পার্টনার</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="POP ম্যানেজার" value={stats?.popManagers ?? 0} icon={Radio} to="/dashboard/branches/managers" />
          <StatCard label="BW রিসেলার সাব-ইউজার" value={stats?.bwResellerUsers ?? 0} icon={Network} />
          <StatCard label="এই মাসে পরিশোধিত" value={stats?.billPaid ?? 0} icon={Receipt} accent="primary" />
          <StatCard label="BW POP" value={stats?.topBw.length ?? 0} icon={Wifi} to="/dashboard/bw-sale/pop" />
        </div>
      </div>

      {/* Top BW Resellers */}
      {stats && stats.topBw.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">টপ ৫ ব্যান্ডউইথ রিসেলার (সাব-ইউজার অনুযায়ী)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {stats.topBw.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-foreground">{r.name}</span>
                  </span>
                  <span className="font-semibold text-primary">{r.users} ইউজার</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
