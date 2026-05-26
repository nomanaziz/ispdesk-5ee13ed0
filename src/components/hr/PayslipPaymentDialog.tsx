import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  payroll: any | null;
  onClose: () => void;
}

export default function PayslipPaymentDialog({ payroll, onClose }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState<number>(0);
  const [paidFrom, setPaidFrom] = useState<string>("cash");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [sms, setSms] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: payments } = useQuery({
    queryKey: ["payroll-payments", payroll?.id],
    queryFn: async () => {
      if (!payroll?.id) return [];
      const { data } = await supabase.from("payroll_payments").select("*").eq("payroll_id", payroll.id);
      return data || [];
    },
    enabled: !!payroll?.id,
  });

  const totalPayable = Number(payroll?.net_salary || 0);
  const totalPaid = (payments || []).reduce((s, p: any) => s + Number(p.amount), 0);
  const payLeft = Math.max(0, totalPayable - totalPaid);

  useEffect(() => {
    if (payroll) {
      setMode("full");
      setAmount(payLeft);
      setRemarks("");
      setDate(new Date().toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payroll?.id, payLeft]);

  useEffect(() => {
    if (mode === "full") setAmount(payLeft);
  }, [mode, payLeft]);

  const submit = async () => {
    if (!payroll) return;
    if (amount <= 0) return toast.error("পরিমাণ ০ এর বেশি দিন");
    if (amount > payLeft + 0.001) return toast.error("পরিমাণ বাকি থেকে বেশি হতে পারবে না");
    setSaving(true);
    try {
      const { error: e1 } = await supabase.from("payroll_payments").insert({
        payroll_id: payroll.id,
        amount,
        payment_date: date,
        paid_from: paidFrom,
        remarks,
        sms_sent: sms,
      });
      if (e1) throw e1;

      const newPaid = totalPaid + amount;
      const status = newPaid >= totalPayable - 0.001 ? "paid" : "partial";
      const { error: e2 } = await supabase
        .from("payroll")
        .update({
          paid_amount: newPaid,
          payment_status: status,
          status,
          paid_at: status === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", payroll.id);
      if (e2) throw e2;

      toast.success(status === "paid" ? "সম্পূর্ণ পরিশোধিত" : "আংশিক পরিশোধিত");
      qc.invalidateQueries({ queryKey: ["payroll-month"] });
      qc.invalidateQueries({ queryKey: ["payroll-payments"] });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!payroll} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Payment Methods</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm space-y-1">
            <div><strong>Total Payable:</strong> {totalPayable.toLocaleString()} tk</div>
            <div><strong>Total Paid:</strong> {totalPaid.toLocaleString()} tk</div>
            <div className="text-orange-600"><strong>Pay Left:</strong> {payLeft.toLocaleString()} tk</div>
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="flex gap-6">
            <div className="flex items-center gap-2"><RadioGroupItem value="full" id="m-full" /><Label htmlFor="m-full">Pay Full</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="partial" id="m-part" /><Label htmlFor="m-part">Pay Partially</Label></div>
          </RadioGroup>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pay (tk)</Label>
              <Input type="number" value={amount} disabled={mode === "full"}
                onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>From</Label>
              <Select value={paidFrom} onValueChange={setPaidFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Label htmlFor="sms" className="cursor-pointer">Send SMS</Label>
            <Checkbox id="sms" checked={sms} onCheckedChange={(c) => setSms(!!c)} />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="destructive" onClick={onClose}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={submit} disabled={saving}>
              {saving ? "..." : "Pay"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
