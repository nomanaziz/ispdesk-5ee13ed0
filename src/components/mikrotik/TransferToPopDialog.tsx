import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selectedIds: string[];
  onTransferred: () => void;
}

export function TransferToPopDialog({ open, onOpenChange, selectedIds, onTransferred }: Props) {
  const qc = useQueryClient();
  const [popId, setPopId] = useState<string>("");
  const [mikrotikId, setMikrotikId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");

  useEffect(() => {
    if (!open) { setPopId(""); setMikrotikId(""); setPackageId(""); }
  }, [open]);

  const { data: pops = [] } = useQuery({
    queryKey: ["pops_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, pop_code, branch_id, tariff_id, pop_type, balance")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const selectedPop = pops.find((p: any) => p.id === popId);

  const { data: mikrotiks = [] } = useQuery({
    queryKey: ["pop_mikrotiks", selectedPop?.branch_id],
    queryFn: async () => {
      if (!selectedPop?.branch_id) return [];
      const { data, error } = await supabase
        .from("mikrotik_devices")
        .select("id, name, ip_address")
        .eq("branch_id", selectedPop.branch_id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPop?.branch_id,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["pop_tariff_packages", selectedPop?.tariff_id],
    queryFn: async () => {
      if (!selectedPop?.tariff_id) return [];
      const { data, error } = await supabase
        .from("reseller_tariff_packages")
        .select("id, package_id, mikrotik_profile, selling_rate, validity_days, isp_packages(name)")
        .eq("tariff_id", selectedPop.tariff_id)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPop?.tariff_id,
  });

  const selectedPkg: any = packages.find((p: any) => p.id === packageId);
  const perDay = useMemo(() => {
    if (!selectedPkg) return 0;
    const days = Number(selectedPkg.validity_days) || 30;
    const rate = Number(selectedPkg.selling_rate) || 0;
    return days > 0 ? rate / days : 0;
  }, [selectedPkg]);
  const creditable = useMemo(() => +(perDay * selectedIds.length).toFixed(2), [perDay, selectedIds.length]);

  const transfer = useMutation({
    mutationFn: async () => {
      if (!popId || !mikrotikId) throw new Error("POP এবং MikroTik সিলেক্ট করুন");
      if (!packageId || !selectedPkg) throw new Error("Package সিলেক্ট করুন");
      if (!selectedPop?.branch_id) throw new Error("এই POP-এর কোনো branch assign করা নেই");

      // Prepaid balance check
      if (selectedPop.pop_type === "prepaid" && Number(selectedPop.balance || 0) < creditable) {
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
          mikrotik_id: mikrotikId,
          server_name: mikrotiks.find((m: any) => m.id === mikrotikId)?.name || null,
          branch_id: selectedPop.branch_id,
          package_id: selectedPkg.package_id,
          monthly_bill: sellingRate,
          status: "active",
          mikrotik_status: "enabled",
        }));

      let createdCount = 0;
      let createdIds: string[] = [];
      if (newClients.length > 0) {
        const { data: ins, error: insErr } = await supabase
          .from("clients")
          .insert(newClients as any)
          .select("id");
        if (insErr) throw insErr;
        createdCount = ins?.length || 0;
        createdIds = (ins || []).map((r: any) => r.id);
      }
      const skipped = selectedIds.length - createdCount;

      // Update mikrotik_clients
      const { error } = await supabase
        .from("mikrotik_clients")
        .update({
          transferred_to_pop_id: popId,
          transferred_to_mikrotik_id: mikrotikId,
          mikrotik_id: mikrotikId,
          transferred_at: new Date().toISOString(),
          transferred_by: user?.id ?? null,
          exported: true,
          exported_to: `pop:${popId}`,
        })
        .in("id", selectedIds);
      if (error) throw error;

      // Debit POP balance via branch_funding (refund trans_type subtracts via trigger)
      if (creditable > 0) {
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

      return { createdCount, skipped, creditable };
    },
    onSuccess: (res) => {
      const { createdCount, skipped, creditable } = res;
      toast.success(
        `${createdCount} client তৈরি — ৳${creditable} POP balance থেকে কাটা হয়েছে` +
        (skipped > 0 ? ` (${skipped} duplicate skip)` : "")
      );
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
          <div className="space-y-2">
            <Label>MAC/POP Reseller</Label>
            <Select value={popId} onValueChange={(v) => { setPopId(v); setMikrotikId(""); setPackageId(""); }}>
              <SelectTrigger><SelectValue placeholder="POP বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {pops.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.pop_code ? `(${p.pop_code})` : ""} — ৳{Number(p.balance || 0).toFixed(0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>টার্গেট MikroTik সার্ভার</Label>
            <Select value={mikrotikId} onValueChange={setMikrotikId} disabled={!popId}>
              <SelectTrigger>
                <SelectValue placeholder={!popId ? "প্রথমে POP সিলেক্ট করুন" : mikrotiks.length === 0 ? "এই POP-এ কোনো MikroTik নেই" : "MikroTik বাছাই করুন"} />
              </SelectTrigger>
              <SelectContent>
                {mikrotiks.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} {m.ip_address ? `— ${m.ip_address}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Package</Label>
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Per Day Charge</Label>
              <Input readOnly value={perDay ? `৳${perDay.toFixed(2)}` : "—"} className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Selected Clients</Label>
              <Input readOnly value={selectedIds.length} className="bg-muted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Creditable Amount</Label>
              <Input readOnly value={creditable ? `৳${creditable.toFixed(2)}` : "—"} className="bg-muted font-semibold" />
            </div>
          </div>

          {selectedPop?.pop_type === "prepaid" && creditable > Number(selectedPop?.balance || 0) && (
            <p className="text-xs text-destructive">
              ⚠️ POP balance ৳{Number(selectedPop.balance || 0).toFixed(2)} — creditable ৳{creditable.toFixed(2)} এর চেয়ে কম। Export blocked।
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!popId || !mikrotikId || !packageId || transfer.isPending ||
              (selectedPop?.pop_type === "prepaid" && creditable > Number(selectedPop?.balance || 0))}
          >
            {transfer.isPending ? "Exporting..." : `Export ✓ (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
