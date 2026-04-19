import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Activity, Cable, Power, Edit2 } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

export default function SwitchDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const portToggle = usePermission("switch.port.toggle", id);
  const portEdit = usePermission("switch.port.edit", id);
  const vlanManage = usePermission("switch.vlan.manage", id);
  const trafficView = usePermission("switch.traffic.view", id);
  const [editPort, setEditPort] = useState<any>(null);
  const [trafficPort, setTrafficPort] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: sw } = useQuery({
    queryKey: ["switch-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("switches").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });

  const { data: ports = [] } = useQuery({
    queryKey: ["switch-ports", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("switch_ports")
        .select("*")
        .eq("switch_id", id!)
        .order("if_index", { ascending: true });
      return data || [];
    },
  });

  const { data: vlans = [] } = useQuery({
    queryKey: ["switch-vlans", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("switch_vlans").select("*").eq("switch_id", id!).order("vlan_id");
      return data || [];
    },
  });

  const { data: traffic = [] } = useQuery({
    queryKey: ["switch-traffic", id, trafficPort],
    enabled: !!id && !!trafficPort && trafficView.allowed,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("switch_traffic_samples")
        .select("in_bps, out_bps, recorded_at")
        .eq("switch_id", id!)
        .eq("interface", trafficPort!)
        .order("recorded_at", { ascending: false })
        .limit(60);
      return (data || []).reverse().map((s) => ({
        t: new Date(s.recorded_at).toLocaleTimeString("en-US", { minute: "2-digit", second: "2-digit" }),
        in: Number(s.in_bps) / 1000,
        out: Number(s.out_bps) / 1000,
      }));
    },
  });

  const sync = async () => {
    setSyncing(true);
    try {
      const r1 = await supabase.functions.invoke("snmp-fetch-switch-info", { body: { switch_id: id } });
      const r2 = await supabase.functions.invoke("snmp-fetch-switch-ports", { body: { switch_id: id } });
      if (r1.error || r2.error) throw new Error(r1.error?.message || r2.error?.message);
      toast.success("Sync সম্পন্ন");
      qc.invalidateQueries({ queryKey: ["switch-detail", id] });
      qc.invalidateQueries({ queryKey: ["switch-ports", id] });
    } catch (e: any) {
      toast.error(e.message || "Sync ব্যর্থ");
    } finally {
      setSyncing(false);
    }
  };

  const togglePort = async (port: any, enabled: boolean) => {
    const { error } = await supabase.functions.invoke("switch-port-toggle", {
      body: { switch_id: id, interface: port.interface, enabled },
    });
    if (error) return toast.error(error.message || "অনুমতি নেই");
    toast.success(`Port ${port.interface} ${enabled ? "ON" : "OFF"}`);
    qc.invalidateQueries({ queryKey: ["switch-ports", id] });
  };

  const saveEdit = async () => {
    if (!editPort) return;
    const { error } = await supabase.functions.invoke("switch-port-update", {
      body: {
        switch_id: id,
        interface: editPort.interface,
        description: editPort.description,
        vlan_id: editPort.vlan_id ? Number(editPort.vlan_id) : null,
      },
    });
    if (error) return toast.error(error.message || "অনুমতি নেই");
    toast.success("সংরক্ষিত");
    setEditPort(null);
    qc.invalidateQueries({ queryKey: ["switch-ports", id] });
  };

  const fmtRate = (bps: any) => {
    const n = Number(bps) || 0;
    if (n > 1e9) return (n / 1e9).toFixed(2) + " Gbps";
    if (n > 1e6) return (n / 1e6).toFixed(2) + " Mbps";
    if (n > 1e3) return (n / 1e3).toFixed(1) + " Kbps";
    return n + " bps";
  };

  return (
    <PermissionGate permission="switch.view" showDenied>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/network/switches"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{sw?.name || "Switch"}</h1>
            <p className="text-xs text-muted-foreground font-mono">{sw?.ip_address} · {sw?.vendor}</p>
          </div>
          <Button onClick={sync} disabled={syncing} size="sm" className="ml-auto">
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sync
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["Status", sw?.status],
            ["Uptime", sw?.uptime || "—"],
            ["CPU", sw?.cpu_usage != null ? `${sw.cpu_usage}%` : "—"],
            ["Memory", sw?.memory_usage != null ? `${sw.memory_usage}%` : "—"],
            ["Model", sw?.model || "—"],
            ["Firmware", sw?.firmware || "—"],
            ["Total Ports", ports.length],
            ["Last Synced", sw?.last_synced ? new Date(sw.last_synced).toLocaleString("bn-BD") : "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="border rounded-md p-2 bg-card">
              <div className="text-[11px] text-muted-foreground uppercase">{k}</div>
              <div className="text-sm font-bold mt-1">{v as any}</div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="interface">
          <TabsList>
            <TabsTrigger value="interface"><Cable className="h-4 w-4 mr-1" /> Interface State</TabsTrigger>
            <TabsTrigger value="sfp"><Activity className="h-4 w-4 mr-1" /> SFP Info</TabsTrigger>
            <TabsTrigger value="shutdown"><Power className="h-4 w-4 mr-1" /> Port Shutdown</TabsTrigger>
            <TabsTrigger value="vlan">VLAN ({vlans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="interface">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Oper</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Duplex</TableHead>
                      <TableHead>In Rate</TableHead>
                      <TableHead>Out Rate</TableHead>
                      <TableHead>MAC</TableHead>
                      <TableHead>VLAN</TableHead>
                      <TableHead>Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ports.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.interface}</TableCell>
                        <TableCell className="text-xs">{p.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={p.oper_status === "up" ? "default" : "destructive"}>{p.oper_status || "—"}</Badge>
                        </TableCell>
                        <TableCell>{p.speed_mbps ? `${p.speed_mbps} M` : "—"}</TableCell>
                        <TableCell>{p.duplex || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{fmtRate(p.in_rate_bps)}</TableCell>
                        <TableCell className="text-xs font-mono">{fmtRate(p.out_rate_bps)}</TableCell>
                        <TableCell className="text-xs font-mono">{p.mac_address || "—"}</TableCell>
                        <TableCell>{p.vlan_id ?? "—"}</TableCell>
                        <TableCell>
                          {portEdit.allowed && (
                            <Button size="icon" variant="ghost" onClick={() => setEditPort({ ...p })}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {trafficView.allowed && (
                            <Button size="icon" variant="ghost" onClick={() => setTrafficPort(p.interface)}>
                              <Activity className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {ports.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Sync করে port আনুন</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sfp">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Interface</TableHead>
                      <TableHead>TX (dBm)</TableHead>
                      <TableHead>RX (dBm)</TableHead>
                      <TableHead>Bias (mA)</TableHead>
                      <TableHead>Temp (°C)</TableHead>
                      <TableHead>Voltage (V)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ports.filter((p: any) => p.tx_power != null || p.rx_power != null).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.interface}</TableCell>
                        <TableCell className="font-bold">{p.tx_power ?? "—"}</TableCell>
                        <TableCell className="font-bold">{p.rx_power ?? "—"}</TableCell>
                        <TableCell>{p.bias_current ?? "—"}</TableCell>
                        <TableCell>{p.sfp_temp ?? "—"}</TableCell>
                        <TableCell>{p.sfp_voltage ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shutdown">
            <Card>
              <CardContent className="p-4">
                {!portToggle.allowed && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded mb-3 text-sm">
                    Port toggle অনুমতি নেই (`switch.port.toggle`)
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ports.map((p: any) => (
                    <div key={p.id} className="border rounded p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs">{p.interface}</div>
                        <div className="text-[11px] text-muted-foreground">{p.description || "—"}</div>
                      </div>
                      <Switch
                        checked={p.enabled}
                        disabled={!portToggle.allowed}
                        onCheckedChange={(v) => togglePort(p, v)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vlan">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>VLAN ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Tagged Ports</TableHead>
                      <TableHead>Untagged Ports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vlans.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">VLAN নেই</TableCell></TableRow>
                    ) : vlans.map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-bold">{v.vlan_id}</TableCell>
                        <TableCell>{v.name || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{(v.tagged_ports || []).join(", ") || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{(v.untagged_ports || []).join(", ") || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!vlanManage.allowed && (
                  <div className="p-3 text-xs text-muted-foreground">VLAN manage অনুমতি নেই</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit dialog */}
        <Dialog open={!!editPort} onOpenChange={() => setEditPort(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Port {editPort?.interface} সম্পাদনা</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs">Description</label>
                <Input
                  value={editPort?.description || ""}
                  onChange={(e) => setEditPort({ ...editPort, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs">VLAN ID</label>
                <Input
                  type="number"
                  value={editPort?.vlan_id || ""}
                  onChange={(e) => setEditPort({ ...editPort, vlan_id: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPort(null)}>বাতিল</Button>
              <Button onClick={saveEdit}>সংরক্ষণ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live traffic dialog */}
        <Dialog open={!!trafficPort} onOpenChange={() => setTrafficPort(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Live Traffic — {trafficPort}</DialogTitle></DialogHeader>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="in" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                  <Area type="monotone" dataKey="out" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">5 sec polling · in=primary, out=destructive · Kbps</p>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
