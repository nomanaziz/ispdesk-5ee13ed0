import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Partner { id: string; name: string; logo_url: string | null; website_url: string | null; status: string; sort_order: number | null; created_at: string; }
const empty: Partial<Partner> = { name: "", logo_url: "", website_url: "", status: "active", sort_order: 0 };

export default function WebsitePartners() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Partner>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website_partners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_partners").select("*").order("sort_order");
      if (error) throw error;
      return data as Partner[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Partner>) => {
      const payload = { name: item.name, logo_url: item.logo_url, website_url: item.website_url, status: item.status, sort_order: item.sort_order };
      if (editId) { const { error } = await (supabase as any).from("website_partners").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("website_partners").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_partners"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_partners").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_partners"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: Partner) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">পার্টনারস</h1><p className="text-muted-foreground">ওয়েবসাইটের পার্টনার ম্যানেজ করুন</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন পার্টনার</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>নাম</TableHead><TableHead>লোগো</TableHead><TableHead>ওয়েবসাইট</TableHead><TableHead>ক্রম</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.logo_url ? <img src={item.logo_url} alt={item.name} className="h-8 w-auto" /> : "—"}</TableCell>
                <TableCell className="truncate max-w-[200px]">{item.website_url || "—"}</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো পার্টনার নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "পার্টনার সম্পাদনা" : "নতুন পার্টনার"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="নাম" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="লোগো URL" value={form.logo_url || ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
            <Input placeholder="ওয়েবসাইট URL" value={form.website_url || ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
            <Input type="number" placeholder="ক্রম" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-center gap-2">
              <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
              <span className="text-sm">{form.status === "active" ? "Active" : "Inactive"}</span>
            </div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editId ? "আপডেট" : "সংরক্ষণ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
