import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Offer { id: string; title: string; description: string | null; image_url: string | null; discount_text: string | null; status: string; start_date: string | null; end_date: string | null; created_at: string; }
const empty: Partial<Offer> = { title: "", description: "", image_url: "", discount_text: "", status: "active", start_date: "", end_date: "" };

export default function WebsiteOffers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Offer>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website_offers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_offers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Offer[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Offer>) => {
      const payload = { title: item.title, description: item.description, image_url: item.image_url, discount_text: item.discount_text, status: item.status, start_date: item.start_date || null, end_date: item.end_date || null };
      if (editId) { const { error } = await (supabase as any).from("website_offers").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("website_offers").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_offers"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_offers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_offers"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: Offer) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">অফারসমূহ</h1><p className="text-muted-foreground">ওয়েবসাইটের অফার ম্যানেজ করুন</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন অফার</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>শিরোনাম</TableHead><TableHead>ছাড়</TableHead><TableHead>শুরু</TableHead><TableHead>শেষ</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.discount_text || "—"}</TableCell>
                <TableCell>{item.start_date || "—"}</TableCell>
                <TableCell>{item.end_date || "—"}</TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো অফার নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "অফার সম্পাদনা" : "নতুন অফার"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="শিরোনাম" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="বিবরণ" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input placeholder="ছাড়ের বিবরণ (যেমন: ৫০% ছাড়)" value={form.discount_text || ""} onChange={(e) => setForm({ ...form, discount_text: e.target.value })} />
            <Input placeholder="ইমেজ URL" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-muted-foreground">শুরুর তারিখ</label><Input type="date" value={form.start_date || ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label className="text-sm text-muted-foreground">শেষের তারিখ</label><Input type="date" value={form.end_date || ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
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
