import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cpu, Wifi, WifiOff, AlertTriangle, Search, History } from "lucide-react";

const getRxColor = (rx: number | null) => {
  if (rx == null) return "text-muted-foreground";
  if (rx >= -18) return "text-emerald-600 font-bold";
  if (rx >= -21) return "text-green-600 font-bold";
  if (rx >= -24) return "text-yellow-600 font-bold";
  if (rx >= -27) return "text-orange-600 font-bold";
  return "text-red-600 font-bold";
};

const getRxBadge = (rx: number | null) => {
  if (rx == null) return "secondary";
  if (rx >= -24) return "default";
  if (rx >= -27) return "secondary";
  return "destructive";
};

export default function OnuList() {
  const [oltFilter, setOltFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dbFilter, setDbFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [historyOnuId, setHistoryOnuId] = useState<string | null>(null);
  const perPage = 20;

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => { const { data } = await supabase.from("olt_devices").select("id, name"); return data || []; },
  });

  const { data: onus = [] } = useQuery({
    queryKey: ["onu-list-full"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("*, olt_devices(name)").order("last_seen", { ascending: false });
      return data || [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["onu-history", historyOnuId],
    enabled: !!historyOnuId,
    queryFn: async () => {
      const { data } = await supabase.from("onu_history").select("*").eq("onu_id", historyOnuId!).order("recorded_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const filtered = onus.filter(o => {
    if (oltFilter !== "all" && o.olt_id !== oltFilter) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (dbFilter !== "all") {
      const rx = o.rx_power;
      if (rx == null) return false;
      if (dbFilter === "good" && rx < -18) return false;
      if (dbFilter === "ok" && (rx < -24 || rx >= -18)) return false;
      if (dbFilter === "warning" && (rx < -27 || rx >= -24)) return false;
      if (dbFilter === "critical" && rx >= -27) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!(o.mac?.toLowerCase().includes(s) || o.serial_number?.toLowerCase().includes(s) || o.description?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totalOnu = onus.length;
  const onlineOnu = onus.filter(o => o.status === "online").length;
  const offlineOnu = onus.filter(o => o.status === "offline").length;
  const highDb = onus.filter(o => o.rx_power != null && o.rx_power < -24).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ONU তালিকা</h1>
        <p className="text-muted-foreground text-sm">সকল ONU ডিভাইসের তালিকা ও স্ট্যাটাস</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "মোট ONU", value: totalOnu, icon: Cpu, color: "blue" },
          { label: "অনলাইন", value: onlineOnu, icon: Wifi, color: "emerald" },
          { label: "অফলাইন", value: offlineOnu, icon: WifiOff, color: "red" },
          { label: "High dB (>-24)", value: highDb, icon: AlertTriangle, color: "orange" },
        ].map(c => (
          <Card key={c.label} className={`border-l-4 border-l-${c.color}-500`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg bg-${c.color}-500/10 flex items-center justify-center`}>
                <c.icon className={`h-6 w-6 text-${c.color}-500`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={oltFilter} onValueChange={v => { setOltFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="OLT ফিল্টার" /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল OLT</SelectItem>{olts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল স্ট্যাটাস</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent>
            </Select>
            <Select value={dbFilter} onValueChange={v => { setDbFilter(v); setPage(0); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল dB</SelectItem>
                <SelectItem value="good">Good (0~-18)</SelectItem>
                <SelectItem value="ok">OK (-18~-24)</SelectItem>
                <SelectItem value="warning">Warning (-24~-27)</SelectItem>
                <SelectItem value="critical">Critical (&lt;-27)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="MAC/Serial/Description..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>OLT</TableHead>
                  <TableHead>Interface</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>RX (dBm)</TableHead>
                  <TableHead>TX (dBm)</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">কোনো ONU পাওয়া যায়নি</TableCell></TableRow>
                ) : paged.map((o: any, i) => (
                  <TableRow key={o.id}>
                    <TableCell>{page * perPage + i + 1}</TableCell>
                    <TableCell className="font-medium">{o.olt_devices?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{o.interface || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{o.mac || "—"}</TableCell>
                    <TableCell className="text-xs">{o.serial_number || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{o.description || "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "online" ? "default" : "destructive"}>{o.status}</Badge></TableCell>
                    <TableCell className={getRxColor(o.rx_power)}>
                      {o.rx_power != null ? `${o.rx_power} dBm` : "—"}
                    </TableCell>
                    <TableCell>{o.tx_power != null ? `${o.tx_power}` : "—"}</TableCell>
                    <TableCell>{o.distance != null ? `${o.distance}m` : "—"}</TableCell>
                    <TableCell className="text-xs">{o.last_seen ? new Date(o.last_seen).toLocaleString("bn-BD") : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setHistoryOnuId(o.id)} title="ইতিহাস"><History className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>পূর্ববর্তী</Button>
              <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>পরবর্তী</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!historyOnuId} onOpenChange={() => setHistoryOnuId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>ONU ইতিহাস</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>সময়</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>RX Power</TableHead>
                <TableHead>TX Power</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">কোনো ইতিহাস নেই</TableCell></TableRow>
              ) : history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="text-xs">{new Date(h.recorded_at).toLocaleString("bn-BD")}</TableCell>
                  <TableCell><Badge variant={h.status === "online" ? "default" : "destructive"}>{h.status}</Badge></TableCell>
                  <TableCell className={getRxColor(h.rx_power)}>{h.rx_power != null ? `${h.rx_power} dBm` : "—"}</TableCell>
                  <TableCell>{h.tx_power ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
