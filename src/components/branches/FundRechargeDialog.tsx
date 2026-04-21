import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  popId: string | undefined;
  popName?: string;
}

export default function FundRechargeDialog({ open, onOpenChange, popId, popName }: Props) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("500");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "ত্রুটি", description: "সঠিক পরিমাণ দিন", variant: "destructive" });
      return;
    }
    if (!popId) {
      toast({ title: "ত্রুটি", description: "POP detect করা যায়নি", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pop-fund-recharge", {
        body: { pop_id: popId, amount: amt, gateway: "bkash" },
      });
      if (error) throw error;
      const url = (data as any)?.redirect_url;
      if (!url) throw new Error((data as any)?.message || "bKash URL missing");
      toast({ title: "bKash-এ নিয়ে যাচ্ছে...", description: `৳${amt}` });
      window.location.href = url;
    } catch (e: any) {
      toast({ title: "ব্যর্থ", description: e?.message || "Recharge failed", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
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

          <div className="text-center space-y-2 py-2">
            <p className="text-sm font-medium">Pay Using bKash</p>
            <div
              className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-md border"
              style={{ backgroundColor: "hsl(330 80% 96%)", borderColor: "hsl(330 80% 85%)", color: "hsl(330 80% 45%)" }}
            >
              <span className="font-bold">bKash</span>
              <span>Payment</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
            {loading ? "Processing..." : `Go For Pay (৳${Number(amount) || 0})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
