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
  selectedClients: any[];
  onTransferred?: () => void;
}

/**
 * Transfer existing admin-owned clients into a reseller (POP) portal.
 * - Preserves PPP enabled/disabled state, password, expire_date, etc.
 * - Only changes ownership: owner_scope, branch_id, package_id, monthly_bill, server, profile.
 * - Validates that POP's tariff has matching package for each client's profile.
 */
export default function TransferClientsToPopDialog({ open, onOpenChange, selectedClients, onTransferred }: Props) {
  const qc = useQueryClient();
  const [popId, setPopId] = useState<string>("");
  const [popPickerOpen, setPopPickerOpen] = useState(false);

  useEffect(() => { if (!open) setPopId(""); }, [open]);

  const { data: pops = [] } = useQuery({
    queryKey: ["pops_for_client_transfer"],
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

  const selectedPop = pops.find((p: any) => p.id === popId);

  // Group selected clients by profile
  const profileGroups = useMemo(() => {
    const map = new Map<string, number>();
    (selectedClients || []).forEach((r) => {
      const k = (r.profile || "(no profile)").toString();
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([profile, count]) => ({ profile, count }));
  }, [selectedClients]);

  // POP tariff packages
  const { data: tariffPackages = [] } = useQuery({
    queryKey: ["pop_tariff_packages_client_xfer", selectedPop?.tariff_id],
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

  const profileMismatchClients = useMemo(
    () => (selectedClients || []).filter((c) => unmatchedProfileSet.has((c.profile || "").toLowerCase())),
    [selectedClients, unmatchedProfileSet]
  );

  // Already in this POP?
  const alreadyInPopClients = useMemo(() => {
    if (!selectedPop?.branch_id) return [];
    return (selectedClients || []).filter((c) => c.branch_id === selectedPop.branch_id);
  }, [selectedClients, selectedPop?.branch_id]);

  const validProfileCounts = useMemo(() => {
    const m = new Map<string, number>();
    (selectedClients || [])
      .filter((c) => !unmatchedProfileSet.has((c.profile || "").toLowerCase()))
      .forEach((c) => {
        const k = c.profile || "(no profile)";
        m.set(k, (m.get(k) || 0) + 1);
      });
    return m;
  }, [selectedClients, unmatchedProfileSet]);

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

  const unmatchedCount = profileMismatchClients.length;
  const blockedByIssues = unmatchedCount > 0;

  const [openProfile, setOpenProfile] = useState(false);
  const [openSubGroups, setOpenSubGroups] = useState<Record<string, boolean>>({});
  const toggleSub = (k: string) => setOpenSubGroups((s) => ({ ...s, [k]: !s[k] }));

  const groupBy = (list: any[], key: string) => {
    const m = new Map<string, any[]>();
    list.forEach((u) => {
      const k = u[key] || "(none)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    });
    return Array.from(m.entries()).map(([value, users]) => ({ value, users }));
  };

  const balanceShort =
    !!selectedPop?.fund_started &&
    !selectedPop?.allow_negative_balance &&
    Number(totalCreditable) > Number(selectedPop?.balance || 0);

  const transfer = useMutation({
    mutationFn: async () => {
      if (!popId || !selectedPop) throw new Error("POP সিলেক্ট করুন");
      if (!selectedPop?.tariff_id) throw new Error("এই POP-এ tariff assigned নেই");
      if (!selectedPop?.branch_id) throw new Error("এই POP-এর কোনো branch assign করা নেই");
      if (unmatchedCount > 0) throw new Error(`${unmatchedCount} জন client-এর profile POP-এর tariff-এ নেই`);
      if (balanceShort) throw new Error(`POP-এর balance অপ্রতুল (${selectedPop.balance} < ${totalCreditable})`);

      const { data: { user } } = await supabase.auth.getUser();

      const pkgByProfile = new Map<string, any>();
      matched.forEach((m) => { if (m.pkg) pkgByProfile.set((m.profile || "").toLowerCase(), m.pkg); });

      // Skip clients already in this POP
      const eligible = (selectedClients || []).filter((c) => c.branch_id !== selectedPop.branch_id);
      const skipped = (selectedClients?.length || 0) - eligible.length;

      let updated = 0;
      for (const c of eligible) {
        const pkg = pkgByProfile.get((c.profile || "").toLowerCase());
        if (!pkg) continue;
        const { error } = await supabase
          .from("clients")
          .update({
            owner_scope: "pop",
            branch_id: selectedPop.branch_id,
            package_id: pkg.package_id,
            monthly_bill: Number(pkg.selling_rate || 0),
            mikrotik_id: pkg?.mikrotik_devices?.id || c.mikrotik_id || null,
            server_name: pkg?.mikrotik_devices?.name || c.server_name || null,
            profile: pkg.mikrotik_profile,
          })
          .eq("id", c.id);
        if (error) throw error;
        updated++;
      }

      if (Number(totalCreditable) > 0 && selectedPop.fund_started) {
        const desc = matched.filter((m) => m.pkg).map((m) => `${m.count}× ${m.pkg.isp_packages?.name || m.pkg.mikrotik_profile}`).join(", ");
        const { error: fErr } = await supabase.from("branch_funding").insert({
          branch_id: selectedPop.branch_id,
          amount: Number(totalCreditable),
          received_amount: Number(totalCreditable),
          trans_type: "refund",
          type: "deduction",
          payment_method: "system",
          funding_date: new Date().toISOString().slice(0, 10),
          description: `Client transfer → POP: ${desc}`,
          remarks: `Auto-debit: Admin clients → POP ${selectedPop.name}`,
          status: "approved",
          created_by: user?.id ?? null,
        });
        if (fErr) throw fErr;
      }

      return { updated, skipped, totalCreditable: Number(totalCreditable), fundStarted: !!selectedPop.fund_started, popName: selectedPop.name };
    },
    onSuccess: (res) => {
      const { updated, skipped, totalCreditable, fundStarted, popName } = res;
      const base = fundStarted
        ? `${updated} client ${popName}-এ ট্রান্সফার হয়েছে — ৳${totalCreditable} POP balance থেকে কাটা হয়েছে`
        : `${updated} client ${popName}-এ ট্রান্সফার হয়েছে — Free mode (balance unchanged)`;
      toast.success(base + (skipped > 0 ? ` (${skipped} আগে থেকেই এই POP-এ ছিল, skip)` : ""));
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["pops_for_client_transfer"] });
      onTransferred?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> রিসেলার / POP-এ ট্রান্সফার
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">{selectedClients?.length || 0}</Badge> জন client POP-এ ট্রান্সফার হবে। PPP enable/disable অবস্থা অপরিবর্তিত থাকবে।
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

          {alreadyInPopClients.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              ⚠️ {alreadyInPopClients.length} জন client আগে থেকেই এই POP-এ আছে — এদের skip করা হবে।
            </div>
          )}

          {selectedPop?.tariff_id && (
            <div className="space-y-2">
              <Label>Profile → Package auto-match</Label>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Client Profile</TableHead>
                      <TableHead className="text-xs text-center">Clients</TableHead>
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
                              <XCircle className="h-3.5 w-3.5" /> POP-এর tariff-এ এই package নেই
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right">{m.pkg ? `৳${m.dayDebit.toFixed(2)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {blockedByIssues && (
                <div className="space-y-2">
                  <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      {unmatchedCount} জন client-এর <b>profile mismatch</b>। আগে এই client-গুলোর package change করুন বা POP-এর tariff-এ এই package add করুন।
                    </span>
                  </div>

                  <div className="rounded-md border divide-y">
                    <Collapsible open={openProfile} onOpenChange={setOpenProfile}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-sm">
                        <span className="flex items-center gap-2">
                          <ChevronRight className={cn("h-4 w-4 transition-transform", openProfile && "rotate-90")} />
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="font-medium">Profile mismatch</span>
                        </span>
                        <Badge variant="destructive">{unmatchedCount} client</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="bg-muted/30">
                        {groupBy(profileMismatchClients, "profile").map((g) => {
                          const k = `prof:${g.value}`;
                          return (
                            <div key={k} className="border-t">
                              <button
                                type="button"
                                onClick={() => toggleSub(k)}
                                className="w-full flex items-center justify-between px-8 py-1.5 hover:bg-muted/50 text-xs"
                              >
                                <span className="flex items-center gap-2">
                                  <ChevronRight className={cn("h-3 w-3 transition-transform", openSubGroups[k] && "rotate-90")} />
                                  <span className="font-mono">{g.value}</span>
                                </span>
                                <span className="text-muted-foreground">{g.users.length} client</span>
                              </button>
                              {openSubGroups[k] && (
                                <ul className="px-12 py-1.5 text-xs space-y-0.5 bg-background/50">
                                  {g.users.map((u: any) => (
                                    <li key={u.id} className="font-mono text-muted-foreground">
                                      {u.name} <span className="text-[10px]">({u.username || u.client_id || "—"})</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Total Monthly (sell)</div>
                  <div className="font-semibold text-base">৳{Number(totalMonthly).toFixed(2)}</div>
                </div>
                <div className="rounded border p-2">
                  <div className="text-muted-foreground">Today's Creditable (debit)</div>
                  <div className="font-semibold text-base">৳{Number(totalCreditable).toFixed(2)}</div>
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
              ⚠️ POP balance ৳{Number(selectedPop?.balance || 0).toFixed(2)} — creditable ৳{Number(totalCreditable).toFixed(2)} এর চেয়ে কম। Transfer blocked।
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!popId || !selectedPop?.tariff_id || transfer.isPending || blockedByIssues || balanceShort || (selectedClients?.length || 0) === 0}
          >
            {transfer.isPending ? "ট্রান্সফার হচ্ছে..." : `ট্রান্সফার করুন (${selectedClients?.length || 0})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
