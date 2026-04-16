import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Download, Upload, Wifi } from "lucide-react";

const fmt = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${u[i]}`;
};

const PortalLiveUsage = () => {
  const { customer } = usePortalAuth();

  const { data: client } = useQuery({
    queryKey: ["portal-usage-client", customer?.sub],
    queryFn: async () => {
      if (customer?.type !== "client") return null;
      const { data } = await supabase
        .from("clients")
        .select("total_upload, total_download, is_online, username, speed")
        .eq("id", customer!.sub)
        .maybeSingle();
      return data;
    },
    enabled: !!customer?.sub && customer?.type === "client",
    refetchInterval: 30000,
  });

  const totalUp = Number(client?.total_upload || 0);
  const totalDown = Number(client?.total_download || 0);

  const stats = [
    { label: "Total Download", value: fmt(totalDown), icon: Download, tint: "from-emerald-500 to-teal-600" },
    { label: "Total Upload", value: fmt(totalUp), icon: Upload, tint: "from-sky-500 to-indigo-600" },
    { label: "Status", value: client?.is_online ? "Online" : "Offline", icon: Wifi, tint: client?.is_online ? "from-green-500 to-emerald-600" : "from-slate-400 to-slate-600" },
    { label: "Speed", value: client?.speed || "—", icon: Activity, tint: "from-violet-500 to-fuchsia-600" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Live Usage</h1>
          <p className="text-sm text-muted-foreground">Real-time bandwidth & connection status</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.tint} flex items-center justify-center text-white shadow`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground mt-3">{s.label}</div>
              <div className="text-lg font-bold truncate">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-10 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Real-time graph coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">
            Detailed usage charts will appear here once traffic monitoring is enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLiveUsage;
