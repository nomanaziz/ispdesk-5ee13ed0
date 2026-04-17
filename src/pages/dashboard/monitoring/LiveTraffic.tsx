import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Activity, Download, Upload, Wifi, Search, ChevronsUpDown, Clock, MapPin, User, Gauge,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const fmtBytes = (b: number) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(2)} ${u[i]}`;
};

type Sample = { time: string; down: number; up: number };
const MAX_POINTS = 40;

export default function LiveTraffic() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [snap, setSnap] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["live-traffic-clients", search],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, name, client_id, username, contact, speed, is_online")
        .not("username", "is", null)
        .neq("username", "")
        .order("is_online", { ascending: false })
        .limit(200);
      if (search) q = q.or(`name.ilike.%${search}%,username.ilike.%${search}%,client_id.ilike.%${search}%,contact.ilike.%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) || null, [clients, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setSamples([]);
    setSnap(null);

    const tick = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("live-traffic-snapshot", {
          body: { client_id: selectedId },
        });
        if (cancelled) return;
        if (error || !data) return;
        setSnap(data);
        const t = new Date().toLocaleTimeString([], { hour12: false });
        if (!data.online) {
          setSamples((s) => [...s, { time: t, down: 0, up: 0 }].slice(-MAX_POINTS));
          return;
        }
        const downKbps = Math.round(Number(data.download_bps || 0) / 1000);
        const upKbps = Math.round(Number(data.upload_bps || 0) / 1000);
        setSamples((s) => [...s, { time: t, down: downKbps, up: upKbps }].slice(-MAX_POINTS));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();
    const id = window.setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [selectedId]);

  const latest = samples[samples.length - 1];
  const isOnline = !!snap?.online;

  return (
    <div className="space-y-5 p-4 md:p-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-primary-foreground shadow">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Live Traffic Monitor</h1>
          <p className="text-sm text-muted-foreground">PPPoE user real-time bandwidth (updates every 3s)</p>
        </div>
      </div>

      {/* Client picker */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="text-sm font-medium min-w-[120px]">Select Client:</div>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full md:w-[420px] justify-between">
                  {selected ? (
                    <span className="truncate">
                      {selected.name} <span className="text-muted-foreground">({selected.username})</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Choose a client by name / username / code…</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search…" value={search} onValueChange={setSearch} />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={() => { setSelectedId(c.id); setOpen(false); }}
                        >
                          <span className={cn(
                            "h-2 w-2 rounded-full mr-2",
                            c.is_online ? "bg-emerald-500" : "bg-muted-foreground/40"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.username} · {c.client_id || "—"} · {c.contact || "—"}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selected && (
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ml-auto",
                isOnline ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              )}>
                <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                {loading ? "Polling…" : isOnline ? "Online" : "Offline"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selected && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a client to start monitoring live traffic.</p>
          </CardContent>
        </Card>
      )}

      {selected && (
        <>
          {/* Connection details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" /> Session Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: User, label: "Client", value: selected.name },
                  { icon: User, label: "Username", value: selected.username },
                  { icon: Gauge, label: "Package", value: selected.speed || "—" },
                  { icon: MapPin, label: "IP Address", value: snap?.address || "—" },
                  { icon: Wifi, label: "Interface", value: snap?.interface || "—" },
                  { icon: Clock, label: "Uptime", value: snap?.uptime || "—" },
                  { icon: Download, label: "Session Download", value: fmtBytes(Number(snap?.session_download_bytes || 0)) },
                  { icon: Upload, label: "Session Upload", value: fmtBytes(Number(snap?.session_upload_bytes || 0)) },
                ].map((r) => (
                  <div key={r.label} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <r.icon className="h-3 w-3" />{r.label}
                    </div>
                    <div className="text-sm font-semibold truncate" title={String(r.value)}>{r.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Speed cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-primary-foreground shadow">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Download</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {latest ? latest.down.toLocaleString() : "0"}{" "}
                    <span className="text-sm font-medium text-muted-foreground">Kbps</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-500/10 to-indigo-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-primary-foreground shadow">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Upload</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {latest ? latest.up.toLocaleString() : "0"}{" "}
                    <span className="text-sm font-medium text-muted-foreground">Kbps</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Live Traffic
                <span className="text-xs font-normal text-muted-foreground ml-auto">Updates every 3s</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={samples} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} unit=" Kbps" width={80} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8, fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v.toLocaleString()} Kbps`, ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="down" name="Download" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="up" name="Upload" stroke="hsl(217 91% 60%)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!isOnline && samples.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Client is offline — speed will appear when the PPPoE session becomes active.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
