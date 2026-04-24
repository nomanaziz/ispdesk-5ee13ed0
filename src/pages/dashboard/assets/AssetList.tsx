import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package, Wallet, CheckCircle2, UserCheck, AlertOctagon } from "lucide-react";

const CATEGORIES = [
  "Network Equipment",
  "IT Equipment",
  "Furniture",
  "Vehicle",
  "Tools",
  "Generator",
  "AC / Cooling",
  "Office Supply",
  "Other",
];

const STATUSES = ["active", "in_repair", "idle", "destroyed"] as const;
const STATUS_LABEL: Record<string, string> = {
  active: "সক্রিয়",
  in_repair: "মেরামতে",
  idle: "অব্যবহৃত",
  destroyed: "নষ্ট",
};
const STATUS_TONE: Record<string, string> = {
  active: "bg-green-500/15 text-green-600",
  in_repair: "bg-amber-500/15 text-amber-600",
  idle: "bg-muted text-muted-foreground",
  destroyed: "bg-red-500/15 text-red-600",
};

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "bKash", "Nagad", "Rocket", "Card", "Online"];

const defaultForm = {
  name: "",
  code: "",
  category: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  purchase_price: 0,
  location: "",
  assigned_to: null as string | null,
  status: "active" as (typeof STATUSES)[number],
  payment_method: "Cash",
  notes: "",
};

export default function AssetList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["assets-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("status", "active").order("name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        category: form.category || null,
        purchase_date: form.purchase_date || null,
        purchase_price: Number(form.purchase_price) || 0,
        location: form.location.trim() || null,
        assigned_to: form.assigned_to || null,
        status: form.status,
        payment_method: form.payment_method || null,
        notes: form.notes.trim() || null,
      };

      if (editId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", editId);
        if (error) throw error;
        return { id: editId, isNew: false };
      }

      const { data, error } = await supabase.from("assets").insert(payload).select("id").single();
      if (error) throw error;
      const newId = data!.id as string;

      // Auto accounting: insert expense entry if purchase_price > 0
      if (payload.purchase_price > 0) {
        await supabase.from("expense_entries").insert({
          amount: payload.purchase_price,
          description: `Asset Purchase: ${payload.name}`,
          category: "Equipment",
          payment_method: payload.payment_method,
          reference: `asset:${newId}`,
          expense_date: payload.purchase_date,
          month: (payload.purchase_date || new Date().toISOString()).slice(0, 7),
          status: "active",
        });
      }
      return { id: newId, isNew: true };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["assets-list"] });
      qc.invalidateQueries({ queryKey: ["expense-entries"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success(
        editId
          ? "Asset আপডেট হয়েছে"
          : res.isNew && form.purchase_price > 0
            ? "Asset যোগ হয়েছে এবং Cash Book থেকে টাকা debit হয়েছে"
            : "Asset যোগ হয়েছে",
      );
      setOpen(false);
      setEditId(null);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // Reverse the linked expense entry first
      await supabase.from("expense_entries").delete().eq("reference", `asset:${id}`);
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets-list"] });
      qc.invalidateQueries({ queryKey: ["expense-entries"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success("Asset মুছে ফেলা হয়েছে এবং expense reverse হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      name: a.name || "",
      code: a.code || "",
      category: a.category || "",
      purchase_date: a.purchase_date || new Date().toISOString().slice(0, 10),
      purchase_price: Number(a.purchase_price) || 0,
      location: a.location || "",
      assigned_to: a.assigned_to || null,
      status: (a.status as any) || "active",
      payment_method: a.payment_method || "Cash",
      notes: a.notes || "",
    });
    setOpen(true);
  };

  const stats = useMemo(() => {
    const list = assets ?? [];
    return {
      total: list.length,
      value: list.reduce((s, a) => s + Number(a.purchase_price || 0), 0),
      active: list.filter((a) => a.status === "active").length,
      assigned: list.filter((a) => a.assigned_to).length,
      destroyed: list.filter((a) => a.status === "destroyed").length,
    };
  }, [assets]);

  const filtered = (assets ?? []).filter((a) => {
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.name?.toLowerCase().includes(q) && !a.code?.toLowerCase().includes(q) && !a.location?.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const empById = useMemo(() => {
    const m = new Map<string, string>();
    (employees ?? []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [employees]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Asset List</h1>
          <p className="text-muted-foreground text-sm">কোম্পানির সকল asset (Router, OLT, Generator, Vehicle ইত্যাদি)</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditId(null);
              setForm(defaultForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> নতুন Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Asset সম্পাদনা" : "নতুন Asset যোগ করুন"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">নাম *</label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="যেমন: MikroTik CCR1036" />
                </div>
                <div>
                  <label className="text-xs font-medium">কোড / সিরিয়াল</label>
                  <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="অপশনাল" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">ক্যাটাগরি</label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">স্ট্যাটাস</label>
                  <Select value={form.status} onValueChange={(v: any) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">ক্রয় তারিখ</label>
                  <Input type="date" value={form.purchase_date} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">ক্রয় মূল্য (৳)</label>
                  <Input
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_price: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">পেমেন্ট মেথড</label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">লোকেশন</label>
                  <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="যেমন: Head Office Rack 2" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">যাকে assign করা</label>
                <Select
                  value={form.assigned_to ?? "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v === "none" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কাউকে নয়</SelectItem>
                    {(employees ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">নোট</label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              {!editId && form.purchase_price > 0 && (
                <div className="text-xs p-2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  ⚡ এই asset যোগ করলে Cash Book থেকে <strong>৳{Number(form.purchase_price).toLocaleString()}</strong> debit হবে (
                  {form.payment_method})।
                </div>
              )}
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : editId ? "আপডেট" : "Asset যোগ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="মোট Asset" value={stats.total} icon={Package} tone="bg-primary/15 text-primary" />
        <StatCard label="মোট মূল্য" value={`৳${stats.value.toLocaleString()}`} icon={Wallet} tone="bg-blue-500/15 text-blue-600" />
        <StatCard label="সক্রিয়" value={stats.active} icon={CheckCircle2} tone="bg-green-500/15 text-green-600" />
        <StatCard label="Assigned" value={stats.assigned} icon={UserCheck} tone="bg-violet-500/15 text-violet-600" />
        <StatCard label="নষ্ট" value={stats.destroyed} icon={AlertOctagon} tone="bg-red-500/15 text-red-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="নাম / কোড / লোকেশন..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
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
                  <TableHead className="text-xs">নাম</TableHead>
                  <TableHead className="text-xs">কোড</TableHead>
                  <TableHead className="text-xs">ক্যাটাগরি</TableHead>
                  <TableHead className="text-xs">ক্রয় তারিখ</TableHead>
                  <TableHead className="text-xs text-right">মূল্য</TableHead>
                  <TableHead className="text-xs">লোকেশন</TableHead>
                  <TableHead className="text-xs">Assigned</TableHead>
                  <TableHead className="text-xs">স্ট্যাটাস</TableHead>
                  <TableHead className="text-xs text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      কোনো asset নেই — উপরে "নতুন Asset" বাটন দিয়ে যোগ করুন
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a, i) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs py-2">{i + 1}</TableCell>
                      <TableCell className="text-xs py-2 font-medium">{a.name}</TableCell>
                      <TableCell className="text-xs py-2 font-mono">{a.code || "-"}</TableCell>
                      <TableCell className="text-xs py-2">
                        <Badge variant="outline">{a.category || "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2">{a.purchase_date || "-"}</TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium">
                        ৳{Number(a.purchase_price || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs py-2">{a.location || "-"}</TableCell>
                      <TableCell className="text-xs py-2">{a.assigned_to ? empById.get(a.assigned_to) || "—" : "-"}</TableCell>
                      <TableCell className="text-xs py-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] ${STATUS_TONE[a.status] || ""}`}>
                          {STATUS_LABEL[a.status] || a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm(`"${a.name}" delete করবেন? Linked expense entry-ও মুছে যাবে।`)) del.mutate(a.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: any; icon: any; tone: string }) {
  return (
    <Card>
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          <p className="text-base font-semibold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
