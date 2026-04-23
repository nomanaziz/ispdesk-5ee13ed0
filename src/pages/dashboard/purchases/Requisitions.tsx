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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, ClipboardList, Clock, FileCheck, FileX } from "lucide-react";

const emptyForm = { requisition_no: "", item_id: "", quantity: 1, vendor_id: "", estimated_cost: 0, notes: "" };

export default function Requisitions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: requisitions = [], isLoading } = useQuery({
    queryKey: ["requisitions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("requisitions").select("*, vendor:vendors(name), item:inventory_items(name)").order("created_at", { ascending: false });
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { requisition_no: form.requisition_no, item_id: form.item_id || null, quantity: form.quantity, vendor_id: form.vendor_id || null, estimated_cost: form.estimated_cost, notes: form.notes || null };
      if (editing) {
        const { error } = await supabase.from("requisitions").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("requisitions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); toast({ title: editing ? "আপডেট হয়েছে" : "রিকুইজিশন যোগ হয়েছে" }); closeDialog(); },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("requisitions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); toast({ title: "স্ট্যাটাস আপডেট হয়েছে" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("requisitions").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); toast({ title: "মুছে ফেলা হয়েছে" }); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditing(null); setForm(emptyForm); };
  const openEdit = (r: any) => { setEditing(r); setForm({ requisition_no: r.requisition_no, item_id: r.item_id || "", quantity: r.quantity || 1, vendor_id: r.vendor_id || "", estimated_cost: r.estimated_cost || 0, notes: r.notes || "" }); setDialogOpen(true); };

  const filtered = requisitions.filter((r: any) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.requisition_no.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = requisitions.filter((r: any) => r.status === "pending").length;
  const approved = requisitions.filter((r: any) => r.status === "approved").length;
  const rejected = requisitions.filter((r: any) => r.status === "rejected").length;

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">অনুমোদিত</Badge>;
    if (s === "rejected") return <Badge variant="destructive">প্রত্যাখ্যাত</Badge>;
    return <Badge variant="secondary">পেন্ডিং</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">রিকুইজিশন</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />নতুন রিকুইজিশন</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">মোট</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{requisitions.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">পেন্ডিং</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-600" /><span className="text-2xl font-bold">{pending}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">অনুমোদিত</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{approved}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">প্রত্যাখ্যাত</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><FileX className="h-5 w-5 text-red-600" /><span className="text-2xl font-bold">{rejected}</span></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="রিকুইজিশন নং দিয়ে খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-64" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent><SelectItem value="all">সব</SelectItem><SelectItem value="pending">পেন্ডিং</SelectItem><SelectItem value="approved">অনুমোদিত</SelectItem><SelectItem value="rejected">প্রত্যাখ্যাত</SelectItem></SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>রিকুইজিশন নং</TableHead>
              <TableHead>আইটেম</TableHead>
              <TableHead>পরিমাণ</TableHead>
              <TableHead>ভেন্ডর</TableHead>
              <TableHead>আনুমানিক খরচ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>নোট</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">কোনো রিকুইজিশন পাওয়া যায়নি</TableCell></TableRow>
            ) : filtered.map((r: any, i: number) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{r.requisition_no}</TableCell>
                <TableCell>{r.item?.name || "—"}</TableCell>
                <TableCell>{r.quantity}</TableCell>
                <TableCell>{r.vendor?.name || "—"}</TableCell>
                <TableCell>৳{Number(r.estimated_cost || 0).toLocaleString("bn-BD")}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="max-w-[150px] truncate">{r.notes || "—"}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" title="অনুমোদন" onClick={() => statusMutation.mutate({ id: r.id, status: "approved" })}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" title="প্রত্যাখ্যান" onClick={() => statusMutation.mutate({ id: r.id, status: "rejected" })}><XCircle className="h-4 w-4 text-red-600" /></Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "রিকুইজিশন সম্পাদনা" : "নতুন রিকুইজিশন"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>রিকুইজিশন নং *</Label><Input value={form.requisition_no} onChange={e => setForm(p => ({ ...p, requisition_no: e.target.value }))} /></div>
            <div><Label>আইটেম</Label>
              <SearchableSelect
                value={form.item_id}
                onValueChange={v => setForm(p => ({ ...p, item_id: v }))}
                options={items.map((it: any) => ({ value: it.id, label: it.name }))}
                placeholder="আইটেম নির্বাচন করুন"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>পরিমাণ</Label><Input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} /></div>
              <div><Label>আনুমানিক খরচ</Label><Input type="number" value={form.estimated_cost} onChange={e => setForm(p => ({ ...p, estimated_cost: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>ভেন্ডর</Label>
              <SearchableSelect
                value={form.vendor_id}
                onValueChange={v => setForm(p => ({ ...p, vendor_id: v }))}
                options={vendors.map((v: any) => ({ value: v.id, label: v.name }))}
                placeholder="ভেন্ডর নির্বাচন করুন"
              />
            </div>
            <div><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.requisition_no || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
