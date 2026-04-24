import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DedicatedPkg {
  id: string;
  name: string;
  bandwidth_label: string | null;
  price_label: string;
  features: string[];
  badges: string[];
  is_popular: boolean;
  sort_order: number;
  status: string;
  contact_url: string | null;
}

const empty: Partial<DedicatedPkg> = {
  name: "", bandwidth_label: "", price_label: "Call for Price",
  features: [], badges: [], is_popular: false, sort_order: 0, status: "active", contact_url: "",
};

export default function WebsiteDedicatedPackages() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<DedicatedPkg>>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [featuresText, setFeaturesText] = useState("");
  const [badgesText, setBadgesText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["website_dedicated_packages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("website_dedicated_packages").select("*").order("sort_order");
      if (error) throw error;
      return data as DedicatedPkg[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const features = featuresText.split("\n").map(s => s.trim()).filter(Boolean);
      const badges = badgesText.split(",").map(s => s.trim()).filter(Boolean);
      const payload: any = {
        name: form.name, bandwidth_label: form.bandwidth_label, price_label: form.price_label || "Call for Price",
        features, badges, is_popular: form.is_popular, sort_order: form.sort_order || 0,
        status: form.status || "active", contact_url: form.contact_url,
      };
      if (editId) {
        const { error } = await (supabase as any).from("website_dedicated_packages").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("website_dedicated_packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_dedicated_packages"] }); setOpen(false); toast({ title: editId ? "আপডেট হয়েছে" : "যোগ হয়েছে" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("website_dedicated_packages").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["website_dedicated_packages"] }); toast({ title: "ডিলিট হয়েছে" }); },
  });

  const openEdit = (item: DedicatedPkg) => {
    setForm(item); setEditId(item.id);
    setFeaturesText((item.features || []).join("\n"));
    setBadgesText((item.badges || []).join(", "));
    setOpen(true);
  };
  const openNew = () => { setForm(empty); setEditId(null); setFeaturesText(""); setBadgesText(""); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ডেডিকেটেড প্যাকেজ</h1>
          <p className="text-muted-foreground">"Call for Price" এন্টারপ্রাইজ বা ডেডিকেটেড ব্যান্ডউইথ অফার ম্যানেজ করুন।</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />নতুন প্যাকেজ</Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>নাম</TableHead><TableHead>ব্যান্ডউইথ</TableHead><TableHead>মূল্য লেবেল</TableHead>
            <TableHead>জনপ্রিয়</TableHead><TableHead>ক্রম</TableHead><TableHead>স্ট্যাটাস</TableHead>
            <TableHead className="text-right">অ্যাকশন</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {data?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.bandwidth_label || "—"}</TableCell>
                <TableCell>{item.price_label}</TableCell>
                <TableCell>{item.is_popular ? "✓" : ""}</TableCell>
                <TableCell>{item.sort_order}</TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge></TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("ডিলিট করবেন?")) del.mutate(item.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো প্যাকেজ নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "প্যাকেজ সম্পাদনা" : "নতুন ডেডিকেটেড প্যাকেজ"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div><Label>নাম</Label><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enterprise 100 Mbps Dedicated" /></div>
            <div><Label>ব্যান্ডউইথ লেবেল</Label><Input value={form.bandwidth_label || ""} onChange={(e) => setForm({ ...form, bandwidth_label: e.target.value })} placeholder="100 Mbps Symmetric" /></div>
            <div><Label>মূল্য লেবেল</Label><Input value={form.price_label || ""} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="Call for Price" /></div>
            <div><Label>ফিচার (প্রতি লাইনে একটি)</Label><Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} placeholder="Real IP&#10;SLA 99.9%&#10;24/7 Support" /></div>
            <div><Label>ব্যাজ (কমা দিয়ে আলাদা)</Label><Input value={badgesText} onChange={(e) => setBadgesText(e.target.value)} placeholder="BDIX, FTP, Cache, Real IP" /></div>
            <div><Label>যোগাযোগ URL (optional)</Label><Input value={form.contact_url || ""} onChange={(e) => setForm({ ...form, contact_url: e.target.value })} placeholder="/contact বা tel:..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>সর্ট অর্ডার</Label><Input type="number" value={form.sort_order || 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-3"><Switch checked={!!form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} /><Label>জনপ্রিয়</Label></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /><Label>সক্রিয়</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "সেভ হচ্ছে..." : "সেভ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
