import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
import {
  GradientHeader, PillTabs, ListRow, StatCardPair,
} from "@/components/mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Receipt, Wallet, ChevronLeft, FileText, CreditCard, TrendingUp, TrendingDown, Zap,
} from "lucide-react";

const PortalBills = () => {
  const { customer } = usePortalAuth();
  const [tab, setTab] = useState<"all" | "due" | "paid">("all");

  const qc = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["portal-bills", customer?.sub],
    queryFn: async () => {
      const res = await callPortal<any>("get_bills");
      return (res.bills || []) as any[];
    },
    enabled: !!customer?.sub && customer?.type === "client",
  });

  const { data: quote } = useQuery({
    queryKey: ["portal-recharge-quote", customer?.sub],
    queryFn: async () => callPortal<any>("client_get_recharge_quote"),
    enabled: !!customer?.sub && customer?.type === "client",
  });

  const minDays = Math.max(1, Number(quote?.min_activation_days || 1));
  const [days, setDays] = useState<number>(0);
  const effectiveDays = days || minDays;
  const dailyRate = Number(quote?.daily_rate || 0);
  const totalAmount = Math.round(dailyRate * effectiveDays * 100) / 100;
  const [trxId, setTrxId] = useState("");
  const [sender, setSender] = useState("");
  const [method, setMethod] = useState("bkash");

  const submitRecharge = useMutation({
    mutationFn: async () => {
      return callPortal<any>("client_create_recharge_payment", {
        days: effectiveDays,
        payment_method: method,
        transaction_id: trxId || null,
        sender_number: sender || null,
      });
    },
    onSuccess: (res: any) => {
      if (res?.error) { toast.error(res.error); return; }
      toast.success(`৳${res.amount} recharge request পাঠানো হয়েছে — admin approve করলে activate হবে।`);
      setTrxId(""); setSender(""); setDays(0);
      qc.invalidateQueries({ queryKey: ["portal-recharge-quote"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });


  const totals = useMemo(() => {
    const amount = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
    const paid = bills.reduce((s, b) => s + Number(b.paid || 0), 0);
    const due = bills.reduce((s, b) => s + Number(b.due || 0), 0);
    const dueCount = bills.filter((b) => Number(b.due || 0) > 0).length;
    const paidCount = bills.filter((b) => b.status === "paid").length;
    return { amount, paid, due, dueCount, paidCount };
  }, [bills]);

  const filtered = useMemo(() => {
    if (tab === "due") return bills.filter((b) => Number(b.due || 0) > 0);
    if (tab === "paid") return bills.filter((b) => b.status === "paid");
    return bills;
  }, [bills, tab]);

  return (
    <div className="md:max-w-3xl md:mx-auto">
      <GradientHeader
        variant="rose"
        leftSlot={
          <Link to="/portal/dashboard" className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        }
        title="মাসিক বিল"
        subtitle="আপনার সকল বিল ও পেমেন্ট"
        statLabel="মোট বকেয়া"
        statValue={`৳ ${totals.due.toLocaleString()}`}
      />

      <div className="px-4 -mt-6 relative z-10 space-y-4 pt-3">
        <StatCardPair
          left={{ label: "মোট বিল", value: `৳${totals.amount.toLocaleString()}`, icon: TrendingUp, tone: "info" }}
          right={{ label: "পরিশোধিত", value: `৳${totals.paid.toLocaleString()}`, icon: TrendingDown, tone: "success", hint: `${totals.paidCount} টি` }}
        />

        {/* Recharge card */}
        {quote && (
          <div className="m-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm">রিচার্জ</h3>
              {quote.expire_date && (
                <Badge variant="secondary" className="text-[10px]">Expire: {quote.expire_date}</Badge>
              )}
            </div>
            {!quote.can_recharge ? (
              <p className="text-xs text-muted-foreground">
                এখনো expire হয়নি — recharge দরকার নেই। Expire হলে এখানে option আসবে।
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Daily rate: ৳{dailyRate.toFixed(2)} · Min {minDays} day(s) · Validity {quote.validity_days}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Days</Label>
                    <Input
                      type="number"
                      min={minDays}
                      value={days || ""}
                      placeholder={String(minDays)}
                      onChange={(e) => setDays(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Total</Label>
                    <Input value={`৳${totalAmount.toFixed(2)}`} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Method</Label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="rocket">Rocket</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Sender No.</Label>
                    <Input value={sender} onChange={(e) => setSender(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Trx ID</Label>
                    <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} />
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={effectiveDays < minDays || submitRecharge.isPending}
                  onClick={() => submitRecharge.mutate()}
                >
                  {submitRecharge.isPending ? "Submitting..." : `Pay ৳${totalAmount.toFixed(2)}`}
                </Button>
              </div>
            )}
          </div>
        )}

        <PillTabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          tabs={[
            { value: "all", label: "সব", count: bills.length },
            { value: "due", label: "বকেয়া", count: totals.dueCount },
            { value: "paid", label: "পরিশোধিত", count: totals.paidCount },
          ]}
        />

        {isLoading ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground">লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="m-card p-10 text-center text-xs text-muted-foreground">কোনো বিল পাওয়া যায়নি</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => {
              const isDue = Number(b.due || 0) > 0;
              const paid = b.status === "paid";
              return (
                <ListRow
                  key={b.id}
                  icon={paid ? Wallet : isDue ? CreditCard : Receipt}
                  iconTint={paid ? "emerald" : isDue ? "rose" : "amber"}
                  title={`#${b.bill_id}`}
                  subtitle={
                    <>
                      {b.month}
                      {Number(b.paid || 0) > 0 && ` · পরিশোধ ৳${Number(b.paid).toLocaleString()}`}
                    </>
                  }
                  badge={
                    <Badge className={
                      paid
                        ? "bg-emerald-100 text-emerald-700 border-0 text-[10px]"
                        : b.status === "partial"
                        ? "bg-amber-100 text-amber-700 border-0 text-[10px]"
                        : "bg-rose-100 text-rose-700 border-0 text-[10px]"
                    }>
                      {paid ? "পরিশোধিত" : b.status === "partial" ? "আংশিক" : "বকেয়া"}
                    </Badge>
                  }
                  amount={
                    <div>
                      <div>৳{Number(b.amount || 0).toLocaleString()}</div>
                      {isDue && <div className="text-[10px] text-rose-500 font-semibold">বকেয়া ৳{Number(b.due).toLocaleString()}</div>}
                    </div>
                  }
                  amountTone={isDue ? "danger" : paid ? "success" : "neutral"}
                  to={`/portal/bills/${b.id}`}
                  rightExtra={<FileText className="h-3.5 w-3.5 text-muted-foreground/60" />}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalBills;
