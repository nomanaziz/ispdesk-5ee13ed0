import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, TrendingUp, Banknote, Wifi, Users } from "lucide-react";

const SOURCES = [
  { value: "client_billing", label: "ক্লায়েন্ট বিলিং" },
  { value: "mac_reseller", label: "ম্যাক রিসেলার" },
  { value: "bandwidth_sale", label: "ব্যান্ডউইথ সেল" },
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "bKash", "Nagad", "Rocket", "Card", "Online"];

const defaultForm = {
  amount: 0, description: "", income_date: new Date().toISOString().slice(0, 10),
  reference: "", source: "client_billing", account_id: null as string | null,
  month: new Date().toISOString().slice(0, 7), received_by: "", payment_method: "",
};

export default function Income() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["income-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("income_entries").select("*").order("income_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["chart-of-accounts-income"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id, name, code").eq("type", "income").eq("status", "active");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      if (editId) {
        const { error } = await supabase.from("income_entries").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("income_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income-entries"] });
      toast.success(editId ? "আপডেট হয়েছে" : "সংরক্ষিত হয়েছে");
      setOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["income-entries"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (entries ?? []).filter(e => {
    if (filterSource !== "all" && e.source !== filterSource) return false;
    if (search && !e.description?.toLowerCase().includes(search.toLowerCase()) && !e.reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAll = (entries ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const totalBilling = (entries ?? []).filter(e => e.source === "client_billing").reduce((s, e) => s + Number(e.amount), 0);
  const totalReseller = (entries ?? []).filter(e => e.source === "mac_reseller").reduce((s, e) => s + Number(e.amount), 0);
  const totalBw = (entries ?? []).filter(e => e.source === "bandwidth_sale").reduce((s, e) => s + Number(e.amount), 0);

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({ amount: e.amount, description: e.description || "", income_date: e.income_date || "", reference: e.reference || "", source: e.source || "client_billing", account_id: e.account_id, month: e.month || "", received_by: e.received_by || "", payment_method: e.payment_method || "" });
    setOpen(true);
  };

  const sourceLabel = (s: string) => SOURCES.find(x => x.value === s)?.label || s;
  const sourceColor = (s: string) => s === "client_billing" ? "bg-green-500/20 text-green-600" : s === "mac_reseller" ? "bg-blue-500/20 text-blue-600" : "bg-purple-500/20 text-purple-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">আয়</h1>
          <p className="text-muted-foreground text-sm">সকল আয়ের উৎস ও এন্ট্রি</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> আয় যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "আয় সম্পাদনা" : "নতুন আয়"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-medium">আয়ের উৎস *</label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">পরিমাণ (৳) *</label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">তারিখ</label>
                  <Input type="date" value={form.income_date} onChange={e => setForm(f => ({ ...f, income_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">মাস</label>
                  <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">পেমেন্ট মেথড</label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">অ্যাকাউন্ট</label>
                <Select value={form.account_id || "none"} onValueChange={v => setForm(f => ({ ...f, account_id: v === "none" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনটি নয়</SelectItem>
                    {(accounts ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">বিবরণ</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">রেফারেন্স</label>
                  <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">গ্রহণকারী</label>
                  <Input value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending || form.amount <= 0}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">মোট আয়</p><p className="text-xl font-bold">৳{totalAll.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-green-500/20 text-green-500"><TrendingUp className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">ক্লায়েন্ট বিলিং</p><p className="text-xl font-bold">৳{totalBilling.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary"><Users className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">ম্যাক রিসেলার</p><p className="text-xl font-bold">৳{totalReseller.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-500"><Banknote className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">ব্যান্ডউইথ সেল</p><p className="text-xl font-bold">৳{totalBw.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-500"><Wifi className="h-5 w-5" /></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="বিবরণ / রেফারেন্স খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব উৎস</SelectItem>
            {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">উৎস</TableHead>
                  <TableHead className="text-xs">বিবরণ</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
                  <TableHead className="text-xs">রেফারেন্স</TableHead>
                  <TableHead className="text-xs">পেমেন্ট</TableHead>
                  <TableHead className="text-xs text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো এন্ট্রি নেই</TableCell></TableRow>
                ) : filtered.map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs py-2">{i + 1}</TableCell>
                    <TableCell className="text-xs py-2">{e.income_date}</TableCell>
                    <TableCell className="text-xs py-2"><Badge variant="outline" className={sourceColor(e.source)}>{sourceLabel(e.source)}</Badge></TableCell>
                    <TableCell className="text-xs py-2">{e.description || "-"}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium">৳{Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs py-2">{e.reference || "-"}</TableCell>
                    <TableCell className="text-xs py-2">{e.payment_method || "-"}</TableCell>
                    <TableCell className="text-xs py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
