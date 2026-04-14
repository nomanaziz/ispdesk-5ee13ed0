import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, ShoppingCart, DollarSign, CheckCircle, Clock } from "lucide-react";

const emptyForm = { purchase_no: "", vendor_id: "", item_id: "", quantity: 1, unit_price: 0, total: 0, purchase_date: new Date().toISOString().split("T")[0], status: "completed", notes: "" };

export default function Purchases() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchases").select("*, vendor:vendors(name), item:inventory_items(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => { const { data } = await supabase.from("vendors").select("id, name").eq("status", "active"); return data || []; },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory_items"],
    queryFn: async () => { const { data } = await supabase.from("inventory_items").select("id, name"); return data || []; },
  });

  const updateTotal = (qty: number, price: number) => setForm(p => ({ ...p, quantity: qty, unit_price: price, total: qty * price }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { purchase_no: form.purchase_no, vendor_id: form.vendor_id || null, item_id: form.item_id || null, quantity: form.quantity, unit_price: form.unit_price, total: form.total, purchase_date: form.purchase_date, status: form.status, notes: form.notes || null };
      if (editing) {
        const { error } = await supabase.from("purchases").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("purchases").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); toast({ title: editing ? "আপডেট হয়েছে" : "ক্রয় যোগ হয়েছে" }); closeDialog(); },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("purchases").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchases"] }); toast({ title: "মুছে ফেলা হয়েছে" }); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm); };
  const openEdit = (p: any) => { setEditing(p); setForm({ purchase_no: p.purchase_no, vendor_id: p.vendor_id || "", item_id: p.item_id || "", quantity: p.quantity || 1, unit_price: Number(p.unit_price) || 0, total: Number(p.total) || 0, purchase_date: p.purchase_date || "", status: p.status, notes: p.notes || "" }); setDialogOpen(true); };

  const filtered = purchases.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search && !p.purchase_no.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAmount = purchases.reduce((s: number, p: any) => s + Number(p.total || 0), 0);
  const completed = purchases.filter((p: any) => p.status === "completed").length;
  const pendingCount = purchases.filter((p: any) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ক্রয় তালিকা</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />নতুন ক্রয়</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট ক্রয়</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{purchases.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট পরিমাণ</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">৳{totalAmount.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">সম্পন্ন</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{completed}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">পেন্ডিং</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-600" /><span className="text-2xl font-bold">{pendingCount}</span></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="ক্রয় নং দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-64" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent><SelectItem value="all">সব</SelectItem><SelectItem value="completed">সম্পন্ন</SelectItem><SelectItem value="pending">পেন্ডিং</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>ক্রয় নং</TableHead>
              <TableHead>ভেন্ডর</TableHead>
              <TableHead>আইটেম</TableHead>
              <TableHead>পরিমাণ</TableHead>
              <TableHead>একক মূল্য</TableHead>
              <TableHead>মোট</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">কোনো ক্রয় পাওয়া যায়নি</TableCell></TableRow>
            ) : filtered.map((p: any, i: number) => (
              <TableRow key={p.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{p.purchase_no}</TableCell>
                <TableCell>{p.vendor?.name || "—"}</TableCell>
                <TableCell>{p.item?.name || "—"}</TableCell>
                <TableCell>{p.quantity}</TableCell>
                <TableCell>৳{Number(p.unit_price || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell className="font-medium">৳{Number(p.total || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell>{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("bn-BD") : "—"}</TableCell>
                <TableCell><Badge variant={p.status === "completed" ? "default" : "secondary"}>{p.status === "completed" ? "সম্পন্ন" : "পেন্ডিং"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "ক্রয় সম্পাদনা" : "নতুন ক্রয়"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>ক্রয় নং *</Label><Input value={form.purchase_no} onChange={e => setForm(p => ({ ...p, purchase_no: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ভেন্ডর</Label>
                <Select value={form.vendor_id} onValueChange={v => setForm(p => ({ ...p, vendor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>আইটেম</Label>
                <Select value={form.item_id} onValueChange={v => setForm(p => ({ ...p, item_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>{items.map((it: any) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>পরিমাণ</Label><Input type="number" value={form.quantity} onChange={e => updateTotal(Number(e.target.value), form.unit_price)} /></div>
              <div><Label>একক মূল্য</Label><Input type="number" value={form.unit_price} onChange={e => updateTotal(form.quantity, Number(e.target.value))} /></div>
              <div><Label>মোট</Label><Input type="number" value={form.total} disabled className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>তারিখ</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} /></div>
              <div><Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="completed">সম্পন্ন</SelectItem><SelectItem value="pending">পেন্ডিং</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.purchase_no || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
