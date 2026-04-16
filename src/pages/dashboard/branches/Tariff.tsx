import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Settings, Pencil, Trash2, RefreshCw } from "lucide-react";

interface TariffForm {
  name: string;
  package_id: string;
  selling_rate: number;
  activation_days: number;
  min_activation_days: number;
  protocol_type: string;
  mikrotik_server_id: string;
  mikrotik_profile: string;
}

const defaultForm: TariffForm = {
  name: "", package_id: "", selling_rate: 0, activation_days: 30,
  min_activation_days: 1, protocol_type: "PPPoE", mikrotik_server_id: "", mikrotik_profile: "",
};

export default function Tariff() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TariffForm>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<{ name: string; "rate-limit": string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const { data: tariffs, isLoading } = useQuery({
    queryKey: ["reseller-tariffs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_tariffs")
        .select("*, isp_packages(name, price), mikrotik_devices(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["isp-packages-pop-select"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price").eq("status", "active").eq("package_type", "pop");
      return data ?? [];
    },
  });

  const { data: servers } = useQuery({
    queryKey: ["mikrotik-servers-select"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name");
      return data ?? [];
    },
  });

  // Fetch MikroTik profiles when server changes
  const fetchProfiles = async (deviceId: string) => {
    if (!deviceId) {
      setProfiles([]);
      return;
    }
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-profiles", {
        body: { device_id: deviceId },
      });
      if (error) throw error;
      if (data?.profiles) {
        setProfiles(data.profiles);
      } else {
        setProfiles([]);
        if (data?.error) toast.error(data.error);
      }
    } catch (e: any) {
      toast.error("প্রোফাইল লোড ব্যর্থ: " + (e.message || "Unknown error"));
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // When server selection changes in form
  const handleServerChange = (serverId: string) => {
    setForm({ ...form, mikrotik_server_id: serverId, mikrotik_profile: "" });
    fetchProfiles(serverId);
  };

  // Load profiles when editing an existing tariff
  useEffect(() => {
    if (open && form.mikrotik_server_id) {
      fetchProfiles(form.mikrotik_server_id);
    }
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        package_id: form.package_id || null,
        selling_rate: form.selling_rate,
        activation_days: form.activation_days,
        min_activation_days: form.min_activation_days,
        is_daily_recharge: false,
        protocol_type: form.protocol_type,
        mikrotik_server_id: form.mikrotik_server_id || null,
        mikrotik_profile: form.mikrotik_profile || null,
      };
      if (editId) {
        const { error } = await supabase.from("reseller_tariffs").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reseller_tariffs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller-tariffs"] });
      toast.success(editId ? "ট্যারিফ আপডেট হয়েছে" : "ট্যারিফ যোগ হয়েছে");
      setOpen(false);
      setForm(defaultForm);
      setEditId(null);
      setProfiles([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reseller_tariffs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller-tariffs"] });
      toast.success("ট্যারিফ মুছে ফেলা হয়েছে");
    },
  });

  const openEdit = (t: any) => {
    setForm({
      name: t.name, package_id: t.package_id || "", selling_rate: t.selling_rate,
      activation_days: t.activation_days, min_activation_days: t.min_activation_days ?? 1,
      protocol_type: t.protocol_type || "PPPoE", mikrotik_server_id: t.mikrotik_server_id || "",
      mikrotik_profile: t.mikrotik_profile || "",
    });
    setEditId(t.id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ট্যারিফ কনফিগারেশন</h1>
          <p className="text-sm text-muted-foreground">POP-এর জন্য প্যাকেজ রেট ও সেটিংস</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditId(null); setProfiles([]); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> ট্যারিফ যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "ট্যারিফ এডিট" : "নতুন ট্যারিফ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ট্যারিফের নাম *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. XYZ POP" />
              </div>
              <div>
                <Label>প্যাকেজ সিলেক্ট (POP)</Label>
                <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                  <SelectTrigger><SelectValue placeholder="প্যাকেজ বাছাই করুন" /></SelectTrigger>
                  <SelectContent>
                    {packages?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>সেলিং রেট (৳)</Label>
                <Input type="number" value={form.selling_rate} onChange={(e) => setForm({ ...form, selling_rate: Number(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>অ্যাক্টিভেশন দিন</Label>
                  <Input type="number" value={form.activation_days} onChange={(e) => {
                    const val = Number(e.target.value);
                    setForm({ ...form, activation_days: val, min_activation_days: Math.min(form.min_activation_days, val) });
                  }} />
                </div>
                <div>
                  <Label>মিনিমাম অ্যাক্টিভেশন দিন</Label>
                  <Input type="number" value={form.min_activation_days} min={1} max={form.activation_days} onChange={(e) => {
                    const val = Math.min(Number(e.target.value), form.activation_days);
                    setForm({ ...form, min_activation_days: Math.max(1, val) });
                  }} />
                  <p className="text-xs text-muted-foreground mt-1">POP অ্যাডমিন ম্যানুয়াল রিচার্জে ন্যূনতম দিন</p>
                </div>
              </div>
              <div>
                <Label>MikroTik সার্ভার</Label>
                <Select value={form.mikrotik_server_id} onValueChange={handleServerChange}>
                  <SelectTrigger><SelectValue placeholder="সার্ভার বাছাই করুন" /></SelectTrigger>
                  <SelectContent>
                    {servers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>প্রোটোকল টাইপ</Label>
                <Select value={form.protocol_type} onValueChange={(v) => setForm({ ...form, protocol_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PPPoE">PPPoE</SelectItem>
                    <SelectItem value="IPoE">IPoE</SelectItem>
                    <SelectItem value="Static">Static</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  MikroTik প্রোফাইল
                  {form.mikrotik_server_id && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => fetchProfiles(form.mikrotik_server_id)}
                      disabled={loadingProfiles}
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingProfiles ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </Label>
                {profiles.length > 0 ? (
                  <Select value={form.mikrotik_profile} onValueChange={(v) => setForm({ ...form, mikrotik_profile: v })}>
                    <SelectTrigger><SelectValue placeholder="প্রোফাইল বাছাই করুন" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name} {p["rate-limit"] ? `(${p["rate-limit"]})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.mikrotik_profile}
                    onChange={(e) => setForm({ ...form, mikrotik_profile: e.target.value })}
                    placeholder={loadingProfiles ? "লোড হচ্ছে..." : form.mikrotik_server_id ? "সার্ভার থেকে সিঙ্ক করুন" : "আগে সার্ভার সিলেক্ট করুন"}
                    disabled={loadingProfiles}
                  />
                )}
              </div>
              <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" /> ট্যারিফ তালিকা
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>প্যাকেজ</TableHead>
                    <TableHead>মূল্য (৳)</TableHead>
                    <TableHead>সেলিং রেট (৳)</TableHead>
                    <TableHead>দিন</TableHead>
                    <TableHead>মিনি. দিন</TableHead>
                    <TableHead>প্রোটোকল</TableHead>
                    <TableHead>সার্ভার</TableHead>
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariffs?.map((t: any, i) => (
                    <TableRow key={t.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.isp_packages?.name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{t.isp_packages?.price ?? 0}</TableCell>
                      <TableCell className="font-mono">৳{t.selling_rate}</TableCell>
                      <TableCell>{t.activation_days}</TableCell>
                      <TableCell>{t.min_activation_days ?? 1}</TableCell>
                      <TableCell>{t.protocol_type}</TableCell>
                      <TableCell>{t.mikrotik_devices?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!tariffs || tariffs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        কোনো ট্যারিফ পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
