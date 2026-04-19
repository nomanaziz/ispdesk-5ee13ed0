import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Activity, AlertCircle } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";

type Bucket = { label: string; key: string; min: number; max: number; tone: string };

const BUCKETS: Bucket[] = [
  { label: "DB ≥-20 (Excellent)", key: "b20", min: -20, max: 0, tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500" },
  { label: "DB -21 ~ -23", key: "b23", min: -23, max: -21, tone: "bg-emerald-500/10 text-emerald-700 border-emerald-400" },
  { label: "DB -24 (Good)", key: "b24", min: -24, max: -24, tone: "bg-lime-500/15 text-lime-700 border-lime-500" },
  { label: "DB -25 ~ -26", key: "b26", min: -26, max: -25, tone: "bg-yellow-500/15 text-yellow-700 border-yellow-500" },
  { label: "DB -27 (Warning)", key: "b27", min: -27, max: -27, tone: "bg-orange-500/15 text-orange-700 border-orange-500" },
  { label: "DB -28 ~ -29", key: "b29", min: -29, max: -28, tone: "bg-orange-600/15 text-orange-800 border-orange-600" },
  { label: "DB -30", key: "b30", min: -30, max: -30, tone: "bg-red-500/15 text-red-700 border-red-500" },
  { label: "DB ≤-31 (Critical)", key: "b31", min: -999, max: -31, tone: "bg-red-700/15 text-red-800 border-red-700" },
];

function bucketOf(rx: number | null): string | null {
  if (rx == null) return null;
  for (const b of BUCKETS) if (rx >= b.min && rx <= b.max) return b.key;
  return null;
}

export default function PowerDashboard() {
  const [openBucket, setOpenBucket] = useState<Bucket | null>(null);

  const { data: onus = [] } = useQuery({
    queryKey: ["power-dashboard-onus"],
    queryFn: async () => {
      const { data } = await supabase
        .from("onu_list")
        .select("id, mac, serial_number, interface, rx_power, status, last_seen, description, olt_devices(name)")
        .order("rx_power", { ascending: true });
      return data || [];
    },
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of onus) {
      const k = bucketOf(o.rx_power as number | null);
      if (k) m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [onus]);

  const portUtil = useMemo(() => {
    const m = new Map<string, { olt: string; iface: string; count: number }>();
    for (const o of onus as any[]) {
      const olt = o.olt_devices?.name || "—";
      const iface = (o.interface as string) || "—";
      const key = `${olt}|${iface}`;
      const cur = m.get(key) || { olt, iface, count: 0 };
      cur.count += 1;
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [onus]);

  const filteredForBucket = (b: Bucket) =>
    (onus as any[]).filter((o) => {
      const k = bucketOf(o.rx_power as number | null);
      return k === b.key;
    });

  const exportCsv = (b: Bucket) => {
    const rows = filteredForBucket(b);
    const header = "OLT,MAC,Serial,Interface,RX(dBm),Status,LastSeen,Description";
    const lines = rows.map((o: any) =>
      [
        o.olt_devices?.name ?? "",
        o.mac ?? "",
        o.serial_number ?? "",
        o.interface ?? "",
        o.rx_power ?? "",
        o.status ?? "",
        o.last_seen ?? "",
        (o.description ?? "").replace(/,/g, " "),
      ].join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `power-${b.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionGate permission="olt.dashboard.view" showDenied>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">OLT Power Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            RX পাওয়ার ব্যান্ড অনুযায়ী সকল ONU — কার্ডে ক্লিক করে বিস্তারিত দেখুন।
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> DB List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setOpenBucket(b)}
                  className={`border-2 rounded-lg p-3 text-left transition-all hover:scale-105 ${b.tone}`}
                >
                  <div className="text-xs font-medium opacity-80">{b.label}</div>
                  <div className="text-3xl font-bold mt-1">{counts[b.key] || 0}</div>
                  <div className="text-[10px] opacity-70 mt-1">ONU</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GPON Port Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {portUtil.slice(0, 24).map((p) => (
                <div
                  key={`${p.olt}-${p.iface}`}
                  className="border rounded-lg p-3 flex items-center justify-between bg-muted/30"
                >
                  <div>
                    <div className="font-semibold text-sm">{p.olt}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.iface}</div>
                  </div>
                  <Badge variant={p.count > 100 ? "destructive" : "default"}>{p.count}</Badge>
                </div>
              ))}
              {portUtil.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-6 flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" /> কোনো ডেটা নেই
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!openBucket} onOpenChange={() => setOpenBucket(null)}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{openBucket?.label}</DialogTitle>
                {openBucket && (
                  <Button size="sm" variant="outline" onClick={() => exportCsv(openBucket)}>
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                )}
              </div>
            </DialogHeader>
            {openBucket && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OLT</TableHead>
                    <TableHead>MAC</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Interface</TableHead>
                    <TableHead>RX (dBm)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForBucket(openBucket).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.olt_devices?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{o.mac || "—"}</TableCell>
                      <TableCell className="text-xs">{o.serial_number || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{o.interface || "—"}</TableCell>
                      <TableCell className="font-bold">{o.rx_power ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === "online" ? "default" : "destructive"}>{o.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.last_seen ? new Date(o.last_seen).toLocaleString("bn-BD") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredForBucket(openBucket).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        ONU পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
