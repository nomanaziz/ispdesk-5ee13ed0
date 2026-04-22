import { useState, useMemo } from "react";
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
import { Plus, Search, Trash2, Edit, Power, PowerOff, Settings, MapPin } from "lucide-react";
import { usePopScope } from "@/hooks/usePopScope";

export default function Zones() {
  const { isPopMode, branchId } = usePopScope();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", division_id: "", district_id: "", upazila_id: "" });
  const queryClient = useQueryClient();

  const { data: zones, isLoading } = useQuery({
    queryKey: ["config-zones", isPopMode && branchId ? branchId : "all"],
    queryFn: async () => {
      let q: any = supabase.from("zones").select("*, divisions(name), districts(name), upazilas(name)").order("name");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions } = useQuery({
    queryKey: ["divisions-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allDistricts } = useQuery({
    queryKey: ["districts-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("districts").select("id, name, division_id").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: allUpazilas } = useQuery({
    queryKey: ["upazilas-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("upazilas").select("id, name, district_id").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredDistricts = useMemo(() =>
    form.division_id ? allDistricts?.filter(d => d.division_id === form.division_id) : allDistricts,
    [form.division_id, allDistricts]
  );

  const filteredUpazilas = useMemo(() =>
    form.district_id ? allUpazilas?.filter(u => u.district_id === form.district_id) : allUpazilas,
    [form.district_id, allUpazilas]
  );

  const upsertMutation = useMutation({
    mutationFn: async () => {
      // Auto-generate a code if user left it blank — DB requires NOT NULL.
      const autoCode = () => {
        const slug = (form.name || "ZONE")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "")
          .slice(0, 6) || "ZONE";
        return `${slug}-${Date.now().toString().slice(-5)}`;
      };
      const data: any = {
        name: form.name,
        code: form.code?.trim() ? form.code.trim() : autoCode(),
        description: form.description || null,
        division_id: form.division_id || null,
        district_id: form.district_id || null,
        upazila_id: form.upazila_id || null,
      };
      if (isPopMode && branchId) data.branch_id = branchId;
      if (editingItem) {
        const { error } = await supabase.from("zones").update(data).eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("zones").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-zones"] });
      toast.success(editingItem ? "জোন আপডেট সফল" : "জোন যোগ করা হয়েছে");
      setDialogOpen(false);
      setEditingItem(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;

      const { data: zoneSubZones, error: subZonesError } = await supabase
        .from("sub_zones")
        .select("id")
        .in("zone_id", ids);
      if (subZonesError) throw subZonesError;

      const subZoneIds = zoneSubZones?.map((subZone) => subZone.id) ?? [];

      const { count: zoneClientCount, error: zoneClientError } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .in("zone_id", ids);
      if (zoneClientError) throw zoneClientError;

      let subZoneClientCount = 0;
      if (subZoneIds.length > 0) {
        const { count, error } = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .in("sub_zone_id", subZoneIds);
        if (error) throw error;
        subZoneClientCount = count ?? 0;
      }

      const { count: branchManagerCount, error: branchManagerError } = await supabase
        .from("branch_managers")
        .select("id", { count: "exact", head: true })
        .in("zone_id", ids);
      if (branchManagerError) throw branchManagerError;

      if ((zoneClientCount ?? 0) > 0 || subZoneClientCount > 0 || (branchManagerCount ?? 0) > 0) {
        throw new Error("নির্বাচিত zone এখনও client বা POP assignment-এ ব্যবহৃত হচ্ছে, তাই delete করা যাচ্ছে না।");
      }

      const { error: boxesZoneError } = await supabase.from("boxes").update({ zone_id: null }).in("zone_id", ids);
      if (boxesZoneError) throw boxesZoneError;

      const { error: supportTicketsError } = await supabase.from("support_tickets").update({ zone_id: null }).in("zone_id", ids);
      if (supportTicketsError) throw supportTicketsError;

      const { error: clientNoticesError } = await supabase.from("client_notices").update({ zone_id: null }).in("zone_id", ids);
      if (clientNoticesError) throw clientNoticesError;

      const { error: clientRequestsZoneError } = await supabase.from("client_requests").update({ zone_id: null }).in("zone_id", ids);
      if (clientRequestsZoneError) throw clientRequestsZoneError;

      if (subZoneIds.length > 0) {
        const { error: boxesSubZoneError } = await supabase.from("boxes").update({ sub_zone_id: null }).in("sub_zone_id", subZoneIds);
        if (boxesSubZoneError) throw boxesSubZoneError;

        const { error: clientRequestsSubZoneError } = await supabase.from("client_requests").update({ subzone_id: null }).in("subzone_id", subZoneIds);
        if (clientRequestsSubZoneError) throw clientRequestsSubZoneError;

        const { error: subZoneDeleteError } = await supabase.from("sub_zones").delete().in("id", subZoneIds);
        if (subZoneDeleteError) throw subZoneDeleteError;
      }

      const { error } = await supabase.from("zones").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-zones"] });
      queryClient.invalidateQueries({ queryKey: ["config-zones-options"] });
      queryClient.invalidateQueries({ queryKey: ["config-sub-zones-options"] });
      toast.success("মুছে ফেলা হয়েছে");
      setSelected(new Set());
      setDeleteOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("zones").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-zones"] });
      toast.success("স্ট্যাটাস আপডেট");
    },
  });

  const bulkStatus = useMutation({
    mutationFn: async (status: string) => {
      for (const id of selected) {
        const { error } = await supabase.from("zones").update({ status }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-zones"] });
      toast.success("বাল্ক আপডেট সফল");
      setSelected(new Set());
    },
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ name: "", code: "", description: "", division_id: "", district_id: "", upazila_id: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      code: item.code || "",
      description: item.description || "",
      division_id: item.division_id || "",
      district_id: item.district_id || "",
      upazila_id: item.upazila_id || "",
    });
    setDialogOpen(true);
  };

  const filtered = zones?.filter((z: any) =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    (z.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = (filtered?.length || 0) > 0 && filtered?.every((z: any) => selected.has(z.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">জোন (Zone)</h1>
          <p className="text-sm text-muted-foreground">জোন ম্যানেজমেন্ট — বিভাগ, জেলা ও উপজেলা সহ</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> নতুন জোন</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" /> জোন তালিকা
              {zones && <Badge variant="secondary" className="ml-2">{filtered?.length || 0}</Badge>}
            </CardTitle>
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
                        else setSelected(new Set(filtered?.map((z: any) => z.id)));
                      }} />
                    </TableHead>
                    <TableHead>জোনের নাম</TableHead>
                    <TableHead>কোড</TableHead>
                    <TableHead>বিভাগ</TableHead>
                    <TableHead>জেলা</TableHead>
                    <TableHead>উপজেলা</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো জোন পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered?.map((zone: any) => (
                    <TableRow key={zone.id} className={selected.has(zone.id) ? "bg-muted/50" : ""}>
                      <TableCell><Checkbox checked={selected.has(zone.id)} onCheckedChange={() => {
                        const n = new Set(selected); if (n.has(zone.id)) n.delete(zone.id); else n.add(zone.id); setSelected(n);
                      }} /></TableCell>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>{zone.code || "—"}</TableCell>
                      <TableCell>{zone.divisions?.name || "—"}</TableCell>
                      <TableCell>{zone.districts?.name || "—"}</TableCell>
                      <TableCell>{zone.upazilas?.name || "—"}</TableCell>
                      <TableCell>
                        <Switch checked={zone.status === "active"} onCheckedChange={(c) => toggleStatus.mutate({ id: zone.id, status: c ? "active" : "inactive" })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(zone)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setSelected(new Set([zone.id])); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editingItem ? "জোন সম্পাদনা" : "নতুন জোন যোগ করুন"}</DialogTitle>
            <DialogDescription>জোনের তথ্য ও ভৌগোলিক অবস্থান পূরণ করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">জোনের নাম <span className="text-destructive">*</span></label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="text-sm font-medium">কোড</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium">বিবরণ</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            {/* Geographic hierarchy */}
            <div className="border-t pt-3 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">ভৌগোলিক অবস্থান</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">বিভাগ</label>
                  <Select value={form.division_id} onValueChange={(v) => setForm({ ...form, division_id: v, district_id: "", upazila_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="বিভাগ নির্বাচন" /></SelectTrigger>
                    <SelectContent>
                      {divisions?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">জেলা</label>
                  <Select value={form.district_id} onValueChange={(v) => setForm({ ...form, district_id: v, upazila_id: "" })} disabled={!form.division_id}>
                    <SelectTrigger><SelectValue placeholder="জেলা নির্বাচন" /></SelectTrigger>
                    <SelectContent>
                      {filteredDistricts?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">উপজেলা</label>
                  <Select value={form.upazila_id} onValueChange={(v) => setForm({ ...form, upazila_id: v })} disabled={!form.district_id}>
                    <SelectTrigger><SelectValue placeholder="উপজেলা নির্বাচন" /></SelectTrigger>
                    <SelectContent>
                      {filteredUpazilas?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => { if (!form.name.trim()) { toast.error("নাম আবশ্যক"); return; } upsertMutation.mutate(); }} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>মুছে ফেলার নিশ্চিতকরণ</DialogTitle>
            <DialogDescription>{selected.size}টি জোন মুছে ফেলতে চান?</DialogDescription>
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
