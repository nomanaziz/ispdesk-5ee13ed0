import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bill: any | null;
  clientId: string;
}

export default function BillEditDialog({ open, onOpenChange, bill, clientId }: Props) {
  const qc = useQueryClient();
  const [packageId, setPackageId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");

  const { data: packages } = useQuery({
    queryKey: ["isp-packages-edit"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price, bandwidth_down").eq("status", "active");
      return data || [];
    },
  });

  useEffect(() => {
    if (bill) {
      setAmount(Number(bill.amount || 0));
      setPackageId(bill.package_id || "");
      setRemarks("");
    }
  }, [bill]);

  const save = useMutation({
    mutationFn: async () => {
      if (!bill?.id) throw new Error("No bill selected");
      const newDue = Math.max(0, Number(amount) - Number(bill.paid || 0));
      const { error } = await supabase
        .from("billing")
        .update({ amount, due: newDue })
        .eq("id", bill.id);
      if (error) throw error;
      const userId = (await supabase.auth.getUser()).data.user?.id;
      await supabase.from("billing_history").insert({
        billing_id: bill.id,
        client_id: clientId,
        action: "edited",
        old_value: { amount: bill.amount, package_id: bill.package_id || null },
        new_value: { amount, package_id: packageId || null },
        remarks: remarks || null,
        changed_by: userId || null,
      });
    },
    onSuccess: () => {
      toast.success("ইনভয়েস আপডেট হয়েছে");
      qc.invalidateQueries({ queryKey: ["client-profile", clientId] });
      qc.invalidateQueries({ queryKey: ["bill-history", clientId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ইনভয়েস সম্পাদনা — {bill?.month}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>প্যাকেজ</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger><SelectValue placeholder="প্যাকেজ নির্বাচন" /></SelectTrigger>
              <SelectContent>
                {packages?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>বিল পরিমাণ (৳)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>মন্তব্য / কারণ</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="কেন পরিবর্তন করা হচ্ছে?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
