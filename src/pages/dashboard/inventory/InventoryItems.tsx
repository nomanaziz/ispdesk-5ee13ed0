import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

type Item = {
  id: string;
  name: string;
  code: string | null;
  category_id: string | null;
  unit_id: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  quantity: number | null;
  store_id: string | null;
  status: string;
  created_at: string;
};

type Ref = { id: string; name: string };

const emptyForm = { name: "", code: "", category_id: "", unit_id: "", purchase_price: "", sale_price: "", store_id: "", status: "active" };

export default function InventoryItems() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_categories").select("id, name").eq("status", "active");
      if (error) throw error;
      return data as Ref[];
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["inventory_units"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_units").select("id, name").eq("status", "active");
      if (error) throw error;
      return data as Ref[];
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["store_locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_locations").select("id, name").eq("status", "active");
      if (error) throw error;
      return data as Ref[];
    },
  });

  const getName = (list: Ref[], id: string | null) => list.find(r => r.id === id)?.name || "-";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        code: form.code || null,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        store_id: form.store_id || null,
        status: form.status,
      };
      if (editingId) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success(editingId ? "আইটেম আপডেট হয়েছে" : "আইটেম যোগ হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("আইটেম মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openEdit = (item: Item) => {
    setForm({
      name: item.name, code: item.code || "", category_id: item.category_id || "", unit_id: item.unit_id || "",
      purchase_price: item.purchase_price?.toString() || "", sale_price: item.sale_price?.toString() || "",
      store_id: item.store_id || "", status: item.status,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || (item.code || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || item.category_id === catFilter;
    const matchStore = storeFilter === "all" || item.store_id === storeFilter;
    return matchSearch && matchCat && matchStore;
  });

  const lowStock = items.filter(i => (i.quantity || 0) < 10 && i.status === "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="আইটেম তালিকা"
        description="ইনভেন্টরি আইটেম, স্টক ও ক্যাটাগরি পরিচালনা"
        action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> আইটেম যোগ করুন</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="মোট আইটেম" value={items.length} icons8="stack" />
        <StatCard label="সক্রিয়" value={items.filter(i => i.status === "active").length} icons8="checked" />
        <StatCard label="লো স্টক (<10)" value={lowStock} icons8="high-priority" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="আইটেম খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-48" /></div>
        <Select value={catFilter} onValueChange={setCatFilter}><SelectTrigger className="w-44"><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger><SelectContent><SelectItem value="all">সকল ক্যাটাগরি</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className="w-44"><SelectValue placeholder="স্টোর" /></SelectTrigger><SelectContent><SelectItem value="all">সকল স্টোর</SelectItem>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>কোড</TableHead><TableHead>নাম</TableHead><TableHead>ক্যাটাগরি</TableHead><TableHead>ইউনিট</TableHead><TableHead>ক্রয় মূল্য</TableHead><TableHead>বিক্রয় মূল্য</TableHead><TableHead>স্টক</TableHead><TableHead>স্টোর</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={11} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center py-8">কোনো আইটেম পাওয়া যায়নি</TableCell></TableRow> :
            filtered.map((item, i) => (
              <TableRow key={item.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{item.code || "-"}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{getName(categories, item.category_id)}</TableCell>
                <TableCell>{getName(units, item.unit_id)}</TableCell>
                <TableCell>{item.purchase_price?.toLocaleString("bn-BD") || "-"}</TableCell>
                <TableCell>{item.sale_price?.toLocaleString("bn-BD") || "-"}</TableCell>
                <TableCell><span className={(item.quantity || 0) < 10 ? "text-orange-600 font-bold" : ""}>{item.quantity ?? 0}</span></TableCell>
                <TableCell>{getName(stores, item.store_id)}</TableCell>
                <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "আইটেম সম্পাদনা" : "নতুন আইটেম"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: ONU Device" /></div>
            <div><Label>কোড</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="ITM-001" /></div>
            <div><Label>ক্যাটাগরি</Label><Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}><SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>ইউনিট</Label><Select value={form.unit_id} onValueChange={v => setForm({ ...form, unit_id: v })}><SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger><SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>স্টোর</Label><Select value={form.store_id} onValueChange={v => setForm({ ...form, store_id: v })}><SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger><SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>ক্রয় মূল্য</Label><Input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" /></div>
            <div><Label>বিক্রয় মূল্য</Label><Input type="number" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} placeholder="0" /></div>
            <div><Label>স্ট্যাটাস</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
