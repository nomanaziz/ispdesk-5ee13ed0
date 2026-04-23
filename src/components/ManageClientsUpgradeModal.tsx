import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Users, Zap, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Slab {
  id: string;
  user_limit: number;
  monthly_price: number;
  display_order: number;
  is_active: boolean;
}

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

  const { data: slabs = [] } = useQuery({
    queryKey: ["bw-panel-pricing-slabs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_panel_pricing_slabs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return (data || []) as Slab[];
    },
  });

  const { data: customerRow } = useQuery({
    queryKey: ["bw-customer-demo-status", customer?.sub],
    enabled: !!customer?.sub && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sale_customers")
        .select("panel_demo_used, panel_subscription_expires_at")
        .eq("id", customer!.sub)
        .maybeSingle();
      return data;
    },
  });

  const demoUsed = !!(customerRow as any)?.panel_demo_used;

  const selected = slabs.find((s) => s.id === selectedId);

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
      await callActivate({
        customer_id: customer.sub,
        slab_id: selected.id,
        payment_method: "online",
        paid_amount: selected.monthly_price,
      });
      toast.success(`প্যানেল অ্যাক্সেস সক্রিয় হয়েছে — ${selected.user_limit} ইউজার পর্যন্ত`);
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
      toast.success("ফ্রি ট্রায়াল শুরু হয়েছে — ৫০ ইউজার, ৩০ দিন");
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
            Manage Your Clients — Panel Subscription
          </DialogTitle>
          <DialogDescription>
            আপনার নিজস্ব ক্লায়েন্ট ম্যানেজ করতে চান? নিচের যেকোনো প্ল্যান বেছে নিয়ে সম্পূর্ণ POP Admin প্যানেল আনলক করুন।
            MikroTik ইন্টিগ্রেশন, ক্লায়েন্ট ম্যানেজমেন্ট, বিলিং, রিপোর্ট — সব কিছু।
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {slabs.map((s) => {
            const active = s.id === selectedId;
            return (
              <Card
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg relative",
                  active && "ring-2 ring-primary shadow-lg",
                )}
              >
                {active && (
                  <Badge className="absolute -top-2 -right-2 bg-primary">
                    <Check className="h-3 w-3" />
                  </Badge>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Users className="h-4 w-4" /> {s.user_limit.toLocaleString()} ইউজার
                  </div>
                  <div className="text-2xl font-bold">
                    ৳{Number(s.monthly_price).toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">/মাস</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ৳{(Number(s.monthly_price) / s.user_limit).toFixed(2)} প্রতি ইউজার
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 mt-4 space-y-2 text-sm">
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

        <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3 mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Try Free for 1 Month
            </div>
            <div className="text-muted-foreground text-xs">
              ৫০ ইউজার পর্যন্ত — কোনো পেমেন্ট ছাড়াই ৩০ দিন ব্যবহার করুন। প্রতি কাস্টমার একবারই।
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

        <div className="flex items-center justify-between pt-4 border-t mt-2">
          <div className="text-sm text-muted-foreground">
            {selected ? (
              <>
                সিলেক্ট করেছেন: <strong>{selected.user_limit} ইউজার</strong> — ৳
                {Number(selected.monthly_price).toLocaleString()}/মাস
              </>
            ) : (
              "একটি প্ল্যান সিলেক্ট করুন"
            )}
          </div>
          <Button onClick={handlePay} disabled={!selected || paying} size="lg" className="gap-2">
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {paying ? "প্রসেস হচ্ছে..." : selected ? `Pay Now ৳${Number(selected.monthly_price).toLocaleString()}` : "Pay Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
