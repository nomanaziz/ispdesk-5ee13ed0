import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Settings,
  Pencil,
  Trash2,
  RefreshCw,
  Eye,
  X as XIcon,
  History,
  RotateCw,
} from "lucide-react";
import { format } from "date-fns";
import { TariffChangeLogDialog } from "@/components/branches/TariffChangeLogDialog";

interface PackageRow {
  id?: string; // db id if existing
  tempId: string; // for client-side tracking
  package_id: string;
  buy_rate: number;
  selling_rate: number;
  validity_days: number;
  min_activation_days: number;
  mikrotik_server_id: string;
  mikrotik_profile: string;
  protocol_type: string;
  _serverChanged?: boolean; // mark for sync after save
}

interface MikroProfile {
  name: string;
  "rate-limit"?: string;
}

const emptyPkgForm = (): PackageRow => ({
  tempId: crypto.randomUUID(),
  package_id: "",
  buy_rate: 0,
  selling_rate: 0,
  validity_days: 30,
  min_activation_days: 1,
  mikrotik_server_id: "",
  mikrotik_profile: "",
  protocol_type: "PPPoE",
});

export default function Tariff() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewTariff, setViewTariff] = useState<any>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logTariff, setLogTariff] = useState<{ id: string; name: string } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const [tariffName, setTariffName] = useState("");
  const tariffType = "date_to_date" as const;
  const [editId, setEditId] = useState<string | null>(null);

  const [pkgRows, setPkgRows] = useState<PackageRow[]>([]);
  const [pkgForm, setPkgForm] = useState<PackageRow>(emptyPkgForm());
  const [editingPkgIdx, setEditingPkgIdx] = useState<number | null>(null);

  const [profileCache, setProfileCache] = useState<Record<string, MikroProfile[]>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // ----- Queries -----
  const { data: tariffs, isLoading } = useQuery({
    queryKey: ["reseller-tariffs-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_tariffs")
        .select(
          "id, name, tariff_type, status, created_at, created_by, " +
            "reseller_tariff_packages(id, package_id, mikrotik_server_id, mikrotik_profile, protocol_type, buy_rate, selling_rate, validity_days, min_activation_days, " +
            "isp_packages(name, price), mikrotik_devices(name))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: assignedPopsByTariff } = useQuery({
    queryKey: ["tariff-assigned-pops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, tariff_id")
        .not("tariff_id", "is", null);
      if (error) throw error;
      const map: Record<string, { id: string; name: string }[]> = {};
      (data ?? []).forEach((p: any) => {
        if (!p.tariff_id) return;
        if (!map[p.tariff_id]) map[p.tariff_id] = [];
        map[p.tariff_id].push({ id: p.id, name: p.name });
      });
      return map;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["isp-packages-sellable-select"],
    queryFn: async () => {
      const { data } = await supabase
        .from("isp_packages")
        .select("id, name, price, package_type")
        .eq("status", "active")
        .in("package_type", ["home", "corporate", "business", "dedicated"])
        .order("name");
      return data ?? [];
    },
  });

  const { data: servers } = useQuery({
    queryKey: ["mikrotik-servers-select"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name");
      return data ?? [];
    },
  });

  // Resolve "created_by" → user names
  const creatorIds = Array.from(
    new Set((tariffs ?? []).map((t: any) => t.created_by).filter(Boolean)),
  );
  const { data: creatorProfiles } = useQuery({
    queryKey: ["tariff-creator-profiles", creatorIds.join(",")],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", creatorIds as string[]);
      return data ?? [];
    },
  });
  const creatorMap: Record<string, string> = {};
  (creatorProfiles ?? []).forEach((p: any) => {
    creatorMap[p.user_id] = p.full_name?.trim() || p.email?.split("@")[0] || "—";
  });

  // ----- Helpers -----
  const fetchProfiles = async (deviceId: string) => {
    if (!deviceId) return;
    if (profileCache[deviceId]) return;
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "fetch-mikrotik-profiles",
        { body: { device_id: deviceId } },
      );
      if (error) throw error;
      setProfileCache((c) => ({ ...c, [deviceId]: data?.profiles ?? [] }));
    } catch (e: any) {
      toast.error("প্রোফাইল লোড ব্যর্থ: " + (e.message || "Unknown"));
    } finally {
      setLoadingProfiles(false);
    }
  };

  const onPackageSelect = (packageId: string) => {
    const pkg = packages?.find((p) => p.id === packageId);
    setPkgForm((f) => ({
      ...f,
      package_id: packageId,
      buy_rate: Number(f.selling_rate ?? pkg?.price ?? 0),
    }));
  };

  const onServerSelect = (serverId: string) => {
    setPkgForm((f) => ({ ...f, mikrotik_server_id: serverId, mikrotik_profile: "" }));
    fetchProfiles(serverId);
  };

  const addOrUpdatePkgRow = () => {
    if (!pkgForm.package_id) return toast.error("Package সিলেক্ট করুন");
    if (!pkgForm.mikrotik_server_id) return toast.error("Server সিলেক্ট করুন");
    if (!pkgForm.mikrotik_profile) return toast.error("Profile সিলেক্ট করুন");

    if (editingPkgIdx !== null) {
      const old = pkgRows[editingPkgIdx];
      const serverChanged =
        old.mikrotik_server_id !== pkgForm.mikrotik_server_id ||
        old.mikrotik_profile !== pkgForm.mikrotik_profile;
      const next = [...pkgRows];
      next[editingPkgIdx] = { ...pkgForm, _serverChanged: serverChanged || old._serverChanged };
      setPkgRows(next);
      setEditingPkgIdx(null);
    } else {
      // duplicate guard
      const dup = pkgRows.find(
        (r) =>
          r.package_id === pkgForm.package_id &&
          r.mikrotik_server_id === pkgForm.mikrotik_server_id,
      );
      if (dup) return toast.error("এই package + server combination ইতিমধ্যে আছে");
      setPkgRows([...pkgRows, pkgForm]);
    }
    setPkgForm(emptyPkgForm());
  };

  const editPkgRow = (idx: number) => {
    setPkgForm({ ...pkgRows[idx] });
    setEditingPkgIdx(idx);
    if (pkgRows[idx].mikrotik_server_id) fetchProfiles(pkgRows[idx].mikrotik_server_id);
  };

  const deletePkgRow = (idx: number) => {
    setPkgRows(pkgRows.filter((_, i) => i !== idx));
    if (editingPkgIdx === idx) {
      setEditingPkgIdx(null);
      setPkgForm(emptyPkgForm());
    }
  };

  const resetDialog = () => {
    setTariffName("");
    // tariffType is fixed to date_to_date
    setEditId(null);
    setPkgRows([]);
    setPkgForm(emptyPkgForm());
    setEditingPkgIdx(null);
  };

  // ----- Save -----
  const save = useMutation({
    mutationFn: async () => {
      if (!tariffName.trim()) throw new Error("Tariff নাম দিন");
      if (pkgRows.length === 0) throw new Error("কমপক্ষে একটি package যোগ করুন");

      const userRes = await supabase.auth.getUser();
      const uid = userRes.data.user?.id ?? null;

      let tariffId = editId;
      if (editId) {
        const { error } = await supabase
          .from("reseller_tariffs")
          .update({ name: tariffName, tariff_type: tariffType })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("reseller_tariffs")
          .insert({
            name: tariffName,
            tariff_type: tariffType,
            created_by: uid,
            // legacy columns satisfied via defaults / nullables
            activation_days: pkgRows[0].validity_days || 30,
            selling_rate: pkgRows[0].selling_rate,
            package_id: pkgRows[0].package_id,
          })
          .select("id")
          .single();
        if (error) throw error;
        tariffId = data.id;
      }
      if (!tariffId) throw new Error("Tariff id missing");

      // Replace all package rows: delete existing then insert
      const { error: delErr } = await supabase
        .from("reseller_tariff_packages")
        .delete()
        .eq("tariff_id", tariffId);
      if (delErr) throw delErr;

      const rowsToInsert = pkgRows.map((r) => ({
        tariff_id: tariffId!,
        package_id: r.package_id,
        mikrotik_server_id: r.mikrotik_server_id || null,
        mikrotik_profile: r.mikrotik_profile || null,
        protocol_type: r.protocol_type,
        buy_rate: Number(r.selling_rate ?? 0),
        selling_rate: Number(r.selling_rate ?? 0),
        validity_days: r.validity_days || 30,
        min_activation_days: r.min_activation_days || 1,
      }));
      const { data: inserted, error: insErr } = await supabase
        .from("reseller_tariff_packages")
        .insert(rowsToInsert)
        .select("id, package_id, mikrotik_server_id");
      if (insErr) throw insErr;

      // Trigger sync for any rows that had server change
      const changedRows = pkgRows
        .map((r, i) => ({ ...r, dbId: inserted?.[i]?.id }))
        .filter((r) => r._serverChanged && r.dbId);

      for (const r of changedRows) {
        await supabase.functions
          .invoke("sync-tariff-package-change", {
            body: { tariff_package_id: r.dbId },
          })
          .catch((e) => console.error("sync failed", e));
      }
      return { changedCount: changedRows.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["reseller-tariffs-v2"] });
      qc.invalidateQueries({ queryKey: ["tariff-assigned-pops"] });
      toast.success(
        editId ? "Tariff আপডেট হয়েছে" : "Tariff তৈরি হয়েছে",
      );
      if (res.changedCount > 0) {
        toast.info(`${res.changedCount} package সার্ভার পরিবর্তনের জন্য sync ট্রিগার হয়েছে`);
      }
      setDialogOpen(false);
      resetDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      // SAFE DELETE GUARD: ensure no clients are using packages of this tariff
      const { data: pkgRowsForTariff } = await supabase
        .from("reseller_tariff_packages")
        .select("package_id")
        .eq("tariff_id", id);
      const pkgIds = Array.from(
        new Set((pkgRowsForTariff ?? []).map((r: any) => r.package_id).filter(Boolean)),
      );
      if (pkgIds.length > 0) {
        const { count } = await supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .in("package_id", pkgIds as string[]);
        if ((count ?? 0) > 0) {
          throw new Error(
            `এই tariff delete করা যাবে না — ${count} জন client এই tariff-এর package ব্যবহার করছে। আগে তাদের অন্য package-এ shift করুন।`,
          );
        }
      }
      const { count: popCount } = await supabase
        .from("branch_managers")
        .select("id", { count: "exact", head: true })
        .eq("tariff_id", id);
      if ((popCount ?? 0) > 0) {
        throw new Error(
          `এই tariff ${popCount} টি POP-এ assigned আছে। আগে POP থেকে সরান।`,
        );
      }
      const { error } = await supabase.from("reseller_tariffs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller-tariffs-v2"] });
      toast.success("Tariff মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const syncPackage = async (tariffId: string) => {
    setSyncing(tariffId + ":pkg");
    try {
      const { data: tpkgs } = await supabase
        .from("reseller_tariff_packages")
        .select("id")
        .eq("tariff_id", tariffId);
      let total = 0;
      for (const tp of tpkgs ?? []) {
        const { data, error } = await supabase.functions.invoke(
          "sync-tariff-package-change",
          { body: { tariff_package_id: tp.id, mode: "package_only" } },
        );
        if (error) throw error;
        total += data?.affected_clients ?? 0;
      }
      toast.success(`Sync Package সম্পন্ন — ${total} client আপডেট`);
    } catch (e: any) {
      toast.error("Sync Package ব্যর্থ: " + (e.message || "Unknown"));
    } finally {
      setSyncing(null);
    }
  };

  const syncProfile = async (tariffId: string) => {
    setSyncing(tariffId + ":prof");
    try {
      const { data: tpkgs } = await supabase
        .from("reseller_tariff_packages")
        .select("id")
        .eq("tariff_id", tariffId);
      let total = 0;
      for (const tp of tpkgs ?? []) {
        const { data, error } = await supabase.functions.invoke(
          "sync-tariff-package-change",
          { body: { tariff_package_id: tp.id } },
        );
        if (error) throw error;
        total += data?.synced ?? 0;
      }
      toast.success(`Sync Profile সম্পন্ন — ${total} client MikroTik-এ push হয়েছে`);
    } catch (e: any) {
      toast.error("Sync Profile ব্যর্থ: " + (e.message || "Unknown"));
    } finally {
      setSyncing(null);
    }
  };

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const next = status === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("reseller_tariffs")
        .update({ status: next })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reseller-tariffs-v2"] }),
  });

  const openEdit = (t: any) => {
    setEditId(t.id);
    setTariffName(t.name);
    // tariffType always date_to_date
    const rows: PackageRow[] = (t.reseller_tariff_packages ?? []).map((p: any) => ({
      tempId: crypto.randomUUID(),
      id: p.id,
      package_id: p.package_id,
      buy_rate: Number(p.selling_rate ?? 0),
      selling_rate: Number(p.selling_rate ?? 0),
      validity_days: p.validity_days ?? 30,
      min_activation_days: p.min_activation_days ?? 1,
      mikrotik_server_id: p.mikrotik_server_id ?? "",
      mikrotik_profile: p.mikrotik_profile ?? "",
      protocol_type: p.protocol_type ?? "PPPoE",
    }));
    setPkgRows(rows);
    rows.forEach((r) => r.mikrotik_server_id && fetchProfiles(r.mikrotik_server_id));
    setDialogOpen(true);
  };

  const openView = (t: any) => {
    setViewTariff(t);
    setViewOpen(true);
  };

  const profilesForCurrentServer = pkgForm.mikrotik_server_id
    ? profileCache[pkgForm.mikrotik_server_id] ?? []
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ট্যারিফ কনফিগারেশন</h1>
          <p className="text-sm text-muted-foreground">
            POP-এর জন্য Multi-package tariff (Buy/Sell rate, Multiple servers)
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (!v) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> ট্যারিফ যোগ করুন
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editId ? "Edit Tariff" : "New Tariff"}
              </DialogTitle>
            </DialogHeader>

            {/* Tariff Type */}
            <div className="space-y-2">
              <Label>Tariff Type</Label>
              <RadioGroup
                value={tariffType}
                onValueChange={(v) => setTariffType(v as any)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="t-custom" />
                  <Label htmlFor="t-custom" className="cursor-pointer">Custom</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="date_to_date" id="t-d2d" />
                  <Label htmlFor="t-d2d" className="cursor-pointer">Date To Date</Label>
                </div>
              </RadioGroup>
              {tariffType === "date_to_date" ? (
                <p className="text-xs text-muted-foreground">
                  Date To Date — client-এর billing date থেকে পরের মাসের একই তারিখ পর্যন্ত validity হবে। Validity Days / Min Activation Days প্রযোজ্য নয়।
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Custom — admin-defined validity ও minimum activation দিন ব্যবহার হবে।
                </p>
              )}
            </div>

            {/* Tariff Name */}
            <div>
              <Label>Tariff Name *</Label>
              <Input
                value={tariffName}
                onChange={(e) => setTariffName(e.target.value)}
                placeholder="e.g. Reseller Standard"
              />
            </div>

            {/* Package Form */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="font-semibold text-sm">
                {editingPkgIdx !== null ? "Edit Package Row" : "Add Package"}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Package Name *</Label>
                  <Select value={pkgForm.package_id} onValueChange={onPackageSelect}>
                    <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                    <SelectContent>
                      {packages?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ৳{p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Selling Rate (৳) *</Label>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    এটি POP-এর Buying Rate হিসেবে ব্যবহৃত হবে
                  </p>
                  <Input
                    type="number"
                    value={pkgForm.selling_rate}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      // Mirror to buy_rate for backward compatibility
                      setPkgForm({ ...pkgForm, selling_rate: v, buy_rate: v });
                    }}
                  />
                </div>
                {tariffType === "custom" && (
                  <>
                    <div>
                      <Label>Validity Days</Label>
                      <Input
                        type="number"
                        value={pkgForm.validity_days}
                        onChange={(e) =>
                          setPkgForm({
                            ...pkgForm,
                            validity_days: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Min Activation Days</Label>
                      <Input
                        type="number"
                        value={pkgForm.min_activation_days}
                        min={1}
                        onChange={(e) =>
                          setPkgForm({
                            ...pkgForm,
                            min_activation_days: Math.max(1, Number(e.target.value)),
                          })
                        }
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label>Protocol</Label>
                  <Select
                    value={pkgForm.protocol_type}
                    onValueChange={(v) =>
                      setPkgForm({ ...pkgForm, protocol_type: v })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPPoE">PPPoE</SelectItem>
                      <SelectItem value="IPoE">IPoE</SelectItem>
                      <SelectItem value="Static">Static</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Server *</Label>
                  <Select
                    value={pkgForm.mikrotik_server_id}
                    onValueChange={onServerSelect}
                  >
                    <SelectTrigger><SelectValue placeholder="Select server" /></SelectTrigger>
                    <SelectContent>
                      {servers?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-2">
                    MikroTik Profile *
                    {pkgForm.mikrotik_server_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          setProfileCache((c) => {
                            const n = { ...c };
                            delete n[pkgForm.mikrotik_server_id];
                            return n;
                          });
                          fetchProfiles(pkgForm.mikrotik_server_id);
                        }}
                        disabled={loadingProfiles}
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${loadingProfiles ? "animate-spin" : ""}`}
                        />
                      </Button>
                    )}
                  </Label>
                  {profilesForCurrentServer.length > 0 ? (
                    <Select
                      value={pkgForm.mikrotik_profile}
                      onValueChange={(v) =>
                        setPkgForm({ ...pkgForm, mikrotik_profile: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profilesForCurrentServer.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name} {p["rate-limit"] ? `(${p["rate-limit"]})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={pkgForm.mikrotik_profile}
                      onChange={(e) =>
                        setPkgForm({ ...pkgForm, mikrotik_profile: e.target.value })
                      }
                      placeholder={
                        loadingProfiles
                          ? "Loading..."
                          : pkgForm.mikrotik_server_id
                            ? "Sync from server"
                            : "Select server first"
                      }
                      disabled={loadingProfiles}
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={addOrUpdatePkgRow}>
                  {editingPkgIdx !== null ? "Update Row" : "Add Package"}
                </Button>
                {editingPkgIdx !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPkgIdx(null);
                      setPkgForm(emptyPkgForm());
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Inner Table */}
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Selling Rate</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Min Days</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pkgRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center text-muted-foreground py-6"
                      >
                        কোনো package যোগ করা হয়নি
                      </TableCell>
                    </TableRow>
                  ) : (
                    pkgRows.map((r, i) => {
                      const pkgName =
                        packages?.find((p) => p.id === r.package_id)?.name ?? "-";
                      const srvName =
                        servers?.find((s) => s.id === r.mikrotik_server_id)?.name ?? "-";
                      return (
                        <TableRow key={r.tempId}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell className="font-medium">{pkgName}</TableCell>
                          <TableCell>{srvName}</TableCell>
                          <TableCell>{r.protocol_type}</TableCell>
                          <TableCell>{r.mikrotik_profile}</TableCell>
                          <TableCell className="font-mono">৳{r.selling_rate}</TableCell>
                          <TableCell>{r.validity_days}</TableCell>
                          <TableCell>{r.min_activation_days}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editPkgRow(i)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePkgRow(i)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending
                  ? "Saving..."
                  : editId
                    ? "Update Tariff"
                    : "Save Tariff"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tariff List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" /> Tariff List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S/N</TableHead>
                    <TableHead>Tariff Name</TableHead>
                    <TableHead>Assigned POPs</TableHead>
                    <TableHead>Packages</TableHead>
                    <TableHead>Servers</TableHead>
                    <TableHead>Profiles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!tariffs || tariffs.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-8"
                      >
                        কোনো tariff পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                  {tariffs?.map((t: any, i: number) => {
                    const pops = assignedPopsByTariff?.[t.id] ?? [];
                    const rows = t.reseller_tariff_packages ?? [];
                    const pkgNames = Array.from(
                      new Set(
                        rows
                          .map((r: any) => r.isp_packages?.name)
                          .filter(Boolean),
                      ),
                    );
                    const srvNames = Array.from(
                      new Set(
                        rows
                          .map((r: any) => r.mikrotik_devices?.name)
                          .filter(Boolean),
                      ),
                    );
                    const profNames = Array.from(
                      new Set(
                        rows.map((r: any) => r.mikrotik_profile).filter(Boolean),
                      ),
                    );
                    return (
                      <TableRow key={t.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          {pops.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {pops.slice(0, 3).map((p) => (
                                <Badge key={p.id} variant="secondary" className="text-xs">
                                  {p.name}
                                </Badge>
                              ))}
                              {pops.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{pops.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {pkgNames.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {srvNames.join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {profNames.join(", ") || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={t.status === "active" ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() =>
                              toggleStatus.mutate({ id: t.id, status: t.status })
                            }
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.created_by ? (creatorMap[t.created_by] ?? "—") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.created_at
                            ? format(new Date(t.created_at), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View"
                              onClick={() => openView(t)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sync Package (DB-level)"
                              disabled={syncing === t.id + ":pkg"}
                              onClick={() => {
                                const popCount = (assignedPopsByTariff?.[t.id] ?? []).length;
                                if (confirm(`Sync Package চালাবেন? এই tariff-এর ${popCount} POP-এর সব client affected হবে।`))
                                  syncPackage(t.id);
                              }}
                            >
                              <RefreshCw className={`h-4 w-4 ${syncing === t.id + ":pkg" ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Sync Profile (MikroTik push)"
                              disabled={syncing === t.id + ":prof"}
                              onClick={() => {
                                if (confirm("Sync Profile চালাবেন? সব client-এর MikroTik profile push হবে।"))
                                  syncProfile(t.id);
                              }}
                            >
                              <RotateCw className={`h-4 w-4 ${syncing === t.id + ":prof" ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Change Log"
                              onClick={() => {
                                setLogTariff({ id: t.id, name: t.name });
                                setLogOpen(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete"
                              onClick={() => {
                                if (confirm("Tariff মুছে ফেলবেন?"))
                                  del.mutate(t.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTariff?.name}</DialogTitle>
          </DialogHeader>
          {viewTariff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <strong>{viewTariff.tariff_type}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <strong>{viewTariff.status}</strong>
                </div>
              </div>
              <div>
                <Label className="text-xs">Assigned POPs</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(assignedPopsByTariff?.[viewTariff.id] ?? []).map((p) => (
                    <Badge key={p.id} variant="secondary">{p.name}</Badge>
                  ))}
                  {(assignedPopsByTariff?.[viewTariff.id] ?? []).length === 0 && (
                    <span className="text-xs text-muted-foreground">কোনো POP assigned নেই</span>
                  )}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Selling Rate</TableHead>
                    <TableHead>Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewTariff.reseller_tariff_packages ?? []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.isp_packages?.name ?? "-"}</TableCell>
                      <TableCell>{p.mikrotik_devices?.name ?? "-"}</TableCell>
                      <TableCell>{p.mikrotik_profile ?? "-"}</TableCell>
                      <TableCell className="font-mono">৳{p.selling_rate}</TableCell>
                      <TableCell>{p.validity_days}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TariffChangeLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        tariffId={logTariff?.id ?? null}
        tariffName={logTariff?.name ?? ""}
      />
    </div>
  );
}
