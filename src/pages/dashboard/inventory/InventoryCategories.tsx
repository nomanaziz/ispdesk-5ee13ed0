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
import { Plus, Pencil, Trash2, Search, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

const emptyForm = { name: "", status: "active" };

export default function InventoryCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_categories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("inventory_categories").update({ name: form.name, status: form.status }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_categories").insert({ name: form.name, status: form.status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_categories"] });
      toast.success(editingId ? "ক্যাটাগরি আপডেট হয়েছে" : "ক্যাটাগরি যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_categories"] });
      toast.success("ক্যাটাগরি মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (c: Category) => { setForm({ name: c.name, status: c.status }); setEditingId(c.id); setDialogOpen(true); };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">আইটেম ক্যাটাগরি</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> ক্যাটাগরি যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FolderOpen className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">মোট ক্যাটাগরি</p><p className="text-2xl font-bold">{categories.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-green-500" /></div><div><p className="text-sm text-muted-foreground">সক্রিয়</p><p className="text-2xl font-bold">{categories.filter(c => c.status === "active").length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-red-500" /></div><div><p className="text-sm text-muted-foreground">নিষ্ক্রিয়</p><p className="text-2xl font-bold">{categories.filter(c => c.status === "inactive").length}</p></div></div></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="ক্যাটাগরি খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>ক্যাটাগরি নাম</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>তারিখ</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">কোনো ক্যাটাগরি পাওয়া যায়নি</TableCell></TableRow> :
            filtered.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell>{new Date(c.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Fiber Cable" /></div>
            <div><Label>স্ট্যাটাস</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
