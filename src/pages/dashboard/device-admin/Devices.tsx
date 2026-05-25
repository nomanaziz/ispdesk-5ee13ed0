import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Router, Cpu, Network, Users, Database, UserPlus, UserX, Plus, Search, Trash2, AlertTriangle, Wifi, Server as ServerIcon, HardDrive, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DeployUserDialog } from "@/components/device-admin/DeployUserDialog";
import { AddDeviceDialog } from "@/components/device-admin/AddDeviceDialog";
import { DeviceInspectorDialog } from "@/components/device-admin/DeviceInspectorDialog";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";

// category → label/icon
const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  router: { label: "Router", icon: Router, color: "bg-blue-500/10 text-blue-600" },
  olt: { label: "OLT", icon: Cpu, color: "bg-purple-500/10 text-purple-600" },
  switch: { label: "Switch", icon: Network, color: "bg-emerald-500/10 text-emerald-600" },
  access_point: { label: "Access Point", icon: Wifi, color: "bg-cyan-500/10 text-cyan-600" },
  server: { label: "Server", icon: ServerIcon, color: "bg-indigo-500/10 text-indigo-600" },
  pppoe: { label: "PPPoE Server", icon: HardDrive, color: "bg-orange-500/10 text-orange-600" },
  zkteco: { label: "ZKTeco", icon: Users, color: "bg-amber-500/10 text-amber-600" },
  other: { label: "অন্যান্য", icon: Database, color: "bg-gray-500/10 text-gray-600" },
};

// source table → which table to delete from
type Row = {
  id: string;
  name: string;
  ip_address: string | null;
  status: string | null;
  location?: string | null;
  category: string;
  vendor: string;
  source: "mikrotik_devices" | "olt_devices" | "pop_devices" | "zkteco_devices" | "device_admin_managed_devices";
};

export default function DeviceInventory() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"deploy" | "remove" | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; source: string } | null>(null);
  const [inspectDevice, setInspectDevice] = useState<{ id: string; name: string; type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);


  const { allowed: canAdd } = usePermission("device.add");
  const { allowed: canDelete } = usePermission("device.delete");

  const { data = [], isLoading } = useQuery({
    queryKey: ["device_admin_inventory"],
    queryFn: async (): Promise<Row[]> => {
      const [mk, olt, sw, zk, mg] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name,ip_address,status"),
        supabase.from("olt_devices").select("id,name,ip_address,status,vendor"),
        supabase.from("pop_devices").select("id,name,ip_address,status"),
        supabase.from("zkteco_devices").select("id,name,ip_address,status,location"),
        supabase.from("device_admin_managed_devices").select("id,name,category,vendor,ip_address,status,location"),
      ]);
      return [
        ...((mk.data ?? []) as any[]).map((d) => ({ ...d, category: "router", vendor: "mikrotik", source: "mikrotik_devices" as const })),
        ...((olt.data ?? []) as any[]).map((d) => ({ ...d, category: "olt", vendor: d.vendor || "—", source: "olt_devices" as const })),
        ...((sw.data ?? []) as any[]).map((d) => ({ ...d, category: "switch", vendor: "—", source: "pop_devices" as const })),
        ...((zk.data ?? []) as any[]).map((d) => ({ ...d, category: "zkteco", vendor: "zkteco", source: "zkteco_devices" as const })),
        ...((mg.data ?? []) as any[]).map((d) => ({ ...d, category: d.category || "other", vendor: d.vendor || "—", source: "device_admin_managed_devices" as const })),
      ];
    },
  });

  // duplicate IP map
  const dupIps = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((d) => { if (d.ip_address) counts[d.ip_address] = (counts[d.ip_address] || 0) + 1; });
    return new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([ip]) => ip));
  }, [data]);

  const vendorOptions = useMemo(() => {
    const s = new Set<string>();
    data.forEach((d) => d.vendor && d.vendor !== "—" && s.add(d.vendor));
    return Array.from(s).sort();
  }, [data]);

  const filtered = data.filter((d) => {
    if (category !== "all" && d.category !== category) return false;
    if (vendorFilter !== "all" && d.vendor !== vendorFilter) return false;
    if (search && !`${d.name} ${d.ip_address || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const del = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from(row.source).delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_inventory"] });
      toast.success("ডিভাইস delete হয়েছে");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" /> ডিভাইস ইনভেন্টরি
        </h1>
        <div className="flex gap-2 flex-wrap">
          {canAdd && (
            <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> ডিভাইস যোগ</Button>
          )}
          <Button variant="secondary" onClick={() => setDialog("deploy")}>
            <UserPlus className="h-4 w-4 mr-2" /> ইউজার ডিপ্লয়
          </Button>
          <Button variant="destructive" onClick={() => setDialog("remove")}>
            <UserX className="h-4 w-4 mr-2" /> ইউজার রিমুভ
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        💡 MikroTik device গুলো <strong>Mikrotik → Servers</strong> থেকে auto-sync হয়। অন্য device এই page-এর "ডিভাইস যোগ" button দিয়ে যোগ করুন। Type = device-এর ধরন (Router/OLT/...), Vendor = brand (MikroTik/VSOL/...)।
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল টাইপ</SelectItem>
                {Object.entries(CATEGORY_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল Vendor</SelectItem>
                {vendorOptions.map((v) => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="নাম বা IP দিয়ে সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="ml-auto text-sm text-muted-foreground">মোট: {filtered.length}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>টাইপ</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>লোকেশন</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="w-24">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো ডিভাইস পাওয়া যায়নি</TableCell></TableRow>
              ) : filtered.map((d, i) => {
                const meta = CATEGORY_META[d.category] || CATEGORY_META.other;
                const Icon = meta.icon;
                const isDup = d.ip_address && dupIps.has(d.ip_address);
                return (
                  <TableRow key={`${d.source}-${d.id}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${meta.color}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm uppercase">{d.vendor}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {d.ip_address || "—"}
                        {isDup && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Duplicate
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{d.location || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "online" ? "default" : d.status === "offline" ? "destructive" : "secondary"}>
                        {d.status || "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="ইন্সপেক্ট" onClick={() => setInspectDevice({ id: d.id, name: d.name, type: d.category === "router" && d.vendor === "mikrotik" ? "mikrotik" : d.category })}>
                          <Search className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => {
                          if (d.source === "mikrotik_devices") {
                            toast.info("MikroTik device — Mikrotik → Servers page থেকে edit করুন");
                            navigate("/dashboard/mikrotik/servers");
                            return;
                          }
                          if (d.source !== "device_admin_managed_devices") {
                            toast.info("এই source-এর device এখান থেকে edit করা যায় না");
                            return;
                          }
                          setEditTarget({ id: d.id, source: d.source });
                          setAddOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteTarget(d)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {dialog && <DeployUserDialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)} mode={dialog} />}
      <AddDeviceDialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) setEditTarget(null); }} editDevice={editTarget} />
      <DeviceInspectorDialog open={!!inspectDevice} onOpenChange={(v) => !v && setInspectDevice(null)} device={inspectDevice} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ডিভাইস delete করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.ip_address}) — এই কাজ ফিরিয়ে আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && del.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
