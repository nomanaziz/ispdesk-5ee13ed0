import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet, CreditCard, Smartphone } from "lucide-react";

interface Gateway {
  name: string;
  category: "mobile_personal" | "mobile_merchant" | "bank" | "gateway";
  type: string;
  active: boolean;
  show_on_website: boolean;
  color: string;
  fields: Record<string, string>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  popId: string | undefined;
  popName?: string;
}

// Map admin-configured gateway "name" → backend gateway key the edge function expects
function gatewayKey(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bkash")) return "bkash";
  if (n.includes("ssl")) return "sslcommerz";
  if (n.includes("recharge")) return "rechargeserver";
  if (n.includes("nagad")) return "nagad";
  return name.toLowerCase().replace(/\s+/g, "_");
}

export default function FundRechargeDialog({ open, onOpenChange, popId, popName }: Props) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("500");
  const [loadingName, setLoadingName] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["public-payment-gateways"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_payment_gateways");
      if (error) throw error;
      return ((data as unknown) as Gateway[]) || [];
    },
    enabled: open,
  });

  // Auto-only gateways (skip manual bank/personal — this dialog is self-service auto recharge)
  const visible = useMemo(
    () => gateways.filter(g => g.active && (g.category === "gateway" || g.category === "mobile_merchant")),
    [gateways]
  );

  const startCheckout = async (gw: Gateway) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "ত্রুটি", description: "সঠিক পরিমাণ দিন", variant: "destructive" });
      return;
    }
    if (!popId) {
      toast({ title: "ত্রুটি", description: "POP detect করা যায়নি", variant: "destructive" });
      return;
    }
    setLastError(null);
    setLoadingName(gw.name);
    try {
      const key = gatewayKey(gw.name);
      const { data, error } = await supabase.functions.invoke("pop-fund-recharge", {
        body: { pop_id: popId, amount: amt, gateway: key },
      });
      if (error) throw error;
      const url = (data as any)?.redirect_url;
      if (!url) throw new Error((data as any)?.message || `${gw.name} URL missing`);
      toast({ title: `${gw.name}-এ নিয়ে যাচ্ছে...`, description: `৳${amt}` });
      window.location.href = url;
    } catch (e: any) {
      const msg = e?.message || "Recharge failed";
      setLastError(msg);
      toast({ title: `${gw.name} — ব্যর্থ`, description: msg, variant: "destructive" });
      setLoadingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loadingName && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Fund Recharge
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {popName && (
            <p className="text-xs text-muted-foreground">POP: <span className="font-medium text-foreground">{popName}</span></p>
          )}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Recharge Amount</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-lg"
              autoFocus
            />
          </div>

          {lastError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              {lastError}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Pay Using</Label>
            {isLoading && <div className="text-xs text-muted-foreground py-4 text-center">Loading...</div>}
            {!isLoading && visible.length === 0 && (
              <div className="text-xs text-muted-foreground py-6 text-center border rounded-md">
                Admin এখনো কোনো online gateway active করেননি। সরাসরি admin-এর সাথে যোগাযোগ করুন।
              </div>
            )}
            {visible.map(gw => {
              const Icon = gw.category === "gateway" ? CreditCard : Smartphone;
              const busy = loadingName === gw.name;
              const disabled = !!loadingName && !busy;
              return (
                <button
                  key={gw.name}
                  onClick={() => startCheckout(gw)}
                  disabled={disabled || busy}
                  className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition ${
                    disabled ? "opacity-50" : "hover:bg-accent hover:border-primary/40"
                  }`}
                >
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${gw.color}20`, color: gw.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{gw.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {busy ? "Processing..." : "অটোমেটিক — পেমেন্ট পেজে নিয়ে যাবে"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">৳{Number(amount) || 0}</div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
