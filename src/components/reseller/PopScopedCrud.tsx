import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Settings } from "lucide-react";

export interface PopFieldConfig {
  key: string;
  label: string;
  type?: "text" | "select" | "number" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  tableName: string;
  /** column on the row that links it to the POP — usually "branch_id" */
  scopeColumn?: string;
  /** Extra static fields to merge into every insert (e.g. { created_by_pop: true }) */
  insertExtras?: Record<string, any>;
  fields: PopFieldConfig[];
  searchKeys?: string[];
}

/**
 * Generic CRUD page for POP-scoped (reseller portal) configuration tables.
 * Automatically filters queries by branch_id and forces inserts to belong
 * to the current POP. If the logged-in POP has no branch_id assigned,
 * the page shows a helpful banner instead of silently leaking data.
 */
export default function PopScopedCrud({
  title,
  subtitle,
  tableName,
  scopeColumn = "branch_id",
  insertExtras = {},
  fields,
  searchKeys = ["name"],
}: Props) {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data, isLoading } = useQuery({
    queryKey: [`pop-${tableName}`, branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName as any)
        .select("*")
        .eq(scopeColumn, branchId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form, [scopeColumn]: branchId, ...insertExtras };
      if (editing) {
        const { error } = await supabase.from(tableName as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`pop-${tableName}`, branchId] });
      toast.success(editing ? "আপডেট সফল" : "যোগ করা হয়েছে");
      setOpen(false);
      setEditing(null);
      setForm({});
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tableName as any).delete().eq("id", id).eq(scopeColumn, branchId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`pop-${tableName}`, branchId] });
      toast.success("মুছে ফেলা হয়েছে");
      setDelOpen(false);
      setDelId(null);
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from(tableName as any).update({ status }).eq("id", id).eq(scopeColumn, branchId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`pop-${tableName}`, branchId] }),
  });

  if (!branchId) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <h2 className="text-lg font-semibold">এই POP-এর জন্য branch assign করা নেই</h2>
          <p className="text-sm text-muted-foreground">
            Admin panel → POP Manager → এই POP-এ একটি branch assign করুন।
          </p>
        </CardContent>
      </Card>
    );
  }

  const filtered = (data || []).filter((row: any) =>
    !search ||
    searchKeys.some((k) => String(row[k] || "").toLowerCase().includes(search.toLowerCase())),
  );

  const openAdd = () => {
    setEditing(null);
    const init: Record<string, any> = {};
    fields.forEach((f) => (init[f.key] = ""));
    setForm(init);
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    const init: Record<string, any> = {};
    fields.forEach((f) => (init[f.key] = row[f.key] ?? ""));
    setForm(init);
    setOpen(true);
  };

  const submit = () => {
    const missing = fields.find((f) => f.required && !String(form[f.key] || "").trim());
    if (missing) {
      toast.error(`${missing.label} আবশ্যক`);
      return;
    }
    upsert.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন যোগ করুন
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" /> {title} তালিকা
              {data && <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="অনুসন্ধান..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={fields.length + 2} className="text-center text-muted-foreground py-8">
                        কোনো তথ্য নেই
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((row: any) => (
                    <TableRow key={row.id}>
                      {fields.map((f) => (
                        <TableCell key={f.key}>
                          {f.options
                            ? f.options.find((o) => o.value === row[f.key])?.label || row[f.key] || "—"
                            : row[f.key] ?? "—"}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Switch
                          checked={row.status === "active"}
                          onCheckedChange={(c) =>
                            toggleStatus.mutate({ id: row.id, status: c ? "active" : "inactive" })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => { setDelId(row.id); setDelOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `${title} সম্পাদনা` : `নতুন ${title}`}</DialogTitle>
            <DialogDescription>নিচের ফর্মটি পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium">
                  {f.label} {f.required && <span className="text-destructive">*</span>}
                </label>
                {f.type === "select" && f.options ? (
                  <Select
                    value={form[f.key] || ""}
                    onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                  >
                    <SelectTrigger><SelectValue placeholder={f.placeholder || "নির্বাচন করুন"} /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder || f.label}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={submit} disabled={upsert.isPending}>
              {upsert.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলবেন?</DialogTitle>
            <DialogDescription>এই কাজটি আর ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>বাতিল</Button>
            <Button
              variant="destructive"
              onClick={() => delId && remove.mutate(delId)}
              disabled={remove.isPending}
            >
              মুছে ফেলুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
