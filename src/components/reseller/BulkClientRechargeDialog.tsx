import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: Array<{ id: string; monthly_bill: number; name: string }>;
}

export default function BulkClientRechargeDialog({ open, onOpenChange, clients }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [days, setDays] = useState("1");

  const { data: popInfo } = useQuery({
    queryKey: ["pop-balance-info"],
    queryFn: async () => await callPortal<{ pop: any }>("get_pop_balance_info"),
    enabled: open,
  });
  const popBalance = Number(popInfo?.pop?.balance || 0);
  const allowNeg = !!popInfo?.pop?.allow_negative_balance;

  const calc = useMemo(() => {
    const n = parseInt(days) || 0;
    const lines = clients.map((c) => {
      const monthly = Number(c.monthly_bill || 0);
      const daily = Math.round((monthly / 30) * 100) / 100;
      return { ...c, daily, lineTotal: daily * n };
    });
    const total = lines.reduce((s, l) => s + l.lineTotal, 0);
    const avgDaily = lines.length ? lines.reduce((s, l) => s + l.daily, 0) / lines.length : 0;
    return { lines, total, avgDaily, n };
  }, [days, clients]);

  const exceeds = !allowNeg && calc.total > popBalance;

  const mutate = useMutation({
    mutationFn: async () => {
      const res: any = await callPortal("pop_bulk_recharge_clients", {
        client_ids: clients.map((c) => c.id),
        days: calc.n,
      });
      return res;
    },
    onSuccess: (res: any) => {
      toast.success(`Recharge: ${res.succeeded} সফল, ${res.failed} ব্যর্থ — মোট ৳${Number(res.total_charged || 0).toFixed(2)} কাটা হয়েছে`);
      qc.invalidateQueries({ queryKey: ["pop-billing-clients"] });
      qc.invalidateQueries({ queryKey: ["pop-balance-info"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      const msg = String(e?.message || e);
      if (msg.includes("INSUFFICIENT_BALANCE")) {
        toast.error("পর্যাপ্ত balance নেই — recharge করুন", {
          action: { label: "Recharge", onClick: () => navigate("/pop-admin/fund-history/credit") },
        });
      } else {
        toast.error(msg);
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Client Validity Extend / Renewal</DialogTitle>
          <DialogDescription>Selected client গুলোর জন্য একসাথে recharge করুন। Per-day rate = monthly bill / 30।</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">New Renewal Days <span className="text-destructive">*</span></Label>
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
            {exceeds && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> Days limit exceed — POP balance ৳{popBalance.toFixed(2)} যথেষ্ট নয়।
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Avg. Per Day Charge</Label>
              <Input value={calc.avgDaily.toFixed(2)} readOnly className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs">Selected Clients</Label>
              <Input value={clients.length} readOnly className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs">POP Balance</Label>
              <Input value={popBalance.toFixed(2)} readOnly className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs">Total Creditable Amount</Label>
              <Input value={calc.total.toFixed(2)} readOnly className="bg-muted font-semibold" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => mutate.mutate()}
            disabled={mutate.isPending || calc.n < 1 || clients.length === 0 || exceeds}
          >
            {mutate.isPending ? "Processing..." : "Recharge / Renew"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
