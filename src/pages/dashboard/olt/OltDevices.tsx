import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Server, Wifi, WifiOff, Cpu, Pencil, Trash2, Eye, Search } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const vendors = ["huawei","bdcom","vsol","dbc","syrotech","solitine","corelink","c-data","ecom","hsgq","phyhome"] as const;

type OltDevice = Tables<"olt_devices">;

const emptyForm = {
  name: "", ip_address: "", port: 23, connection_type: "telnet" as "telnet" | "ssh",
  vendor: "huawei" as typeof vendors[number], username: "", password_encrypted: "",
  branch_id: null as string | null, mikrotik_id: null as string | null, description: "",
};

export default function OltDevices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 15;

  const { data: devices = [] } = useQuery({
    queryKey: ["olt-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices").select("*, branches(name)").order("created_at", { ascending: false });
      return (data || []) as (OltDevice & { branches: { name: string } | null })[];
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
      const payload: TablesInsert<"olt_devices"> = {
        name: form.name, ip_address: form.ip_address, port: form.port,
        connection_type: form.connection_type, vendor: form.vendor,
        username: form.username, password_encrypted: form.password_encrypted,
        branch_id: form.branch_id || null, mikrotik_id: form.mikrotik_id || null,
        description: form.description || null,
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
  const openEdit = (d: OltDevice) => {
    setEditId(d.id);
    setForm({ name: d.name, ip_address: d.ip_address, port: d.port, connection_type: d.connection_type, vendor: d.vendor, username: d.username || "", password_encrypted: d.password_encrypted || "", branch_id: d.branch_id, mikrotik_id: d.mikrotik_id, description: d.description || "" });
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
                  <TableHead>নাম</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>IP:Port</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>ব্রাঞ্চ</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>CPU%</TableHead>
                  <TableHead>Mem%</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>ONU</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">কোনো OLT পাওয়া যায়নি</TableCell></TableRow>
                ) : paged.map((d, i) => {
                  const stats = getOnuStats(d.id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{page * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{d.vendor}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{d.ip_address}:{d.port}</TableCell>
                      <TableCell className="uppercase text-xs">{d.connection_type}</TableCell>
                      <TableCell>{d.branches?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "online" ? "default" : "destructive"}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>{d.cpu_usage ?? "—"}%</TableCell>
                      <TableCell>{d.memory_usage ?? "—"}%</TableCell>
                      <TableCell className="text-xs">{d.uptime || "—"}</TableCell>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "OLT সম্পাদনা" : "নতুন OLT যোগ করুন"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>IP Address *</Label><Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} /></div>
              <div><Label>Port</Label><Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor} onValueChange={v => setForm(f => ({ ...f, vendor: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vendors.map(v => <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Connection</Label>
                <Select value={form.connection_type} onValueChange={v => setForm(f => ({ ...f, connection_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="telnet">Telnet</SelectItem><SelectItem value="ssh">SSH</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Username</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
              <div><Label>Password</Label><Input type="password" value={form.password_encrypted} onChange={e => setForm(f => ({ ...f, password_encrypted: e.target.value }))} /></div>
            </div>
            <div>
              <Label>ব্রাঞ্চ</Label>
              <Select value={form.branch_id || "none"} onValueChange={v => setForm(f => ({ ...f, branch_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>MikroTik লিংক</Label>
              <Select value={form.mikrotik_id || "none"} onValueChange={v => setForm(f => ({ ...f, mikrotik_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                <SelectContent><SelectItem value="none">—</SelectItem>{mikrotiks.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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
