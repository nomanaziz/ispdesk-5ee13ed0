import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedClients: any[];
  invalidateKey?: string;
}

export default function BulkDateExtendDialog({ open, onOpenChange, selectedClients, invalidateKey = "billing-list" }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"days" | "date">("days");
  const [days, setDays] = useState(30);
  const [newDate, setNewDate] = useState("");
  const [markBillPaid, setMarkBillPaid] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const toEnable: any[] = [];

      for (const c of selectedClients) {
        let target: string;
        if (mode === "date") {
          if (!newDate) throw new Error("নতুন তারিখ দিন");
          target = newDate;
        } else {
          const base = c.expire_date ? new Date(c.expire_date) : new Date();
          base.setDate(base.getDate() + days);
          target = base.toISOString().slice(0, 10);
        }
        await supabase.from("clients").update({ expire_date: target }).eq("id", c.id);

        const exp = new Date(target);
        if (exp.getTime() > today.getTime() && c.mikrotik_id && c.username) {
          toEnable.push(c);
        }
      }

      // Auto-enable MikroTik for clients now in the future
      for (const c of toEnable) {
        try {
          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: { mikrotik_id: c.mikrotik_id, username: c.username, client_id: c.id, action: "enable" },
          });
        } catch { /* continue, don't fail the whole batch */ }
      }

      if (markBillPaid) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const billUpdates = selectedClients.map(async (c) => {
          const { data: bill } = await supabase
            .from("billing")
            .select("id, amount")
            .eq("client_id", c.id)
            .eq("month", currentMonth)
            .maybeSingle();
          if (bill?.id) {
            await supabase.from("billing").update({
              paid: Number(bill.amount || 0),
              due: 0,
              status: "paid",
              pay_date: new Date().toISOString().slice(0, 10),
            }).eq("id", bill.id);
          }
        });
        await Promise.all(billUpdates);
      }
    },
    onSuccess: () => {
      toast.success(`${selectedClients.length} জন ক্লায়েন্টের তারিখ আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>মেয়াদ বাড়ান ({selectedClients.length} জন)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="days" id="days" />
              <Label htmlFor="days">দিন সংখ্যা যোগ করুন</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="date" id="date" />
              <Label htmlFor="date">নির্দিষ্ট তারিখ সেট করুন</Label>
            </div>
          </RadioGroup>
          {mode === "days" ? (
            <div>
              <Label>দিন সংখ্যা</Label>
              <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          ) : (
            <div>
              <Label>নতুন তারিখ</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          )}
          <div className="flex items-start gap-2 rounded border p-3 bg-muted/30">
            <Checkbox id="mark-paid" checked={markBillPaid} onCheckedChange={(v) => setMarkBillPaid(!!v)} className="mt-0.5" />
            <Label htmlFor="mark-paid" className="text-sm cursor-pointer leading-tight">
              এই মাসের বিল paid হিসেবে mark করুন
              <span className="block text-xs text-muted-foreground mt-0.5">
                (বকেয়ার red color চলে যাবে — কোনো income entry তৈরি হবে না, এটা শুধু waiver/extension)
              </span>
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "আপডেট হচ্ছে..." : "আপডেট"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
