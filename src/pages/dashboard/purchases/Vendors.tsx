import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Users, UserCheck, UserX } from "lucide-react";

type Vendor = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  status: string;
  created_at: string;
};

const emptyForm = { name: "", contact: "", email: "", address: "", status: "active" };

export default function Vendors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Vendor[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, contact: form.contact || null, email: form.email || null, address: form.address || null, status: form.status };
      if (editing) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: editing ? "ভেন্ডর আপডেট হয়েছে" : "ভেন্ডর যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: "ভেন্ডর মুছে ফেলা হয়েছে" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm); };
  const openEdit = (v: Vendor) => { setEditing(v); setForm({ name: v.name, contact: v.contact || "", email: v.email || "", address: v.address || "", status: v.status }); setDialogOpen(true); };

  const filtered = vendors.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.contact || "").includes(search));
  const active = vendors.filter(v => v.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ভেন্ডর ম্যানেজমেন্ট</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />নতুন ভেন্ডর</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট ভেন্ডর</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{vendors.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">সক্রিয়</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{active}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">নিষ্ক্রিয়</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><UserX className="h-5 w-5 text-red-600" /><span className="text-2xl font-bold">{vendors.length - active}</span></div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="নাম বা কন্ট্যাক্ট দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>নাম</TableHead>
              <TableHead>কন্ট্যাক্ট</TableHead>
              <TableHead>ইমেইল</TableHead>
              <TableHead>ঠিকানা</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো ভেন্ডর পাওয়া যায়নি</TableCell></TableRow>
            ) : filtered.map((v, i) => (
              <TableRow key={v.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell>{v.contact || "—"}</TableCell>
                <TableCell>{v.email || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{v.address || "—"}</TableCell>
                <TableCell><Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell>{new Date(v.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(v.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "ভেন্ডর সম্পাদনা" : "নতুন ভেন্ডর"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>কন্ট্যাক্ট</Label><Input value={form.contact} onChange={e => setForm(p => ({ ...p, contact: e.target.value }))} /></div>
            <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>ঠিকানা</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>স্ট্যাটাস</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
