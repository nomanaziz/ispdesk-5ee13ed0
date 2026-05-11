import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { usePopScope } from "@/hooks/usePopScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Server, Loader2 } from "lucide-react";

interface MikrotikDevice {
  id: string;
  name: string;
  ip_address: string;
  username: string;
  password_encrypted: string;
  api_port: number;
  version: string;
  timeout: number;
  status: "online" | "offline" | "unknown";
  enabled: boolean;
  order_no: number | null;
  branch_id?: string | null;
  assigned_to_pop_id?: string | null;
}

const defaultForm = {
  name: "",
  ip_address: "",
  username: "",
  password_encrypted: "",
  api_port: 8728,
  version: "6.43_or_older",
  timeout: 10,
  order_no: 1,
};

const isValidIpOrDomain = (value: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(value)) return value.split(".").every((n) => Number(n) >= 0 && Number(n) <= 255);
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(value);
};

export default function BwPanelMikrotikServers() {
  const queryClient = useQueryClient();
  const { branchId, popId, popName } = usePopScope();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({});

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["bw_panel_mikrotik_devices", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mikrotik_devices")
        .select("*")
        .eq("branch_id", branchId!)
        .order("order_no", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as MikrotikDevice[];
    },
  });

  const nextOrderNo = () => devices.reduce((m, d) => Math.max(m, d.order_no || 0), 0) + 1;

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof defaultForm & { id?: string }) => {
      const payload: any = { ...values };
      if (values.id) {
        const { error } = await supabase.from("mikrotik_devices").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        payload.status = "unknown";
        payload.enabled = true;
        payload.branch_id = branchId;
        payload.assigned_to_pop_id = popId;
        const { error } = await supabase.from("mikrotik_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_panel_mikrotik_devices"] });
      toast.success(editId ? "সার্ভার আপডেট হয়েছে" : "সার্ভার যোগ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mikrotik_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_panel_mikrotik_devices"] });
      toast.success("সার্ভার মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const updates: any = { enabled: !enabled };
      if (!enabled === false) updates.status = "offline";
      const { error } = await supabase.from("mikrotik_devices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bw_panel_mikrotik_devices"] }),
  });

  const checkStatus = async (deviceId: string) => {
    setCheckingStatus((p) => ({ ...p, [deviceId]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("check-mikrotik-status", {
        body: { device_id: deviceId },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bw_panel_mikrotik_devices"] });
      toast.success(`স্ট্যাটাস: ${data.status === "online" ? "Connected" : "Disconnected"}`);
    } catch (e: any) {
      toast.error("স্ট্যাটাস চেক করতে ব্যর্থ: " + (e.message || "Unknown error"));
    } finally {
      setCheckingStatus((p) => ({ ...p, [deviceId]: false }));
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(defaultForm);
  };

  const openEdit = (d: MikrotikDevice) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      ip_address: d.ip_address,
      username: d.username,
      password_encrypted: d.password_encrypted || "",
      api_port: d.api_port,
      version: d.version,
      timeout: d.timeout,
      order_no: d.order_no || nextOrderNo(),
    });
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...defaultForm, order_no: nextOrderNo() });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.ip_address || !form.username || !form.password_encrypted) {
      toast.error("সব প্রয়োজনীয় ফিল্ড পূরণ করুন");
      return;
    }
    if (!isValidIpOrDomain(form.ip_address)) {
      toast.error("সঠিক IP অ্যাড্রেস বা ডোমেইন নাম দিন");
      return;
    }
    if (!branchId) {
      toast.error("POP context পাওয়া যায়নি — আবার লগইন করুন");
      return;
    }
    upsertMutation.mutate(editId ? { ...form, id: editId } : form);
  };

  const filtered = devices.filter((d) =>
    [d.name, d.ip_address, d.username].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusDisplay = (d: MikrotikDevice) => {
    if (!d.enabled) return { color: "bg-gray-400", text: "Disabled", textColor: "text-muted-foreground" };
    if (d.status === "online") return { color: "bg-green-500 animate-pulse", text: "Connected", textColor: "text-green-600 dark:text-green-400" };
    if (d.status === "unknown") return { color: "bg-yellow-500", text: "Unknown", textColor: "text-yellow-600 dark:text-yellow-400" };
    return { color: "bg-red-500", text: "Disconnected", textColor: "text-red-600 dark:text-red-400" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" /> মাইক্রোটিক সার্ভার
          </h1>
          {popName && <p className="text-sm text-muted-foreground mt-1">POP: {popName}</p>}
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> সার্ভার যোগ করুন
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">সার্ভার তালিকা</CardTitle>
            <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-16">অর্ডার</TableHead>
                  <TableHead>সার্ভার নাম</TableHead>
                  <TableHead>সার্ভার IP</TableHead>
                  <TableHead>ইউজারনেম</TableHead>
                  <TableHead>পাসওয়ার্ড</TableHead>
                  <TableHead>পোর্ট</TableHead>
                  <TableHead>ভার্সন</TableHead>
                  <TableHead>টাইমআউট</TableHead>
                  <TableHead>সক্রিয়</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8">কোনো সার্ভার পাওয়া যায়নি — "সার্ভার যোগ করুন" বাটনে ক্লিক করুন</TableCell></TableRow>
                ) : filtered.map((d, i) => {
                  const statusInfo = getStatusDisplay(d);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{d.order_no ?? "—"}</Badge></TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.ip_address}</TableCell>
                      <TableCell>{d.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{showPasswords[d.id] ? d.password_encrypted : "••••••••"}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords((p) => ({ ...p, [d.id]: !p[d.id] }))}>
                            {showPasswords[d.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{d.api_port}</TableCell>
                      <TableCell><Badge variant="outline">{({"6.43_or_older":"≤6.43","gt6.43_lt7.0":"6.43–7.0","7.0_or_newer":"≥7.0"} as any)[d.version] || d.version}</Badge></TableCell>
                      <TableCell>{d.timeout}s</TableCell>
                      <TableCell>
                        <Switch checked={d.enabled} onCheckedChange={() => toggleEnabled.mutate({ id: d.id, enabled: d.enabled })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-3 w-3 rounded-full ${statusInfo.color}`} />
                          <span className={`text-xs font-medium ${statusInfo.textColor}`}>{statusInfo.text}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Check Status" disabled={checkingStatus[d.id]} onClick={() => checkStatus(d.id)}>
                            {checkingStatus[d.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "সার্ভার সম্পাদনা" : "নতুন সার্ভার যোগ করুন"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>সার্ভার নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MikroTik-1" /></div>
              <div className="space-y-2">
                <Label>সার্ভার IP / ডোমেইন *</Label>
                <Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>ইউজারনেম *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="admin" /></div>
              <div className="space-y-2"><Label>পাসওয়ার্ড *</Label><Input type="password" value={form.password_encrypted} onChange={(e) => setForm({ ...form, password_encrypted: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>API পোর্ট *</Label><Input type="number" value={form.api_port} onChange={(e) => setForm({ ...form, api_port: Number(e.target.value) })} /></div>
              <div className="space-y-2">
                <Label>ভার্সন</Label>
                <Select value={form.version} onValueChange={(v) => setForm({ ...form, version: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6.43_or_older">≤ 6.43</SelectItem>
                    <SelectItem value="gt6.43_lt7.0">6.43 – 7.0</SelectItem>
                    <SelectItem value="7.0_or_newer">≥ 7.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>টাইমআউট (s)</Label><Input type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2">
              <Label>অর্ডার নং *</Label>
              <Input type="number" min={1} value={form.order_no} onChange={(e) => setForm({ ...form, order_no: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>{editId ? "আপডেট" : "সেভ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
