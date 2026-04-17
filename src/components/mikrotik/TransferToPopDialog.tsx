import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    if (!open) { setPopId(""); setMikrotikId(""); }
  }, [open]);

  const { data: pops = [] } = useQuery({
    queryKey: ["pops_for_transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, name, pop_code, branch_id")
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

  const transfer = useMutation({
    mutationFn: async () => {
      if (!popId || !mikrotikId) throw new Error("POP এবং MikroTik সিলেক্ট করুন");
      const { data: { user } } = await supabase.auth.getUser();
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
    },
    onSuccess: () => {
      toast.success(`${selectedIds.length} জন ইউজার ${selectedPop?.name}-এ ট্রান্সফার হয়েছে`);
      qc.invalidateQueries({ queryKey: ["mikrotik_clients"] });
      onTransferred();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> POP-এ ট্রান্সফার
          </DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">{selectedIds.length}</Badge> জন MikroTik ইউজার নির্দিষ্ট POP-এর MikroTik সার্ভারে ট্রান্সফার করুন।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>POP (Reseller) সিলেক্ট করুন</Label>
            <Select value={popId} onValueChange={(v) => { setPopId(v); setMikrotikId(""); }}>
              <SelectTrigger><SelectValue placeholder="POP বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {pops.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.pop_code ? `(${p.pop_code})` : ""}
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
            {popId && mikrotiks.length === 0 && (
              <p className="text-xs text-destructive">এই POP-এর জন্য Admin থেকে MikroTik server assign করতে হবে।</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button
            onClick={() => transfer.mutate()}
            disabled={!popId || !mikrotikId || transfer.isPending}
          >
            {transfer.isPending ? "ট্রান্সফার হচ্ছে..." : `${selectedIds.length} জনকে ট্রান্সফার করুন`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
