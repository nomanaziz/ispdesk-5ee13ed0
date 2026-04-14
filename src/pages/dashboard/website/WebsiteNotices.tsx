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

interface Notice {
  id: string;
  title: string;
  content: string | null;
  status: string;
  publish_date: string | null;
  created_at: string;
}

const empty: Partial<Notice> = { title: "", content: "", status: "draft", publish_date: new Date().toISOString().split("T")[0] };

export default function WebsiteNotices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Notice>>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["website_notices"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_notices").select("*").order("publish_date", { ascending: false });
      if (error) throw error;
      return data as Notice[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<Notice>) => {
      if (editId) {
        const { error } = await (supabase as any).from("website_notices").update({ title: item.title, content: item.content, status: item.status, publish_date: item.publish_date }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("website_notices").insert({ title: item.title, content: item.content, status: item.status, publish_date: item.publish_date });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_notices"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_notices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_notices"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: Notice) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">নোটিশ</h1>
          <p className="text-muted-foreground">ওয়েবসাইটের নোটিশ ম্যানেজ করুন</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন নোটিশ</Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>শিরোনাম</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.publish_date}</TableCell>
                <TableCell><Badge variant={item.status === "published" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">কোনো নোটিশ নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "নোটিশ সম্পাদনা" : "নতুন নোটিশ"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="শিরোনাম" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="বিষয়বস্তু" value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
            <Input type="date" value={form.publish_date || ""} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
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
