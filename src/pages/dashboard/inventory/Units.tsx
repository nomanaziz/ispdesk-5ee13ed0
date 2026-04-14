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
import { Plus, Pencil, Trash2, Search, Ruler } from "lucide-react";
import { toast } from "sonner";

type Unit = {
  id: string;
  name: string;
  short_name: string | null;
  status: string;
  created_at: string;
};

const emptyForm = { name: "", short_name: "", status: "active" };

export default function Units() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["inventory_units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_units").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Unit[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("inventory_units").update({ name: form.name, short_name: form.short_name || null, status: form.status }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_units").insert({ name: form.name, short_name: form.short_name || null, status: form.status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_units"] });
      toast.success(editingId ? "ইউনিট আপডেট হয়েছে" : "ইউনিট যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_units"] });
      toast.success("ইউনিট মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (u: Unit) => { setForm({ name: u.name, short_name: u.short_name || "", status: u.status }); setEditingId(u.id); setDialogOpen(true); };

  const filtered = units.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || (u.short_name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">পরিমাপ একক</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> ইউনিট যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Ruler className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">মোট ইউনিট</p><p className="text-2xl font-bold">{units.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-green-500" /></div><div><p className="text-sm text-muted-foreground">সক্রিয়</p><p className="text-2xl font-bold">{units.filter(u => u.status === "active").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-red-500" /></div><div><p className="text-sm text-muted-foreground">নিষ্ক্রিয়</p><p className="text-2xl font-bold">{units.filter(u => u.status === "inactive").length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="ইউনিট খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>নাম</TableHead><TableHead>সংক্ষিপ্ত নাম</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>তারিখ</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো ইউনিট পাওয়া যায়নি</TableCell></TableRow> :
            filtered.map((u, i) => (
              <TableRow key={u.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.short_name || "-"}</TableCell>
                <TableCell><Badge variant={u.status === "active" ? "default" : "secondary"}>{u.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "ইউনিট সম্পাদনা" : "নতুন ইউনিট"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Meter" /></div>
            <div><Label>সংক্ষিপ্ত নাম</Label><Input value={form.short_name} onChange={e => setForm({ ...form, short_name: e.target.value })} placeholder="যেমন: m" /></div>
            <div><Label>স্ট্যাটাস</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
