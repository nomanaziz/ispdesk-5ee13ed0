import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { ArrowRightLeft, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
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
  const [packageId, setPackageId] = useState<string>("");
  const [popPickerOpen, setPopPickerOpen] = useState(false);

  useEffect(() => {
    if (!open) { setPopId(""); setPackageId(""); }
  }, [open]);

  const { data: pops = [] } = useQuery({
    queryKey: ["pops_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, pop_code, branch_id, tariff_id, pop_type, balance, status, fund_started")
        .order("name");
      if (error) throw error;
      // case-insensitive active filter — DB has mix of "Active" & "active"
      return (data || []).filter((p: any) => (p.status || "").toLowerCase() === "active");
    },
    enabled: open,
  });

  const { data: selectedRows = [] } = useQuery({
    queryKey: ["mt_selected_for_transfer", selectedIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mikrotik_clients")
        .select("id, name, profile")
        .in("id", selectedIds);
      if (error) throw error;
      return data || [];
    },
    enabled: open && selectedIds.length > 0,
  });

  const profileGroups = useMemo(() => {
    const map = new Map<string, number>();
    (selectedRows as any[]).forEach((r) => {
      const k = r.profile || "(no profile)";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [selectedRows]);
  const isMixed = profileGroups.length > 1;
  const uniqueProfile = profileGroups.length === 1 ? profileGroups[0][0] : null;

  const selectedPop = pops.find((p: any) => p.id === popId);

  const { data: packages = [] } = useQuery({
    queryKey: ["pop_tariff_packages", selectedPop?.tariff_id],
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

  const selectedPkg: any = packages.find((p: any) => p.id === packageId);
  const targetMikrotik = selectedPkg?.mikrotik_devices;
  const perDay = useMemo(() => {
    if (!selectedPkg) return 0;
    const days = Number(selectedPkg.validity_days) || 30;
    const rate = Number(selectedPkg.selling_rate) || 0;
    return days > 0 ? rate / days : 0;
  }, [selectedPkg]);
  const creditable = useMemo(() => +(perDay * selectedIds.length).toFixed(2), [perDay, selectedIds.length]);
  const monthlyPerUser = useMemo(() => Number(selectedPkg?.selling_rate) || 0, [selectedPkg]);
  const totalMonthly = useMemo(() => +(monthlyPerUser * selectedIds.length).toFixed(2), [monthlyPerUser, selectedIds.length]);
  const profileMismatch = !!(selectedPkg?.mikrotik_profile && uniqueProfile && uniqueProfile !== selectedPkg.mikrotik_profile);

  const transfer = useMutation({
    mutationFn: async () => {
      if (!popId) throw new Error("POP সিলেক্ট করুন");
      if (!packageId || !selectedPkg) throw new Error("Package সিলেক্ট করুন");
      if (!targetMikrotik?.id) throw new Error("এই Package-এ MikroTik server assigned নাই");
      if (!selectedPop?.branch_id) throw new Error("এই POP-এর কোনো branch assign করা নেই");
      if (isMixed) throw new Error("Mixed profile — single profile-এর user select করুন");
      if (profileMismatch) throw new Error(`Profile mismatch — User profile "${uniqueProfile}" ≠ Package profile "${selectedPkg.mikrotik_profile}"`);

      if (selectedPop.fund_started && Number(selectedPop.balance || 0) < creditable && !selectedPop.allow_negative_balance) {
        throw new Error(`POP-এর balance অপ্রতুল (${selectedPop.balance} < ${creditable})`);
      }

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

      const sellingRate = Number(selectedPkg.selling_rate) || 0;
      const newClients = (mkRows || [])
        .filter((r: any) => r.name && !existingSet.has(r.name.toLowerCase()))
        .map((r: any) => ({
          name: r.name,
          username: r.name,
          password: r.password || "",
          profile: r.profile || selectedPkg.mikrotik_profile || null,
          mac_address: r.caller_id || null,
          remote_address: r.remote_address || null,
          connection_type: r.service || null,
          mikrotik_id: targetMikrotik.id,
          server_name: targetMikrotik.name || null,
          branch_id: selectedPop.branch_id,
          package_id: selectedPkg.package_id,
          monthly_bill: sellingRate,
          status: "active",
          mikrotik_status: "enabled",
          owner_scope: "pop",
        }));

      let createdCount = 0;
      if (newClients.length > 0) {
        const { error: insErr } = await supabase.from("clients").insert(newClients as any);
        if (insErr) throw insErr;
        createdCount = newClients.length;
      }
      const skipped = selectedIds.length - createdCount;

      const { error } = await supabase
        .from("mikrotik_clients")
        .update({
          transferred_to_pop_id: popId,
          transferred_to_mikrotik_id: targetMikrotik.id,
          mikrotik_id: targetMikrotik.id,
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id ?? null,
          exported: true,
          exported_to: `pop:${popId}`,
        })
        .in("id", selectedIds);
      if (error) throw error;

      if (creditable > 0 && selectedPop.fund_started) {
        const { error: fErr } = await supabase.from("branch_funding").insert({
          branch_id: selectedPop.branch_id,
          amount: creditable,
          received_amount: creditable,
          trans_type: "refund",
          type: "deduction",
          payment_method: "system",
          funding_date: new Date().toISOString().slice(0, 10),
          description: `MikroTik export: ${createdCount} client × ${perDay.toFixed(2)}/day (${selectedPkg?.isp_packages?.name || ""})`,
          remarks: `Auto-debit: MikroTik users → POP ${selectedPop.name}`,
          status: "approved",
          created_by: user?.id ?? null,
        });
        if (fErr) throw fErr;
      }

      return { createdCount, skipped, creditable, fundStarted: !!selectedPop.fund_started };
    },
    onSuccess: (res) => {
      const { createdCount, skipped, creditable, fundStarted } = res;
      const base = fundStarted
        ? `${createdCount} client তৈরি — ৳${creditable} POP balance থেকে কাটা হয়েছে`
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Export to POP/Reseller
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">{selectedIds.length}</Badge> জন MikroTik ইউজার POP-এ পাঠানো হবে। POP balance থেকে creditable amount কাটা হবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isMixed && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" /> Mixed profiles detected
              </div>
              <p className="text-xs text-destructive/90">সবগুলো user-এর MikroTik profile এক হতে হবে:</p>
              <ul className="text-xs text-destructive/90 ml-4 list-disc">
                {profileGroups.map(([prof, count]) => (
                  <li key={prof}><span className="font-mono">{prof}</span> — {count} user</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-1">💡 Import page-এ "প্রোফাইল" filter দিয়ে এক profile-এর user আলাদা করে export করুন।</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>MAC/POP Reseller</Label>
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
                          onSelect={() => { setPopId(p.id); setPackageId(""); setPopPickerOpen(false); }}
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

          <div className="space-y-2">
            <Label>Package (Tariff থেকে)</Label>
            <Select value={packageId} onValueChange={setPackageId} disabled={!popId}>
              <SelectTrigger>
                <SelectValue placeholder={!popId ? "প্রথমে POP সিলেক্ট করুন" : !selectedPop?.tariff_id ? "এই POP-এ tariff assigned নাই" : packages.length === 0 ? "Package নাই" : "Package বাছাই করুন"} />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p?.isp_packages?.name || "Package"} {p.mikrotik_profile ? `(${p.mikrotik_profile})` : ""} — ৳{p.selling_rate}/{p.validity_days}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Target MikroTik সার্ভার (auto from package)</Label>
            <Input
              readOnly
              value={targetMikrotik ? `${targetMikrotik.name}${targetMikrotik.ip_address ? ` — ${targetMikrotik.ip_address}` : ""}` : "—"}
              className="bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Per Day Charge</Label>
              <Input readOnly value={perDay ? `৳${perDay.toFixed(2)}` : "—"} className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Per User Monthly</Label>
              <Input readOnly value={monthlyPerUser ? `৳${monthlyPerUser.toFixed(2)}` : "—"} className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Monthly ({selectedIds.length})</Label>
              <Input readOnly value={totalMonthly ? `৳${totalMonthly.toFixed(2)}` : "—"} className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Creditable</Label>
              <Input readOnly value={creditable ? `৳${creditable.toFixed(2)}` : "—"} className="bg-muted font-semibold" />
            </div>
          </div>

          {profileMismatch && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-2 py-1.5">
              ⚠️ User-দের MikroTik profile <span className="font-mono">"{uniqueProfile}"</span> — কিন্তু Package profile <span className="font-mono">"{selectedPkg?.mikrotik_profile}"</span>। আগে MikroTik-এ profile change করুন।
            </p>
          )}

          {selectedPop && !selectedPop.fund_started && (
            <p className="text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded">
              🟢 Free mode — এই POP-এর fund start নেই, balance check হবে না। Unlimited transfer allowed।
            </p>
          )}

          {selectedPop?.pop_type === "prepaid" && selectedPop?.fund_started && creditable > Number(selectedPop?.balance || 0) && (
            <p className="text-xs text-destructive">
              ⚠️ POP balance ৳{Number(selectedPop.balance || 0).toFixed(2)} — creditable ৳{creditable.toFixed(2)} এর চেয়ে কম। Export blocked।
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!popId || !packageId || !targetMikrotik?.id || transfer.isPending || isMixed || profileMismatch ||
              (selectedPop?.pop_type === "prepaid" && selectedPop?.fund_started && creditable > Number(selectedPop?.balance || 0))}
          >
            {transfer.isPending ? "Exporting..." : `Export ✓ (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
