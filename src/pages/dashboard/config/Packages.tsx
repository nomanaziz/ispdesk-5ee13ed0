import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Search, Globe, Plus, Edit, Trash2, Power, PowerOff } from "lucide-react";

const PACKAGE_TYPES = [
  { value: "home", label: "Home", color: "bg-blue-500" },
  { value: "corporate", label: "Corporate", color: "bg-orange-500" },
  { value: "business", label: "Business", color: "bg-green-600" },
  { value: "personal", label: "Personal", color: "bg-amber-500" },
  { value: "dedicated", label: "Dedicated", color: "bg-purple-600" },
  { value: "pop", label: "POP", color: "bg-indigo-500" },
];

export default function Packages() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", price: "", bandwidth: "", protocol: "", setup_fee: "", package_type: "home" });
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery({
    queryKey: ["isp-packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("isp_packages").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: protocolTypes } = useQuery({
    queryKey: ["config-protocol-types-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("protocol_types").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleHomepage = useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase.from("isp_packages").update({ show_on_homepage: show }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["isp-packages"] }); toast.success("হোমপেজ ভিজিবিলিটি আপডেট"); },
    onError: () => toast.error("আপডেট ব্যর্থ"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("isp_packages").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["isp-packages"] }); toast.success("স্ট্যাটাস আপডেট"); },
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const bw = Number(form.bandwidth) || 0;
      const data = {
        name: form.name,
        code: form.code || null,
        price: Number(form.price) || 0,
        bandwidth_down: bw,
        bandwidth_up: bw,
        protocol: form.protocol || null,
        setup_fee: Number(form.setup_fee) || 0,
        package_type: form.package_type || "home",
      };
      if (editingPkg) {
        const { error } = await supabase.from("isp_packages").update(data).eq("id", editingPkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("isp_packages").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isp-packages"] });
      toast.success(editingPkg ? "প্যাকেজ আপডেট সফল" : "প্যাকেজ যোগ করা হয়েছে");
      setDialogOpen(false); setEditingPkg(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from("isp_packages").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isp-packages"] });
      toast.success("মুছে ফেলা হয়েছে");
      setSelected(new Set()); setDeleteOpen(false);
    },
  });

  const bulkStatus = useMutation({
    mutationFn: async (status: string) => {
      for (const id of selected) {
        const { error } = await supabase.from("isp_packages").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isp-packages"] });
      toast.success("বাল্ক আপডেট সফল"); setSelected(new Set());
    },
  });

  const openAdd = () => {
    setEditingPkg(null);
    setForm({ name: "", code: "", price: "", bandwidth: "", protocol: "", setup_fee: "", package_type: "home" });
    setDialogOpen(true);
  };

  const openEdit = (pkg: any) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name, code: pkg.code || "", price: String(pkg.price),
      bandwidth: String(pkg.bandwidth_down || 0),
      protocol: pkg.protocol || "", setup_fee: String(pkg.setup_fee || 0),
      package_type: pkg.package_type || "home",
    });
    setDialogOpen(true);
  };

  const filtered = packages
    ?.filter((p) => typeFilter === "all" || p.package_type === typeFilter)
    ?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const allSelected = (filtered?.length || 0) > 0 && filtered?.every((p) => selected.has(p.id));

  const getPackageTypeBadge = (type: string | null) => {
    const pt = PACKAGE_TYPES.find(t => t.value === type) || PACKAGE_TYPES[0];
    return (
      <Badge className={`${pt.color} text-white border-0 text-xs font-semibold`}>
        {pt.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Packages</h1>
          <p className="text-sm text-muted-foreground">ISP প্যাকেজ ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> নতুন প্যাকেজ</Button>
      </div>

      {/* Package Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={typeFilter === "all" ? "default" : "outline"} onClick={() => setTypeFilter("all")}>সব</Button>
        {PACKAGE_TYPES.map((t) => (
          <Button key={t.value} size="sm" variant={typeFilter === t.value ? "default" : "outline"} onClick={() => setTypeFilter(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5" /> প্যাকেজ তালিকা</CardTitle>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => bulkStatus.mutate("active")} className="gap-1"><Power className="h-3.5 w-3.5" /> সক্রিয়</Button>
                  <Button size="sm" variant="outline" onClick={() => bulkStatus.mutate("inactive")} className="gap-1"><PowerOff className="h-3.5 w-3.5" /> নিষ্ক্রিয়</Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)} className="gap-1"><Trash2 className="h-3.5 w-3.5" /> মুছুন ({selected.size})</Button>
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
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox checked={allSelected} onCheckedChange={() => {
                        if (allSelected) setSelected(new Set());
                        else setSelected(new Set(filtered?.map((p) => p.id)));
                      }} />
                    </TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>প্যাকেজ টাইপ</TableHead>
                    <TableHead>ব্যান্ডউইথ (Mbps)</TableHead>
                    <TableHead>মূল্য (৳)</TableHead>
                    <TableHead>প্রোটোকল</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-center"><div className="flex items-center justify-center gap-1"><Globe className="h-3.5 w-3.5" /> হোমপেজ</div></TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">কোনো প্যাকেজ পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered?.map((pkg) => (
                    <TableRow key={pkg.id} className={selected.has(pkg.id) ? "bg-muted/50" : ""}>
                      <TableCell><Checkbox checked={selected.has(pkg.id)} onCheckedChange={() => {
                        const n = new Set(selected); if (n.has(pkg.id)) n.delete(pkg.id); else n.add(pkg.id); setSelected(n);
                      }} /></TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{getPackageTypeBadge(pkg.package_type)}</TableCell>
                      <TableCell>{pkg.bandwidth_down || 0} Mbps</TableCell>
                      <TableCell>{pkg.price.toLocaleString()}</TableCell>
                      <TableCell>{pkg.protocol || "—"}</TableCell>
                      <TableCell>
                        <Switch checked={pkg.status === "active"} onCheckedChange={(c) => toggleStatus.mutate({ id: pkg.id, status: c ? "active" : "inactive" })} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={pkg.show_on_homepage ?? false} onCheckedChange={(c) => toggleHomepage.mutate({ id: pkg.id, show: c })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(pkg)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setSelected(new Set([pkg.id])); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPkg ? "প্যাকেজ সম্পাদনা" : "নতুন প্যাকেজ যোগ করুন"}</DialogTitle>
            <DialogDescription>প্যাকেজের তথ্য পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-sm font-medium">নাম <span className="text-destructive">*</span></label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">কোড</label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
              <div>
                <label className="text-sm font-medium">প্যাকেজ টাইপ</label>
                <Select value={form.package_type} onValueChange={(v) => setForm({...form, package_type: v})}>
                  <SelectTrigger><SelectValue placeholder="টাইপ নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {PACKAGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">মূল্য (৳)</label><Input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} /></div>
              <div><label className="text-sm font-medium">সেটআপ ফি</label><Input type="number" value={form.setup_fee} onChange={(e) => setForm({...form, setup_fee: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">ব্যান্ডউইথ (Mbps)</label><Input type="number" value={form.bandwidth} onChange={(e) => setForm({...form, bandwidth: e.target.value})} placeholder="যেমন: 10" /></div>
              <div>
                <label className="text-sm font-medium">প্রোটোকল</label>
                <Select value={form.protocol} onValueChange={(v) => setForm({...form, protocol: v})}>
                  <SelectTrigger><SelectValue placeholder="প্রোটোকল নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {protocolTypes?.map((pt) => (
                      <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => { if (!form.name.trim()) { toast.error("নাম আবশ্যক"); return; } upsertMutation.mutate(); }} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>{selected.size}টি প্যাকেজ মুছে ফেলতে চান?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate([...selected])} disabled={deleteMutation.isPending}>মুছে ফেলুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
