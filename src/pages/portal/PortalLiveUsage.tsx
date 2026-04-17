import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Download, Upload, Wifi, User, Hash, Phone, Clock, Gauge } from "lucide-react";
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

const fmtUptime = (since?: string | null) => {
  if (!since) return "—";
  const ms = Date.now() - new Date(since).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

type Sample = { time: string; down: number; up: number };
const MAX_POINTS = 30;

const PortalLiveUsage = () => {
  const { customer } = usePortalAuth();
  const clientId = customer?.type === "client" ? customer.sub : undefined;

  const { data: client } = useQuery({
    queryKey: ["portal-live-client", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from("clients")
        .select(
          "id, name, client_id, username, contact, speed, is_online, total_upload, total_download, joining_date"
        )
        .eq("id", clientId)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
    refetchInterval: 10000,
  });

  const [samples, setSamples] = useState<Sample[]>([]);
  const lastRef = useRef<{ up: number; down: number; t: number } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const tick = async () => {
      const { data } = await supabase
        .from("clients")
        .select("total_upload, total_download")
        .eq("id", clientId)
        .maybeSingle();
      if (cancelled || !data) return;
      const now = Date.now();
      const up = Number(data.total_upload || 0);
      const down = Number(data.total_download || 0);
      if (lastRef.current) {
        const dt = Math.max(1, (now - lastRef.current.t) / 1000);
        const upKbps = Math.max(0, ((up - lastRef.current.up) * 8) / 1000 / dt);
        const downKbps = Math.max(0, ((down - lastRef.current.down) * 8) / 1000 / dt);
        setSamples((s) => {
          const next = [
            ...s,
            {
              time: new Date().toLocaleTimeString([], { hour12: false }),
              down: Math.round(downKbps),
              up: Math.round(upKbps),
            },
          ];
          return next.slice(-MAX_POINTS);
        });
      } else {
        // seed an initial 0 point so chart appears immediately
        setSamples([{ time: new Date().toLocaleTimeString([], { hour12: false }), down: 0, up: 0 }]);
      }
      lastRef.current = { up, down, t: now };
    };

    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [clientId]);

  const latest = samples[samples.length - 1];
  const isOnline = !!client?.is_online;

  const infoRows = [
    { icon: User, label: "Client Name", value: client?.name || "—" },
    { icon: Hash, label: "Client Code", value: client?.client_id || "—" },
    { icon: User, label: "Username", value: client?.username || "—" },
    { icon: Phone, label: "Mobile", value: client?.contact || (client as any)?.mobile || "—" },
    { icon: Gauge, label: "Package Speed", value: client?.speed || "—" },
    { icon: Clock, label: "Connection Since", value: client?.joining_date ? new Date(client.joining_date).toLocaleDateString() : "—" },
    { icon: Download, label: "Downloaded Data", value: fmtBytes(Number(client?.total_download || 0)) },
    { icon: Upload, label: "Uploaded Data", value: fmtBytes(Number(client?.total_upload || 0)) },
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

      {/* Real-time graph */}
      <Card className="border-0 shadow-sm">
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
          {!isOnline && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Client is offline — live speed will appear once the connection is active and traffic sync is running.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalLiveUsage;
