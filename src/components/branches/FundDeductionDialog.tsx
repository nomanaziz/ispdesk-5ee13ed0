import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pop: { id: string; name: string; balance: number; allow_negative_balance?: boolean; pop_type?: string } | null;
}

export default function FundDeductionDialog({ open, onOpenChange, pop }: Props) {
  const qc = useQueryClient();
  const [type, setType] = useState<"debit" | "credit">("debit");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!pop) throw new Error("POP missing");
      if (amount <= 0) throw new Error("পরিমাণ লিখুন");
      const newBalance = type === "debit" ? Number(pop.balance) - amount : Number(pop.balance) + amount;
      if (type === "debit" && newBalance < 0 && !pop.allow_negative_balance) {
        throw new Error("Balance শূন্যের নিচে যেতে পারবে না — Negative Balance অনুমোদন বন্ধ");
      }
      const { data: u } = await supabase.auth.getUser();
      const { error: txErr } = await supabase.from("pop_transactions").insert({
        pop_id: pop.id,
        type,
        amount,
        balance_after: newBalance,
        description: description || null,
        created_by: u?.user?.id ?? null,
      });
      if (txErr) throw txErr;
      const { error: balErr } = await supabase
        .from("branch_managers")
        .update({ balance: newBalance })
        .eq("id", pop.id);
      if (balErr) throw balErr;
    },
    onSuccess: () => {
      toast.success(`${type === "debit" ? "ডেবিট" : "ক্রেডিট"} সম্পন্ন`);
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      qc.invalidateQueries({ queryKey: ["pop-transactions"] });
      onOpenChange(false);
      setAmount(0);
      setDescription("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ফান্ড ম্যানেজমেন্ট — {pop?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">বর্তমান ব্যালেন্স: <strong className="text-foreground">৳{pop?.balance ?? 0}</strong></div>
          <div>
            <Label>লেনদেনের ধরন</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit (Deduct)</SelectItem>
                <SelectItem value="credit">Credit (Add Fund)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>পরিমাণ (৳)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>বিবরণ</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "..." : "সাবমিট"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
