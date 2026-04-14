import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, Server } from "lucide-react";

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
  created_at: string;
}

const defaultForm = {
  name: "",
  ip_address: "",
  username: "",
  password_encrypted: "",
  api_port: 8728,
  version: "v3",
  timeout: 10,
};

export default function Servers() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["mikrotik_devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mikrotik_devices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as MikrotikDevice[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof defaultForm & { id?: string }) => {
      const payload = { ...values } as any;
      if (values.id) {
        const { error } = await supabase.from("mikrotik_devices").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        payload.status = "online";
        const { error } = await supabase.from("mikrotik_devices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mikrotik_devices"] });
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
      queryClient.invalidateQueries({ queryKey: ["mikrotik_devices"] });
      toast.success("সার্ভার মুছে ফেলা হয়েছে");
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("mikrotik_devices").update({ status: status === "online" ? "offline" : "online" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mikrotik_devices"] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(defaultForm);
  };

  const openEdit = (d: MikrotikDevice) => {
    setEditId(d.id);
    setForm({ name: d.name, ip_address: d.ip_address, username: d.username, password_encrypted: d.password_encrypted || "", api_port: d.api_port, version: d.version, timeout: d.timeout });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.ip_address || !form.username || !form.password_encrypted) {
      toast.error("সব প্রয়োজনীয় ফিল্ড পূরণ করুন");
      return;
    }
    upsertMutation.mutate(editId ? { ...form, id: editId } : form);
  };

  const filtered = devices.filter((d) =>
    [d.name, d.ip_address, d.username].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Server className="h-6 w-6" /> মাইক্রোটিক সার্ভার</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> সার্ভার যোগ করুন</Button>
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
                  <TableHead>সার্ভার নাম</TableHead>
                  <TableHead>সার্ভার IP</TableHead>
                  <TableHead>ইউজারনেম</TableHead>
                  <TableHead>পাসওয়ার্ড</TableHead>
                  <TableHead>পোর্ট</TableHead>
                  <TableHead>ভার্সন</TableHead>
                  <TableHead>টাইমআউট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">কোনো সার্ভার পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell>{i + 1}</TableCell>
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
                    <TableCell><Badge variant="outline">{d.version}</Badge></TableCell>
                    <TableCell>{d.timeout}s</TableCell>
                    <TableCell>
                      <Switch checked={d.status === "online"} onCheckedChange={() => toggleStatus.mutate({ id: d.id, status: d.status })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Sync"><RefreshCw className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
              <div className="space-y-2"><Label>সার্ভার IP *</Label><Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" /></div>
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
                  <SelectContent><SelectItem value="v3">v3</SelectItem><SelectItem value="v2">v2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>টাইমআউট (সেকেন্ড)</Label><Input type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: Number(e.target.value) })} /></div>
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
