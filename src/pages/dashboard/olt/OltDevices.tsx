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
  Router, CheckCircle2, AlertCircle, Circle,
} from "lucide-react";
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
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">কোনো OLT পাওয়া য