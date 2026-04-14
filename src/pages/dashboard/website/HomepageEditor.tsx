import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LandingItem { id: string; section: string; content_key: string; content_value: any; sort_order: number | null; is_active: boolean | null; }
const empty: Partial<LandingItem> = { section: "homepage", content_key: "", content_value: {}, sort_order: 0, is_active: true };

export default function HomepageEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LandingItem>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [jsonStr, setJsonStr] = useState("{}");

  const { data, isLoading } = useQuery({
    queryKey: ["landing_content", "homepage"],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_content").select("*").eq("section", "homepage").order("sort_order");
      if (error) throw error;
      return data as LandingItem[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<LandingItem>) => {
      let parsed;
      try { parsed = JSON.parse(jsonStr); } catch { throw new Error("Invalid JSON"); }
      const payload = { section: "homepage", content_key: item.content_key, content_value: parsed, sort_order: item.sort_order, is_active: item.is_active };
      if (editId) { const { error } = await supabase.from("landing_content").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await supabase.from("landing_content").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_content", "homepage"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("landing_content").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_content", "homepage"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: LandingItem) => { setForm(item); setEditId(item.id); setJsonStr(JSON.stringify(item.content_value, null, 2)); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setJsonStr("{}"); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">হোমপেজ এডিটর</h1><p className="text-muted-foreground">হোমপেজের কন্টেন্ট ম্যানেজ করুন</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন কন্টেন্ট</Button>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>কী</TableHead><TableHead>ভ্যালু (প্রিভিউ)</TableHead><TableHead>ক্রম</TableHead><TableHead>সক্রিয়</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.content_key}</TableCell>
                <TableCell className="truncate max-w-[300px] text-muted-foreground">{JSON.stringify(item.content_value).slice(0, 80)}...</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell>{item.is_active ? "✅" : "❌"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">কোনো কন্টেন্ট নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "কন্টেন্ট সম্পাদনা" : "নতুন কন্টেন্ট"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="কন্টেন্ট কী (যেমন: hero_title)" value={form.content_key || ""} onChange={(e) => setForm({ ...form, content_key: e.target.value })} />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">কন্টেন্ট ভ্যালু (JSON)</label>
              <Textarea value={jsonStr} onChange={(e) => setJsonStr(e.target.value)} rows={8} className="font-mono text-sm" />
            </div>
            <Input type="number" placeholder="ক্রম" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">{form.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
            </div>
          </div>
          <DialogFooter><Button onClick={() => save.mutate(form)} disabled={save.isPending}>{editId ? "আপডেট" : "সংরক্ষণ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
