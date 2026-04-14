import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface LeaveCategory {
  id: string;
  name: string;
  days_allowed: number | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveCategory | null>(null);
  const [form, setForm] = useState({ name: "", days_allowed: "0", description: "", status: "active" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as LeaveCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, days_allowed: parseInt(form.days_allowed) || 0, description: form.description || null, status: form.status };
      if (editing) {
        const { error } = await supabase.from("leave_categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leave_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      toast.success(editing ? "ক্যাটাগরি আপডেট হয়েছে" : "ক্যাটাগরি যোগ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      toast.success("ক্যাটাগরি মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", days_allowed: "0", description: "", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (c: LeaveCategory) => {
    setEditing(c);
    setForm({ name: c.name, days_allowed: String(c.days_allowed ?? 0), description: c.description || "", status: c.status });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditing(null); };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">লিভ ক্যাটাগরি</h1>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> নতুন ক্যাটাগরি</Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>ক্যাটাগরি নাম</TableHead>
              <TableHead>অনুমোদিত দিন</TableHead>
              <TableHead>বিবরণ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো ক্যাটাগরি পাওয়া যায়নি</TableCell></TableRow>
            ) : filtered.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.days_allowed ?? 0} দিন</TableCell>
                <TableCell className="max-w-[200px] truncate">{c.description || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>ক্যাটাগরি নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Sick Leave" /></div>
            <div><Label>বার্ষিক অনুমোদিত দিন</Label><Input type="number" value={form.days_allowed} onChange={(e) => setForm({ ...form, days_allowed: e.target.value })} /></div>
            <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>স্ট্যাটাস</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
