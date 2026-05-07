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
import { Plus, Search, Pencil, Trash2, TrendingDown } from "lucide-react";

const CATEGORIES = ["Office", "Salary", "Utility", "Maintenance", "Network", "Equipment", "Transport", "Marketing", "Tax", "Other"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "bKash", "Nagad", "Rocket", "Card", "Online"];

const defaultForm = {
  amount: 0, description: "", expense_date: new Date().toISOString().slice(0, 10),
  reference: "", category: "", account_id: null as string | null,
  month: new Date().toISOString().slice(0, 7), paid_by: "", payment_method: "",
};

export default function Expense() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["expense-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_entries").select("*").order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["chart-of-accounts-expense"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id, name, code").eq("type", "expense").eq("status", "active");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      if (editId) {
        const { error } = await supabase.from("expense_entries").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expense_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-entries"] });
      toast.success(editId ? "আপডেট হয়েছে" : "সংরক্ষিত হয়েছে");
      setOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense-entries"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (entries ?? []).filter(e => {
    if (filterCat !== "all" && e.category !== filterCat) return false;
    if (search && !e.description?.toLowerCase().includes(search.toLowerCase()) && !e.reference?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = (entries ?? []).reduce((s, e) => s + Number(e.amount), 0);

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({ amount: e.amount, description: e.description || "", expense_date: e.expense_date || "", reference: e.reference || "", category: e.category || "", account_id: e.account_id, month: e.month || "", paid_by: e.paid_by || "", payment_method: e.payment_method || "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">ব্যয়</h1>
          <p className="text-xs text-muted-foreground">সকল ব্যয়ের এন্ট্রি</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> ব্যয় যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "ব্যয় সম্পাদনা" : "নতুন ব্যয়"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">পরিমাণ (৳) *</label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">ক্যাটাগরি</label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">তারিখ</label>
                  <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">মাস</label>
                  <Input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">পেমেন্ট মেথড</label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                  <label className="text-xs font-medium">প্রদানকারী</label>
                  <Input value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))} />
                </div>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending || form.amount <= 0}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">মোট ব্যয়</p><p className="text-xl font-bold">৳{total.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-red-500/20 text-red-500"><TrendingDown className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">মোট এন্ট্রি</p><p className="text-xl font-bold">{(entries ?? []).length}</p></div>
          <div className="p-2.5 rounded-xl bg-muted text-muted-foreground"><TrendingDown className="h-5 w-5" /></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="বিবরণ / রেফারেন্স খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">ক্যাটাগরি</TableHead>
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
                    <TableCell className="text-xs py-2">{e.expense_date}</TableCell>
                    <TableCell className="text-xs py-2"><Badge variant="outline">{e.category || "-"}</Badge></TableCell>
                    <TableCell className="text-xs py-2">{e.description || "-"}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium text-red-500">৳{Number(e.amount).toLocaleString()}</TableCell>
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
