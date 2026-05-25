import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Server, Wifi, WifiOff, Cpu, Pencil, Trash2, Search, Download, Loader2,
  Router, CheckCircle2, AlertCircle, Circle, Users, RefreshCw,
} from "lucide-react";

import ResellerAccessDialog from "@/components/olt/ResellerAccessDialog";
import { z } from "zod";

const vendors = ["huawei", "zte", "bdcom", "vsol", "dbc", "syrotech", "solitine", "corelink", "c-data", "ecom", "hsgq", "phyhome"] as const;
const PRIMARY_VENDORS = new Set(["huawei", "zte", "bdcom"]);

const ipRegex = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}$/;

const formSchema = z.object({
  name: z.string().trim().min(1, "নাম দিন").max(120),
  ip_address: z.string().regex(ipRegex, "সঠিক IP দিন"),
  port: z.number().int().min(1).max(65535),
  telnet_port: z.number().int().min(1).max(65535),
  snmp_port: z.number().int().min(1).max(65535),
});

const emptyForm = {
  name: "", ip_address: "", port: 23, telnet_port: 23,
  connection_type: "telnet" as "telnet" | "ssh",
  vendor: "huawei" as typeof vendors[number], username: "", password_encrypted: "",
  branch_id: null as string | null, mikrotik_id: null as string | null, description: "",
  snmp_enabled: false, snmp_ip: "", snmp_port: 161, snmp_community: "public",
  snmp_version: "v2c", brand_model: "", olt_version: "",
  data_source_priority: "agent_first" as "agent_first" | "snmp_first" | "agent_only" | "snmp_only",
  agent_enabled: true,
  snmp_fallback_enabled: true,
  agent_stale_seconds: 180,
};

// Live status from last_seen (online if seen ≤3 min ago)
function computeLive(lastSeen: string | null, dbStatus: string | null): "online" | "offline" | "unknown" {
  if (!lastSeen) return (dbStatus as any) || "unknown";
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff <= 3 * 60_000) return "online";
  if (diff <= 24 * 3600_000) return "offline";
  return "unknown";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s আগে`;
  if (s < 3600) return `${Math.floor(s / 60)}m আগে`;
  if (s < 86400) return `${Math.floor(s / 3600)}h আগে`;
  return `${Math.floor(s / 86400)}d আগে`;
}

export default function OltDevices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [accessOlt, setAccessOlt] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [fetchingName, setFetchingName] = useState(false);
  const perPage = 15;

  const { data: devices = [] } = useQuery({
    queryKey: ["olt-devices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("olt_devices")
        .select("*, branches(name), mikrotik_devices(id, name, ip_address, status)")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    refetchInterval: 30_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });

  const { data: mikrotiks = [] } = useQuery({
    queryKey: ["mikrotik-list-enriched"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mikrotik_devices")
        .select("id, name, ip_address, api_port, status, enabled, branch_id")
        .order("name");
      return (data || []) as any[];
    },
  });

  const { data: onuCounts = [] } = useQuery({
    queryKey: ["onu-counts-by-olt"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("olt_id, status");
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const selectedMikrotik = useMemo(
    () => mikrotiks.find((m) => m.id === form.mikrotik_id),
    [form.mikrotik_id, mikrotiks],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.safeParse({
        name: form.name, ip_address: form.ip_address,
        port: form.port, telnet_port: form.telnet_port, snmp_port: form.snmp_port,
      });
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        throw new Error(first?.message || "ফর্ম যাচাই ব্যর্থ");
      }
      const payload: any = {
        name: form.name.trim(), ip_address: form.ip_address.trim(), port: form.port,
        telnet_port: form.telnet_port,
        connection_type: form.connection_type, vendor: form.vendor,
        username: form.username || null, password_encrypted: form.password_encrypted || null,
        branch_id: form.branch_id || null, mikrotik_id: form.mikrotik_id || null,
        description: form.description || null,
        snmp_enabled: form.snmp_enabled, snmp_ip: form.snmp_ip || null,
        snmp_port: form.snmp_port, snmp_community: form.snmp_community || "public",
        snmp_version: form.snmp_version, brand_model: form.brand_model || null,
        olt_version: form.olt_version || null,
        data_source_priority: form.data_source_priority,
        agent_enabled: form.agent_enabled,
        snmp_fallback_enabled: form.snmp_fallback_enabled,
        agent_stale_seconds: Math.max(30, Number(form.agent_stale_seconds) || 180),
      };
      if (editId) {
        const { error } = await supabase.from("olt_devices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("olt_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["olt-devices"] });
      setOpen(false);
      toast.success(editId ? "আপডেট হয়েছে" : "যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("olt_devices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-devices"] }); toast.success("মুছে ফেলা হয়েছে"); },
  });

  const fetchSnmpName = async () => {
    const ip = form.snmp_ip || form.ip_address;
    if (!ip) { toast.error("আগে IP দিন"); return; }
    setFetchingName(true);
    try {
      const { data, error } = await supabase.functions.invoke("snmp-fetch-olt-name", {
        body: { ip, port: form.snmp_port, community: form.snmp_community, version: form.snmp_version },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.name) {
        setForm((f) => ({ ...f, name: data.name }));
        toast.success(`Device name: ${data.name}`);
      } else {
        toast.error("নাম পাওয়া যায়নি");
      }
    } catch (e: any) {
      toast.error(e.message || "SNMP fetch failed");
    } finally {
      setFetchingName(false);
    }
  };

  const filtered = devices.filter((d) =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.ip_address.includes(search) ||
    (d.mikrotik_devices?.name || "").toLowerCase().includes(search.toLowerCase()),
  );
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totalOlt = devices.length;
  const onlineOlt = devices.filter((d) => computeLive(d.last_seen, d.status) === "online").length;
  const offlineOlt = totalOlt - onlineOlt;
  const totalOnu = onuCounts.length;

  const openAdd = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      name: d.name, ip_address: d.ip_address, port: d.port,
      telnet_port: d.telnet_port ?? 23,
      connection_type: d.connection_type,
      vendor: d.vendor, username: d.username || "", password_encrypted: d.password_encrypted || "",
      branch_id: d.branch_id, mikrotik_id: d.mikrotik_id, description: d.description || "",
      snmp_enabled: d.snmp_enabled || false, snmp_ip: d.snmp_ip || "",
      snmp_port: d.snmp_port ?? 161, snmp_community: d.snmp_community || "public",
      snmp_version: d.snmp_version || "v2c", brand_model: d.brand_model || "",
      olt_version: d.olt_version || "",
      data_source_priority: d.data_source_priority || "agent_first",
      agent_enabled: d.agent_enabled ?? true,
      snmp_fallback_enabled: d.snmp_fallback_enabled ?? true,
      agent_stale_seconds: d.agent_stale_seconds ?? 180,
    });
    setOpen(true);
  };

  const getOnuStats = (oltId: string) => {
    const onus = onuCounts.filter((o) => o.olt_id === oltId);
    return { total: onus.length, online: onus.filter((o) => o.status === "online").length };
  };

  const statusDot = (live: string) => {
    if (live === "online") return <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />;
    if (live === "offline") return <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />;
    return <Circle className="h-2.5 w-2.5 fill-muted-foreground text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OLT ডিভাইস</h1>
          <p className="text-muted-foreground text-sm">সকল OLT ডিভাইস ম্যানেজমেন্ট ও MikroTik ম্যাপিং</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> OLT যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "মোট OLT", value: totalOlt, icon: Server, color: "blue" },
          { label: "অনলাইন", value: onlineOlt, icon: Wifi, color: "emerald" },
          { label: "অফলাইন", value: offlineOlt, icon: WifiOff, color: "red" },
          { label: "মোট ONU", value: totalOnu, icon: Cpu, color: "purple" },
        ].map((c) => (
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>OLT তালিকা</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম, IP বা MikroTik দিয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম / Alias</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>IP / Ports</TableHead>
                  <TableHead>SNMP</TableHead>
                  <TableHead>ব্রাঞ্চ</TableHead>
                  <TableHead>MikroTik</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>ONU</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">কোনো OLT পাওয়া যায়নি</TableCell></TableRow>
                ) : paged.map((d, i) => {
                  const stats = getOnuStats(d.id);
                  const live = computeLive(d.last_seen, d.status);
                  const mt = d.mikrotik_devices;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{page * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">{statusDot(live)} {d.name}</div>
                        {d.brand_model && <div className="text-[11px] text-muted-foreground">{d.brand_model}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={PRIMARY_VENDORS.has(d.vendor) ? "default" : "outline"} className="capitalize">
                          {d.vendor}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {d.ip_address}
                        <div className="text-muted-foreground">W:{d.port} • T:{d.telnet_port ?? 23}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.snmp_enabled ? "default" : "secondary"} className="text-[10px]">
                          {d.snmp_enabled ? "ON" : "OFF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.branches?.name || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {mt ? (
                          <div className="flex items-center gap-1.5">
                            <Router className="h-3.5 w-3.5 text-blue-500" />
                            <div>
                              <div className="font-medium">{mt.name}</div>
                              <div className="text-muted-foreground font-mono text-[10px]">{mt.ip_address}</div>
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={live === "online" ? "default" : live === "offline" ? "destructive" : "secondary"} className="capitalize">
                          {live}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(d.last_seen)}</TableCell>
                      <TableCell>
                        <span className="text-emerald-600 font-medium">{stats.online}</span>
                        <span className="text-muted-foreground">/{stats.total}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Reseller Access" onClick={() => setAccessOlt({ id: d.id, name: d.name })}>
                            <Users className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) delMut.mutate(d.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>পূর্ববর্তী</Button>
              <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>পরবর্তী</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "OLT সম্পাদনা" : "নতুন OLT যোগ করুন"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            {/* Section: Basic Identity */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Identity</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>নাম / Alias *</Label>
                  <Input
                    placeholder="e.g. Madaripur-BDCOM-1"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">SNMP থেকে auto-fetch করতে পারেন (নিচে SNMP enable করে Fetch Name)</p>
                </div>
                <div>
                  <Label>Vendor *</Label>
                  <Select value={form.vendor} onValueChange={(v) => setForm((f) => ({ ...f, vendor: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v} value={v} className="capitalize">
                          {v} {PRIMARY_VENDORS.has(v) && <span className="text-[10px] text-emerald-500 ml-1">★</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Brand / Model</Label><Input placeholder="e.g. MA5608T" value={form.brand_model} onChange={(e) => setForm((f) => ({ ...f, brand_model: e.target.value }))} /></div>
                <div><Label>OLT Version</Label><Input placeholder="e.g. V800R013" value={form.olt_version} onChange={(e) => setForm((f) => ({ ...f, olt_version: e.target.value }))} /></div>
              </div>
            </div>

            {/* Section: Connection (CLI) */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Connection (CLI)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>IP Address *</Label><Input placeholder="192.168.x.x" value={form.ip_address} onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))} /></div>
                <div>
                  <Label>Wave / Mgmt Port</Label>
                  <Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Telnet Port</Label>
                  <Input type="number" value={form.telnet_port} onChange={(e) => setForm((f) => ({ ...f, telnet_port: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Connection Type</Label>
                  <Select value={form.connection_type} onValueChange={(v) => setForm((f) => ({ ...f, connection_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="telnet">Telnet</SelectItem><SelectItem value="ssh">SSH</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} /></div>
                <div><Label>Password</Label><Input type="password" value={form.password_encrypted} onChange={(e) => setForm((f) => ({ ...f, password_encrypted: e.target.value }))} /></div>
              </div>
            </div>

            {/* Section: SNMP */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SNMP (Monitoring)</Label>
                <Switch checked={form.snmp_enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, snmp_enabled: v }))} />
              </div>
              {form.snmp_enabled && (
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>SNMP IP</Label><Input placeholder={form.ip_address || "OLT IP"} value={form.snmp_ip} onChange={(e) => setForm((f) => ({ ...f, snmp_ip: e.target.value }))} /></div>
                    <div><Label>SNMP Port</Label><Input type="number" value={form.snmp_port} onChange={(e) => setForm((f) => ({ ...f, snmp_port: Number(e.target.value) }))} /></div>
                    <div>
                      <Label>Version</Label>
                      <Select value={form.snmp_version} onValueChange={(v) => setForm((f) => ({ ...f, snmp_version: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v1">v1</SelectItem>
                          <SelectItem value="v2c">v2c</SelectItem>
                          <SelectItem value="v3">v3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><Label>Community String</Label><Input value={form.snmp_community} onChange={(e) => setForm((f) => ({ ...f, snmp_community: e.target.value }))} /></div>
                    <Button type="button" variant="outline" onClick={fetchSnmpName} disabled={fetchingName}>
                      {fetchingName ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                      Fetch Name
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">SNMP থেকে device-এর actual sysName fetch করে Alias-এ বসাবে</p>
                </div>
              )}
            </div>

            {/* Section: Linking — Branch + MikroTik */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Linking</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ব্রাঞ্চ</Label>
                  <Select value={form.branch_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Router className="h-3.5 w-3.5" /> MikroTik (যে router-এর under-এ এই OLT)</Label>
                  <Select value={form.mikrotik_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, mikrotik_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="MikroTik নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {mikrotiks.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            {m.status === "online" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                            {m.name} <span className="text-xs text-muted-foreground font-mono">({m.ip_address})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedMikrotik && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Router className="h-4 w-4 text-blue-500" />
                    {selectedMikrotik.name}
                    <Badge variant={selectedMikrotik.status === "online" ? "default" : "secondary"} className="ml-auto capitalize">
                      {selectedMikrotik.status || "unknown"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Host: <span className="font-mono text-foreground">{selectedMikrotik.ip_address}:{selectedMikrotik.api_port}</span></div>
                    <div>Enabled: <span className="text-foreground">{selectedMikrotik.enabled ? "হ্যাঁ" : "না"}</span></div>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">এই MikroTik-এর PPPoE users এর সাথে OLT-র ONU auto-mapping হবে।</p>
                </div>
              )}
              {/* Section: Data Source (Agent / SNMP) */}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Data Source — Agent / SNMP</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={form.data_source_priority}
                      onValueChange={(v: any) => setForm((f) => ({ ...f, data_source_priority: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent_first">Agent first (SNMP fallback)</SelectItem>
                        <SelectItem value="snmp_first">SNMP first</SelectItem>
                        <SelectItem value="agent_only">Agent only</SelectItem>
                        <SelectItem value="snmp_only">SNMP only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground pt-1">কোন উৎসকে primary হিসেবে ব্যবহার করা হবে</p>
                  </div>
                  <div>
                    <Label>Agent stale threshold (সেকেন্ড)</Label>
                    <Input
                      type="number"
                      min={30}
                      value={form.agent_stale_seconds}
                      onChange={(e) => setForm((f) => ({ ...f, agent_stale_seconds: Number(e.target.value) || 180 }))}
                    />
                    <p className="text-[11px] text-muted-foreground pt-1">কতো সেকেন্ড agent silent থাকলে SNMP fallback active হবে</p>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label className="cursor-pointer">Agent Enabled</Label>
                      <p className="text-[11px] text-muted-foreground">Polling agent থেকে data নেওয়া হবে</p>
                    </div>
                    <Switch
                      checked={form.agent_enabled}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, agent_enabled: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <Label className="cursor-pointer">SNMP Fallback</Label>
                      <p className="text-[11px] text-muted-foreground">Agent fail হলে SNMP try করা হবে</p>
                    </div>
                    <Switch
                      checked={form.snmp_fallback_enabled}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, snmp_fallback_enabled: v }))}
                    />
                  </div>
                </div>
              </div>

              <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.name || !form.ip_address || saveMut.isPending}>
              {saveMut.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResellerAccessDialog open={!!accessOlt} onOpenChange={(v) => !v && setAccessOlt(null)} olt={accessOlt} />
    </div>
  );
}
