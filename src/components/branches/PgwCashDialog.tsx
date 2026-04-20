import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pop: any | null;
  remaining: number;
}

export default function PgwCashDialog({ open, onOpenChange, pop, remaining }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    receipt_no: "",
    remarks: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        payment_date: new Date().toISOString().slice(0, 10),
        amount: remaining,
        receipt_no: "",
        remarks: "",
      });
    }
  }, [open, remaining]);

  const save = useMutation({
    mutationFn: async () => {
      if (!pop) throw new Error("POP নেই");
      if (form.amount <= 0) throw new Error("পরিমাণ ০ এর বেশি হতে হবে");
      if (form.amount > remaining) throw new Error("Remaining এর চেয়ে বেশি দেওয়া যাবে না");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("reseller_pgw_settlements").insert({
        reseller_id: pop.id,
        amount: form.amount,
        method: "cash",
        settlement_type: "cash",
        reference: form.receipt_no || null,
        receipt_no: form.receipt_no || null,
        notes: form.remarks || null,
        payment_date: form.payment_date,
        status: "completed",
        created_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgw-pop-rollup"] });
      qc.invalidateQueries({ queryKey: ["pgw-settlements-history"] });
      qc.invalidateQueries({ queryKey: ["pgw-pop-transactions"] });
      toast.success("ক্যাশ পেমেন্ট সফল");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!pop) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>ক্যাশ পেমেন্ট — {pop.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 bg-muted/50 p-3 rounded text-sm">
            <div><span className="text-muted-foreground">POP কোড:</span> <strong>{pop.pop_code || "-"}</strong></div>
            <div><span className="text-muted-foreground">কোম্পানি:</span> <strong>{pop.company_name || "-"}</strong></div>
            <div><span className="text-muted-foreground">মোবাইল:</span> <strong>{pop.phone || pop.contact || "-"}</strong></div>
            <div><span className="text-muted-foreground">Remaining:</span> <strong className="text-primary">৳{Number(remaining).toFixed(2)}</strong></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment Date *</Label>
              <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div>
              <Label>Paid Amount *</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Receipt / Trxn No</Label>
            <Input value={form.receipt_no} onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "সংরক্ষণ হচ্ছে..." : "ক্যাশ পেমেন্ট নিশ্চিত করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
