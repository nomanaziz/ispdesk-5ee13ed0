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

  const { data: costInfo } = useQuery({
    queryKey: ["clients-recharge-cost", clients.map((c) => c.id).sort().join(",")],
    queryFn: async () =>
      await callPortal<{ items: Array<{ client_id: string; buy_rate?: number; min_activation_days?: number; daily_rate?: number; error?: string }> }>(
        "get_clients_recharge_cost",
        { client_ids: clients.map((c) => c.id) },
      ),
    enabled: open && clients.length > 0,
  });

  const costMap = useMemo(() => {
    const m = new Map<string, { daily: number; days: number; buy: number; error?: string }>();
    for (const it of costInfo?.items || []) {
      m.set(it.client_id, {
        daily: Number(it.daily_rate || 0),
        days: Number(it.min_activation_days || 0),
        buy: Number(it.buy_rate || 0),
        error: it.error,
      });
    }
    return m;
  }, [costInfo]);

  const calc = useMemo(() => {
    const n = parseInt(days) || 0;
    const lines = clients.map((c) => {
      const info = costMap.get(c.id);
      const daily = info?.daily ?? 0;
      const ok = !info?.error && daily > 0;
      return { ...c, daily, lineTotal: daily * n, ok, error: info?.error };
    });
    const valid = lines.filter((l) => l.ok);
    const total = valid.reduce((s, l) => s + l.lineTotal, 0);
    const avgDaily = valid.length ? valid.reduce((s, l) => s + l.daily, 0) / valid.length : 0;
    const invalidCount = lines.length - valid.length;
    return { lines, valid, total, avgDaily, n, invalidCount };
  }, [days, clients, costMap]);

  const exceeds = !allowNeg && calc.total > popBalance;

  const mutate = useMutation({
    mutationFn: async () => {
      const validIds = calc.valid.map((l) => l.id);
      if (!validIds.length) throw new Error("কোনো client-এর rate resolve হয়নি");
      const res: any = await callPortal("pop_bulk_recharge_clients", {
        client_ids: validIds,
        days: calc.n,
      });
      return res;
    },
    onSuccess: (res: any) => {
      const succeeded = Number(res?.succeeded || 0);
      const failed = Number(res?.failed || 0);
      const total = Number(res?.total_charged || 0);
      if (succeeded > 0) {
        toast.success(`Recharge: ${succeeded} সফল, ${failed} ব্যর্থ — মোট ৳${total.toFixed(2)} কাটা হয়েছে`);
      }
      if (failed > 0) {
        const errs: any[] = Array.isArray(res?.errors) ? res.errors : [];
        const firstMsg = errs[0]?.error || "Unknown error";
        toast.error(`${failed} client ব্যর্থ: ${firstMsg}`);
      }
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["pop-billing-clients"] });
      qc.invalidateQueries({ queryKey: ["pop-balance-info"] });
      if (succeeded > 0 && failed === 0) onOpenChange(false);
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
          <DialogDescription>Selected client গুলোর জন্য একসাথে recharge করুন। Per-day rate = package buying rate ÷ minimum activation days।</DialogDescription>
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
            {calc.invalidCount > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> {calc.invalidCount} client-এর package buying rate পাওয়া যায়নি — তারা skip হবে।
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
