import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Send, Search, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

const defaultForm = {
  client_id: "",
  service_id: "",
  vas_username: "",
  vas_password: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  status: "active",
};

export default function VasSubscriptions() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterService, setFilterService] = useState("all");

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["vas-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vas_subscriptions")
        .select("*, clients(name, contact, client_id), vas_services(name, credentials_template)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-vas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, client_id, contact").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["vas-services-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vas_services").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof defaultForm & { id?: string }) => {
      const payload = {
        client_id: formData.client_id,
        service_id: formData.service_id,
        vas_username: formData.vas_username,
        vas_password: formData.vas_password,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
      };
      if (formData.id) {
        const { error } = await supabase.from("vas_subscriptions").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vas_subscriptions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vas-subscriptions"] });
      toast.success(editingId ? "সাবস্ক্রিপশন আপডেট হয়েছে" : "সাবস্ক্রিপশন যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সেভ করতে ব্যর্থ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vas_subscriptions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vas-subscriptions"] });
      toast.success("সাবস্ক্রিপশন মুছে ফেলা হয়েছে");
    },
  });

  const sendCredentialsSms = async (sub: any) => {
    const service = sub.vas_services;
    const client = sub.clients;
    if (!client?.contact) {
      toast.error("ক্লায়েন্টের ফোন নম্বর নেই");
      return;
    }
    const template = service?.credentials_template || "আপনার {service_name} ID: {username}, Password: {password}";
    const message = template
      .replace("{service_name}", service?.name || "")
      .replace("{username}", sub.vas_username || "")
      .replace("{password}", sub.vas_password || "");

    const { error } = await supabase.from("sms_log").insert({
      recipient: client.contact,
      message,
      status: "pending",
      sms_type: "vas_credentials",
    });
    if (error) {
      toast.error("SMS পাঠাতে ব্যর্থ");
    } else {
      toast.success(`${client.name} কে SMS পাঠানো হয়েছে`);
    }
  };

  const sendBulkSms = async () => {
    const selected = subscriptions.filter((s: any) => selectedIds.includes(s.id));
    let sent = 0;
    for (const sub of selected) {
      const service = sub.vas_services as any;
      const client = sub.clients as any;
      if (!client?.contact) continue;
      const template = service?.credentials_template || "আপনার {service_name} ID: {username}, Password: {password}";
      const message = template
        .replace("{service_name}", service?.name || "")
        .replace("{username}", sub.vas_username || "")
        .replace("{password}", sub.vas_password || "");
      await supabase.from("sms_log").insert({
        recipient: client.contact,
        message,
        status: "pending",
        sms_type: "vas_credentials",
      });
      sent++;
    }
    toast.success(`${sent} জন ক্লায়েন্টকে SMS পাঠানো হয়েছে`);
    setSelectedIds([]);
    setBulkSmsOpen(false);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      client_id: s.client_id,
      service_id: s.service_id,
      vas_username: s.vas_username || "",
      vas_password: s.vas_password || "",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
      status: s.status || "active",
    });
    setDialogOpen(true);
  };

  const filtered = subscriptions.filter((s: any) => {
    const matchSearch = (s.clients?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.vas_services?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.vas_username || "").toLowerCase().includes(search.toLowerCase());
    const matchService = filterService === "all" || s.service_id === filterService;
    return matchSearch && matchService;
  });

  const activeCount = subscriptions.filter((s: any) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VAS সাবস্ক্রিপশন</h1>
          <p className="text-muted-foreground text-sm">ক্লায়েন্ট OTT সাবস্ক্রিপশন ও ক্রেডেনশিয়াল</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="outline" onClick={() => setBulkSmsOpen(true)}>
              <Send className="h-4 w-4 mr-2" /> বাল্ক SMS ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> নতুন সাবস্ক্রিপশন
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট সাবস্ক্রিপশন</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{subscriptions.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">সক্রিয়</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মেয়াদোত্তীর্ণ / বাতিল</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{subscriptions.length - activeCount}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ক্লায়েন্ট / সার্ভিস খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterService} onValueChange={setFilterService}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="সার্ভিস ফিল্টার" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল সার্ভিস</SelectItem>
            {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onCheckedChange={(v) => setSelectedIds(v ? filtered.map((s: any) => s.id) : [])}
                />
              </TableHead>
              <TableHead>#</TableHead>
              <TableHead>ক্লায়েন্ট</TableHead>
              <TableHead>সার্ভিস</TableHead>
              <TableHead>ইউজারনেম</TableHead>
              <TableHead>পাসওয়ার্ড</TableHead>
              <TableHead>শুরু</TableHead>
              <TableHead>শেষ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">কোনো সাবস্ক্রিপশন পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((s: any, i: number) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(s.id)}
                      onCheckedChange={(v) => setSelectedIds(v ? [...selectedIds, s.id] : selectedIds.filter((id) => id !== s.id))}
                    />
                  </TableCell>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.clients?.name || "—"}<br /><span className="text-xs text-muted-foreground">{s.clients?.client_id}</span></TableCell>
                  <TableCell><Badge variant="outline">{s.vas_services?.name || "—"}</Badge></TableCell>
                  <TableCell>{s.vas_username || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{showPasswords[s.id] ? s.vas_password : "••••••"}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPasswords((p) => ({ ...p, [s.id]: !p[s.id] }))}>
                        {showPasswords[s.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{s.start_date ? format(new Date(s.start_date), "dd MMM yyyy", { locale: bn }) : "—"}</TableCell>
                  <TableCell>{s.end_date ? format(new Date(s.end_date), "dd MMM yyyy", { locale: bn }) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "destructive"}>
                      {s.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" title="SMS পাঠান" onClick={() => sendCredentialsSms(s)}>
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "সাবস্ক্রিপশন সম্পাদনা" : "নতুন সাবস্ক্রিপশন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ক্লায়েন্ট *</label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="ক্লায়েন্ট নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.client_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">সার্ভিস *</label>
              <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                <SelectTrigger><SelectValue placeholder="সার্ভিস নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">VAS ইউজারনেম</label>
              <Input value={form.vas_username} onChange={(e) => setForm({ ...form, vas_username: e.target.value })} placeholder="OTT Login ID" />
            </div>
            <div>
              <label className="text-sm font-medium">VAS পাসওয়ার্ড</label>
              <Input value={form.vas_password} onChange={(e) => setForm({ ...form, vas_password: e.target.value })} placeholder="OTT Password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">শুরুর তারিখ</label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">শেষ তারিখ</label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">সক্রিয়</SelectItem>
                  <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                  <SelectItem value="expired">মেয়াদোত্তীর্ণ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={!form.client_id || !form.service_id || saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS Dialog */}
      <Dialog open={bulkSmsOpen} onOpenChange={setBulkSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>বাল্ক SMS পাঠান</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} জন ক্লায়েন্টকে তাদের VAS ক্রেডেনশিয়াল SMS এ পাঠানো হবে।
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSmsOpen(false)}>বাতিল</Button>
            <Button onClick={sendBulkSms}>
              <Send className="h-4 w-4 mr-2" /> SMS পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
