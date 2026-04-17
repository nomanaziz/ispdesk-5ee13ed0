import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuItem { id: string; title: string; url: string | null; parent_id: string | null; sort_order: number | null; status: string; location: string; created_at: string; }
const empty: Partial<MenuItem> = { title: "", url: "", parent_id: null, sort_order: 0, status: "active", location: "header" };

const LOCATION_OPTIONS = [
  { value: "header", label: "হেডার মেনু" },
  { value: "footer_quick", label: "ফুটার - দ্রুত লিংক" },
  { value: "footer_resource", label: "ফুটার - রিসোর্স" },
];

const locationLabel = (loc: string) => LOCATION_OPTIONS.find((o) => o.value === loc)?.label || loc;

export default function WebsiteMenu() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<MenuItem>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterLoc, setFilterLoc] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["website_menu", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_menu").select("*").order("location").order("sort_order");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const save = useMutation({
    mutationFn: async (item: Partial<MenuItem>) => {
      const payload = { title: item.title, url: item.url, parent_id: item.parent_id || null, sort_order: item.sort_order, status: item.status, location: item.location || "header" };
      if (editId) { const { error } = await (supabase as any).from("website_menu").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("website_menu").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_menu"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_menu").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_menu"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: MenuItem) => { setForm(item); setEditId(item.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };

  const filtered = (data || []).filter((i) => filterLoc === "all" || i.location === filterLoc);
  const parentItems = filtered.filter((i) => !i.parent_id);
  const getParentName = (pid: string | null) => data?.find((i) => i.id === pid)?.title || "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-bold text-foreground">মেনু এডিটর</h1><p className="text-muted-foreground">হেডার ও ফুটার মেনু ম্যানেজ করুন</p></div>
        <div className="flex items-center gap-2">
          <Select value={filterLoc} onValueChange={setFilterLoc}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব লোকেশন</SelectItem>
              {LOCATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন মেনু আইটেম</Button>
        </div>
      </div>
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow><TableHead>শিরোনাম</TableHead><TableHead>URL</TableHead><TableHead>লোকেশন</TableHead><TableHead>প্যারেন্ট</TableHead><TableHead>ক্রম</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="text-right">অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className={`font-medium ${item.parent_id ? "pl-8" : ""}`}>{item.parent_id ? "└ " : ""}{item.title}</TableCell>
                <TableCell className="text-muted-foreground">{item.url || "—"}</TableCell>
                <TableCell><Badge variant="outline">{locationLabel(item.location)}</Badge></TableCell>
                <TableCell>{getParentName(item.parent_id)}</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">কোনো মেনু আইটেম নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "মেনু সম্পাদনা" : "নতুন মেনু আইটেম"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="শিরোনাম" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="URL (যেমন: /about)" value={form.url || ""} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">লোকেশন</label>
              <Select value={form.location || "header"} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="প্যারেন্ট মেনু" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">কোনো প্যারেন্ট নেই</SelectItem>
                {parentItems.filter((i) => i.id !== editId).map((i) => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
              </SelectContent>
            </Select>
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
