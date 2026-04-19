import { useState } from "react";
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
import { Plus, Server, Wifi, WifiOff, Cpu, Pencil, Trash2, Search, Download, Loader2 } from "lucide-react";

const vendors = ["huawei","bdcom","vsol","dbc","syrotech","solitine","corelink","c-data","ecom","hsgq","phyhome"] as const;

const emptyForm = {
  name: "", ip_address: "", port: 23, telnet_port: 23,
  connection_type: "telnet" as "telnet" | "ssh",
  vendor: "huawei" as typeof vendors[number], username: "", password_encrypted: "",
  branch_id: null as string | null, mikrotik_id: null as string | null, description: "",
  snmp_enabled: false, snmp_ip: "", snmp_port: 161, snmp_community: "public",
  snmp_version: "v2c", brand_model: "", olt_version: "",
};

export default function OltDevices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [fetchingName, setFetchingName] = useState(false);
  const perPage = 15;

  const { data: devices = [] } = useQuery({
    queryKey: ["olt-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices").select("*, branches(name), mikrotik_devices(name)").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-list"],
    queryFn: async () => { const { data } = await supabase.from("branches").select("id, name"); return data || []; },
  });

  const { data: mikrotiks = [] } = useQuery({
    queryKey: ["mikrotik-list"],
    queryFn: async () => { const { data } = await supabase.from("mikrotik_devices").select("id, name"); return data || []; },
  });

  const { data: onuCounts = [] } = useQuery({
    queryKey: ["onu-counts-by-olt"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("olt_id, status");
      return data || [];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name, ip_address: form.ip_address, port: form.port,
        telnet_port: form.telnet_port,
        connection_type: form.connection_type, vendor: form.vendor,
        username: form.username, password_encrypted: form.password_encrypted,
        branch_id: form.branch_id || null, mikrotik_id: form.mikrotik_id || null,
        description: form.description || null,
        snmp_enabled: form.snmp_enabled, snmp_ip: form.snmp_ip || null,
        snmp_port: form.snmp_port, snmp_community: form.snmp_community || "public",
        snmp_version: form.snmp_version, brand_model: form.brand_model || null,
        olt_version: form.olt_version || null,
      };
      if (editId) {
        const { error } = await supabase.from("olt_devices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("olt_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-devices"] }); setOpen(false); toast.success(editId ? "আপডেট হয়েছে" : "যোগ হয়েছে"); },
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
        setForm(f => ({ ...f, name: data.name }));
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

  const filtered = devices.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.ip_address.includes(search)
  );
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totalOlt = devices.length;
  const onlineOlt = devices.filter(d => d.status === "online").length;
  const offlineOlt = devices.filter(d => d.status === "offline").length;
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
    });
    setOpen(true);
  };

  const getOnuStats = (oltId: string) => {
    const onus = onuCounts.filter(o => o.olt_id === oltId);
    return { total: onus.length, online: onus.filter(o => o.status === "online").length };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OLT ডিভাইস</h1>
          <p className="text-muted-foreground text-sm">সকল OLT ডিভাইস ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> OLT যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "মোট OLT", value: totalOlt, icon: Server, color: "blue" },
          { label: "অনলাইন", value: onlineOlt, icon: Wifi, color: "emerald" },
          { label: "অফলাইন", value: offlineOlt, icon: WifiOff, color: "red" },
          { label: "মোট ONU", value: totalOnu, icon: Cpu, color: "purple" },
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>OLT তালিকা</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="নাম বা IP দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
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
                  <TableHead>Brand/Model</TableHead>
                  <TableHead>IP : Wave / Telnet</TableHead>
                  <TableHead>SNMP</TableHead>
                  <TableHead>ব্রাঞ্চ</TableHead>
                  <TableHead>MikroTik</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>CPU%</TableHead>
                  <TableHead>Mem%</TableHead>
                  <TableHead>ONU</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">কোনো OLT পাওয়া যায়নি</TableCell></TableRow>
                ) : paged.map((d, i) => {
                  const stats = getOnuStats(d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{page * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{d.vendor}</Badge></TableCell>
                      <TableCell className="text-xs">{d.brand_model || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {d.ip_address}
                        <div className="text-muted-foreground">W:{d.port} • T:{d.telnet_port ?? 23}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.snmp_enabled ? "default" : "secondary"} className="text-[10px]">
                          {d.snmp_enabled ? "ON" : "OFF"}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.branches?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{d.mikrotik_devices?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "online" ? "default" : "destructive"}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>{d.cpu_usage ?? "—"}%</TableCell>
                      <TableCell>{d.memory_usage ?? "—"}%</TableCell>
                      <TableCell>
                        <span className="text-emerald-600">{stats.online}</span>/<span>{stats.total}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>পূর্ববর্তী</Button>
              <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>পরবর্তী</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Port-forward IP দেখে চেনা কঠিন — পরিচিত নাম দিন বা SNMP থেকে fetch করুন</p>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Select value={form.vendor} onValueChange={v => setForm(f => ({ ...f, vendor: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{vendors.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Brand / Model</Label><Input placeholder="e.g. MA5608T" value={form.brand_model} onChange={e => setForm(f => ({ ...f, brand_model: e.target.value }))} /></div>
                <div><Label>OLT Version</Label><Input placeholder="e.g. V800R013" value={form.olt_version} onChange={e => setForm(f => ({ ...f, olt_version: e.target.value }))} /></div>
              </div>
            </div>

            {/* Section: Connection (CLI) */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Connection (CLI)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>IP Address *</Label><Input placeholder="192.168.x.x" value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} /></div>
                <div>
                  <Label>Wave / Mgmt Port</Label>
                  <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Telnet Port</Label>
                  <Input type="number" value={form.telnet_port} onChange={e => setForm(f => ({ ...f, telnet_port: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Connection Type</Label>
                  <Select value={form.connection_type} onValueChange={v => setForm(f => ({ ...f, connection_type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="telnet">Telnet</SelectItem><SelectItem value="ssh">SSH</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Username</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
                <div><Label>Password</Label><Input type="password" value={form.password_encrypted} onChange={e => setForm(f => ({ ...f, password_encrypted: e.target.value }))} /></div>
              </div>
            </div>

            {/* Section: SNMP */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">SNMP (Monitoring)</Label>
                <Switch checked={form.snmp_enabled} onCheckedChange={v => setForm(f => ({ ...f, snmp_enabled: v }))} />
              </div>
              {form.snmp_enabled && (
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>SNMP IP</Label><Input placeholder={form.ip_address || "OLT IP"} value={form.snmp_ip} onChange={e => setForm(f => ({ ...f, snmp_ip: e.target.value }))} /></div>
                    <div><Label>SNMP Port</Label><Input type="number" value={form.snmp_port} onChange={e => setForm(f => ({ ...f, snmp_port: Number(e.target.value) }))} /></div>
                    <div>
                      <Label>Version</Label>
                      <Select value={form.snmp_version} onValueChange={v => setForm(f => ({ ...f, snmp_version: v }))}>
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
                    <div className="flex-1"><Label>Community String</Label><Input value={form.snmp_community} onChange={e => setForm(f => ({ ...f, snmp_community: e.target.value }))} /></div>
                    <Button type="button" variant="outline" onClick={fetchSnmpName} disabled={fetchingName}>
                      {fetchingName ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                      Fetch Name
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">SNMP থেকে device-এর actual sysName fetch করে Alias-এ বসাবে</p>
                </div>
              )}
            </div>

            {/* Section: Linking */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Linking</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ব্রাঞ্চ</Label>
                  <Select value={form.branch_id || "none"} onValueChange={v => setForm(f => ({ ...f, branch_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>MikroTik লিংক (Optional)</Label>
                  <Select value={form.mikrotik_id || "none"} onValueChange={v => setForm(f => ({ ...f, mikrotik_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{mikrotiks.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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
    </div>
  );
}
