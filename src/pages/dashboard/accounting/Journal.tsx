import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, BookText } from "lucide-react";

const defaultForm = {
  entry_no: "", debit_account_id: null as string | null, credit_account_id: null as string | null,
  amount: 0, description: "", entry_date: new Date().toISOString().slice(0, 10),
};

export default function Journal() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["chart-of-accounts-all"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("id, name, code").eq("status", "active").order("code");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      if (editId) {
        const { error } = await supabase.from("journal_entries").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success(editId ? "আপডেট হয়েছে" : "সংরক্ষিত হয়েছে");
      setOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal-entries"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const acctName = (id: string | null) => {
    if (!id) return "-";
    const a = (accounts ?? []).find(a => a.id === id);
    return a ? `${a.code} - ${a.name}` : "-";
  };

  const filtered = (entries ?? []).filter(e => {
    if (search && !e.entry_no.toLowerCase().includes(search.toLowerCase()) && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = (entries ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">জার্নাল</h1>
          <p className="text-muted-foreground text-sm">জার্নাল এন্ট্রি তালিকা</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> জার্নাল এন্ট্রি</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "এন্ট্রি সম্পাদনা" : "নতুন জার্নাল এন্ট্রি"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">এন্ট্রি নম্বর *</label>
                  <Input value={form.entry_no} onChange={e => setForm(f => ({ ...f, entry_no: e.target.value }))} placeholder="JE-001" />
                </div>
                <div>
                  <label className="text-xs font-medium">তারিখ</label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">ডেবিট অ্যাকাউন্ট *</label>
                <Select value={form.debit_account_id || "none"} onValueChange={v => setForm(f => ({ ...f, debit_account_id: v === "none" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">নির্বাচন করুন</SelectItem>
                    {(accounts ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">ক্রেডিট অ্যাকাউন্ট *</label>
                <Select value={form.credit_account_id || "none"} onValueChange={v => setForm(f => ({ ...f, credit_account_id: v === "none" ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">নির্বাচন করুন</SelectItem>
                    {(accounts ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">পরিমাণ (৳) *</label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-xs font-medium">বিবরণ</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.entry_no || form.amount <= 0}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">মোট এন্ট্রি</p><p className="text-xl font-bold">{(entries ?? []).length}</p></div>
          <div className="p-2.5 rounded-xl bg-primary/20 text-primary"><BookText className="h-5 w-5" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">মোট পরিমাণ</p><p className="text-xl font-bold">৳{total.toLocaleString()}</p></div>
          <div className="p-2.5 rounded-xl bg-green-500/20 text-green-500"><BookText className="h-5 w-5" /></div>
        </CardContent></Card>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="এন্ট্রি নম্বর / বিবরণ খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">এন্ট্রি নং</TableHead>
                  <TableHead className="text-xs">ডেবিট</TableHead>
                  <TableHead className="text-xs">ক্রেডিট</TableHead>
                  <TableHead className="text-xs text-right">পরিমাণ</TableHead>
                  <TableHead className="text-xs">বিবরণ</TableHead>
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
                    <TableCell className="text-xs py-2">{e.entry_date}</TableCell>
                    <TableCell className="text-xs py-2 font-mono">{e.entry_no}</TableCell>
                    <TableCell className="text-xs py-2">{acctName(e.debit_account_id)}</TableCell>
                    <TableCell className="text-xs py-2">{acctName(e.credit_account_id)}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium">৳{Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs py-2">{e.description || "-"}</TableCell>
                    <TableCell className="text-xs py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(e.id); setForm({ entry_no: e.entry_no, debit_account_id: e.debit_account_id, credit_account_id: e.credit_account_id, amount: Number(e.amount), description: e.description || "", entry_date: e.entry_date || "" }); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
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
