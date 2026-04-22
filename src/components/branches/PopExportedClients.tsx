import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Power, PowerOff, Package, Server } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import BulkActionBar from "./BulkActionBar";
import { exportCsv, exportPdf, type ColDef } from "@/lib/exporters";

interface Props {
  popId: string;
  branchId?: string | null;
}

type Row = any;

export default function PopExportedClients({ popId, branchId }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [pkgFilter, setPkgFilter] = useState<string>("all");
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(25);

  // Bulk dialogs
  const [pkgDialog, setPkgDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [newPkg, setNewPkg] = useState("");
  const [newProfile, setNewProfile] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-exported-mt", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data: mtRows, error: e1 } = await supabase
        .from("mikrotik_clients" as any)
        .select("id, name, password, profile, service, server_name, mikrotik_id, remote_address, status, user_status, linked_client_id, transferred_to_pop_id")
        .eq("transferred_to_pop_id", popId)
        .not("linked_client_id", "is", null);
      if (e1) throw e1;

      const linkedIds = (mtRows ?? []).map((r: any) => r.linked_client_id).filter(Boolean);
      let clientsById: Record<string, any> = {};
      if (linkedIds.length) {
        const { data: cRows } = await supabase
          .from("clients")
          .select("id, client_id, name, contact, mac_address, remote_address, server_name, billing_status, mikrotik_status, mikrotik_id, username, is_online, monthly_bill, package_id, zone_id, client_type, isp_packages(id,name), zones(name)")
          .in("id", linkedIds);
        clientsById = Object.fromEntries((cRows ?? []).map((c: any) => [c.id, c]));
      }
      return (mtRows ?? []).map((m: any) => ({ ...m, client: clientsById[m.linked_client_id] }));
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["packages-active"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, bandwidth_down, price").eq("status", "active");
      return data ?? [];
    },
  });

  const { data: servers } = useQuery({
    queryKey: ["mikrotik-servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices" as any).select("id, name");
      return data ?? [];
    },
  });

  // Derive filter option lists
  const profileOptions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r: any) => r.profile && set.add(r.profile));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r: any) => {
      if (pkgFilter !== "all" && r.client?.package_id !== pkgFilter) return false;
      if (serverFilter !== "all" && r.client?.mikrotik_id !== serverFilter && r.mikrotik_id !== serverFilter) return false;
      if (protocolFilter !== "all" && (r.service || "pppoe") !== protocolFilter) return false;
      if (profileFilter !== "all" && r.profile !== profileFilter) return false;
      if (!q) return true;
      return [r.name, r.client?.name, r.client?.contact, r.client?.client_id, r.remote_address]
        .some((v: any) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [data, search, pkgFilter, serverFilter, protocolFilter, profileFilter]);

  const visible = filtered.slice(0, pageSize);
  const allOnPageSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPageSelected) visible.forEach((r) => next.delete(r.id));
    else visible.forEach((r) => next.add(r.id));
    setSelected(next);
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedRows = useMemo(() => filtered.filter((r) => selected.has(r.id)), [filtered, selected]);

  // Per-row toggles
  const toggleBilling = async (r: Row) => {
    if (!r.client?.id) return;
    const isActive = r.client?.billing_status === "active" || r.client?.billing_status === "enabled";
    const next = isActive ? "disabled" : "active";
    const { error } = await supabase.from("clients").update({ billing_status: next }).eq("id", r.client.id);
    if (error) return toast.error(error.message);
    toast.success(`Billing ${next}`);
    qc.invalidateQueries({ queryKey: ["pop-exported-mt", popId] });
  };

  const toggleMikrotik = async (r: Row) => {
    const isDisabled = r.user_status === "disabled" || r.client?.mikrotik_status === "disabled";
    const action = isDisabled ? "enable" : "disable";
    const { error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
      body: { mikrotik_id: r.mikrotik_id || r.client?.mikrotik_id, username: r.name || r.client?.username, client_id: r.client?.id, action },
    });
    if (error) return toast.error(error.message);
    await supabase.from("mikrotik_clients" as any).update({ user_status: isDisabled ? "active" : "disabled" }).eq("id", r.id);
    if (r.client?.id) await supabase.from("clients").update({ mikrotik_status: isDisabled ? "active" : "disabled" }).eq("id", r.client.id);
    toast.success(`MikroTik ${action}d`);
    qc.invalidateQueries({ queryKey: ["pop-exported-mt", popId] });
  };

  // Bulk actions
  const runBulk = async (label: string, fn: (r: Row) => Promise<void>) => {
    if (selectedRows.length === 0) return;
    setBulkBusy(label);
    let ok = 0, fail = 0;
    for (const r of selectedRows) {
      try { await fn(r); ok++; } catch { fail++; }
    }
    setBulkBusy(null);
    toast[fail ? "warning" : "success"](`${label}: ${ok} সফল${fail ? `, ${fail} ব্যর্থ` : ""}`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["pop-exported-mt", popId] });
  };

  const bulkEnable = () => runBulk("Bulk Enable", async (r) => {
    if (r.client?.id) await supabase.from("clients").update({ billing_status: "active", mikrotik_status: "active" }).eq("id", r.client.id);
    await supabase.functions.invoke("manage-mikrotik-ppp", { body: { mikrotik_id: r.mikrotik_id || r.client?.mikrotik_id, username: r.name, client_id: r.client?.id, action: "enable" } });
    await supabase.from("mikrotik_clients" as any).update({ user_status: "active" }).eq("id", r.id);
  });

  const bulkDisable = () => runBulk("Bulk Disable", async (r) => {
    if (r.client?.id) await supabase.from("clients").update({ billing_status: "disabled", mikrotik_status: "disabled" }).eq("id", r.client.id);
    await supabase.functions.invoke("manage-mikrotik-ppp", { body: { mikrotik_id: r.mikrotik_id || r.client?.mikrotik_id, username: r.name, client_id: r.client?.id, action: "disable" } });
    await supabase.from("mikrotik_clients" as any).update({ user_status: "disabled" }).eq("id", r.id);
  });

  const applyBulkPackage = async () => {
    if (!newPkg) return;
    const pkg = packages?.find((p: any) => p.id === newPkg);
    setPkgDialog(false);
    await runBulk("Package Change", async (r) => {
      if (r.client?.id) {
        await supabase.from("clients").update({
          package_id: newPkg,
          monthly_bill: pkg?.price || 0,
          profile: pkg?.name || "",
        }).eq("id", r.client.id);
      }
      await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: r.mikrotik_id || r.client?.mikrotik_id, username: r.name, client_id: r.client?.id, action: "update", profile: pkg?.name || "" },
      });
      await supabase.from("mikrotik_clients" as any).update({ profile: pkg?.name || "" }).eq("id", r.id);
    });
    setNewPkg("");
  };

  const applyBulkProfile = async () => {
    if (!newProfile.trim()) return;
    const p = newProfile.trim();
    setProfileDialog(false);
    await runBulk("Profile Change", async (r) => {
      await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: r.mikrotik_id || r.client?.mikrotik_id, username: r.name, client_id: r.client?.id, action: "update", profile: p },
      });
      await supabase.from("mikrotik_clients" as any).update({ profile: p }).eq("id", r.id);
    });
    setNewProfile("");
  };

  // Exports
  const exportCols: ColDef<Row>[] = [
    { header: "Client ID", accessor: (r) => r.client?.client_id || "" },
    { header: "User ID", accessor: (r) => r.name || "" },
    { header: "Customer", accessor: (r) => r.client?.name || "" },
    { header: "Mobile", accessor: (r) => r.client?.contact || "" },
    { header: "Zone", accessor: (r) => r.client?.zones?.name || "" },
    { header: "Package", accessor: (r) => r.client?.isp_packages?.name || r.profile || "" },
    { header: "IP", accessor: (r) => r.client?.remote_address || r.remote_address || "" },
    { header: "MAC", accessor: (r) => r.client?.mac_address || "" },
    { header: "Server", accessor: (r) => r.client?.server_name || r.server_name || "" },
    { header: "B.Status", accessor: (r) => r.client?.billing_status || "" },
    { header: "M.Status", accessor: (r) => r.client?.mikrotik_status || r.user_status || "" },
  ];
  const rowsForExport = selectedRows.length ? selectedRows : filtered;

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <div className="text-sm text-destructive p-3 border border-destructive/30 rounded-md">লোড করতে সমস্যা হয়েছে: {(error as any).message}</div>;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={pkgFilter} onValueChange={setPkgFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Package" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Packages</SelectItem>
            {packages?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serverFilter} onValueChange={setServerFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Server" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Servers</SelectItem>
            {servers?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={protocolFilter} onValueChange={setProtocolFilter}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Protocol" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Protocols</SelectItem>
            <SelectItem value="pppoe">PPPoE</SelectItem>
            <SelectItem value="static">Static</SelectItem>
            <SelectItem value="hotspot">Hotspot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Profile" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            {profileOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9 ml-auto" />
        <span className="text-xs text-muted-foreground">মোট: {filtered.length}</span>
      </div>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedRows.length}
        totalCount={filtered.length}
        actions={[
          { key: "pkg", label: "Bulk Package Change", icon: <Package className="h-3 w-3" />, onClick: () => setPkgDialog(true), loading: bulkBusy === "Package Change" },
          { key: "profile", label: "Bulk Profile Change", icon: <Server className="h-3 w-3" />, onClick: () => setProfileDialog(true), loading: bulkBusy === "Profile Change" },
          { key: "enable", label: "Bulk Enable", icon: <Power className="h-3 w-3" />, onClick: bulkEnable, loading: bulkBusy === "Bulk Enable", variant: "default" },
          { key: "disable", label: "Bulk Disable", icon: <PowerOff className="h-3 w-3" />, onClick: bulkDisable, loading: bulkBusy === "Bulk Disable", variant: "destructive" },
        ]}
        onExportCsv={() => exportCsv("exported-clients", exportCols, rowsForExport)}
        onExportPdf={() => exportPdf("exported-clients", "Exported Clients", exportCols, rowsForExport)}
      />

      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Client ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>B.Status</TableHead>
              <TableHead>M.Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r: any) => {
              const billingActive = r.client?.billing_status === "active" || r.client?.billing_status === "enabled";
              const mtActive = !(r.user_status === "disabled" || r.client?.mikrotik_status === "disabled");
              return (
                <TableRow key={r.id}>
                  <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                  <TableCell className="font-mono text-xs">{r.client?.client_id || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{showPwd[r.id] ? (r.password || "-") : "••••••"}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPwd((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                        {showPwd[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{r.client?.name || "-"}</TableCell>
                  <TableCell>{r.client?.contact || "-"}</TableCell>
                  <TableCell>{r.client?.zones?.name || "-"}</TableCell>
                  <TableCell>{r.client?.isp_packages?.name || r.profile || "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.client?.remote_address || r.remote_address || "-"}</TableCell>
                  <TableCell>{r.client?.server_name || r.server_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={billingActive} onCheckedChange={() => toggleBilling(r)} />
                      <Badge variant={billingActive ? "default" : "secondary"} className="text-[10px]">{r.client?.billing_status || "-"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={mtActive} onCheckedChange={() => toggleMikrotik(r)} />
                      <Badge variant={r.client?.is_online ? "default" : "outline"} className="text-[10px]">
                        {r.client?.is_online ? "Online" : (mtActive ? "active" : "disabled")}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">কোনো exported client নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Package Dialog */}
      <Dialog open={pkgDialog} onOpenChange={setPkgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Package Change</DialogTitle>
            <DialogDescription>{selectedRows.length} client-এর package change হবে</DialogDescription>
          </DialogHeader>
          <Select value={newPkg} onValueChange={setNewPkg}>
            <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
            <SelectContent>
              {packages?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgDialog(false)}>বাতিল</Button>
            <Button onClick={applyBulkPackage} disabled={!newPkg}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Profile Change</DialogTitle>
            <DialogDescription>MikroTik profile name নতুন করে set হবে — {selectedRows.length} user</DialogDescription>
          </DialogHeader>
          <Input value={newProfile} onChange={(e) => setNewProfile(e.target.value)} placeholder="profile name (e.g. 10M)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialog(false)}>বাতিল</Button>
            <Button onClick={applyBulkProfile} disabled={!newProfile.trim()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
