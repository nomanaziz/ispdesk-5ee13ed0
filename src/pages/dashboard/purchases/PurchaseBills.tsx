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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Receipt, DollarSign, AlertTriangle } from "lucide-react";

const emptyForm = { bill_no: "", vendor_id: "", amount: 0, paid: 0, due: 0, bill_date: new Date().toISOString().split("T")[0], status: "unpaid" };

export default function PurchaseBills() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["purchase_bills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_bills").select("*, vendor:vendors(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => { const { data } = await supabase.from("vendors").select("id, name").eq("status", "active"); return data || []; },
  });

  const updateDue = (amount: number, paid: number) => setForm(p => ({ ...p, amount, paid, due: Math.max(0, amount - paid) }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const status = form.due <= 0 ? "paid" : form.paid > 0 ? "partial" : "unpaid";
      const payload = { bill_no: form.bill_no, vendor_id: form.vendor_id || null, amount: form.amount, paid: form.paid, due: form.due, bill_date: form.bill_date, status };
      if (editing) {
        const { error } = await supabase.from("purchase_bills").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("purchase_bills").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase_bills"] }); toast({ title: editing ? "আপডেট হয়েছে" : "বিল যোগ হয়েছে" }); closeDialog(); },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("purchase_bills").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase_bills"] }); toast({ title: "মুছে ফেলা হয়েছে" }); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm); };
  const openEdit = (b: any) => { setEditing(b); setForm({ bill_no: b.bill_no, vendor_id: b.vendor_id || "", amount: Number(b.amount) || 0, paid: Number(b.paid) || 0, due: Number(b.due) || 0, bill_date: b.bill_date || "", status: b.status }); setDialogOpen(true); };

  const filtered = bills.filter((b: any) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search && !b.bill_no.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAmount = bills.reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const totalPaid = bills.reduce((s: number, b: any) => s + Number(b.paid || 0), 0);
  const totalDue = bills.reduce((s: number, b: any) => s + Number(b.due || 0), 0);

  const statusBadge = (s: string) => {
    if (s === "paid") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">পরিশোধিত</Badge>;
    if (s === "partial") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">আংশিক</Badge>;
    return <Badge variant="destructive">অপরিশোধিত</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">পার্চেজ বিল</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />নতুন বিল</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট পরিমাণ</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">৳{totalAmount.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">পরিশোধিত</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">৳{totalPaid.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">বকেয়া</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /><span className="text-2xl font-bold">৳{totalDue.toLocaleString("bn-BD")}</span></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="বিল নং দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-64" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent><SelectItem value="all">সব</SelectItem><SelectItem value="paid">পরিশোধিত</SelectItem><SelectItem value="partial">আংশিক</SelectItem><SelectItem value="unpaid">অপরিশোধিত</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>বিল নং</TableHead>
              <TableHead>ভেন্ডর</TableHead>
              <TableHead>পরিমাণ</TableHead>
              <TableHead>পরিশোধিত</TableHead>
              <TableHead>বকেয়া</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">কোনো বিল পাওয়া যায়নি</TableCell></TableRow>
            ) : filtered.map((b: any, i: number) => (
              <TableRow key={b.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{b.bill_no}</TableCell>
                <TableCell>{b.vendor?.name || "—"}</TableCell>
                <TableCell>৳{Number(b.amount || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell>৳{Number(b.paid || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell className="font-medium text-destructive">৳{Number(b.due || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell>{b.bill_date ? new Date(b.bill_date).toLocaleDateString("bn-BD") : "—"}</TableCell>
                <TableCell>{statusBadge(b.status)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(b.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "বিল সম্পাদনা" : "নতুন বিল"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>বিল নং *</Label><Input value={form.bill_no} onChange={e => setForm(p => ({ ...p, bill_no: e.target.value }))} /></div>
            <div><Label>ভেন্ডর</Label>
              <SearchableSelect
                value={form.vendor_id}
                onValueChange={v => setForm(p => ({ ...p, vendor_id: v }))}
                options={vendors.map((v: any) => ({ value: v.id, label: v.name }))}
                placeholder="ভেন্ডর নির্বাচন করুন"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>পরিমাণ</Label><Input type="number" value={form.amount} onChange={e => updateDue(Number(e.target.value), form.paid)} /></div>
              <div><Label>পরিশোধিত</Label><Input type="number" value={form.paid} onChange={e => updateDue(form.amount, Number(e.target.value))} /></div>
              <div><Label>বকেয়া</Label><Input type="number" value={form.due} disabled className="bg-muted" /></div>
            </div>
            <div><Label>তারিখ</Label><Input type="date" value={form.bill_date} onChange={e => setForm(p => ({ ...p, bill_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.bill_no || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
