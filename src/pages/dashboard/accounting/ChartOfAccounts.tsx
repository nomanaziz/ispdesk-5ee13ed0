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
import { Plus, Search, Pencil, Trash2, BookOpen } from "lucide-react";

const TYPES = [
  { value: "asset", label: "সম্পদ (Asset)" },
  { value: "liability", label: "দায় (Liability)" },
  { value: "equity", label: "মূলধন (Equity)" },
  { value: "income", label: "আয় (Income)" },
  { value: "expense", label: "ব্যয় (Expense)" },
];

const defaultForm = { code: "", name: "", type: "asset", parent_id: null as string | null, balance: 0, status: "active" };

export default function ChartOfAccounts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, balance: Number(form.balance) };
      if (editId) {
        const { error } = await supabase.from("chart_of_accounts").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chart_of_accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast.success(editId ? "আপডেট হয়েছে" : "সংরক্ষিত হয়েছে");
      setOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chart-of-accounts"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (accounts ?? []).filter(a => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeLabel = (t: string) => TYPES.find(x => x.value === t)?.label || t;
  const typeColor = (t: string) => {
    const colors: Record<string, string> = { asset: "bg-blue-500/20 text-blue-600", liability: "bg-red-500/20 text-red-600", equity: "bg-purple-500/20 text-purple-600", income: "bg-green-500/20 text-green-600", expense: "bg-amber-500/20 text-amber-600" };
    return colors[t] || "";
  };

  const parentName = (pid: string | null) => {
    if (!pid) return "-";
    const p = (accounts ?? []).find(a => a.id === pid);
    return p ? `${p.code} - ${p.name}` : "-";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">চার্ট অফ অ্যাকাউন্টস</h1>
          <p className="text-muted-foreground text-sm">অ্যাকাউন্ট কাঠামো ও শ্রেণীবিভাগ</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> অ্যাকাউন্ট যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "অ্যাকাউন্ট সম্পাদনা" : "নতুন অ্যাকাউন্ট"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">কোড *</label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="1001" />
                </div>
                <div>
                  <label className="text-xs font-medium">ধরন *</label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">নাম *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">প্যারেন্ট অ্যাকাউন্ট</label>
                  <Select value={form.parent_id || "none"} onValueChange={v => setForm(f => ({ ...f, parent_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">কোনটি নয়</SelectItem>
                      {(accounts ?? []).filter(a => a.id !== editId).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">ব্যালেন্স</label>
                  <Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">স্ট্যাটাস</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">সক্রিয়</SelectItem>
                    <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.code || !form.name}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {TYPES.map(t => {
          const count = (accounts ?? []).filter(a => a.type === t.value).length;
          return (
            <Card key={t.value}><CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{t.label}</p><p className="text-xl font-bold">{count}</p></div>
              <div className={`p-2.5 rounded-xl ${typeColor(t.value)}`}><BookOpen className="h-5 w-5" /></div>
            </CardContent></Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="কোড / নাম খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরন</SelectItem>
            {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                  <TableHead className="text-xs">কোড</TableHead>
                  <TableHead className="text-xs">নাম</TableHead>
                  <TableHead className="text-xs">ধরন</TableHead>
                  <TableHead className="text-xs">প্যারেন্ট</TableHead>
                  <TableHead className="text-xs text-right">ব্যালেন্স</TableHead>
                  <TableHead className="text-xs">স্ট্যাটাস</TableHead>
                  <TableHead className="text-xs text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                )) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো অ্যাকাউন্ট নেই</TableCell></TableRow>
                ) : filtered.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs py-2">{i + 1}</TableCell>
                    <TableCell className="text-xs py-2 font-mono">{a.code}</TableCell>
                    <TableCell className="text-xs py-2 font-medium">{a.name}</TableCell>
                    <TableCell className="text-xs py-2"><Badge variant="outline" className={typeColor(a.type)}>{typeLabel(a.type)}</Badge></TableCell>
                    <TableCell className="text-xs py-2">{parentName(a.parent_id)}</TableCell>
                    <TableCell className="text-xs py-2 text-right">৳{Number(a.balance).toLocaleString()}</TableCell>
                    <TableCell className="text-xs py-2"><Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                    <TableCell className="text-xs py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(a.id); setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id, balance: Number(a.balance), status: a.status }); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
