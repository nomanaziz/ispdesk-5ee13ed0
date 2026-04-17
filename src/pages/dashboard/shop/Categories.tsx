import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { slugify } from "@/lib/shopUtils";
import { toast } from "sonner";

export default function ShopCategories() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: "", slug: "", sort_order: 0, image: "", status: "active" });

  const load = async () => {
    const { data } = await supabase.from("shop_categories").select("*").order("sort_order");
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEdit(null); setForm({ name: "", slug: "", sort_order: 0, image: "", status: "active" }); setOpen(true); };
  const openEdit = (c: any) => { setEdit(c); setForm({ name: c.name, slug: c.slug, sort_order: c.sort_order, image: c.image || "", status: c.status }); setOpen(true); };

  const save = async () => {
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    const { error } = edit
      ? await supabase.from("shop_categories").update(payload).eq("id", edit.id)
      : await supabase.from("shop_categories").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("সংরক্ষিত হয়েছে"); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    const { error } = await supabase.from("shop_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>প্রোডাক্ট ক্যাটেগরি</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />নতুন</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit ? "এডিট" : "নতুন"} ক্যাটেগরি</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>নাম</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: edit ? form.slug : slugify(e.target.value) })} /></div>
                <div><Label>স্লাগ</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
                <div><Label>সর্ট অর্ডার</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
                <div><Label>ইমেজ URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
                <Button onClick={save} className="w-full">সংরক্ষণ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>নাম</TableHead><TableHead>স্লাগ</TableHead><TableHead>সর্ট</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">কোনো ক্যাটেগরি নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
