import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Server, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";

export default function ZktecoDevices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", ip_address: "", port: 4370, api_id: "", api_password: "", serial_number: "", location: "", status: "active",
  });

  const { data: devices, isLoading } = useQuery({
    queryKey: ["zkteco-devices"],
    queryFn: async () => {
      const { data } = await supabase.from("zkteco_devices").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = { ...values, port: Number(values.port) };
      if (editId) {
        const { error } = await supabase.from("zkteco_devices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("zkteco_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      toast.success(editId ? "ডিভাইস আপডেট হয়েছে" : "ডিভাইস যোগ হয়েছে");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zkteco_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      toast.success("ডিভাইস মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.functions.invoke("sync-zkteco-data", {
        body: { device_id: deviceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["zkteco-devices"] });
      toast.success(`সিঙ্ক সফল! ${data?.synced_count || 0} রেকর্ড`);
    },
    onError: (e: any) => toast.error(`সিঙ্ক ব্যর্থ: ${e.message}`),
  });

  const resetForm = () => {
    setOpen(false);
    setEditId(null);
    setForm({ name: "", ip_address: "", port: 4370, api_id: "", api_password: "", serial_number: "", location: "", status: "active" });
  };

  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({ name: d.name, ip_address: d.ip_address, port: d.port, api_id: d.api_id || "", api_password: d.api_password || "", serial_number: d.serial_number || "", location: d.location || "", status: d.status });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ZKTeco ডিভাইস</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — অ্যাটেনডেন্স ডিভাইস ম্যানেজমেন্ট</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> ডিভাইস যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "ডিভাইস সম্পাদনা" : "নতুন ZKTeco ডিভাইস"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>ডিভাইস নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Gate Device" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>IP Address *</Label><Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.201" /></div>
                <div><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>API ID</Label><Input value={form.api_id} onChange={(e) => setForm({ ...form, api_id: e.target.value })} /></div>
                <div><Label>API Password</Label><Input type="password" value={form.api_password} onChange={(e) => setForm({ ...form, api_password: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Office" /></div>
              </div>
              <div>
                <Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.ip_address}>
                {editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Server className="h-5 w-5" /> সংযুক্ত ডিভাইসের তালিকা</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>IP : Port</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>শেষ সিঙ্ক</TableHead>
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(devices || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো ডিভাইস নেই</TableCell></TableRow>
                  )}
                  {(devices || []).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="font-mono text-sm">{d.ip_address}:{d.port}</TableCell>
                      <TableCell>{d.serial_number || "—"}</TableCell>
                      <TableCell>{d.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "active" ? "default" : "secondary"} className="gap-1">
                          {d.status === "active" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{d.last_sync_at ? new Date(d.last_sync_at).toLocaleString("bn-BD") : "কখনো না"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate(d.id)} disabled={syncMutation.isPending}>
                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} /> সিঙ্ক
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(d)}>সম্পাদনা</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
