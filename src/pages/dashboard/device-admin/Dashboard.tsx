import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, HardDrive, Activity, Users, Server, Cpu, Network, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function DeviceAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["device_admin_dashboard"],
    queryFn: async () => {
      const [mk, olt, sw, zk, jobs, backups, audit] = await Promise.all([
        supabase.from("mikrotik_devices").select("id", { count: "exact", head: true }),
        supabase.from("olt_devices").select("id", { count: "exact", head: true }),
        supabase.from("pop_devices").select("id", { count: "exact", head: true }),
        supabase.from("zkteco_devices").select("id", { count: "exact", head: true }),
        supabase.from("device_admin_deploy_jobs").select("id,status,job_type,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("device_admin_backups").select("id,created_at,file_name,device_name,device_type").order("created_at", { ascending: false }).limit(5),
        supabase.from("device_admin_audit_log").select("id,action,device_name,performed_by_name,created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      return {
        mikrotik: mk.count ?? 0,
        olt: olt.count ?? 0,
        switches: sw.count ?? 0,
        zkteco: zk.count ?? 0,
        jobs: jobs.data ?? [],
        backups: backups.data ?? [],
        audit: audit.data ?? [],
      };
    },
  });

  const cards = [
    { label: "MikroTik", value: stats?.mikrotik ?? 0, icon: Server, color: "text-blue-500" },
    { label: "OLT", value: stats?.olt ?? 0, icon: Cpu, color: "text-purple-500" },
    { label: "Switch / POP", value: stats?.switches ?? 0, icon: Network, color: "text-emerald-500" },
    { label: "ZKTeco", value: stats?.zkteco ?? 0, icon: Users, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> ডিভাইস অ্যাডমিনিস্ট্রেশন ড্যাশবোর্ড
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                  <div className="text-3xl font-bold mt-1">{c.value}</div>
                </div>
                <c.icon className={`h-8 w-8 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> সাম্প্রতিক জব
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.jobs.length === 0 && <div className="text-sm text-muted-foreground">কোনো জব নেই</div>}
            {stats?.jobs.map((j: any) => (
              <div key={j.id} className="flex items-center justify-between text-sm p-2 rounded border border-border">
                <div>
                  <div className="font-medium">{j.job_type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString("bn-BD")}</div>
                </div>
                <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>
                  {j.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" /> সাম্প্রতিক ব্যাকআপ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.backups.length === 0 && <div className="text-sm text-muted-foreground">কোনো ব্যাকআপ নেই</div>}
            {stats?.backups.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between text-sm p-2 rounded border border-border">
                <div>
                  <div className="font-mono text-xs">{b.file_name}</div>
                  <div className="text-xs text-muted-foreground">{b.device_name} • {b.device_type}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("bn-BD")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> অডিট টাইমলাইন
            <Link to="/dashboard/device-admin/audit-log" className="ml-auto text-xs text-primary hover:underline">সব দেখুন →</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats?.audit.length === 0 && <div className="text-sm text-muted-foreground">কোনো অডিট রেকর্ড নেই</div>}
          {stats?.audit.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 text-sm p-2 rounded border border-border">
              <Badge variant="outline" className="text-xs">{a.action}</Badge>
              <div className="flex-1">
                <span className="font-medium">{a.device_name || "—"}</span>
                <span className="text-muted-foreground"> • {a.performed_by_name || "system"}</span>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("bn-BD")}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
