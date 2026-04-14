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
import { Plus, Edit, Trash2, Tv, Search } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type VasService = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  status: string;
  provider_type: string | null;
  logo_url: string | null;
  credentials_template: string | null;
  created_at: string;
};

const defaultForm = {
  name: "",
  description: "",
  price: 0,
  status: "active",
  provider_type: "ott",
  credentials_template: "আপনার {service_name} ID: {username}, Password: {password}",
};

export default function VasConfig() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["vas-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vas_services").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as VasService[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof defaultForm & { id?: string }) => {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        status: formData.status,
        provider_type: formData.provider_type,
        credentials_template: formData.credentials_template || null,
      };
      if (formData.id) {
        const { error } = await supabase.from("vas_services").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vas_services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vas-services"] });
      toast.success(editingId ? "সার্ভিস আপডেট হয়েছে" : "সার্ভিস যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সার্ভিস সেভ করতে ব্যর্থ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vas_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vas-services"] });
      toast.success("সার্ভিস মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছতে ব্যর্থ"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("vas_services").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vas-services"] }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const openEdit = (s: VasService) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description || "",
      price: s.price || 0,
      status: s.status,
      provider_type: s.provider_type || "ott",
      credentials_template: s.credentials_template || defaultForm.credentials_template,
    });
    setDialogOpen(true);
  };

  const filtered = services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = services.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VAS কনফিগারেশন</h1>
          <p className="text-muted-foreground text-sm">OTT প্ল্যাটফর্ম সার্ভিস পরিচালনা</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> নতুন সার্ভিস
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট সার্ভিস</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{services.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">সক্রিয়</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">নিষ্ক্রিয়</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{services.length - activeCount}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="সার্ভিস খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>সার্ভিস নাম</TableHead>
              <TableHead>টাইপ</TableHead>
              <TableHead>মূল্য (৳)</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>বিবরণ</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">কোনো সার্ভিস পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tv className="h-4 w-4 text-muted-foreground" />
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.provider_type?.toUpperCase() || "OTT"}</Badge>
                  </TableCell>
                  <TableCell>{s.price || 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={s.status === "active"}
                      onCheckedChange={() => toggleStatus.mutate({ id: s.id, status: s.status })}
                    />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{s.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "সার্ভিস সম্পাদনা" : "নতুন VAS সার্ভিস"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">সার্ভিস নাম *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Bongo" />
            </div>
            <div>
              <label className="text-sm font-medium">টাইপ</label>
              <Select value={form.provider_type} onValueChange={(v) => setForm({ ...form, provider_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ott">OTT</SelectItem>
                  <SelectItem value="iptv">IPTV</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">মূল্য (৳)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm font-medium">বিবরণ</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">SMS টেমপ্লেট</label>
              <Textarea
                value={form.credentials_template}
                onChange={(e) => setForm({ ...form, credentials_template: e.target.value })}
                rows={2}
                placeholder="আপনার {service_name} ID: {username}, Password: {password}"
              />
              <p className="text-xs text-muted-foreground mt-1">ব্যবহারযোগ্য ভেরিয়েবল: {"{service_name}"}, {"{username}"}, {"{password}"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
