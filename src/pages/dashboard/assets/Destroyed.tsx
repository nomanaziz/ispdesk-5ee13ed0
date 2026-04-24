import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Trash2, AlertOctagon, TrendingDown, CalendarDays } from "lucide-react";

const defaultForm = {
  source: "asset" as "asset" | "custom",
  asset_id: null as string | null,
  item_name: "",
  destroy_date: new Date().toISOString().slice(0, 10),
  reason: "",
  loss_amount: 0,
};

export default function Destroyed() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["destroyed-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destroyed_items").select("*").order("destroy_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: availableAssets } = useQuery({
    queryKey: ["destroyed-available-assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("assets")
        .select("id, name, code, purchase_price, status")
        .neq("status", "destroyed")
        .order("name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const isAsset = form.source === "asset" && !!form.asset_id;
      let itemName = form.item_name.trim();

      if (isAsset) {
        const a = availableAssets?.find((x) => x.id === form.asset_id);
        if (!a) throw new Error("Asset পাওয়া যায়নি");
        itemName = a.name;
      }
      if (!itemName) throw new Error("Item name দিন");

      // 1) Insert destroyed_items row
      const { data: created, error } = await supabase
        .from("destroyed_items")
        .insert({
          asset_id: isAsset ? form.asset_id : null,
          item_name: itemName,
          destroy_date: form.destroy_date,
          reason: form.reason.trim() || null,
          loss_amount: Number(form.loss_amount) || 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      const newId = created!.id as string;

      // 2) Mark linked asset as destroyed
      if (isAsset && form.asset_id) {
        await supabase.from("assets").update({ status: "destroyed" }).eq("id", form.asset_id);
      }

      // 3) Auto accounting: book a loss/write-off
      const loss = Number(form.loss_amount) || 0;
      if (loss > 0) {
        await supabase.from("expense_entries").insert({
          amount: loss,
          description: `Destroyed: ${itemName}${form.reason ? ` — ${form.reason}` : ""}`,
          category: "Loss / Write-off",
          payment_method: "Adjustment",
          reference: `destroyed:${newId}`,
          expense_date: form.destroy_date,
          month: form.destroy_date.slice(0, 7),
          status: "active",
        });
      }
      return { loss };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["destroyed-items"] });
      qc.invalidateQueries({ queryKey: ["destroyed-available-assets"] });
      qc.invalidateQueries({ queryKey: ["assets-list"] });
      qc.invalidateQueries({ queryKey: ["expense-entries"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success(
        res.loss > 0
          ? `নষ্ট হিসাবে save হয়েছে — ৳${res.loss.toLocaleString()} loss ব্যয়ে যোগ হয়েছে`
          : "নষ্ট হিসাবে save হয়েছে",
      );
      setOpen(false);
      setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (row: any) => {
      // 1) reverse expense
      await supabase.from("expense_entries").delete().eq("reference", `destroyed:${row.id}`);
      // 2) revert asset status if linked
      if (row.asset_id) {
        await supabase.from("assets").update({ status: "active" }).eq("id", row.asset_id);
      }
      // 3) delete row
      const { error } = await supabase.from("destroyed_items").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destroyed-items"] });
      qc.invalidateQueries({ queryKey: ["destroyed-available-assets"] });
      qc.invalidateQueries({ queryKey: ["assets-list"] });
      qc.invalidateQueries({ queryKey: ["expense-entries"] });
      qc.invalidateQueries({ queryKey: ["accounting-dashboard"] });
      toast.success("Entry মুছেছে — Asset ও expense restore হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = items ?? [];
    const monthStart = new Date().toISOString().slice(0, 7);
    return {
      total: list.length,
      loss: list.reduce((s, x) => s + Number(x.loss_amount || 0), 0),
      thisMonth: list.filter((x) => (x.destroy_date || "").startsWith(monthStart)).length,
    };
  }, [items]);

  const filtered = (items ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.item_name?.toLowerCase().includes(q) || e.reason?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Destroyed Items</h1>
          <p className="text-muted-foreground text-sm">নষ্ট/বাতিল হওয়া asset, ONU, cable ইত্যাদির log</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setForm(defaultForm);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> নতুন Destroyed Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>নষ্ট হওয়া item add করুন</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={form.source === "asset" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, source: "asset" }))}
                >
                  Existing Asset
                </Button>
                <Button
                  variant={form.source === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, source: "custom", asset_id: null }))}
                >
                  Custom Item (যেমন ONU/Cable)
                </Button>
              </div>

              {form.source === "asset" ? (
                <div>
                  <label className="text-xs font-medium">Asset নির্বাচন</label>
                  <Select
                    value={form.asset_id ?? ""}
                    onValueChange={(v) => {
                      const a = availableAssets?.find((x) => x.id === v);
                      setForm((f) => ({
                        ...f,
                        asset_id: v,
                        item_name: a?.name ?? "",
                        loss_amount: f.loss_amount || Number(a?.purchase_price || 0),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Asset বাছাই করুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableAssets ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a.code ? `(${a.code})` : ""} — ৳{Number(a.purchase_price || 0).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">এই asset-এর status "নষ্ট" হয়ে যাবে।</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium">Item Name *</label>
                  <Input
                    value={form.item_name}
                    onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                    placeholder="যেমন: 50m Drop Cable, ONU SN12345"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">নষ্ট হওয়ার তারিখ</label>
                  <Input type="date" value={form.destroy_date} onChange={(e) => setForm((f) => ({ ...f, destroy_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium">ক্ষতি মূল্য (৳)</label>
                  <Input
                    type="number"
                    value={form.loss_amount}
                    onChange={(e) => setForm((f) => ({ ...f, loss_amount: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">কারণ</label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  placeholder="যেমন: বজ্রপাতে নষ্ট, পানি ঢুকে গেছে, অপারেশনাল ক্ষতি..."
                />
              </div>

              {form.loss_amount > 0 && (
                <div className="text-xs p-2 rounded-md bg-red-500/10 text-red-700 dark:text-red-400">
                  ⚠️ <strong>৳{Number(form.loss_amount).toLocaleString()}</strong> "Loss / Write-off" হিসেবে accounting-এ book হবে (P&L এ
                  loss দেখাবে, cash flow হবে না)।
                </div>
              )}

              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || (form.source === "asset" ? !form.asset_id : !form.item_name.trim())}
              >
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="মোট Destroyed" value={stats.total} icon={AlertOctagon} tone="bg-red-500/15 text-red-600" />
        <StatCard label="মোট ক্ষতি" value={`৳${stats.loss.toLocaleString()}`} icon={TrendingDown} tone="bg-rose-500/15 text-rose-600" />
        <StatCard label="এই মাসে" value={stats.thisMonth} icon={CalendarDays} tone="bg-amber-500/15 text-amber-600" />
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8 max-w-md" placeholder="item / কারণ খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">তারিখ</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">কারণ</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs text-right">ক্ষতি (৳)</TableHead>
                  <TableHead className="text-xs text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      কোনো destroyed item নেই
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((e, i) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs py-2">{i + 1}</TableCell>
                      <TableCell className="text-xs py-2">{e.destroy_date || "-"}</TableCell>
                      <TableCell className="text-xs py-2 font-medium">{e.item_name}</TableCell>
                      <TableCell className="text-xs py-2 max-w-xs truncate" title={e.reason || ""}>
                        {e.reason || "-"}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            e.asset_id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {e.asset_id ? "Asset" : "Custom"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right font-medium text-red-600">
                        ৳{Number(e.loss_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm("এই entry মুছবেন? Asset status restore হবে এবং loss expense reverse হবে।")) del.mutate(e);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
