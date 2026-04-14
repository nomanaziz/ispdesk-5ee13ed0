import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Cable, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

const getPortPrefix = (iface: string | null) => {
  if (!iface) return "unknown";
  // e.g. "0/1/1:3" → "0/1/1", or "gpon-onu_1/1/1:1" → "1/1/1"
  const match = iface.match(/(\d+\/\d+\/\d+)/);
  return match ? match[1] : iface;
};

export default function FiberDownFinder() {
  const [oltFilter, setOltFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => { const { data } = await supabase.from("olt_devices").select("id, name"); return data || []; },
  });

  const { data: onus = [], refetch } = useQuery({
    queryKey: ["fiber-down-onus"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("id, olt_id, interface, mac, description, status, last_seen, offline_reason, olt_devices(name)");
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const filteredOnus = oltFilter === "all" ? onus : onus.filter((o: any) => o.olt_id === oltFilter);

  // Group by OLT + PON port
  type PortGroup = { oltName: string; port: string; total: number; offline: number; onus: any[]; key: string };
  const portGroups: Record<string, PortGroup> = {};

  filteredOnus.forEach((o: any) => {
    const port = getPortPrefix(o.interface);
    const key = `${o.olt_id}__${port}`;
    if (!portGroups[key]) portGroups[key] = { oltName: o.olt_devices?.name || "Unknown", port, total: 0, offline: 0, onus: [], key };
    portGroups[key].total++;
    if (o.status === "offline") { portGroups[key].offline++; portGroups[key].onus.push(o); }
  });

  const groups = Object.values(portGroups)
    .filter(g => g.offline > 0)
    .sort((a, b) => (b.offline / b.total) - (a.offline / a.total));

  const fiberDownCount = groups.filter(g => g.total > 0 && (g.offline / g.total) > 0.5).length;
  const warningCount = groups.filter(g => g.total > 0 && (g.offline / g.total) > 0.3 && (g.offline / g.total) <= 0.5).length;

  const getStatusBadge = (g: PortGroup) => {
    const pct = g.total > 0 ? g.offline / g.total : 0;
    if (pct > 0.5) return <Badge variant="destructive">ফাইবার ডাউন</Badge>;
    if (pct > 0.3) return <Badge className="bg-orange-500 text-white">সতর্কতা</Badge>;
    return <Badge variant="secondary">স্বাভাবিক</Badge>;
  };

  const toggleExpand = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ফাইবার ডাউন ফাইন্ডার</h1>
          <p className="text-muted-foreground text-sm">PON পোর্ট অনুযায়ী ফাইবার কাট সনাক্তকরণ</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label className="text-sm">অটো রিফ্রেশ</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center"><Cable className="h-6 w-6 text-red-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">ফাইবার ডাউন সন্দেহ</p>
              <p className="text-2xl font-bold text-red-600">{fiberDownCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-orange-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">সতর্কতা</p>
              <p className="text-2xl font-bold text-orange-600">{warningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">প্রভাবিত পোর্ট</p>
            <p className="text-2xl font-bold text-foreground">{groups.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>PON পোর্ট বিশ্লেষণ</CardTitle>
          <Select value={oltFilter} onValueChange={setOltFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">সকল OLT</SelectItem>{olts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>OLT</TableHead>
                  <TableHead>PON Port</TableHead>
                  <TableHead>মোট ONU</TableHead>
                  <TableHead>অফলাইন</TableHead>
                  <TableHead>অফলাইন %</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো সমস্যা সনাক্ত হয়নি ✓</TableCell></TableRow>
                ) : groups.map(g => (
                  <>
                    <TableRow key={g.key} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(g.key)}>
                      <TableCell>{expanded[g.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">{g.oltName}</TableCell>
                      <TableCell className="font-mono">{g.port}</TableCell>
                      <TableCell>{g.total}</TableCell>
                      <TableCell className="text-red-600 font-bold">{g.offline}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(g.offline / g.total * 100)}%` }} />
                          </div>
                          <span className="text-sm">{((g.offline / g.total) * 100).toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(g)}</TableCell>
                    </TableRow>
                    {expanded[g.key] && g.onus.map((onu: any) => (
                      <TableRow key={onu.id} className="bg-red-50 dark:bg-red-950/20">
                        <TableCell></TableCell>
                        <TableCell className="font-mono text-xs pl-8">{onu.mac || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{onu.interface || "—"}</TableCell>
                        <TableCell className="text-xs" colSpan={2}>{onu.description || "—"}</TableCell>
                        <TableCell className="text-xs">{onu.last_seen ? new Date(onu.last_seen).toLocaleString("bn-BD") : "—"}</TableCell>
                        <TableCell className="text-xs">{onu.offline_reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
