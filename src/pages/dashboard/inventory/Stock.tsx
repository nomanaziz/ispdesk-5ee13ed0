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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, ArrowDownCircle, ArrowUpCircle, Package } from "lucide-react";
import { toast } from "sonner";

type Movement = {
  id: string;
  item_id: string;
  quantity: number;
  type: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

type ItemRef = { id: string; name: string; quantity: number | null };

const emptyForm = { item_id: "", quantity: "", type: "in", reference: "", notes: "" };

export default function Stock() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"in" | "out">("in");
  const [form, setForm] = useState(emptyForm);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Movement[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["inventory_items_ref"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_items").select("id, name, quantity").eq("status", "active");
      if (error) throw error;
      return data as ItemRef[];
    },
  });

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || "-";

  const saveMutation = useMutation({
    mutationFn: async () => {
      const qty = Number(form.quantity);
      if (!qty || qty <= 0) throw new Error("Invalid quantity");

      // Insert movement
      const { error: moveErr } = await supabase.from("stock_movements").insert({
        item_id: form.item_id,
        quantity: qty,
        type: dialogType,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      if (moveErr) throw moveErr;

      // Update item quantity
      const item = items.find(i => i.id === form.item_id);
      const currentQty = item?.quantity || 0;
      const newQty = dialogType === "in" ? currentQty + qty : Math.max(0, currentQty - qty);

      const { error: updateErr } = await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", form.item_id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_items_ref"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success(dialogType === "in" ? "স্টক ইন সফল" : "স্টক আউট সফল");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (mov: Movement) => {
      // Reverse the quantity change
      const item = items.find(i => i.id === mov.item_id);
      const currentQty = item?.quantity || 0;
      const newQty = mov.type === "in" ? Math.max(0, currentQty - mov.quantity) : currentQty + mov.quantity;

      const { error: delErr } = await supabase.from("stock_movements").delete().eq("id", mov.id);
      if (delErr) throw delErr;

      await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", mov.item_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_items_ref"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });

  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm); };
  const openStockIn = () => { setDialogType("in"); setForm({ ...emptyForm, type: "in" }); setDialogOpen(true); };
  const openStockOut = () => { setDialogType("out"); setForm({ ...emptyForm, type: "out" }); setDialogOpen(true); };

  const today = new Date().toISOString().split("T")[0];
  const todayIn = movements.filter(m => m.type === "in" && m.created_at.startsWith(today)).reduce((s, m) => s + m.quantity, 0);
  const todayOut = movements.filter(m => m.type === "out" && m.created_at.startsWith(today)).reduce((s, m) => s + m.quantity, 0);
  const totalStock = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const filtered = movements.filter(m => {
    const matchSearch = getItemName(m.item_id).toLowerCase().includes(search.toLowerCase()) || (m.reference || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">স্টক ম্যানেজমেন্ট</h1>
        <div className="flex gap-2">
          <Button onClick={openStockIn} className="bg-green-600 hover:bg-green-700"><ArrowDownCircle className="h-4 w-4 mr-2" /> স্টক ইন</Button>
          <Button onClick={openStockOut} variant="destructive"><ArrowUpCircle className="h-4 w-4 mr-2" /> স্টক আউট</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ArrowDownCircle className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">আজকের স্টক ইন</p><p className="text-2xl font-bold">{todayIn}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ArrowUpCircle className="h-8 w-8 text-red-500" /><div><p className="text-sm text-muted-foreground">আজকের স্টক আউট</p><p className="text-2xl font-bold">{todayOut}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Package className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">মোট স্টক</p><p className="text-2xl font-bold">{totalStock}</p></div></div></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="আইটেম/রেফারেন্স খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="w-52" /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">সকল</SelectItem><SelectItem value="in">স্টক ইন</SelectItem><SelectItem value="out">স্টক আউট</SelectItem></SelectContent></Select>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>#</TableHead><TableHead>আইটেম</TableHead><TableHead>ধরন</TableHead><TableHead>পরিমাণ</TableHead><TableHead>রেফারেন্স</TableHead><TableHead>নোট</TableHead><TableHead>তারিখ</TableHead><TableHead>অ্যাকশন</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow> :
            filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো স্টক মুভমেন্ট পাওয়া যায়নি</TableCell></TableRow> :
            filtered.map((m, i) => (
              <TableRow key={m.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{getItemName(m.item_id)}</TableCell>
                <TableCell><Badge className={m.type === "in" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>{m.type === "in" ? "স্টক ইন" : "স্টক আউট"}</Badge></TableCell>
                <TableCell>{m.quantity}</TableCell>
                <TableCell>{m.reference || "-"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                <TableCell>{new Date(m.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogType === "in" ? "স্টক ইন" : "স্টক আউট"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>আইটেম *</Label><Select value={form.item_id} onValueChange={v => setForm({ ...form, item_id: v })}><SelectTrigger><SelectValue placeholder="আইটেম নির্বাচন করুন" /></SelectTrigger><SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (স্টক: {i.quantity ?? 0})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>পরিমাণ *</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" min="1" /></div>
            <div><Label>রেফারেন্স</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="PO নম্বর / চালান নম্বর" /></div>
            <div><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য" /></div>
          </div>
          <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.item_id || !form.quantity || saveMutation.isPending}>{saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
