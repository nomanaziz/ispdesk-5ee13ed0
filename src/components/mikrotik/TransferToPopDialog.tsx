import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowRightLeft, Check, ChevronsUpDown, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedIds: string[];
  onTransferred: () => void;
}

export function TransferToPopDialog({ open, onOpenChange, selectedIds, onTransferred }: Props) {
  const qc = useQueryClient();
  const [popId, setPopId] = useState<string>("");
  const [popPickerOpen, setPopPickerOpen] = useState(false);

  useEffect(() => { if (!open) { setPopId(""); } }, [open]);

  const { data: pops = [] } = useQuery({
    queryKey: ["pops_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, pop_code, branch_id, tariff_id, pop_type, balance, status, fund_started, allow_negative_balance")
        .order("name");
      if (error) throw error;
      return (data || []).filter((p: any) => (p.status || "").toLowerCase() === "active");
    },
    enabled: open,
  });

  const { data: selectedRows = [] } = useQuery({
    queryKey: ["mt_selected_for_transfer", selectedIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mikrotik_clients")
        .select("id, name, profile, service")
        .in("id", selectedIds);
      if (error) throw error;
      return data || [];
    },
    enabled: open && selectedIds.length > 0,
  });

  // Group selected users by profile
  const profileGroups = useMemo(() => {
    const map = new Map<string, number>();
    (selectedRows as any[]).forEach((r) => {
      const k = r.profile || "(no profile)";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([profile, count]) => ({ profile, count }));
  }, [selectedRows]);

  const selectedPop = pops.find((p: any) => p.id === popId);

  // Load all packages in POP's tariff
  const { data: tariffPackages = [] } = useQuery({
    queryKey: ["pop_tariff_packages_all", selectedPop?.tariff_id],
    queryFn: async () => {
      if (!selectedPop?.tariff_id) return [];
      const { data, error } = await supabase
        .from("reseller_tariff_packages")
        .select("id, package_id, mikrotik_server_id, mikrotik_profile, selling_rate, validity_days, isp_packages(name), mikrotik_devices:mikrotik_devices!reseller_tariff_packages_mikrotik_server_id_fkey(id, name, ip_address)")
        .eq("tariff_id", selectedPop.tariff_id)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPop?.tariff_id,
  });

  // Per-profile match: for each user profile, pick cheapest matching package in tariff
  const matched = useMemo(() => {
    return profileGroups.map((g) => {
      const candidates = (tariffPackages as any[]).filter(
        (p) => (p.mikrotik_profile || "").toLowerCase() === (g.profile || "").toLowerCase()
      );
      candidates.sort((a, b) => Number(a.selling_rate || 0) - Number(b.selling_rate || 0));
      const pkg = candidates[0] || null;
      const perDay = pkg ? (Number(pkg.selling_rate || 0) / Math.max(Number(pkg.validity_days || 30), 1)) : 0;
      return { ...g, pkg, perDay, dayDebit: +(perDay * g.count).toFixed(2) };
    });
  }, [profileGroups, tariffPackages]);

  const unmatchedProfileSet = useMemo(
    () => new Set(matched.filter((m) => !m.pkg).map((m) => (m.profile || "").toLowerCase())),
    [matched]
  );

  // Per-user issue analysis
  const userIssues = useMemo(() => {
    return (selectedRows as any[]).map((u) => {
      const issues: ("profile_mismatch" | "protocol_mismatch")[] = [];
      const svc = (u.service || "").toLowerCase();
      if (svc !== "pppoe") issues.push("protocol_mismatch");
      if (unmatchedProfileSet.has((u.profile || "").toLowerCase())) issues.push("profile_mismatch");
      return { ...u, issues };
    });
  }, [selectedRows, unmatchedProfileSet]);

  const profileMismatchUsers = userIssues.filter((u) => u.issues.includes("profile_mismatch"));
  const protocolMismatchUsers = userIssues.filter((u) => u.issues.includes("protocol_mismatch"));

  // Group helper
  const groupUsersBy = (users: any[], key: "profile" | "service") => {
    const m = new Map<string, any[]>();
    users.forEach((u) => {
      const k = u[key] || "(none)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    });
    return Array.from(m.entries()).map(([value, list]) => ({ value, users: list }));
  };

  // Totals only from valid users (no issues)
  const validProfileCounts = useMemo(() => {
    const m = new Map<string, number>();
    userIssues.filter((u) => u.issues.length === 0).forEach((u) => {
      const k = u.profile || "(no profile)";
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [userIssues]);

  const totalCreditable = +Array.from(validProfileCounts.entries()).reduce((s, [profile, count]) => {
    const m = matched.find((mm) => mm.profile === profile);
    if (!m?.pkg) return s;
    const perDay = Number(m.pkg.selling_rate || 0) / Math.max(Number(m.pkg.validity_days || 30), 1);
    return s + perDay * count;
  }, 0).toFixed(2);
  const totalMonthly = +Array.from(validProfileCounts.entries()).reduce((s, [profile, count]) => {
    const m = matched.find((mm) => mm.profile === profile);
    return s + (m?.pkg ? Number(m.pkg.selling_rate || 0) * count : 0);
  }, 0).toFixed(2);

  const unmatchedCount = profileMismatchUsers.length;
  const protocolMismatchCount = protocolMismatchUsers.length;
  const blockedByIssues = unmatchedCount > 0 || protocolMismatchCount > 0;

  const [openProfile, setOpenProfile] = useState(false);
  const [openProtocol, setOpenProtocol] = useState(false);
  const [openSubGroups, setOpenSubGroups] = useState<Record<string, boolean>>({});
  const toggleSub = (k: string) => setOpenSubGroups((s) => ({ ...s, [k]: !s[k] }));

  const balanceShort =
    !!selectedPop?.fund_started &&
    !selectedPop?.allow_negative_balance &&
    totalCreditable > Number(selectedPop?.balance || 0);

  const transfer = useMutation({
    mutationFn: async () => {
      if (!popId || !selectedPop) throw new Error("POP সিলেক্ট করুন");
      if (!selectedPop?.tariff_id) throw new Error("এই POP-এ tariff assigned নাই");
      if (!selectedPop?.branch_id) throw new Error("এই POP-এর কোনো branch assign করা নেই");
      if (unmatchedCount > 0) throw new Error(`${unmatchedCount} জন user-এর profile POP-এর tariff-এ নেই — আগে MikroTik-এ profile change করুন বা POP-এর tariff-এ এই package add করুন`);
      if (balanceShort) throw new Error(`POP-এর balance অপ্রতুল (${selectedPop.balance} < ${totalCreditable})`);

      const { data: { user } } = await supabase.auth.getUser();

      const { data: mkRows, error: mkErr } = await supabase
        .from("mikrotik_clients")
        .select("id, name, password, profile, caller_id, remote_address, service")
        .in("id", selectedIds);
      if (mkErr) throw mkErr;

      const usernames = (mkRows || []).map((r: any) => r.name).filter(Boolean);
      const { data: existing } = await supabase
        .from("clients")
        .select("username")
        .in("username", usernames);
      const existingSet = new Set((existing || []).map((c: any) => c.username?.toLowerCase()));

      // Build profile→matched-pkg lookup
      const pkgByProfile = new Map<string, any>();
      matched.forEach((m) => { if (m.pkg) pkgByProfile.set((m.profile || "").toLowerCase(), m.pkg); });

      const newClients = (mkRows || [])
        .filter((r: any) => r.name && !existingSet.has(r.name.toLowerCase()))
        .map((r: any) => {
          const pkg = pkgByProfile.get((r.profile || "").toLowerCase());
          if (!pkg) return null;
          return {
            name: r.name,
            username: r.name,
            password: r.password || "",
            profile: pkg.mikrotik_profile, // force POP package profile
            mac_address: r.caller_id || null,
            remote_address: r.remote_address || null,
            connection_type: r.service || null,
            mikrotik_id: pkg?.mikrotik_devices?.id || null,
            server_name: pkg?.mikrotik_devices?.name || null,
            branch_id: selectedPop.branch_id,
            package_id: pkg.package_id,
            monthly_bill: Number(pkg.selling_rate || 0),
            status: "active",
            mikrotik_status: "enabled",
            owner_scope: "pop",
          };
        })
        .filter(Boolean);

      let createdCount = 0;
      if (newClients.length > 0) {
        const { error: insErr } = await supabase.from("clients").insert(newClients as any);
        if (insErr) throw insErr;
        createdCount = newClients.length;
      }
      const skipped = selectedIds.length - createdCount;

      const firstMikrotikId = (newClients[0] as any)?.mikrotik_id || null;
      const { error } = await supabase
        .from("mikrotik_clients")
        .update({
          transferred_to_pop_id: popId,
          transferred_to_mikrotik_id: firstMikrotikId,
          mikrotik_id: firstMikrotikId,
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id ?? null,
          exported: true,
          exported_to: `pop:${popId}`,
        })
        .in("id", selectedIds);
      if (error) throw error;

      if (totalCreditable > 0 && selectedPop.fund_started) {
        const desc = matched.filter((m) => m.pkg).map((m) => `${m.count}× ${m.pkg.isp_packages?.name || m.pkg.mikrotik_profile}`).join(", ");
        const { error: fErr } = await supabase.from("branch_funding").insert({
          branch_id: selectedPop.branch_id,
          amount: totalCreditable,
          received_amount: totalCreditable,
          trans_type: "refund",
          type: "deduction",
          payment_method: "system",
          funding_date: new Date().toISOString().slice(0, 10),
          description: `MikroTik export: ${desc}`,
          remarks: `Auto-debit: MikroTik users → POP ${selectedPop.name}`,
          status: "approved",
          created_by: user?.id ?? null,
        });
        if (fErr) throw fErr;
      }

      return { createdCount, skipped, totalCreditable, fundStarted: !!selectedPop.fund_started };
    },
    onSuccess: (res) => {
      const { createdCount, skipped, totalCreditable, fundStarted } = res;
      const base = fundStarted
        ? `${createdCount} client তৈরি — ৳${totalCreditable} POP balance থেকে কাটা হয়েছে`
        : `${createdCount} client তৈরি — Free mode (balance unchanged)`;
      toast.success(base + (skipped > 0 ? ` (${skipped} duplicate skip)` : ""));
      qc.invalidateQueries({ queryKey: ["mikrotik_clients"] });
      qc.invalidateQueries({ queryKey: ["existing_client_usernames"] });
      qc.invalidateQueries({ queryKey: ["pops_for_transfer"] });
      onTransferred();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Export to POP/Reseller
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">{selectedIds.length}</Badge> জন MikroTik ইউজার POP-এ পাঠানো হবে। প্রতিটি profile POP-এর tariff-এর সাথে auto-match হবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>POP Reseller</Label>
            <Popover open={popPickerOpen} onOpenChange={setPopPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedPop ? (
                    <span>{selectedPop.name} {selectedPop.pop_code ? `(${selectedPop.pop_code})` : ""} — ৳{Number(selectedPop.balance || 0).toFixed(0)}</span>
                  ) : (
                    <span className="text-muted-foreground">POP বাছাই করুন ({pops.length})</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="নাম বা code লিখে search..." />
                  <CommandList>
                    <CommandEmpty>কোনো POP পাওয়া যায়নি</CommandEmpty>
                    <CommandGroup>
                      {pops.map((p: any) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.pop_code || ""}`}
                          onSelect={() => { setPopId(p.id); setPopPickerOpen(false); }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", popId === p.id ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{p.name} {p.pop_code ? <span className="text-muted-foreground">({p.pop_code})</span> : null}</span>
                          <span className="text-xs text-muted-foreground">৳{Number(p.balance || 0).toFixed(0)}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedPop && !selectedPop.tariff_id && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              ⚠️ এই POP-এ কোনো tariff assigned নেই। আগে tariff assign করুন।
            </div>
          )}

          {selectedPop?.tariff_id && (
            <div className="space-y-2">
              <Label>Profile → Package auto-match</Label>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">User Profile</TableHead>
                      <TableHead className="text-xs text-center">Users</TableHead>
                      <TableHead className="text-xs">Matched Package</TableHead>
                      <TableHead className="text-xs text-right">Per Day × N</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matched.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground">No selection</TableCell></TableRow>
                    )}
                    {matched.map((m) => (
                      <TableRow key={m.profile} className={!m.pkg ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs font-mono">{m.profile}</TableCell>
                        <TableCell className="text-xs text-center">{m.count}</TableCell>
                        <TableCell className="text-xs">
                          {m.pkg ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {m.pkg.isp_packages?.name || "-"} <span className="text-muted-foreground">— ৳{m.pkg.selling_rate}/{m.pkg.validity_days}d</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-destructive">
                              <XCircle className="h-3.5 w-3.5" /> No matching package in tariff
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">{m.pkg ? `৳${m.dayDebit.toFixed(2)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {unmatchedCount > 0 && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5 flex gap-1.5 items-start">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {unmatchedCount} জন user-এর profile POP-এর tariff-এ নেই। আগে MikroTik-এ profile change করুন অথবা admin থেকে POP-এর tariff-এ এই package add করুন।
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Total Monthly (sell)</div>
                  <div className="font-semibold text-base">৳{totalMonthly.toFixed(2)}</div>
                </div>
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Today's Creditable (debit)</div>
                  <div className="font-semibold text-base">৳{totalCreditable.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}

          {selectedPop && !selectedPop.fund_started && (
            <p className="text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded">
              🟢 Free mode — এই POP-এর fund start নেই, balance check হবে না।
            </p>
          )}

          {balanceShort && (
            <p className="text-xs text-destructive">
              ⚠️ POP balance ৳{Number(selectedPop?.balance || 0).toFixed(2)} — creditable ৳{totalCreditable.toFixed(2)} এর চেয়ে কম। Export blocked।
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!popId || !selectedPop?.tariff_id || transfer.isPending || unmatchedCount > 0 || balanceShort}
          >
            {transfer.isPending ? "Exporting..." : `Export ✓ (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
