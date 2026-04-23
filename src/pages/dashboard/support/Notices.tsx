import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Pin, Bell, Search, X } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["info", "warning", "success", "event"];

type Form = {
  title: string;
  body: string;
  type: string;
  pinned: boolean;
  active: true | false;
  attachment_url: string;
  audience_groups: string[];
  target_pop_ids: string[];
  target_bw_pop_ids: string[];
  target_client_ids: string[];
};

const emptyForm: Form = {
  title: "",
  body: "",
  type: "info",
  pinned: false,
  active: true,
  attachment_url: "",
  audience_groups: [],
  target_pop_ids: [],
  target_bw_pop_ids: [],
  target_client_ids: [],
};

function MultiSelectSearch({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: { id: string; label: string; sublabel?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options.slice(0, 100);
    return options.filter((o) => o.label.toLowerCase().includes(t) || o.sublabel?.toLowerCase().includes(t)).slice(0, 100);
  }, [q, options]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const selectedItems = options.filter((o) => selected.includes(o.id));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} <span className="text-muted-foreground">({selected.length} নির্বাচিত)</span></Label>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || "খুঁজুন..."} className="h-8 pl-7 text-xs" />
      </div>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 p-1.5 border rounded bg-muted/30 max-h-20 overflow-y-auto">
          {selectedItems.map((it) => (
            <Badge key={it.id} variant="secondary" className="text-xs gap-1">
              {it.label}
              <button type="button" onClick={() => toggle(it.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      <div className="border rounded max-h-40 overflow-y-auto">
        {filtered.length === 0 && <div className="p-2 text-xs text-muted-foreground text-center">কোনো ফলাফল নেই</div>}
        {filtered.map((o) => (
          <label key={o.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted cursor-pointer text-xs border-b last:border-b-0">
            <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
            <span className="flex-1">{o.label}</span>
            {o.sublabel && <span className="text-muted-foreground text-[10px]">{o.sublabel}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SupportNotices() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const { data: notices } = useQuery({
    queryKey: ["support-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("client_notices").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pops } = useQuery({
    queryKey: ["notice-pops"],
    queryFn: async () => {
      const { data } = await supabase.from("branch_managers").select("id, name, contact, pop_type").ilike("status", "active").order("name");
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["notice-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name, username, mobile").order("name").limit(2000);
      return data || [];
    },
  });

  const regularPops = useMemo(() => (pops || []).filter((p: any) => p.pop_type !== "bandwidth"), [pops]);
  const bwPops = useMemo(() => (pops || []).filter((p: any) => p.pop_type === "bandwidth"), [pops]);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.body) throw new Error("শিরোনাম ও বার্তা আবশ্যক");
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        pinned: form.pinned,
        active: form.active,
        attachment_url: form.attachment_url || null,
        audience_groups: form.audience_groups,
        target_pop_ids: form.target_pop_ids,
        target_bw_pop_ids: form.target_bw_pop_ids,
        target_client_ids: form.target_client_ids,
      };
      if (editId) {
        const { error } = await supabase.from("client_notices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_notices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-notices"] });
      toast.success("সংরক্ষিত");
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-notices"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
  });

  const close = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const edit = (n: any) => {
    setForm({
      title: n.title || "",
      body: n.body || "",
      type: n.type || "info",
      pinned: !!n.pinned,
      active: !!n.active,
      attachment_url: n.attachment_url || "",
      audience_groups: n.audience_groups || [],
      target_pop_ids: n.target_pop_ids || [],
      target_bw_pop_ids: n.target_bw_pop_ids || [],
      target_client_ids: n.target_client_ids || [],
    });
    setEditId(n.id);
    setOpen(true);
  };

  const toggleGroup = (g: string) => {
    setForm((p) => ({
      ...p,
      audience_groups: p.audience_groups.includes(g) ? p.audience_groups.filter((x) => x !== g) : [...p.audience_groups, g],
    }));
  };

  const audienceSummary = (n: any) => {
    const parts: string[] = [];
    const g = n.audience_groups || [];
    if (g.includes("all_pops")) parts.push("সকল POP");
    if (g.includes("all_bw_pops")) parts.push("সকল BW POP");
    if (g.includes("all_clients")) parts.push("সকল ক্লায়েন্ট");
    if ((n.target_pop_ids || []).length) parts.push(`${n.target_pop_ids.length} POP`);
    if ((n.target_bw_pop_ids || []).length) parts.push(`${n.target_bw_pop_ids.length} BW POP`);
    if ((n.target_client_ids || []).length) parts.push(`${n.target_client_ids.length} ক্লায়েন্ট`);
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> নোটিশ ম্যানেজমেন্ট</h1>
          <p className="text-sm text-muted-foreground">এক জায়গা থেকে সব POP, BW POP এবং ক্লায়েন্টদের নোটিশ পাঠান</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> নতুন নোটিশ</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">শিরোনাম</TableHead>
              <TableHead className="text-xs">ধরন</TableHead>
              <TableHead className="text-xs">প্রাপক</TableHead>
              <TableHead className="text-xs">পিন</TableHead>
              <TableHead className="text-xs">সক্রিয়</TableHead>
              <TableHead className="text-xs">তারিখ</TableHead>
              <TableHead className="text-xs">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(notices || []).map((n: any, i: number) => (
              <TableRow key={n.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium max-w-xs truncate">{n.title}</TableCell>
                <TableCell className="text-xs"><Badge variant="secondary" className="capitalize">{n.type}</Badge></TableCell>
                <TableCell className="text-xs max-w-xs truncate">{audienceSummary(n)}</TableCell>
                <TableCell className="text-xs">{n.pinned && <Pin className="h-3 w-3 text-amber-500" />}</TableCell>
                <TableCell className="text-xs"><Badge variant={n.active ? "default" : "secondary"}>{n.active ? "হ্যাঁ" : "না"}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(n)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("নিশ্চিত?")) del.mutate(n.id); }}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!notices?.length && <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">এখনো কোনো নোটিশ নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "নোটিশ এডিট" : "নতুন নোটিশ"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>শিরোনাম *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>বার্তা *</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <Label>ধরন</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={form.pinned} onCheckedChange={(v) => setForm((p) => ({ ...p, pinned: v }))} /><Label className="text-xs">পিন</Label></div>
              <div className="flex items-center gap-2 pb-2"><Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} /><Label className="text-xs">সক্রিয়</Label></div>
            </div>
            <div><Label>সংযুক্তি URL (ঐচ্ছিক)</Label><Input value={form.attachment_url} onChange={(e) => setForm((p) => ({ ...p, attachment_url: e.target.value }))} placeholder="https://..." /></div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div>
                <Label className="text-sm font-semibold">প্রাপক নির্বাচন</Label>
                <p className="text-[10px] text-muted-foreground">গ্রুপ সিলেক্ট করুন অথবা নিচ থেকে নির্দিষ্ট প্রাপক বেছে নিন</p>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { k: "all_pops", l: "সকল POP" },
                  { k: "all_bw_pops", l: "সকল ব্যান্ডউইথ POP" },
                  { k: "all_clients", l: "সকল ক্লায়েন্ট" },
                ].map((g) => (
                  <label key={g.k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.audience_groups.includes(g.k)} onCheckedChange={() => toggleGroup(g.k)} />
                    {g.l}
                  </label>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <MultiSelectSearch
                  label="নির্দিষ্ট POP"
                  placeholder="POP খুঁজুন..."
                  options={regularPops.map((p: any) => ({ id: p.id, label: p.name, sublabel: p.contact || "" }))}
                  selected={form.target_pop_ids}
                  onChange={(ids) => setForm((p) => ({ ...p, target_pop_ids: ids }))}
                />
                <MultiSelectSearch
                  label="নির্দিষ্ট BW POP"
                  placeholder="BW POP খুঁজুন..."
                  options={bwPops.map((p: any) => ({ id: p.id, label: p.name, sublabel: p.contact || "" }))}
                  selected={form.target_bw_pop_ids}
                  onChange={(ids) => setForm((p) => ({ ...p, target_bw_pop_ids: ids }))}
                />
                <MultiSelectSearch
                  label="নির্দিষ্ট ক্লায়েন্ট"
                  placeholder="ক্লায়েন্ট খুঁজুন..."
                  options={(clients || []).map((c: any) => ({ id: c.id, label: c.name || c.username, sublabel: c.mobile || c.username || "" }))}
                  selected={form.target_client_ids}
                  onChange={(ids) => setForm((p) => ({ ...p, target_client_ids: ids }))}
                />
              </div>
            </div>

            <Button className="w-full" onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "তৈরি করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
