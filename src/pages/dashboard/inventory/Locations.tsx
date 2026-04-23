import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
import { toast } from "sonner";

type Location = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  status: string;
  created_at: string;
};

const emptyForm = { name: "", code: "", address: "", status: "active" };

export default function Locations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["store_locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_locations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Location[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, address: form.address || null, status: form.status };
      if (editingId) {
        const { error } = await supabase.from("store_locations").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_locations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_locations"] });
      toast.success(editingId ? "লোকেশন আপডেট হয়েছে" : "লোকেশন যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store_locations"] });
      toast.success("লোকেশন মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (l: Location) => { setForm({ name: l.name, address: l.address || "", status: l.status }); setEditingId(l.id); setDialogOpen(true); };

  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || (l.address || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">স্টোর লোকেশন</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> লোকেশন যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><MapPin className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">মোট লোকেশন</p><p className="text-2xl font-bold">{locations.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-green-500" /></div><div><p className="text-sm text-muted-foreground">সক্রিয়</p><p className="text-2xl font-bold">{locations.filter(l => l.status === "active").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-red-500" /></div><div><p className="text-sm text-muted-foreground">নিষ্ক্রিয়</p><p className="text-2xl font-bold">{locations.filter(l => l.status === "inactive").length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="লোকেশন খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>নাম</TableHead><TableHead>ঠিকানা</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>তারিখ</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো লোকেশন পাওয়া যায়নি</TableCell></TableRow> :
            filtered.map((l, i) => (
              <TableRow key={l.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.address || "-"}</TableCell>
                <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell>{new Date(l.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "লোকেশন সম্পাদনা" : "নতুন লোকেশন"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: প্রধান গুদাম" /></div>
            <div><Label>ঠিকানা</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="ঠিকানা লিখুন" /></div>
            <div><Label>স্ট্যাটাস</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
