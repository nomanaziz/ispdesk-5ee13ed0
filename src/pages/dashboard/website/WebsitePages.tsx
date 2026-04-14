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

interface Page { id: string; title: string; slug: string; content: string | null; status: string; sort_order: number | null; created_at: string; }
const empty: Partial<Page> = { title: "", slug: "", content: "", status: "draft", sort_order: 0 };

export default function WebsitePages() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Page>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website_pages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_pages").select("*").order("sort_order");
      if (error) throw error;
      return data as Page[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Page>) => {
      const payload = { title: item.title, slug: item.slug, content: item.content, status: item.status, sort_order: item.sort_order };
      if (editId) { const { error } = await (supabase as any).from("website_pages").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("website_pages").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_pages"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_pages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_pages"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: Page) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">CMS পেজ</h1><p className="text-muted-foreground">ওয়েবসাইটের পেজ ম্যানেজ করুন</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন পেজ</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>শিরোনাম</TableHead><TableHead>স্লাগ</TableHead><TableHead>ক্রম</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground">/{item.slug}</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">কোনো পেজ নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "পেজ সম্পাদনা" : "নতুন পেজ"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="শিরোনাম" value={form.title || ""} onChange={(e) => { setForm({ ...form, title: e.target.value, ...(!editId ? { slug: generateSlug(e.target.value) } : {}) }); }} />
            <Input placeholder="স্লাগ" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Textarea placeholder="বিষয়বস্তু (HTML/Markdown)" value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={10} />
            <Input type="number" placeholder="ক্রম" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-center gap-2">
              <Switch checked={form.status === "published"} onCheckedChange={(v) => setForm({ ...form, status: v ? "published" : "draft" })} />
              <span className="text-sm">{form.status === "published" ? "Published" : "Draft"}</span>
            </div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editId ? "আপডেট" : "সংরক্ষণ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
