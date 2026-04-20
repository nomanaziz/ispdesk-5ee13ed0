import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Cheque"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  funding: any | null;
  mode: "pay" | "refund";
}

export default function FundingPayDialog({ open, onOpenChange, funding, mode }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const dueAmount = Number(funding?.due_amount ?? 0);

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Cash");
  const [receivedBy, setReceivedBy] = useState("");
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(mode === "pay" ? dueAmount : 0);
      setMethod("Cash");
      setReceivedBy("");
      setDate(today);
      setRemarks("");
    }
  }, [open, dueAmount, mode]);

  const { data: employees } = useQuery({
    queryKey: ["employees-receivers"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").order("name");
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!funding) throw new Error("Funding row missing");
      if (amount <= 0) throw new Error("পরিমাণ লিখুন");
      if (mode === "pay" && amount > dueAmount) {
        throw new Error(`Receive amount due-এর বেশি হতে পারবে না (Due: ৳${dueAmount})`);
      }

      if (mode === "pay") {
        // Add to received_amount, reduce due_amount
        const newReceived = Number(funding.received_amount ?? 0) + amount;
        const newDue = Math.max(0, dueAmount - amount);
        const { error } = await supabase
          .from("branch_funding")
          .update({
            received_amount: newReceived,
            due_amount: newDue,
            payment_method: method,
            received_by: receivedBy || funding.received_by,
            received_on: date,
            remarks: remarks ? `${funding.remarks ?? ""}\n[Pay ৳${amount} on ${date}] ${remarks}`.trim() : funding.remarks,
          })
          .eq("id", funding.id);
        if (error) throw error;
      } else {
        // Refund — insert a refund row that debits POP balance
        const { error } = await supabase.from("branch_funding").insert({
          branch_id: funding.branch_id,
          amount,
          received_amount: 0,
          discount: 0,
          due_amount: 0,
          payment_method: method,
          received_by: receivedBy || null,
          received_on: date,
          funding_date: date,
          remarks: remarks || `Refund against ${funding.invoice_number ?? funding.id}`,
          description: remarks || null,
          type: "debit",
          trans_type: "refund",
          status: "paid",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      qc.invalidateQueries({ queryKey: ["pops-with-branch"] });
      toast.success(mode === "pay" ? "Payment received" : "Refund recorded");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "pay" ? "Receive Due Payment" : "Refund"} — {funding?.branches?.name ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-2">
              <div className="text-muted-foreground text-xs">Invoice</div>
              <div className="font-mono">{funding?.invoice_number ?? "-"}</div>
            </div>
            <div className="rounded-md border bg-muted/40 p-2">
              <div className="text-muted-foreground text-xs">Current Due</div>
              <div className="font-semibold text-destructive">৳{dueAmount.toLocaleString("en-BD")}</div>
            </div>
          </div>

          <div>
            <Label>{mode === "pay" ? "Receive Amount (৳)" : "Refund Amount (৳)"}</Label>
            <Input
              type="number"
              min={1}
              max={mode === "pay" ? dueAmount : undefined}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Received By</Label>
            <Select value={receivedBy} onValueChange={setReceivedBy}>
              <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {employees?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "..." : mode === "pay" ? "Receive Payment" : "Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
