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
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Testimonial { id: string; name: string; designation: string | null; company: string | null; content: string | null; rating: number | null; image_url: string | null; status: string; sort_order: number | null; created_at: string; }
const empty: Partial<Testimonial> = { name: "", designation: "", company: "", content: "", rating: 5, image_url: "", status: "active", sort_order: 0 };

export default function WebsiteTestimonials() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Testimonial>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website_testimonials"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_testimonials").select("*").order("sort_order");
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Testimonial>) => {
      const payload = { name: item.name, designation: item.designation, company: item.company, content: item.content, rating: item.rating, image_url: item.image_url, status: item.status, sort_order: item.sort_order };
      if (editId) { const { error } = await (supabase as any).from("website_testimonials").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("website_testimonials").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_testimonials"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_testimonials").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_testimonials"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: Testimonial) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">টেস্টিমোনিয়াল</h1><p className="text-muted-foreground">ওয়েবসাইটের টেস্টিমোনিয়াল ম্যানেজ করুন</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন টেস্টিমোনিয়াল</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>নাম</TableHead><TableHead>প্রতিষ্ঠান</TableHead><TableHead>রেটিং</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}<br/><span className="text-xs text-muted-foreground">{item.designation}</span></TableCell>
                <TableCell>{item.company || "—"}</TableCell>
                <TableCell><div className="flex">{Array.from({ length: item.rating || 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div></TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">কোনো টেস্টিমোনিয়াল নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "টেস্টিমোনিয়াল সম্পাদনা" : "নতুন টেস্টিমোনিয়াল"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="নাম" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="পদবী" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <Input placeholder="প্রতিষ্ঠান" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Textarea placeholder="মন্তব্য" value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">রেটিং</label>
              <div className="flex gap-1">{[1,2,3,4,5].map((r) => <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })}><Star className={`h-6 w-6 ${(form.rating || 0) >= r ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} /></button>)}</div>
            </div>
            <Input placeholder="ইমেজ URL" value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
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
