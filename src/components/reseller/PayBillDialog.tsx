import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { Copy, Zap, Hand, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  invoiceNo: string;
  due: number;
  customerId: string;
  onPaid?: () => void;
}

const fnEndpoint = (name: string) => {
  switch (name) {
    case "SSLCommerz": return "sslcommerz-payment";
    case "bKash Merchant": return "bkash-payment";
    case "Nagad Merchant": return "nagad-payment";
    case "RechargeServer": return "rechargeserver-payment";
    default: return "";
  }
};

const gatewaySlug = (name: string) => {
  switch (name) {
    case "SSLCommerz": return "sslcommerz";
    case "bKash Merchant": return "bkash";
    case "Nagad Merchant": return "nagad";
    case "RechargeServer": return "rechargeserver";
    default: return "";
  }
};

const PayBillDialog = ({ open, onOpenChange, invoiceId, invoiceNo, due, customerId, onPaid }: Props) => {
  const { customer } = usePortalAuth();
  const { online, manual, isLoading } = usePaymentGateways();
  const [selected, setSelected] = useState<string>("");
  const [amount, setAmount] = useState(String(due));
  const [trxId, setTrxId] = useState("");
  const [sender, setSender] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string>("");

  const reset = () => {
    setSelected(""); setAmount(String(due)); setTrxId(""); setSender(""); setNote("");
  };

  const submitManual = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক amount দিন");
    if (!sender.trim()) return toast.error("Sender number দিন");
    if (!trxId.trim()) return toast.error("Transaction ID দিন");
    if (!customer?.session_id || !customer?.username || !customer?.type) {
      return toast.error("সেশন মেয়াদ শেষ — আবার লগইন করুন");
    }
    setBusy("manual");
    const { error } = await supabase.rpc("create_bw_invoice_manual_payment", {
      _invoice_id: invoiceId,
      _customer_id: customerId,
      _username: customer.username,
      _user_type: customer.type,
      _session_id: customer.session_id,
      _amount: amt,
      _method: selected,
      _sender_number: sender.trim() || null,
      _trx_id: trxId.trim() || null,
      _note: note.trim() || null,
    });
    setBusy("");
    if (error) return toast.error(error.message);
    toast.success("পেমেন্ট জমা হয়েছে — অনুমোদনের অপেক্ষায়");
    reset();
    onOpenChange(false);
    onPaid?.();
  };

  const startOnline = async (gwName: string) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("সঠিক amount দিন");
    if (!customer?.session_id || !customer?.username || !customer?.type) {
      return toast.error("সেশন মেয়াদ শেষ — আবার লগইন করুন");
    }
    setBusy(gwName);
    try {
      const tran_id = `BW-${invoiceNo}-${Date.now().toString().slice(-6)}`;
      const { data: prId, error: prErr } = await supabase.rpc("create_bw_invoice_payment_request", {
        _invoice_id: invoiceId,
        _customer_id: customerId,
        _username: customer.username,
        _user_type: customer.type,
        _session_id: customer.session_id,
        _amount: amt,
        _method: gwName,
        _return_origin: `${window.location.origin}${window.location.pathname}`,
      });
      if (prErr) throw prErr;
      if (!prId) throw new Error("Payment request তৈরি হয়নি");

      const fn = fnEndpoint(gwName);
      const slug = gatewaySlug(gwName);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const fnBase = `https://${projectId}.supabase.co/functions/v1`;
      const callback = `${fnBase}/payment-callback?gateway=${slug}&request_id=${prId}`;
      const success_url = `${callback}&status=success`;
      const fail_url = `${callback}&status=failed`;

      const { data, error } = await supabase.functions.invoke(fn, {
        body: {
          action: "create",
          amount: amt,
          tran_id,
          payment_request_id: prId,
          request_id: tran_id,
          callback_url: callback,
          success_url, fail_url, cancel_url: fail_url,
          product_name: `Invoice ${invoiceNo}`,
        },
      });
      if (error) throw error;

      const url =
        data?.GatewayPageURL ||
        data?.gatewayPageURL ||
        data?.bkashURL ||
        data?.paymentURL ||
        data?.payment_url ||
        data?.redirect_url ||
        data?.url;
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error(data?.message || "Gateway থেকে redirect URL পাওয়া যায়নি");
    } catch (e: any) {
      toast.error(e.message || "Online পেমেন্ট শুরু করা যায়নি — manual পদ্ধতি ব্যবহার করুন");
    } finally {
      setBusy("");
    }
  };

  const selectedManual = manual.find((m) => m.name === selected);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ইনভয়েস পেমেন্ট — {invoiceNo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-md p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">বকেয়া</span>
            <span className="font-bold text-xl text-destructive">৳ {due.toLocaleString()}</span>
          </div>

          <div>
            <Label>পরিমাণ (Amount)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          {/* Online section */}
          {online.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Zap className="h-4 w-4" /> Online পেমেন্ট (দ্রুততম)
              </div>
              <div className="grid grid-cols-2 gap-2">
                {online.map((g) => (
                  <Button
                    key={g.name}
                    onClick={() => startOnline(g.name)}
                    disabled={!!busy}
                    variant="default"
                    className="justify-start gap-2"
                  >
                    {busy === g.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {g.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(online.length > 0 && manual.length > 0) && <Separator />}

          {/* Manual section */}
          {manual.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <Hand className="h-4 w-4" /> Manual পেমেন্ট
              </div>
              <p className="text-[11px] text-muted-foreground">
                {online.length > 0 ? "Online ব্যর্থ হলে নিচের যেকোনো একটিতে টাকা পাঠান।" : "নিচের যেকোনো একটিতে টাকা পাঠান।"}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {manual.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setSelected(m.name)}
                    className={`text-left border rounded-md p-3 transition ${
                      selected === m.name ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.account ? <>এই নম্বরে পাঠান: <span className="font-mono font-semibold text-foreground">{m.account}</span></> : "নম্বর সেট করা নেই — admin এর সাথে যোগাযোগ করুন"}
                        </div>
                      </div>
                      {m.account && (
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(m.account); toast.success("Copied"); }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedManual && (
                <div className="space-y-3 border rounded-md p-3 bg-muted/30 mt-2">
                  <div className="text-xs">
                    উপরের <strong>{selectedManual.label}</strong> নম্বর{selectedManual.account ? ` (${selectedManual.account})` : ""} এ টাকা পাঠানোর পর নিচের তথ্য দিন:
                  </div>
                  <div>
                    <Label>যে নম্বর থেকে পাঠিয়েছেন (Sender Number) *</Label>
                    <Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                  <div>
                    <Label>Transaction ID *</Label>
                    <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="বিকাশ/নগদ TrxID" />
                  </div>
                  <div>
                    <Label>Note (optional)</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && online.length === 0 && manual.length === 0 && (
            <div className="text-sm text-center text-muted-foreground py-4 border rounded">
              কোনো payment gateway সক্রিয় নেই — admin এর সাথে যোগাযোগ করুন।
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          {selectedManual && (
            <Button onClick={submitManual} disabled={busy === "manual"}>
              {busy === "manual" ? "জমা হচ্ছে..." : "Manual পেমেন্ট জমা দিন"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayBillDialog;
