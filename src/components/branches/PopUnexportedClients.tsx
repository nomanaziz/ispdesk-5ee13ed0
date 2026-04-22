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
import { Eye, EyeOff, RotateCcw, Power, PowerOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BulkActionBar from "./BulkActionBar";
import { exportCsv, exportPdf, type ColDef } from "@/lib/exporters";

interface Props {
  popId: string;
  branchId?: string | null;
}

type Row = any;

export default function PopUnexportedClients({ popId, branchId }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [revertId, setRevertId] = useState<string | null>(null);
  const [bulkRevertOpen, setBulkRevertOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);

  const [serverFilter, setServerFilter] = useState("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [profileFilter, setProfileFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-unexported-mt", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data: rows, error: e } = await supabase
        .from("mikrotik_clients" as any)
        .select("id, name, password, profile, service, server_name, mikrotik_id, remote_address, status, user_status, transferred_to_pop_id, transferred_at")
        .eq("transferred_to_pop_id", popId)
        .is("linked_client_id", null);
      if (e) throw e;
      return (rows ?? []) as any[];
    },
  });

  const { data: servers } = useQuery({
    queryKey: ["mikrotik-servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices" as any).select("id, name");
      return data ?? [];
    },
  });

  const profileOptions = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r: any) => r.profile && set.add(r.profile));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r: any) => {
      if (serverFilter !== "all" && r.mikrotik_id !== serverFilter) return false;
      if (protocolFilter !== "all" && (r.service || "pppoe") !== protocolFilter) return false;
      if (profileFilter !== "all" && r.profile !== profileFilter) return false;
      if (!q) return true;
      return [r.name, r.profile, r.server_name].some((v: any) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [data, search, serverFilter, protocolFilter, profileFilter]);

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

  // Per-row enable toggle
  const toggleEnable = async (r: Row) => {
    const isDisabled = r.user_status === "disabled";
    const action = isDisabled ? "enable" : "disable";
    const { error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
      body: { mikrotik_id: r.mikrotik_id, username: r.name, action },
    });
    if (error) return toast.error(error.message);
    await supabase.from("mikrotik_clients" as any).update({ user_status: isDisabled ? "active" : "disabled" }).eq("id", r.id);
    toast.success(`MikroTik ${action}d`);
    qc.invalidateQueries({ queryKey: ["pop-unexported-mt", popId] });
  };

  const revertOne = async (id: string) => {
    const { data, error } = await supabase.rpc("revert_mikrotik_client" as any, { _mt_id: id });
    if (error) throw error;
    if (data && (data as any).ok === false) throw new Error((data as any).error || "Revert failed");
  };

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
    qc.invalidateQueries({ queryKey: ["pop-unexported-mt", popId] });
    qc.invalidateQueries({ queryKey: ["pop-exported-mt", popId] });
    qc.invalidateQueries({ queryKey: ["mikrotik_clients"] });
  };

  const bulkRevert = async () => {
    setBulkRevertOpen(false);
    await runBulk("Bulk Revert", (r) => revertOne(r.id));
  };
  const bulkEnable = () => runBulk("Bulk Enable", async (r) => {
    await supabase.functions.invoke("manage-mikrotik-ppp", { body: { mikrotik_id: r.mikrotik_id, username: r.name, action: "enable" } });
    await supabase.from("mikrotik_clients" as any).update({ user_status: "active" }).eq("id", r.id);
  });
  const bulkDisable = () => runBulk("Bulk Disable", async (r) => {
    await supabase.functions.invoke("manage-mikrotik-ppp", { body: { mikrotik_id: r.mikrotik_id, username: r.name, action: "disable" } });
    await supabase.from("mikrotik_clients" as any).update({ user_status: "disabled" }).eq("id", r.id);
  });

  const exportCols: ColDef<Row>[] = [
    { header: "Name", accessor: (r) => r.name || "" },
    { header: "Profile", accessor: (r) => r.profile || "" },
    { header: "Protocol", accessor: (r) => r.service || "" },
    { header: "Server", accessor: (r) => r.server_name || "" },
    { header: "IP", accessor: (r) => r.remote_address || "" },
    { header: "Status", accessor: (r) => r.user_status || r.status || "" },
  ];
  const rowsForExport = selectedRows.length ? selectedRows : filtered;

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <div className="text-sm text-destructive p-3 border border-destructive/30 rounded-md">লোড করতে সমস্যা হয়েছে: {(error as any).message}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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

      <BulkActionBar
        selectedCount={selectedRows.length}
        totalCount={filtered.length}
        actions={[
          { key: "revert", label: "Bulk Revert", icon: <RotateCcw className="h-3 w-3" />, onClick: () => setBulkRevertOpen(true), loading: bulkBusy === "Bulk Revert", variant: "destructive" },
          { key: "renew", label: "Bulk Recharge / Renewal", icon: <RefreshCw className="h-3 w-3" />, onClick: () => toast.info("Renewal flow এখানে আসবে — package validity ভিত্তিক"), variant: "secondary" },
          { key: "enable", label: "Bulk Enable", icon: <Power className="h-3 w-3" />, onClick: bulkEnable, loading: bulkBusy === "Bulk Enable", variant: "default" },
          { key: "disable", label: "Bulk Disable", icon: <PowerOff className="h-3 w-3" />, onClick: bulkDisable, loading: bulkBusy === "Bulk Disable", variant: "destructive" },
        ]}
        onExportCsv={() => exportCsv("unexported-clients", exportCols, rowsForExport)}
        onExportPdf={() => exportPdf("unexported-clients", "Unexported MikroTik Users", exportCols, rowsForExport)}
      />

      <p className="text-xs text-muted-foreground">
        এই MikroTik user-গুলো POP-এর scope-এ আছে কিন্তু এখনো client-এ convert হয়নি। Revert করলে user আবার admin "Import from MikroTik"-এ ফেরত যাবে।
      </p>

      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r: any) => {
              const enabled = r.user_status !== "disabled";
              return (
                <TableRow key={r.id}>
                  <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                  <TableCell className="font-mono text-xs">{r.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{showPwd[r.id] ? (r.password || "-") : "••••••"}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPwd((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                        {showPwd[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{r.profile || "-"}</TableCell>
                  <TableCell>{r.service || "-"}</TableCell>
                  <TableCell>{r.server_name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={enabled} onCheckedChange={() => toggleEnable(r)} />
                      <Badge variant={enabled ? "default" : "destructive"} className="text-[10px]">
                        {enabled ? "active" : "disabled"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setRevertId(r.id)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Revert
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">কোনো unexported user নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!revertId} onOpenChange={(o) => !o && setRevertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              এই user MikroTik Import pool-এ ফেরত যাবে। POP আর তাকে দেখতে পাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!revertId) return;
              try {
                await revertOne(revertId);
                toast.success("Revert সম্পন্ন");
                qc.invalidateQueries({ queryKey: ["pop-unexported-mt", popId] });
                qc.invalidateQueries({ queryKey: ["pop-exported-mt", popId] });
                qc.invalidateQueries({ queryKey: ["mikrotik_clients"] });
              } catch (e: any) { toast.error(e.message); }
              setRevertId(null);
            }}>Revert করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRevertOpen} onOpenChange={setBulkRevertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Revert নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRows.length} জন user MikroTik Import pool-এ ফেরত যাবে। এই কাজটি reversible নয়।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={bulkRevert}>Revert করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
