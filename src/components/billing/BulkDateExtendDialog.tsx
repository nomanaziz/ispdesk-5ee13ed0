import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

  const mut = useMutation({
    mutationFn: async () => {
      const updates: Promise<any>[] = [];
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
        updates.push(supabase.from("clients").update({ expire_date: target }).eq("id", c.id));
      }
      await Promise.all(updates);
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
