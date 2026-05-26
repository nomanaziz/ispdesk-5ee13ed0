import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Download, Activity, Wifi, Users2, Search } from "lucide-react";
import { toast } from "sonner";

type Onu = {
  id: string;
  olt_id: string;
  interface: string | null;
  mac: string | null;
  status: string | null;
  rx_power: number | null;
  tx_power: number | null;
  temperature: number | null;
  distance: number | null;
  distance_m: number | null;
  last_seen: string | null;
  olt_devices: { name: string } | null;
};

type Mapping = {
  onu_id: string;
  ppp_username: string | null;
  caller_id_mac: string | null;
  pon_port: string | null;
};

const rxClass = (rx: number | null) => {
  if (rx == null) return "border-muted text-muted-foreground";
  if (rx >= -24) return "border-emerald-500 text-emerald-600 dark:text-emerald-400";
  if (rx >= -27) return "border-yellow-500 text-yellow-600 dark:text-yellow-400";
  return "border-red-500 text-red-600 dark:text-red-400";
};

const onuNumberFromInterface = (iface: string | null) => {
  if (!iface) return "—";
  const m = iface.match(/(\d+)\s*$/);
  return m ? m[1] : iface;
};

const ponPortFromInterface = (iface: string | null) => {
  if (!iface) return "";
  // strip trailing ":N" or ".N" ONU index
  return iface.replace(/[:.]\d+$/, "");
};

export default function OnlineMonitoring() {
  const [params, setParams] = useSearchParams();
  const [oltId, setOltId] = useState<string>(params.get("olt") || "");
  const [ponPort, setPonPort] = useState<string>(params.get("port") || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rxFilter, setRxFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>(params.get("q") || "");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 100;

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (oltId) next.set("olt", oltId); else next.delete("olt");
    if (ponPort !== "all") next.set("port", ponPort); else next.delete("port");
    if (search) next.set("q", search); else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oltId, ponPort, search]);

  const { data: olts = [] } = useQuery({
    queryKey: ["olm-olts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("olt_devices").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: onus = [], refetch, isFetching } = useQuery({
    queryKey: ["olm-onus", oltId],
    enabled: !!oltId,
    refetchInterval: autoRefresh ? 30000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onu_list")
        .select("id, olt_id, interface, mac, status, rx_power, tx_power, temperature, distance, distance_m, last_seen, olt_devices(name)")
        .eq("olt_id", oltId)
        .order("interface", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Onu[];
    },
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ["olm-mappings", oltId],
    enabled: !!oltId && onus.length > 0,
    queryFn: async () => {
      const ids = onus.map(o => o.id);
      const { data, error } = await supabase
        .from("user_onu_mapping")
        .select("onu_id, ppp_username, caller_id_mac, pon_port")
        .in("onu_id", ids);
      if (error) throw error;
      return (data || []) as Mapping[];
    },
  });

  const mapByOnu = useMemo(() => {
    const m = new Map<string, Mapping>();
    mappings.forEach(x => m.set(x.onu_id, x));
    return m;
  }, [mappings]);

  const ports = useMemo(() => {
    const set = new Set<string>();
    onus.forEach(o => { const p = ponPortFromInterface(o.interface); if (p) set.add(p); });
    return Array.from(set).sort();
  }, [onus]);

  const rows = useMemo(() => {
    return onus.map(o => ({
      ...o,
      _port: ponPortFromInterface(o.interface),
      _num: onuNumberFromInterface(o.interface),
      _map: mapByOnu.get(o.id) || null,
    }));
  }, [onus, mapByOnu]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (ponPort !== "all" && r._port !== ponPort) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (rxFilter !== "all") {
        const rx = r.rx_power;
        if (rx == null) return rxFilter === "los";
        if (rxFilter === "good" && rx < -24) return false;
        if (rxFilter === "ok" && (rx < -27 || rx >= -24)) return false;
        if (rxFilter === "warn" && (rx < -29 || rx >= -27)) return false;
        if (rxFilter === "critical" && rx >= -29) return false;
        if (rxFilter === "los") return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const hay = [r.mac, r._map?.ppp_username, r._map?.caller_id_mac, r.interface].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, ponPort, statusFilter, rxFilter, search]);

  const totals = useMemo(() => {
    const total = onus.length;
    const online = onus.filter(o => o.status === "online").length;
    const matched = onus.filter(o => mapByOnu.has(o.id) && mapByOnu.get(o.id)?.ppp_username).length;
    return { total, online, matched };
  }, [onus, mapByOnu]);

  const pageRows = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const exportCsv = () => {
    const header = ["OLT","PON Port","ONU#","PPPoE Username","ONU MAC","Router MAC","RX Power","TX Power","Temp","Status","Distance"];
    const lines = [header.join(",")];
    filtered.forEach(r => {
      lines.push([
        r.olt_devices?.name ?? "",
        r._port,
        r._num,
        r._map?.ppp_username ?? "",
        r.mac ?? "",
        r._map?.caller_id_mac ?? "",
        r.rx_power ?? "",
        r.tx_power ?? "",
        r.temperature ?? "",
        r.status ?? "",
        r.distance_m ?? r.distance ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `onu-monitoring-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হয়েছে");
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Online Client Monitoring</h1>
          <p className="text-sm text-muted-foreground">প্রতিটা OLT-এর live ONU status, RX/TX power, এবং user mapping</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto" />
            <Label htmlFor="auto" className="cursor-pointer">Auto-refresh (30s)</Label>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm opacity-90"><Users2 className="h-4 w-4" /> Total ONU</div>
            <div className="text-3xl font-bold mt-1">{totals.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm opacity-90"><Wifi className="h-4 w-4" /> Online ONU</div>
            <div className="text-3xl font-bold mt-1">{totals.online}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm opacity-90"><Users2 className="h-4 w-4" /> Matched PPPoE</div>
            <div className="text-3xl font-bold mt-1">{totals.matched}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">OLT *</Label>
            <Select value={oltId} onValueChange={(v) => { setOltId(v); setPage(0); }}>
              <SelectTrigger><SelectValue placeholder="OLT সিলেক্ট করুন" /></SelectTrigger>
              <SelectContent>
                {olts.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">PON Port</Label>
            <Select value={ponPort} onValueChange={(v) => { setPonPort(v); setPage(0); }} disabled={!oltId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ports</SelectItem>
                {ports.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="los">LOS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">RX Power</Label>
            <Select value={rxFilter} onValueChange={(v) => { setRxFilter(v); setPage(0); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="good">Good (≥ -24)</SelectItem>
                <SelectItem value="ok">OK (-24 to -27)</SelectItem>
                <SelectItem value="warn">Warning (-27 to -29)</SelectItem>
                <SelectItem value="critical">Critical (&lt; -29)</SelectItem>
                <SelectItem value="los">LOS / No signal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="username / MAC" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {!oltId ? (
            <div className="p-10 text-center text-muted-foreground">Performance-এর জন্য প্রথমে একটা OLT সিলেক্ট করুন।</div>
          ) : !filtered.length ? (
            <div className="p-10 text-center text-muted-foreground">কোনো ONU পাওয়া যায়নি।</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-700 hover:bg-slate-700">
                  <TableHead className="text-white">OLT Name</TableHead>
                  <TableHead className="text-white">PON Port</TableHead>
                  <TableHead className="text-white">ONU #</TableHead>
                  <TableHead className="text-white">PPPoE Username</TableHead>
                  <TableHead className="text-white">ONU MAC</TableHead>
                  <TableHead className="text-white">Router MAC</TableHead>
                  <TableHead className="text-white">RX Power</TableHead>
                  <TableHead className="text-white">TX Power</TableHead>
                  <TableHead className="text-white">Temp</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.olt_devices?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r._port || "—"}</TableCell>
                    <TableCell className="font-semibold">{r._num}</TableCell>
                    <TableCell>{r._map?.ppp_username || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{r.mac || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r._map?.caller_id_mac || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {r.rx_power != null ? (
                        <Badge variant="outline" className={`font-bold ${rxClass(r.rx_power)}`}>{r.rx_power.toFixed(2)}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{r.tx_power != null ? r.tx_power.toFixed(2) : "—"}</TableCell>
                    <TableCell>{r.temperature != null ? r.temperature.toFixed(2) : "—"}</TableCell>
                    <TableCell>
                      {r.status === "online" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0">Online</Badge>
                      ) : r.status === "offline" ? (
                        <Badge variant="secondary">Offline</Badge>
                      ) : (
                        <Badge variant="destructive">{r.status || "—"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.distance_m ?? r.distance ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {filtered.length} টি ONU — Page {page + 1} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Voltage / Laser Bias বর্তমানে SNMP poll করা হয় না — লাগলে polling agent-এর OID extend করতে হবে।
      </p>
    </div>
  );
}
