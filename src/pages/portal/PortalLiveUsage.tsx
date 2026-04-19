import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Download, Upload, Wifi, User, Hash, Phone, Clock, Gauge, WifiOff, Mail, MapPin, Shield } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const fmtBytes = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(2)} ${u[i]}`;
};

type Sample = { time: string; down: number; up: number };
const MAX_POINTS = 30;

const PortalLiveUsage = () => {
  const { customer } = usePortalAuth();
  const clientId = customer?.type === "client" ? customer.sub : undefined;

  const { data } = useQuery({
    queryKey: ["portal-live-usage", clientId],
    queryFn: () => callPortal<any>("get_live_usage"),
    enabled: !!clientId,
    refetchInterval: 15000,
  });
  const client: any = data?.client;
  const [samples, setSamples] = useState<Sample[]>([]);
  const [snapshotOnline, setSnapshotOnline] = useState<boolean | null>(null);
  const [snapUptime, setSnapUptime] = useState<string | null>(null);
  const [snapAddress, setSnapAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("live-traffic-snapshot", {
          body: { client_id: clientId },
        });
        if (cancelled) return;
        if (error || !data) return;
        setSnapshotOnline(!!data.online);
        setSnapUptime(data.uptime || null);
        setSnapAddress(data.address || null);
        if (!data.online) {
          setSamples((s) =>
            [...s, { time: new Date().toLocaleTimeString([], { hour12: false }), down: 0, up: 0 }].slice(-MAX_POINTS)
          );
          return;
        }
        // bps → Kbps
        const downKbps = Math.round(Number(data.download_bps || 0) / 1000);
        const upKbps = Math.round(Number(data.upload_bps || 0) / 1000);
        setSamples((s) =>
          [
            ...s,
            { time: new Date().toLocaleTimeString([], { hour12: false }), down: downKbps, up: upKbps },
          ].slice(-MAX_POINTS)
        );
      } catch (_) {
        /* swallow */
      }
    };

    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientId]);

  const latest = samples[samples.length - 1];
  const isOnline = snapshotOnline ?? !!client?.is_online;

  const infoRows = [
    { icon: User, label: "Client Name", value: client?.name || "—" },
    { icon: Hash, label: "Client Code", value: client?.client_id || "—" },
    { icon: User, label: "Username", value: client?.username || "—" },
    { icon: Phone, label: "Mobile", value: client?.contact || "—" },
    { icon: Mail, label: "Email", value: client?.email || "—" },
    { icon: MapPin, label: "Zone", value: (client as any)?.zones?.name || "—" },
    { icon: Hash, label: "NID", value: (client as any)?.nid_number || "—" },
    { icon: Gauge, label: "Package Speed", value: client?.speed || "—" },
    { icon: Wifi, label: "Connection", value: (client as any)?.connection_type || "—" },
    { icon: Shield, label: "Protocol", value: (client as any)?.protocol_type || "—" },
    { icon: Clock, label: "Joining Date", value: client?.joining_date ? new Date(client.joining_date).toLocaleDateString() : "—" },
    { icon: Download, label: "Downloaded", value: fmtBytes(Number(client?.total_download || 0)) },
    { icon: Upload, label: "Uploaded", value: fmtBytes(Number(client?.total_upload || 0)) },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Live Usage</h1>
          <p className="text-sm text-muted-foreground">Real-time bandwidth & connection status</p>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      {/* Connectivity Information */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" /> Connectivity Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {infoRows.map((r) => (
              <div key={r.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <r.icon className="h-3 w-3" />
                  {r.label}
                </div>
                <div className="text-sm font-semibold truncate" title={String(r.value)}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Offline state */}
      {!isOnline && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-slate-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold">You are Offline</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                আপনার connection বর্তমানে inactive। Connection live হলে এখানে real-time speed ও traffic graph দেখা যাবে।
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live speed cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Download Speed</div>
              <div className="text-2xl font-bold tabular-nums">
                {latest ? latest.down.toLocaleString() : "0"}{" "}
                <span className="text-sm font-medium text-muted-foreground">Kbps</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-500/10 to-indigo-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Upload Speed</div>
              <div className="text-2xl font-bold tabular-nums">
                {latest ? latest.up.toLocaleString() : "0"}{" "}
                <span className="text-sm font-medium text-muted-foreground">Kbps</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time graph — only when online */}
      {isOnline && <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Live Traffic Monitoring
            <span className="text-xs font-normal text-muted-foreground ml-auto">Updates every 3s</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={samples} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  unit=" Kbps"
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v.toLocaleString()} Kbps`, ""]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="down"
                  name="Download"
                  stroke="hsl(160 84% 39%)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="up"
                  name="Upload"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>}
    </div>
  );
};

export default PortalLiveUsage;
