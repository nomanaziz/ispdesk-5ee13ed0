import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Category {
  id: string;
  name: string;
  status: string;
  parent_id: string | null;
  created_at: string;
}

export default function Categories() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", parent_id: "" });
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["bw_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: { name: string; parent_id: string | null }) => {
      const payload = { name: data.name, parent_id: data.parent_id || null };
      if (editingItem) {
        const { error } = await supabase.from("bw_categories").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_categories"] });
      toast.success(editingItem ? "আপডেট সফল হয়েছে" : "সফলভাবে যোগ করা হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_categories"] });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      setDeleteDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bw_categories").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_categories"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const closeDialog = () => { setDialogOpen(false); setEditingItem(null); setFormData({ name: "", parent_id: "" }); };

  const openAdd = (parentId?: string) => {
    setEditingItem(null);
    setFormData({ name: "", parent_id: parentId || "" });
    setDialogOpen(true);
  };

  const openEdit = (item: Category) => {
    setEditingItem(item);
    setFormData({ name: item.name, parent_id: item.parent_id || "" });
    setDialogOpen(true);
  };

  const parentCategories = (categories || []).filter(c => !c.parent_id);
  const getChildren = (parentId: string) => (categories || []).filter(c => c.parent_id === parentId);
  const orphanItems = (categories || []).filter(c => c.parent_id && !parentCategories.find(p => p.id === c.parent_id));

  const filtered = parentCategories.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    const children = getChildren(c.id);
    return c.name.toLowerCase().includes(s) || children.some(ch => ch.name.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">আইটেম ক্যাটাগরি</h1>
          <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — ক্যাটাগরি ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => openAdd()} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন ক্যাটাগরি
        </Button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ক্যাটাগরি অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => {
            const children = getChildren(cat.id);
            return (
              <Card key={cat.id} className="overflow-hidden">
                <Collapsible defaultOpen={children.length > 0}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70">
                          {children.length > 0 ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{cat.name}</CardTitle>
                        </CollapsibleTrigger>
                        <Badge variant="secondary" className="text-xs">{children.length}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={cat.status === "active"}
                          onCheckedChange={(checked) => toggleStatus.mutate({ id: cat.id, status: checked ? "active" : "inactive" })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(cat.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {children.length > 0 ? (
                        <div className="space-y-2 pl-6 border-l-2 border-muted ml-2">
                          {children.map((child) => (
                            <div key={child.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Badge variant={child.status === "active" ? "default" : "secondary"} className="text-xs">
                                  {child.name}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={child.status === "active"}
                                  onCheckedChange={(checked) => toggleStatus.mutate({ id: child.id, status: checked ? "active" : "inactive" })}
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(child)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(child.id); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pl-7">কোনো সাব-ক্যাটাগরি নেই</p>
                      )}
                      <Button variant="ghost" size="sm" className="mt-2 ml-5 gap-1 text-xs" onClick={() => openAdd(cat.id)}>
                        <Plus className="h-3 w-3" /> সাব-ক্যাটাগরি যোগ করুন
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle>
            <DialogDescription>নিচের ফর্মটি পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">নাম <span className="text-destructive">*</span></label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ক্যাটাগরি নাম" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">প্যারেন্ট ক্যাটাগরি</label>
              <Select value={formData.parent_id} onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="কোনোটি নয় (মূল ক্যাটাগরি)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">কোনোটি নয় (মূল ক্যাটাগরি)</SelectItem>
                  {parentCategories.filter(p => p.id !== editingItem?.id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => { if (!formData.name.trim()) { toast.error("নাম আবশ্যক"); return; } upsertMutation.mutate({ name: formData.name, parent_id: formData.parent_id || null }); }} disabled={upsertMutation.isPending}>
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
