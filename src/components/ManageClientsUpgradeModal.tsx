import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Users, TrendingUp, Gift, ShieldCheck, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tier {
  id: string;
  tier_name: string | null;
  min_users: number;
  max_users: number | null;
  billing_mode: "flat" | "per_user" | "free";
  flat_price: number | null;
  per_user_rate: number | null;
  display_order: number;
  is_active: boolean;
}

const tierIcon = (mode: string) =>
  mode === "flat" ? Users : mode === "per_user" ? TrendingUp : Gift;

const tierAccent: Record<string, string> = {
  flat: "border-primary/40 hover:border-primary",
  per_user: "border-amber-500/40 hover:border-amber-500",
  free: "border-emerald-500/40 hover:border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5",
};

const formatRange = (t: Tier) =>
  t.max_users == null
    ? `${t.min_users.toLocaleString()}+ users`
    : `${t.min_users.toLocaleString()}–${t.max_users.toLocaleString()} users`;

export default function ManageClientsUpgradeModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { customer, refresh } = usePortalAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [trialing, setTrialing] = useState(false);

  const { data: tiers = [] } = useQuery({
    queryKey: ["bw-panel-pricing-slabs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_panel_pricing_slabs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return (data || []) as unknown as Tier[];
    },
  });

  const { data: customerRow } = useQuery({
    queryKey: ["bw-customer-usage", customer?.sub],
    enabled: !!customer?.sub && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sale_customers")
        .select(
          "panel_demo_used, panel_subscription_expires_at, active_client_count, current_tier_id, next_month_estimated_bill",
        )
        .eq("id", customer!.sub)
        .maybeSingle();
      return data;
    },
  });

  const demoUsed = !!(customerRow as any)?.panel_demo_used;
  const activeCount = Number((customerRow as any)?.active_client_count || 0);
  const currentTierId = (customerRow as any)?.current_tier_id as string | null;
  const nextBill = Number((customerRow as any)?.next_month_estimated_bill || 0);
  const currentTier = tiers.find((t) => t.id === currentTierId);

  const selected = tiers.find((t) => t.id === selectedId);

  const callActivate = async (body: Record<string, unknown>) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/activate-panel-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Activation failed");
    return data;
  };

  const handlePay = async () => {
    if (!selected || !customer?.sub) return;
    setPaying(true);
    try {
      const amount =
        selected.billing_mode === "flat"
          ? Number(selected.flat_price || 0)
          : selected.billing_mode === "per_user"
            ? Number(selected.per_user_rate || 0) * activeCount
            : 0;
      await callActivate({
        customer_id: customer.sub,
        slab_id: selected.id,
        payment_method: "online",
        paid_amount: amount,
      });
      toast.success(`প্যানেল অ্যাক্সেস সক্রিয় হয়েছে — ${selected.tier_name || ""}`);
      await refresh();
      onOpenChange(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const handleTrial = async () => {
    if (!customer?.sub) return;
    if (demoUsed) {
      toast.error("ফ্রি ট্রায়াল ইতিমধ্যে ব্যবহার করা হয়েছে");
      return;
    }
    setTrialing(true);
    try {
      await callActivate({ customer_id: customer.sub, trial: true });
      toast.success("ফ্রি ট্রায়াল শুরু হয়েছে — ৩০ দিন");
      await refresh();
      onOpenChange(false);
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e.message || "Trial failed");
    } finally {
      setTrialing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Manage Your Clients — Subscription Plans
          </DialogTitle>
          <DialogDescription>
            আপনার active client count অনুযায়ী auto-tier billing। যত client বাড়বে, plan তত বড়।
            ৩,০০০ ছাড়ালে সম্পূর্ণ ফ্রি।
          </DialogDescription>
        </DialogHeader>

        {/* Current usage banner */}
        <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 p-4 flex items-center gap-3">
          <div className="rounded-lg bg-background p-2 shadow-sm">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              আপনার এখন <span className="text-primary">{activeCount.toLocaleString()}</span> জন
              active client আছেন
            </div>
            <div className="text-sm text-muted-foreground">
              {currentTier ? (
                <>
                  বর্তমান Tier: <strong>{currentTier.tier_name}</strong> —{" "}
                  {nextBill === 0 ? (
                    <span className="text-emerald-600 font-semibold">পরের মাস FREE 🎉</span>
                  ) : (
                    <>পরের মাসে আনুমানিক bill: <strong>৳{nextBill.toLocaleString()}</strong></>
                  )}
                </>
              ) : (
                "Plan select করে আপনার প্যানেল active করুন"
              )}
            </div>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {tiers.map((t) => {
            const active = t.id === selectedId;
            const isCurrent = t.id === currentTierId;
            const Icon = tierIcon(t.billing_mode);
            return (
              <Card
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg relative border-2",
                  tierAccent[t.billing_mode],
                  active && "ring-2 ring-primary shadow-lg",
                )}
              >
                {active && (
                  <Badge className="absolute -top-2 -right-2 bg-primary">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-2 left-3 bg-emerald-600 hover:bg-emerald-600">
                    আপনি এখানে
                  </Badge>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">
                      P#{t.display_order} {t.tier_name}
                    </span>
                    {t.billing_mode === "free" && <span className="text-lg">⭐</span>}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {formatRange(t)}
                  </div>
                  <div className="pt-1">
                    {t.billing_mode === "flat" && (
                      <>
                        <div className="text-3xl font-bold">
                          ৳{Number(t.flat_price).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">প্রতি মাসে flat</div>
                      </>
                    )}
                    {t.billing_mode === "per_user" && (
                      <>
                        <div className="text-3xl font-bold">
                          ৳{Number(t.per_user_rate)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            × user
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">প্রতি মাসে</div>
                      </>
                    )}
                    {t.billing_mode === "free" && (
                      <>
                        <div className="text-3xl font-bold text-emerald-600">FREE</div>
                        <div className="text-xs text-muted-foreground">কোনো charge নেই</div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" /> এই প্ল্যানে যা পাবেন:
          </div>
          <ul className="grid sm:grid-cols-2 gap-1.5 text-muted-foreground pl-6 list-disc">
            <li>MikroTik সার্ভার যোগ ও অটো ক্লায়েন্ট কন্ট্রোল</li>
            <li>সম্পূর্ণ ক্লায়েন্ট তালিকা ও বিলিং</li>
            <li>অনলাইন মনিটরিং ও রিপোর্ট</li>
            <li>SMS গেটওয়ে ও টেমপ্লেট</li>
            <li>সাপোর্ট টিকেট সিস্টেম</li>
            <li>একাউন্টিং ও ফাইন্যান্সিয়াল রিপোর্ট</li>
          </ul>
        </div>

        <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Try Free for 1 Month
            </div>
            <div className="text-muted-foreground text-xs">
              ৩০ দিন পুরো প্যানেল ফ্রি ব্যবহার করুন। প্রতি কাস্টমার একবারই।
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleTrial}
            disabled={trialing || demoUsed}
            className="gap-2"
          >
            {trialing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {demoUsed ? "ট্রায়াল ব্যবহৃত" : trialing ? "শুরু হচ্ছে..." : "Start Free Trial"}
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selected ? (
              <>
                সিলেক্ট: <strong>{selected.tier_name}</strong> —{" "}
                {selected.billing_mode === "free"
                  ? "FREE"
                  : selected.billing_mode === "flat"
                    ? `৳${Number(selected.flat_price).toLocaleString()}/মাস`
                    : `৳${(Number(selected.per_user_rate) * activeCount).toLocaleString()}/মাস (${activeCount} users)`}
              </>
            ) : (
              "একটি প্ল্যান সিলেক্ট করুন"
            )}
          </div>
          <Button onClick={handlePay} disabled={!selected || paying} size="lg" className="gap-2">
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {paying ? "প্রসেস হচ্ছে..." : "Activate Plan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
