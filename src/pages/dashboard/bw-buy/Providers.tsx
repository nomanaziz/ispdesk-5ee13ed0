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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, Search, Trash2, Edit, Building2, Upload } from "lucide-react";

export default function Providers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ name: "", contact: "", email: "", mobile: "", address: "" });
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["bw_providers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_providers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get balance due per provider
  const { data: billTotals } = useQuery({
    queryKey: ["bw_provider_balances"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_purchase_bills").select("provider_id, amount, paid");
      if (error) throw error;
      const totals: Record<string, { amount: number; paid: number }> = {};
      (data || []).forEach((b: any) => {
        if (!b.provider_id) return;
        if (!totals[b.provider_id]) totals[b.provider_id] = { amount: 0, paid: 0 };
        totals[b.provider_id].amount += Number(b.amount || 0);
        totals[b.provider_id].paid += Number(b.paid || 0);
      });
      return totals;
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("bw-provider-logos").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("bw-provider-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      let logo_url = editingItem?.logo_url || null;
      if (logoFile) {
        logo_url = await uploadLogo(logoFile);
      }
      const payload = { name: data.name, contact: data.contact || null, email: data.email || null, mobile: data.mobile || null, address: data.address || null, logo_url };
      if (editingItem) {
        const { error } = await supabase.from("bw_providers").update(payload).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bw_providers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_providers"] });
      toast.success(editingItem ? "আপডেট সফল হয়েছে" : "সফলভাবে যোগ করা হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_providers"] });
      toast.success("সফলভাবে মুছে ফেলা হয়েছে");
      setDeleteDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bw_providers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bw_providers"] }),
  });

  const closeDialog = () => { setDialogOpen(false); setEditingItem(null); setLogoFile(null); setFormData({ name: "", contact: "", email: "", mobile: "", address: "" }); };

  const openAdd = () => { setEditingItem(null); setLogoFile(null); setFormData({ name: "", contact: "", email: "", mobile: "", address: "" }); setDialogOpen(true); };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setLogoFile(null);
    setFormData({ name: item.name || "", contact: item.contact || "", email: item.email || "", mobile: item.mobile || "", address: item.address || "" });
    setDialogOpen(true);
  };

  const filtered = (providers || []).filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.contact || "").toLowerCase().includes(s) || (p.email || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">প্রোভাইডার</h1>
          <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — প্রোভাইডার ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> নতুন প্রোভাইডার</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> প্রোভাইডার তালিকা
              <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">লোগো</TableHead>
                    <TableHead>কোম্পানি</TableHead>
                    <TableHead>যোগাযোগ</TableHead>
                    <TableHead>ইমেইল</TableHead>
                    <TableHead>মোবাইল</TableHead>
                    <TableHead>বকেয়া</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো প্রোভাইডার পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered.map((p: any) => {
                    const bal = billTotals?.[p.id];
                    const due = bal ? bal.amount - bal.paid : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.logo_url} />
                            <AvatarFallback className="text-xs">{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.contact || "—"}</TableCell>
                        <TableCell>{p.email || "—"}</TableCell>
                        <TableCell>{p.mobile || "—"}</TableCell>
                        <TableCell>
                          {due > 0 ? (
                            <Badge variant="destructive">৳{due.toLocaleString()}</Badge>
                          ) : (
                            <Badge variant="secondary">৳0</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={p.status === "active"} onCheckedChange={(c) => toggleStatus.mutate({ id: p.id, status: c ? "active" : "inactive" })} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <DialogTitle>{editingItem ? "প্রোভাইডার সম্পাদনা" : "নতুন প্রোভাইডার"}</DialogTitle>
            <DialogDescription>নিচের ফর্মটি পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">লোগো</label>
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={logoFile ? URL.createObjectURL(logoFile) : editingItem?.logo_url} />
                  <AvatarFallback><Upload className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="max-w-[200px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">কোম্পানির নাম <span className="text-destructive">*</span></label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="কোম্পানির নাম" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">যোগাযোগকারী</label>
                <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="যোগাযোগকারী নাম" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">মোবাইল</label>
                <Input value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} placeholder="মোবাইল নম্বর" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ইমেইল</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ইমেইল" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ঠিকানা</label>
              <Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="ঠিকানা" rows={2} />
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
