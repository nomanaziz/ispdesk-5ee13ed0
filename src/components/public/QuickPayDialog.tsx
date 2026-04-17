import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Smartphone, ArrowLeft, CheckCircle2, Copy, Wallet } from "lucide-react";

// Placeholder config — পরে admin settings page থেকে আসবে
const PAYMENT_CONFIG = {
  bank: {
    bank_name: "ডাচ-বাংলা ব্যাংক",
    account_name: "ISP Desk Ltd",
    account_no: "1234567890123",
    branch: "ঢাকা প্রধান শাখা",
    routing: "090260435",
  },
  bkash_personal: { number: "01700-000000", type: "Personal" },
  nagad_personal: { number: "01700-000000", type: "Personal" },
};

type Method = "bank" | "bkash_personal" | "nagad_personal" | "bkash_merchant" | "nagad_merchant" | "rechargeserver";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any;
  defaultAmount: number;
}

export default function QuickPayDialog({ open, onOpenChange, client, defaultAmount }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"choose" | "form" | "done">("choose");
  const [method, setMethod] = useState<Method | null>(null);
  const [amount, setAmount] = useState(String(defaultAmount || 0));
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("choose");
    setMethod(null);
    setAmount(String(defaultAmount || 0));
    setTrxId("");
    setSenderNumber("");
    setNote("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const pickMethod = (m: Method) => {
    if (m === "bkash_merchant" || m === "nagad_merchant" || m === "rechargeserver") {
      toast({
        title: "শীঘ্রই আসছে",
        description: "এই পেমেন্ট পদ্ধতি Phase 2-এ যোগ হবে। এখন Bank, bKash Personal, বা Nagad Personal ব্যবহার করুন।",
      });
      return;
    }
    setMethod(m);
    setStep("form");
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: "কপি হয়েছে", description: txt });
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "ত্রুটি", description: "সঠিক পরিমাণ দিন", variant: "destructive" });
      return;
    }
    if (!trxId.trim()) {
      toast({ title: "ত্রুটি", description: "Transaction ID দিন", variant: "destructive" });
      return;
    }
    if ((method === "bkash_personal" || method === "nagad_personal") && !senderNumber.trim()) {
      toast({ title: "ত্রুটি", description: "যে নম্বর থেকে পাঠিয়েছেন সেটা দিন", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("public_payment_requests").insert({
      client_id: client.id,
      amount: amt,
      method: method!,
      trx_id: trxId.trim(),
      sender_number: senderNumber.trim() || null,
      note: note.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "ব্যর্থ", description: error.message, variant: "destructive" });
      return;
    }
    setStep("done");
  };

  const methodLabel: Record<Method, string> = {
    bank: "ব্যাংক ট্রান্সফার",
    bkash_personal: "বিকাশ (Personal)",
    nagad_personal: "নগদ (Personal)",
    bkash_merchant: "বিকাশ (Merchant)",
    nagad_merchant: "নগদ (Merchant)",
    rechargeserver: "RechargeServer Gateway",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "পেমেন্ট পদ্ধতি বাছাই করুন"}
            {step === "form" && method && `${methodLabel[method]} — তথ্য দিন`}
            {step === "done" && "জমা হয়েছে ✓"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {client?.name} — মোট দিতে: <span className="font-bold text-foreground">৳{defaultAmount}</span>
            </p>

            <MethodCard
              icon={<Building2 className="h-5 w-5" />}
              title="ব্যাংক ট্রান্সফার"
              desc="Bank account-এ পাঠিয়ে Transaction ID দিন"
              onClick={() => pickMethod("bank")}
            />
            <MethodCard
              icon={<Smartphone className="h-5 w-5 text-pink-600" />}
              title="বিকাশ (Personal)"
              desc="Send Money করে Trx ID submit করুন"
              onClick={() => pickMethod("bkash_personal")}
            />
            <MethodCard
              icon={<Smartphone className="h-5 w-5 text-orange-600" />}
              title="নগদ (Personal)"
              desc="Send Money করে Trx ID submit করুন"
              onClick={() => pickMethod("nagad_personal")}
            />
            <MethodCard
              icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
              title="বিকাশ/নগদ Merchant — শীঘ্রই"
              desc="Phase 2-এ চালু হবে"
              onClick={() => pickMethod("bkash_merchant")}
              disabled
            />
            <MethodCard
              icon={<Wallet className="h-5 w-5 text-muted-foreground" />}
              title="RechargeServer Gateway — শীঘ্রই"
              desc="Phase 2-এ চালু হবে"
              onClick={() => pickMethod("rechargeserver")}
              disabled
            />
          </div>
        )}

        {step === "form" && method === "bank" && (
          <div className="space-y-3">
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-sm space-y-1">
                <Row label="ব্যাংক" value={PAYMENT_CONFIG.bank.bank_name} onCopy={copy} />
                <Row label="A/C নাম" value={PAYMENT_CONFIG.bank.account_name} onCopy={copy} />
                <Row label="A/C নং" value={PAYMENT_CONFIG.bank.account_no} onCopy={copy} mono />
                <Row label="শাখা" value={PAYMENT_CONFIG.bank.branch} onCopy={copy} />
                <Row label="Routing" value={PAYMENT_CONFIG.bank.routing} onCopy={copy} mono />
              </CardContent>
            </Card>
            <FormFields
              amount={amount} setAmount={setAmount}
              trxId={trxId} setTrxId={setTrxId}
              senderNumber={senderNumber} setSenderNumber={setSenderNumber}
              note={note} setNote={setNote}
              senderLabel="পাঠানো A/C / Reference (ঐচ্ছিক)"
              senderRequired={false}
            />
          </div>
        )}

        {step === "form" && (method === "bkash_personal" || method === "nagad_personal") && (
          <div className="space-y-3">
            <Card className={method === "bkash_personal" ? "bg-pink-50 border-pink-200" : "bg-orange-50 border-orange-200"}>
              <CardContent className="p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">নম্বর ({method === "bkash_personal" ? "bKash" : "Nagad"} Personal):</span>
                  <Badge variant="outline" className="text-xs">Personal</Badge>
                </div>
                <div className="flex items-center justify-between bg-background rounded-md px-3 py-2">
                  <span className="font-mono font-bold text-base">
                    {method === "bkash_personal" ? PAYMENT_CONFIG.bkash_personal.number : PAYMENT_CONFIG.nagad_personal.number}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => copy(method === "bkash_personal" ? PAYMENT_CONFIG.bkash_personal.number : PAYMENT_CONFIG.nagad_personal.number)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">"Send Money" করে নিচে Trx ID দিন।</p>
              </CardContent>
            </Card>
            <FormFields
              amount={amount} setAmount={setAmount}
              trxId={trxId} setTrxId={setTrxId}
              senderNumber={senderNumber} setSenderNumber={setSenderNumber}
              note={note} setNote={setNote}
              senderLabel="যে নম্বর থেকে পাঠিয়েছেন *"
              senderRequired
            />
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-bold text-lg">আপনার পেমেন্ট জমা হয়েছে</h3>
            <p className="text-sm text-muted-foreground">
              Admin verify করার পর আপনার বিল update হয়ে যাবে। সাধারণত ১-২ ঘন্টার মধ্যে।
            </p>
            <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 inline-block">
              Trx ID: <span className="font-mono font-semibold">{trxId}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "form" && (
            <>
              <Button variant="outline" onClick={() => { setStep("choose"); setMethod(null); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "জমা হচ্ছে..." : "জমা দিন"}
              </Button>
            </>
          )}
          {step === "choose" && (
            <Button variant="outline" onClick={() => handleClose(false)}>বাতিল</Button>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>ঠিক আছে</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MethodCard({ icon, title, desc, onClick, disabled }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:border-primary/40"
      }`}
    >
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function Row({ label, value, onCopy, mono }: { label: string; value: string; onCopy: (v: string) => void; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}:</span>
      <div className="flex items-center gap-1">
        <span className={mono ? "font-mono font-semibold" : "font-medium"}>{value}</span>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onCopy(value)}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function FormFields({ amount, setAmount, trxId, setTrxId, senderNumber, setSenderNumber, note, setNote, senderLabel, senderRequired }: any) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>পরিমাণ (৳) *</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label>Transaction ID *</Label>
          <Input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="যেমন: 8N7G6F5..." />
        </div>
      </div>
      <div>
        <Label>{senderLabel}{senderRequired && " "}</Label>
        <Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="যেমন: 017XXXXXXXX" />
      </div>
      <div>
        <Label>নোট (ঐচ্ছিক)</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}
