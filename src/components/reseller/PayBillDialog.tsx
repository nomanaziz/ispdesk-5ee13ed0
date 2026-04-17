import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string;
  invoiceNo: string;
  due: number;
  customerId: string;
  onPaid?: () => void;
}

const PayBillDialog = ({ open, onOpenChange, invoiceId, invoiceNo, due, customerId, onPaid }: Props) => {
  const [method, setMethod] = useState("bkash");
  const [amount, setAmount] = useState(String(due));
  const [trxId, setTrxId] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    const { error } = await supabase.from("bw_sale_collections").insert({
      invoice_id: invoiceId,
      customer_id: customerId,
      amount: amt,
      balance_due: Math.max(0, due - amt),
      payment_method: method,
      note: trxId ? `TrxID: ${trxId}` : null,
      status: "pending",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted for review");
    onOpenChange(false);
    onPaid?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoiceNo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Amount</span>
              <span className="font-bold text-lg">৳ {due.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <Label>Payment Method</Label>
            <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-3 gap-2 mt-2">
              {[
                { v: "bkash", l: "bKash" },
                { v: "nagad", l: "Nagad" },
                { v: "rocket", l: "Rocket" },
                { v: "bank", l: "Bank" },
                { v: "cash", l: "Cash" },
                { v: "card", l: "Card" },
              ].map((o) => (
                <label
                  key={o.v}
                  className={`border rounded-md p-2 text-center cursor-pointer text-sm ${
                    method === o.v ? "border-primary bg-primary/10" : ""
                  }`}
                >
                  <RadioGroupItem value={o.v} className="sr-only" />
                  {o.l}
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Transaction ID (optional)</Label>
            <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="bKash TrxID..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayBillDialog;
