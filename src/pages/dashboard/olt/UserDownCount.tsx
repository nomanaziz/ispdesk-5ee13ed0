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
import { WifiOff, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

export default function UserDownCount() {
  const [oltFilter, setOltFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => { const { data } = await supabase.from("olt_devices").select("id, name"); return data || []; },
  });

  const { data: onus = [], refetch } = useQuery({
    queryKey: ["onu-down-count"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("id, olt_id, mac, description, status, last_seen, offline_reason, olt_devices(name)");
      return data || [];
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const filteredOnus = oltFilter === "all" ? onus : onus.filter((o: any) => o.olt_id === oltFilter);

  // Group by OLT
  const grouped: Record<string, { name: string; total: number; online: number; offline: number; offlineOnus: any[] }> = {};
  filteredOnus.forEach((o: any) => {
    if (!grouped[o.olt_id]) grouped[o.olt_id] = { name: o.olt_devices?.name || "Unknown", total: 0, online: 0, offline: 0, offlineOnus: [] };
    grouped[o.olt_id].total++;
    if (o.status === "online") grouped[o.olt_id].online++;
    else { grouped[o.olt_id].offline++; grouped[o.olt_id].offlineOnus.push(o); }
  });

  const groups = Object.entries(grouped).sort((a, b) => b[1].offline - a[1].offline);
  const totalDown = filteredOnus.filter((o: any) => o.status === "offline").length;

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ডাউন ONU কাউন্ট</h1>
          <p className="text-muted-foreground text-sm">OLT অনুযায়ী অফলাইন ONU সংখ্যা</p>
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
            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center"><WifiOff className="h-6 w-6 text-red-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">মোট ডাউন ONU</p>
              <p className="text-2xl font-bold text-foreground">{totalDown}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">মোট OLT</p>
            <p className="text-2xl font-bold text-foreground">{groups.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">মোট ONU</p>
            <p className="text-2xl font-bold text-foreground">{filteredOnus.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>OLT অনুযায়ী ডাউন কাউন্ট</CardTitle>
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
                  <TableHead>OLT নাম</TableHead>
                  <TableHead>মোট ONU</TableHead>
                  <TableHead>অনলাইন</TableHead>
                  <TableHead>অফলাইন</TableHead>
                  <TableHead>অফলাইন %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">কোনো ডেটা নেই</TableCell></TableRow>
                ) : groups.map(([oltId, g]) => (
                  <>
                    <TableRow key={oltId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(oltId)}>
                      <TableCell>
                        {g.offline > 0 ? (expanded[oltId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : null}
                      </TableCell>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell>{g.total}</TableCell>
                      <TableCell className="text-emerald-600">{g.online}</TableCell>
                      <TableCell className="text-red-600 font-bold">{g.offline}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${g.total > 0 ? (g.offline / g.total * 100) : 0}%` }} />
                          </div>
                          <span className="text-sm">{g.total > 0 ? ((g.offline / g.total) * 100).toFixed(1) : 0}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded[oltId] && g.offlineOnus.map((onu: any) => (
                      <TableRow key={onu.id} className="bg-red-50 dark:bg-red-950/20">
                        <TableCell></TableCell>
                        <TableCell className="font-mono text-xs pl-8">{onu.mac || "—"}</TableCell>
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
