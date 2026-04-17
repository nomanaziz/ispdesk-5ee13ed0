import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LandingItem { id: string; section: string; content_key: string; content_value: any; sort_order: number | null; is_active: boolean | null; }
const empty: Partial<LandingItem> = { section: "hero", content_key: "", content_value: {}, sort_order: 0, is_active: true };

const KNOWN_SECTIONS = ["hero", "about", "faq", "footer", "homepage", "settings", "features", "gaming", "fiber"];

const PRESETS: { section: string; content_key: string; sample: any; label: string }[] = [
  { section: "hero", content_key: "main", label: "হিরো — মূল টেক্সট", sample: { badge: "৯৯.৯% আপটাইম গ্যারান্টি", title_1: "দ্রুতগতির", title_highlight: "ফাইবার অপটিক", title_2: "ইন্টারনেট", subtitle: "সাশ্রয়ী মূল্যে BDIX, FTP ও ক্যাশ সার্ভার সুবিধাসহ উচ্চ গতির ইন্টারনেট সেবা।", price_label: "মাত্র", price: "৳৫০০", price_suffix: "/মাস থেকে শুরু" } },
  { section: "hero", content_key: "marquee", label: "হিরো — মার্কি টেক্সট (enabled=false করলে বন্ধ হবে)", sample: { enabled: true, text: "🎉 ঈদ মোবারক! সকল প্যাকেজে বিশেষ ছাড়! | 🌟 ফাইবার কানেকশনে ফ্রি রাউটার! | 📞 হেল্পলাইন: ০৯৬৭৮-১২৩৪৫৬" } },
  { section: "footer", content_key: "brand", label: "ফুটার — ব্র্যান্ড", sample: { name: "ISP Desk", tagline: "ইন্টারনেট সেবা প্রদানকারী", description: "আপনার বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী।" } },
  { section: "footer", content_key: "contact", label: "ফুটার — যোগাযোগ", sample: { phone: "০৯৬৭৮-১২৩৪৫৬", email: "info@ispdesk.com", address: "আপনার ঠিকানা, বাংলাদেশ" } },
];

export default function HomepageEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LandingItem>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [jsonStr, setJsonStr] = useState("{}");
  const [filterSec, setFilterSec] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["landing_content", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_content").select("*").order("section").order("sort_order");
      if (error) throw error;
      return data as LandingItem[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<LandingItem>) => {
      let parsed;
      try { parsed = JSON.parse(jsonStr); } catch { throw new Error("Invalid JSON"); }
      const payload = { section: item.section || "hero", content_key: item.content_key, content_value: parsed, sort_order: item.sort_order, is_active: item.is_active };
      if (editId) { const { error } = await supabase.from("landing_content").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await supabase.from("landing_content").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_content"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("landing_content").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["landing_content"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: LandingItem) => { setForm(item); setEditId(item.id); setJsonStr(JSON.stringify(item.content_value, null, 2)); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setJsonStr("{}"); setOpen(true); };

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx];
    setForm({ ...form, section: p.section, content_key: p.content_key });
    setJsonStr(JSON.stringify(p.sample, null, 2));
  };

  const sectionsInDb = Array.from(new Set([...(data?.map((d) => d.section) || []), ...KNOWN_SECTIONS]));
  const filtered = (data || []).filter((d) => filterSec === "all" || d.section === filterSec);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-bold text-foreground">সাইট কন্টেন্ট এডিটর</h1><p className="text-muted-foreground">হোমপেজ, ফুটার, About ইত্যাদি কন্টেন্ট ম্যানেজ করুন</p></div>
        <div className="flex items-center gap-2">
          <Select value={filterSec} onValueChange={setFilterSec}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব সেকশন</SelectItem>
              {sectionsInDb.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন কন্টেন্ট</Button>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>সেকশন</TableHead><TableHead>কী</TableHead><TableHead>ভ্যালু (প্রিভিউ)</TableHead><TableHead>ক্রম</TableHead><TableHead>সক্রিয়</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell><Badge variant="outline">{item.section}</Badge></TableCell>
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
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো কন্টেন্ট নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "কন্টেন্ট সম্পাদনা" : "নতুন কন্টেন্ট"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editId && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">প্রিসেট থেকে দ্রুত যোগ করুন</label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p, i) => (
                    <Button key={i} type="button" size="sm" variant="outline" onClick={() => applyPreset(i)}>{p.label}</Button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">সেকশন</label>
                <Select value={form.section || "hero"} onValueChange={(v) => setForm({ ...form, section: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sectionsInDb.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">কী</label>
                <Input placeholder="যেমন: hero_title" value={form.content_key || ""} onChange={(e) => setForm({ ...form, content_key: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">কন্টেন্ট ভ্যালু (JSON)</label>
              <Textarea value={jsonStr} onChange={(e) => setJsonStr(e.target.value)} rows={10} className="font-mono text-sm" />
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
