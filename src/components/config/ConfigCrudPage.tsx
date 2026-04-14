import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Power, PowerOff, Settings } from "lucide-react";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "select" | "color";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ConfigCrudPageProps {
  title: string;
  tableName: string;
  queryKey: string;
  fields: FieldConfig[];
  extraColumns?: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  onStatusToggle?: (id: string, newStatus: string, row: any) => Promise<void>;
  filterComponent?: React.ReactNode;
  filterFn?: (row: any) => boolean;
  fetchQuery?: () => Promise<any[]>;
}

export default function ConfigCrudPage({
  title,
  tableName,
  queryKey,
  fields,
  extraColumns = [],
  onStatusToggle,
  filterComponent,
  filterFn,
  fetchQuery,
}: ConfigCrudPageProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchQuery || (async () => {
      const { data, error } = await supabase.from(tableName as any).select("*").order("name");
      if (error) throw error;
      return data;
    }),
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (editingItem) {
        const { error } = await supabase.from(tableName as any).update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableName as any).insert(data as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(editingItem ? "আপডেট সফল হয়েছে" : "সফলভাবে যোগ করা হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from(tableName as any).delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      setSelected(new Set());
      setDeleteDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি হয়েছে"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status, row }: { id: string; status: string; row: any }) => {
      if (onStatusToggle) {
        await onStatusToggle(id, status, row);
      } else {
        const { error } = await supabase.from(tableName as any).update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি হয়েছে"),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      for (const id of selected) {
        if (onStatusToggle) {
          const row = items?.find((item: any) => item.id === id);
          await onStatusToggle(id, status, row);
        } else {
          const { error } = await supabase.from(tableName as any).update({ status }).eq("id", id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success("বাল্ক আপডেট সফল হয়েছে");
      setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message || "ত্রুটি হয়েছে"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const openAdd = () => {
    setEditingItem(null);
    const defaults: Record<string, string> = {};
    fields.forEach((f) => (defaults[f.key] = ""));
    setFormData(defaults);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    const data: Record<string, string> = {};
    fields.forEach((f) => (data[f.key] = item[f.key] ?? ""));
    setFormData(data);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const requiredMissing = fields.filter((f) => f.required && !formData[f.key]?.trim());
    if (requiredMissing.length > 0) {
      toast.error(`${requiredMissing[0].label} আবশ্যক`);
      return;
    }
    upsertMutation.mutate(formData);
  };

  const filtered = (items || [])
    .filter((item: any) => filterFn ? filterFn(item) : true)
    .filter((item: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return fields.some((f) => String(item[f.key] || "").toLowerCase().includes(s));
    });

  const allSelected = filtered.length > 0 && filtered.every((item: any) => selected.has(item.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((item: any) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">Configuration — {title} ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন যোগ করুন
        </Button>
      </div>

      {filterComponent}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" /> {title} তালিকা
              {items && <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate("active")} className="gap-1">
                    <Power className="h-3.5 w-3.5" /> সক্রিয়
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => bulkStatusMutation.mutate("inactive")} className="gap-1">
                    <PowerOff className="h-3.5 w-3.5" /> নিষ্ক্রিয়
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> মুছুন ({selected.size})
                  </Button>
                </div>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                    {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
                    {extraColumns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={fields.length + extraColumns.length + 3} className="text-center text-muted-foreground py-8">
                        কোনো তথ্য পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((item: any) => (
                    <TableRow key={item.id} className={selected.has(item.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </TableCell>
                      {fields.map((f) => (
                        <TableCell key={f.key}>
                          {f.type === "color" ? (
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded border" style={{ backgroundColor: item[f.key] || "#000" }} />
                              <span className="text-sm">{item[f.key]}</span>
                            </div>
                          ) : f.options ? (
                            f.options.find((o) => o.value === item[f.key])?.label || item[f.key] || "—"
                          ) : (
                            item[f.key] || "—"
                          )}
                        </TableCell>
                      ))}
                      {extraColumns.map((c) => (
                        <TableCell key={c.key}>{c.render ? c.render(item) : item[c.key] || "—"}</TableCell>
                      ))}
                      <TableCell>
                        <Switch
                          checked={item.status === "active"}
                          onCheckedChange={(checked) =>
                            toggleStatus.mutate({ id: item.id, status: checked ? "active" : "inactive", row: item })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              setSelected(new Set([item.id]));
                              setDeleteDialogOpen(true);
                            }}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? `${title} সম্পাদনা` : `নতুন ${title} যোগ করুন`}</DialogTitle>
            <DialogDescription>নিচের ফর্মটি পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-sm font-medium">{f.label} {f.required && <span className="text-destructive">*</span>}</label>
                {f.type === "select" && f.options ? (
                  <Select value={formData[f.key] || ""} onValueChange={(v) => setFormData({ ...formData, [f.key]: v })}>
                    <SelectTrigger><SelectValue placeholder={f.placeholder || "নির্বাচন করুন"} /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "color" ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData[f.key] || "#000000"}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input value={formData[f.key] || ""} onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })} placeholder="#000000" />
                  </div>
                ) : (
                  <Input
                    value={formData[f.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    placeholder={f.placeholder || f.label}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>আপনি কি নিশ্চিত যে আপনি {selected.size}টি আইটেম মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate([...selected])} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
