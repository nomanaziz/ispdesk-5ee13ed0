import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Building2, Smartphone, ArrowLeft, CheckCircle2, Copy, CreditCard } from "lucide-react";

type Category = "mobile_personal" | "mobile_merchant" | "bank" | "gateway";

interface Gateway {
  name: string;
  category: Category;
  type: string;
  active: boolean;
  show_on_website: boolean;
  color: string;
  fields: Record<string, string>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any;
  defaultAmount: number;
}

export default function QuickPayDialog({ open, onOpenChange, client, defaultAmount }: Props) {
  const { toast } = useToast();
  const { value: gateways } = useSystemSetting<Gateway[]>("payment_gateways", []);
  const [step, setStep] = useState<"choose" | "form" | "done">("choose");
  const [selected, setSelected] = useState<Gateway | null>(null);
  const [amount, setAmount] = useState(String(defaultAmount || 0));
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(
    () => (gateways || []).filter(g => g.active && g.show_on_website),
    [gateways]
  );

  const reset = () => {
    setStep("choose"); setSelected(null);
    setAmount(String(defaultAmount || 0));
    setTrxId(""); setSenderNumber(""); setNote("");
  };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const pickGateway = (gw: Gateway) => {
    if (gw.category === "gateway" || gw.category === "mobile_merchant") {
      toast({
        title: "শীঘ্রই আসছে",
        description: `${gw.name} অটোমেটিক gateway Phase 2-এ চালু হবে। বর্তমানে Personal/Bank পদ্ধতি ব্যবহার করুন।`,
      });
      return;
    }
    setSelected(gw);
    setStep("form");
  };

  const copy = (txt: string) => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast({ title: "কপি হয়েছে", description: txt });
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast({ title: "ত্রুটি", description: "সঠিক পরিমাণ দিন", variant: "destructive" });
    if (!trxId.trim()) return toast({ title: "ত্রুটি", description: "Transaction ID দিন", variant: "destructive" });
    if (selected?.category === "mobile_personal" && !senderNumber.trim())
      return toast({ title: "ত্রুটি", description: "যে নম্বর থেকে পাঠিয়েছেন সেটা দিন", variant: "destructive" });

    setSubmitting(true);
    const methodKey = selected?.name.toLowerCase().replace(/\s+/g, "_") || "unknown";
    const { error } = await supabase.from("public_payment_requests").insert({
      client_id: client.id,
      amount: amt,
      method: methodKey,
      trx_id: trxId.trim(),
      sender_number: senderNumber.trim() || null,
      note: note.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) return toast({ title: "ব্যর্থ", description: error.message, variant: "destructive" });
    setStep("done");
  };

  const iconFor = (cat: Category) => cat === "bank" ? Building2 : cat === "gateway" ? CreditCard : Smartphone;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "পেমেন্ট পদ্ধতি বাছাই করুন"}
            {step === "form" && selected && `${selected.name} — তথ্য দিন`}
            {step === "done" && "জমা হয়েছে ✓"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {client?.name} — মোট দিতে: <span className="font-bold text-foreground">৳{defaultAmount}</span>
            </p>

            {visible.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
                কোনো পেমেন্ট পদ্ধতি কনফিগার করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।
              </div>
            )}

            {visible.map(gw => {
              const Icon = iconFor(gw.category);
              const disabled = gw.category === "gateway" || gw.category === "mobile_merchant";
              const desc = gw.category === "bank"
                ? "Bank account-এ পাঠিয়ে Transaction ID দিন"
                : gw.category === "mobile_personal"
                ? "Send Money করে Trx ID submit করুন"
                : "অটোমেটিক gateway — শীঘ্রই";
              return (
                <button
                  key={gw.name}
                  onClick={() => pickGateway(gw)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition ${
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-accent hover:border-primary/40"
                  }`}
                >
                  <div className="h-10 w-10 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${gw.color}20`, color: gw.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{gw.name}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  {disabled && <Badge variant="outline" className="text-[10px]">শীঘ্রই</Badge>}
                </button>
              );
            })}
          </div>
        )}

        {step === "form" && selected?.category === "bank" && (
          <div className="space-y-3">
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-sm space-y-1">
                <Row label="ব্যাংক" value={selected.fields.bank_name} onCopy={copy} />
                <Row label="A/C নাম" value={selected.fields.account_name} onCopy={copy} />
                <Row label="A/C নং" value={selected.fields.account_number} onCopy={copy} mono />
                <Row label="শাখা" value={selected.fields.branch} onCopy={copy} />
                {selected.fields.routing_number && <Row label="Routing" value={selected.fields.routing_number} onCopy={copy} mono />}
                {selected.fields.address && <Row label="ঠিকানা" value={selected.fields.address} onCopy={copy} />}
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

        {step === "form" && selected?.category === "mobile_personal" && (
          <div className="space-y-3">
            <Card style={{ backgroundColor: `${selected.color}10`, borderColor: `${selected.color}40` }}>
              <CardContent className="p-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">নম্বর ({selected.name}):</span>
                  <Badge variant="outline" className="text-xs">Personal</Badge>
                </div>
                <div className="flex items-center justify-between bg-background rounded-md px-3 py-2">
                  <span className="font-mono font-bold text-base">{selected.fields.number || "—"}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(selected.fields.number)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {selected.fields.holder_name && (
                  <p className="text-xs text-muted-foreground">হোল্ডার: <span className="font-medium text-foreground">{selected.fields.holder_name}</span></p>
                )}
                {selected.fields.instructions && (
                  <p className="text-xs text-muted-foreground">{selected.fields.instructions}</p>
                )}
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
              <Button variant="outline" onClick={() => { setStep("choose"); setSelected(null); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "জমা হচ্ছে..." : "জমা দিন"}
              </Button>
            </>
          )}
          {step === "choose" && <Button variant="outline" onClick={() => handleClose(false)}>বাতিল</Button>}
          {step === "done" && <Button onClick={() => handleClose(false)}>ঠিক আছে</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, onCopy, mono }: { label: string; value: string; onCopy: (v: string) => void; mono?: boolean }) {
  if (!value) return null;
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
        <Label>{senderLabel}</Label>
        <Input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} placeholder="যেমন: 017XXXXXXXX" />
      </div>
      <div>
        <Label>নোট (ঐচ্ছিক)</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}
