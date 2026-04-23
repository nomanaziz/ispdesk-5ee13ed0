import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Package, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function Items() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", category_id: "", provider_id: "", bandwidth: "", price: "", description: "", default_vat_pct: "5" });
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["bw_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_items").select("*, bw_categories(name), bw_providers(name)").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["bw_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_categories").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: providers } = useQuery({
    queryKey: ["bw_providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_providers").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        name: data.name,
        category_id: data.category_id || null,
        provider_id: data.provider_id || null,
        bandwidth: data.bandwidth || null,
        price: data.price ? Number(data.price) : null,
        description: data.description || null,
        default_vat_pct: Number(data.default_vat_pct ?? 5),
      };
      if (editingItem) {
        const { error } = await supabase.from("bw_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_items"] });
      toast.success(editingItem ? "আপডেট সফল হয়েছে" : "সফলভাবে যোগ করা হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_items"] });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      setDeleteDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bw_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_items"] });
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditingItem(null); setFormData({ name: "", category_id: "", provider_id: "", bandwidth: "", price: "", description: "", default_vat_pct: "5" }); };

  const openAdd = (categoryId?: string) => {
    setEditingItem(null);
    setFormData({ name: "", category_id: categoryId || "", provider_id: "", bandwidth: "", price: "", description: "", default_vat_pct: "5" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      category_id: item.category_id || "",
      provider_id: item.provider_id || "",
      bandwidth: item.bandwidth || "",
      price: item.price?.toString() || "",
      description: item.description || "",
      default_vat_pct: (item.default_vat_pct ?? 5).toString(),
    });
    setDialogOpen(true);
  };

  // Group items by category
  const grouped = (categories || []).map(cat => ({
    ...cat,
    items: (items || []).filter((item: any) => item.category_id === cat.id)
      .filter((item: any) => !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.bandwidth || "").toLowerCase().includes(search.toLowerCase())),
  })).filter(g => !search || g.items.length > 0);

  const uncategorized = (items || []).filter((item: any) => !item.category_id)
    .filter((item: any) => !search || item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ব্যান্ডউইথ আইটেম</h1>
          <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — আইটেম ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন আইটেম
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="আইটেম অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.id}>
              <Collapsible defaultOpen>
                <CardHeader className="pb-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <Badge variant="secondary">{group.items.length} আইটেম</Badge>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {group.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">এই ক্যাটাগরিতে কোনো আইটেম নেই</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>নাম</TableHead>
                              <TableHead>প্রোভাইডার</TableHead>
                              <TableHead>ব্যান্ডউইথ</TableHead>
                              <TableHead>মূল্য</TableHead>
                              <TableHead>স্ট্যাটাস</TableHead>
                              <TableHead className="text-right">অ্যাকশন</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.bw_providers?.name || "—"}</TableCell>
                                <TableCell>{item.bandwidth || "—"}</TableCell>
                                <TableCell>{item.price ? `৳${item.price.toLocaleString()}` : "—"}</TableCell>
                                <TableCell>
                                  <Switch checked={item.status === "active"} onCheckedChange={(c) => toggleStatus.mutate({ id: item.id, status: c ? "active" : "inactive" })} />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(item.id); setDeleteDialogOpen(true); }}>
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
                    <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => openAdd(group.id)}>
                      <Plus className="h-3 w-3" /> আইটেম যোগ করুন
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}

          {uncategorized.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" /> অশ্রেণীবদ্ধ
                  <Badge variant="secondary">{uncategorized.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>নাম</TableHead>
                        <TableHead>প্রোভাইডার</TableHead>
                        <TableHead>ব্যান্ডউইথ</TableHead>
                        <TableHead>মূল্য</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead className="text-right">অ্যাকশন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uncategorized.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.bw_providers?.name || "—"}</TableCell>
                          <TableCell>{item.bandwidth || "—"}</TableCell>
                          <TableCell>{item.price ? `৳${item.price.toLocaleString()}` : "—"}</TableCell>
                          <TableCell>
                            <Switch checked={item.status === "active"} onCheckedChange={(c) => toggleStatus.mutate({ id: item.id, status: c ? "active" : "inactive" })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(item.id); setDeleteDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "আইটেম সম্পাদনা" : "নতুন আইটেম"}</DialogTitle>
            <DialogDescription>নিচের ফর্মটি পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">নাম <span className="text-destructive">*</span></label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="আইটেম নাম" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ক্যাটাগরি</label>
                <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনোটি নয়</SelectItem>
                    {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">প্রোভাইডার</label>
                <Select value={formData.provider_id} onValueChange={(v) => setFormData({ ...formData, provider_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনোটি নয়</SelectItem>
                    {(providers || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ব্যান্ডউইথ</label>
                <Input value={formData.bandwidth} onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })} placeholder="e.g. 100 Mbps" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">মূল্য (৳)</label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ডিফল্ট VAT %</label>
                <Input type="number" step="0.01" value={formData.default_vat_pct} onChange={(e) => setFormData({ ...formData, default_vat_pct: e.target.value })} placeholder="5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">বিবরণ</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="বিবরণ লিখুন..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => { if (!formData.name.trim()) { toast.error("নাম আবশ্যক"); return; } upsertMutation.mutate(formData); }} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>আপনি কি নিশ্চিত? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
