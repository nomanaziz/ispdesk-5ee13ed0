import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, Search, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  parent_id: string | null;
  created_at: string;
};

const emptyForm = { name: "", description: "", parent_id: "", status: "active" };

export default function InventoryCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventory_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        parent_id: form.parent_id || null,
        status: form.status,
      };
      if (editingId) {
        const { error } = await supabase.from("inventory_categories").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_categories"] });
      toast.success(editingId ? "ক্যাটাগরি আপডেট হয়েছে" : "ক্যাটাগরি যোগ হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message || "সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_categories"] });
      toast.success("ক্যাটাগরি মুছে ফেলা হয়েছে");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message || "মুছে ফেলা যায়নি"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("inventory_categories").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory_categories"] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); };
  const openAdd = (parentId?: string) => { setEditingId(null); setForm({ ...emptyForm, parent_id: parentId || "" }); setDialogOpen(true); };
  const openEdit = (c: Category) => { setForm({ name: c.name, description: c.description || "", parent_id: c.parent_id || "", status: c.status }); setEditingId(c.id); setDialogOpen(true); };

  const parents = categories.filter(c => !c.parent_id);
  const getChildren = (pid: string) => categories.filter(c => c.parent_id === pid);

  const matches = (c: Category): boolean => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (c.name.toLowerCase().includes(s) || (c.description || "").toLowerCase().includes(s)) return true;
    return getChildren(c.id).some(matches);
  };
  const filteredParents = parents.filter(matches);

  const renderNode = (c: Category, depth: number) => {
    const children = getChildren(c.id);
    return (
      <div key={c.id}>
        <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
          <div className="flex items-center gap-2 min-w-0">
            {children.length > 0 ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{c.name}</Badge>
            {c.description && <span className="text-xs text-muted-foreground truncate">{c.description}</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch checked={c.status === "active"} onCheckedChange={(v) => toggleStatus.mutate({ id: c.id, status: v ? "active" : "inactive" })} />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openAdd(c.id)} title="সাব-ক্যাটাগরি যোগ"><Plus className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {children.length > 0 && <div className="border-l border-muted ml-4">{children.map(ch => renderNode(ch, depth + 1))}</div>}
      </div>
    );
  };

  const totalSubs = categories.length - parents.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">আইটেম ক্যাটাগরি</h1>
          <p className="text-sm text-muted-foreground">ইনভেন্টরি — ক্যাটাগরি ও সাব-ক্যাটাগরি</p>
        </div>
        <Button onClick={() => openAdd()}><Plus className="h-4 w-4 mr-2" /> ক্যাটাগরি যোগ করুন</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FolderOpen className="h-8 w-8 text-primary" /><div><p className="text-sm text-muted-foreground">প্যারেন্ট ক্যাটাগরি</p><p className="text-2xl font-bold">{parents.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-primary" /></div><div><p className="text-sm text-muted-foreground">সাব-ক্যাটাগরি</p><p className="text-2xl font-bold">{totalSubs}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><div className="h-3 w-3 rounded-full bg-muted-foreground" /></div><div><p className="text-sm text-muted-foreground">মোট</p><p className="text-2xl font-bold">{categories.length}</p></div></div></CardContent></Card>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="ক্যাটাগরি খুঁজুন..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">কোনো ক্যাটাগরি পাওয়া যায়নি</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredParents.map(p => {
            const children = getChildren(p.id);
            return (
              <Card key={p.id} className="overflow-hidden">
                <Collapsible defaultOpen={children.length > 0}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 min-w-0">
                        {children.length > 0 ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-base truncate">{p.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">{children.length}</Badge>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        <Switch checked={p.status === "active"} onCheckedChange={(v) => toggleStatus.mutate({ id: p.id, status: v ? "active" : "inactive" })} />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground pl-7">{p.description}</p>}
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {children.length > 0 ? (
                        <div className="space-y-1">{children.map(ch => renderNode(ch, 0))}</div>
                      ) : (
                        <p className="text-xs text-muted-foreground pl-2">কোনো সাব-ক্যাটাগরি নেই</p>
                      )}
                      <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs" onClick={() => openAdd(p.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle>
            <DialogDescription>নাম, বিবরণ এবং প্যারেন্ট নির্বাচন করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Fiber Optic Cable" /></div>
            <div><Label>বিবরণ</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="ঐচ্ছিক বিবরণ" /></div>
            <div>
              <Label>প্যারেন্ট ক্যাটাগরি</Label>
              <Select value={form.parent_id || "none"} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="কোনোটি নয় (মূল ক্যাটাগরি)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">কোনোটি নয় (মূল ক্যাটাগরি)</SelectItem>
                  {categories.filter(c => c.id !== editingId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.parent_id ? "↳ " : ""}{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>স্ট্যাটাস</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>এই ক্যাটাগরি এবং সব সাব-ক্যাটাগরি মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
