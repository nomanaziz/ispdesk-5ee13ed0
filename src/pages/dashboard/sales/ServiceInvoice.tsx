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
import { Plus, Pencil, Trash2, Search, FileText, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface ServiceInvoice {
  id: string;
  invoice_no: string;
  client_id: string | null;
  service_name: string;
  amount: number;
  invoice_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const defaultForm = {
  invoice_no: "",
  client_id: "",
  service_name: "",
  amount: 0,
  invoice_date: new Date().toISOString().split("T")[0],
  status: "unpaid",
  notes: "",
};

export default function ServiceInvoice() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["service_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ServiceInvoice[];
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
        invoice_no: formData.invoice_no,
        client_id: formData.client_id || null,
        service_name: formData.service_name,
        amount: formData.amount,
        invoice_date: formData.invoice_date,
        status: formData.status,
        notes: formData.notes || null,
      };
      if (editId) {
        const { error } = await supabase.from("service_invoices").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_invoices").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_invoices"] });
      toast.success(editId ? "ইনভয়েস আপডেট হয়েছে" : "ইনভয়েস তৈরি হয়েছে");
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_invoices"] });
      toast.success("ইনভয়েস মুছে ফেলা হয়েছে");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => { setForm(defaultForm); setEditId(null); setOpen(false); };

  const openEdit = (inv: ServiceInvoice) => {
    setForm({
      invoice_no: inv.invoice_no,
      client_id: inv.client_id || "",
      service_name: inv.service_name,
      amount: inv.amount,
      invoice_date: inv.invoice_date,
      status: inv.status,
      notes: inv.notes || "",
    });
    setEditId(inv.id);
    setOpen(true);
  };

  const getClientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "-";

  const filtered = invoices
    .filter((inv) => statusFilter === "all" || inv.status === statusFilter)
    .filter((inv) =>
      inv.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      inv.service_name.toLowerCase().includes(search.toLowerCase()) ||
      getClientName(inv.client_id).toLowerCase().includes(search.toLowerCase())
    );

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { paid: "bg-green-100 text-green-700", unpaid: "bg-red-100 text-red-700", partial: "bg-yellow-100 text-yellow-700" };
    const labels: Record<string, string> = { paid: "পেইড", unpaid: "বকেয়া", partial: "আংশিক" };
    return <Badge className={map[s] || ""}>{labels[s] || s}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">সার্ভিস ইনভয়েস</h1>
          <p className="text-muted-foreground text-sm">সেবা সংক্রান্ত ইনভয়েস ম্যানেজ করুন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> নতুন ইনভয়েস</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "ইনভয়েস সম্পাদনা" : "নতুন সার্ভিস ইনভয়েস"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>ইনভয়েস নম্বর *</Label>
                <Input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} placeholder="SRV-001" />
              </div>
              <div>
                <Label>ক্লায়েন্ট</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="ক্লায়েন্ট নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.client_id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>সেবার নাম *</Label>
                <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} placeholder="মেইনটেনেন্স / শিফটিং / ইত্যাদি" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>পরিমাণ (৳)</Label>
                  <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>তারিখ</Label>
                  <Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">বকেয়া</SelectItem>
                    <SelectItem value="paid">পেইড</SelectItem>
                    <SelectItem value="partial">আংশিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>নোট</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="অতিরিক্ত তথ্য..." />
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={!form.invoice_no || !form.service_name || saveMutation.isPending}>
                {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট করুন" : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট ইনভয়েস</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" /><span className="text-2xl font-bold">{invoices.length}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">মোট আয়</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-500" /><span className="text-2xl font-bold">৳{paidAmount.toLocaleString("bn-BD")}</span></div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">বকেয়া</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /><span className="text-2xl font-bold">৳{(totalAmount - paidAmount).toLocaleString("bn-BD")}</span></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle>ইনভয়েস তালিকা</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব</SelectItem>
                  <SelectItem value="paid">পেইড</SelectItem>
                  <SelectItem value="unpaid">বকেয়া</SelectItem>
                  <SelectItem value="partial">আংশিক</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="অনুসন্ধান..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>ইনভয়েস নং</TableHead>
                  <TableHead>ক্লায়েন্ট</TableHead>
                  <TableHead>সেবার নাম</TableHead>
                  <TableHead>পরিমাণ</TableHead>
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
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো ইনভয়েস পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((inv, i) => (
                  <TableRow key={inv.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                    <TableCell>{getClientName(inv.client_id)}</TableCell>
                    <TableCell>{inv.service_name}</TableCell>
                    <TableCell className="font-semibold">৳{inv.amount?.toLocaleString("bn-BD")}</TableCell>
                    <TableCell>{inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy", { locale: bn }) : "-"}</TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{inv.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
