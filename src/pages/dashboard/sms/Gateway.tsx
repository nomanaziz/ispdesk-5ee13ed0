import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";

interface GatewayForm {
  name: string;
  api_url: string;
  api_key: string;
  username: string;
  password: string;
  sender_id: string;
  sms_type: string;
  is_default: boolean;
  status: string;
}

const emptyForm: GatewayForm = {
  name: "", api_url: "", api_key: "", username: "", password: "",
  sender_id: "", sms_type: "english", is_default: false, status: "active",
};

export default function Gateway() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GatewayForm>(emptyForm);
  const [search, setSearch] = useState("");

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["sms_gateways"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_gateways").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: GatewayForm) => {
      if (editId) {
        const { error } = await supabase.from("sms_gateways").update(f).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_gateways").insert(f);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_gateways"] });
      toast({ title: editId ? "গেটওয়ে আপডেট হয়েছে" : "গেটওয়ে যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_gateways").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_gateways"] });
      toast({ title: "গেটওয়ে মুছে ফেলা হয়েছে" });
    },
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };
  const openEdit = (g: any) => {
    setEditId(g.id);
    setForm({ name: g.name, api_url: g.api_url || "", api_key: g.api_key || "", username: g.username || "", password: g.password || "", sender_id: g.sender_id || "", sms_type: g.sms_type, is_default: g.is_default, status: g.status });
    setOpen(true);
  };

  const filtered = gateways.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">এসএমএস গেটওয়ে</h1>
          <p className="text-muted-foreground">SMS প্রোভাইডার গেটওয়ে কনফিগার করুন</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />গেটওয়ে যোগ করুন</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="গেটওয়ে খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>API URL</TableHead>
                  <TableHead>Sender ID</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>ডিফল্ট</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো গেটওয়ে পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{g.api_url}</TableCell>
                    <TableCell>{g.sender_id}</TableCell>
                    <TableCell><Badge variant={g.sms_type === "bangla" ? "default" : "secondary"}>{g.sms_type === "bangla" ? "বাংলা" : "English"}</Badge></TableCell>
                    <TableCell>{g.is_default && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}</TableCell>
                    <TableCell><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "গেটওয়ে সম্পাদনা" : "নতুন গেটওয়ে"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>API URL</Label><Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>API Key</Label><Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Sender ID</Label><Input value={form.sender_id} onChange={(e) => setForm({ ...form, sender_id: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Username (ID)</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SMS ধরন</Label>
                <Select value={form.sms_type} onValueChange={(v) => setForm({ ...form, sms_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="english">English</SelectItem><SelectItem value="bangla">বাংলা</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
              <Label>ডিফল্ট গেটওয়ে</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
