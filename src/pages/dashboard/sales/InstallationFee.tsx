import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface InstallationFee {
  id: string;
  client_id: string | null;
  amount: number;
  paid: number;
  status: string;
  fee_date: string;
  notes: string | null;
  created_at: string;
}

const defaultForm = {
  client_id: "",
  amount: 0,
  paid: 0,
  fee_date: new Date().toISOString().split("T")[0],
  notes: "",
};

const deriveStatus = (amount: number, paid: number): "paid" | "partial" | "unpaid" => {
  const a = Number(amount) || 0;
  const p = Number(paid) || 0;
  if (p <= 0) return "unpaid";
  if (p >= a) return "paid";
  return "partial";
};

export default function InstallationFee() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["installation_fees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("installation_fees").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as InstallationFee[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name, client_id").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const payload = {
        client_id: formData.client_id || null,
        amount: formData.amount,
        paid: formData.paid,
        status: deriveStatus(formData.amount, formData.paid),
        fee_date: formData.fee_date,
        notes: formData.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("installation_fees").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("installation_fees").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation_fees"] });
      toast.success(editId ? "আপডেট হয়েছে" : "ইনস্টলেশন ফি যোগ হয়েছে");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("installation_fees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation_fees"] });
      toast.success("মুছে ফেলা হয়েছে");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => { setForm(defaultForm); setEditId(null); setOpen(false); };

  const openEdit = (fee: InstallationFee) => {
    setForm({
      client_id: fee.client_id || "",
      amount: fee.amount,
      paid: fee.paid,
      fee_date: fee.fee_date,
      notes: fee.notes || "",
    });
    setEditId(fee.id);
    setOpen(true);
  };

  const getClientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "-";

  const filtered = fees.filter((f) =>
    getClientName(f.client_id).toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = fees.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.paid || 0), 0);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { paid: "bg-green-100 text-green-700", unpaid: "bg-red-100 text-red-700", partial: "bg-yellow-100 text-yellow-700" };
    const labels: Record<string, string> = { paid: "পেইড", unpaid: "বকেয়া", partial: "আংশিক" };
    return <Badge className={map[s] || ""}>{labels[s] || s}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">ইনস্টলেশন ফি</h1>
          <p className="text-muted-foreground text-sm">ক্লায়েন্ট ইনস্টলেশন চার্জ ম্যানেজ করুন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> নতুন ফি যোগ</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "ফি সম্পাদনা" : "নতুন ইনস্টলেশন ফি"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ক্লায়েন্ট</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="ক্লায়েন্ট নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.client_id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>মোট পরিমাণ (৳)</Label>
                  <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>পরিশোধিত (৳)</Label>
                  <Input type="number" min={0} value={form.paid} onChange={(e) => setForm({ ...form, paid: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>তারিখ</Label>
                  <Input type="date" value={form.fee_date} onChange={(e) => setForm({ ...form, fee_date: e.target.value })} />
                </div>
                <div>
                  <Label>স্ট্যাটাস (স্বয়ংক্রিয়)</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border bg-muted/40">
                    {statusBadge(deriveStatus(form.amount, form.paid))}
                  </div>
                </div>
              </div>
              <div>
                <Label>নোট</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট করুন" : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট ফি</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">৳{totalAmount.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">আদায়কৃত</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">৳{totalPaid.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">বকেয়া</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /><span className="text-2xl font-bold">৳{(totalAmount - totalPaid).toLocaleString("bn-BD")}</span></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle>ইনস্টলেশন ফি তালিকা</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ক্লায়েন্ট অনুসন্ধান..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>ক্লায়েন্ট</TableHead>
                  <TableHead>মোট (৳)</TableHead>
                  <TableHead>পরিশোধিত (৳)</TableHead>
                  <TableHead>বকেয়া (৳)</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>নোট</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো ডেটা পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((fee, i) => (
                  <TableRow key={fee.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{getClientName(fee.client_id)}</TableCell>
                    <TableCell>৳{fee.amount?.toLocaleString("bn-BD")}</TableCell>
                    <TableCell>৳{fee.paid?.toLocaleString("bn-BD")}</TableCell>
                    <TableCell className="font-semibold">৳{((fee.amount || 0) - (fee.paid || 0)).toLocaleString("bn-BD")}</TableCell>
                    <TableCell>{fee.fee_date ? format(new Date(fee.fee_date), "dd MMM yyyy", { locale: bn }) : "-"}</TableCell>
                    <TableCell>{statusBadge(fee.status)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{fee.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(fee)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(fee.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
