import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedClientIds: string[];
  invalidateKey?: string;
}

export default function BulkThanaChangeDialog({ open, onOpenChange, selectedClientIds, invalidateKey = "clients-list" }: Props) {
  const qc = useQueryClient();
  const [upazilaId, setUpazilaId] = useState("");

  const { data: upazilas = [] } = useQuery({
    queryKey: ["upazilas-active"],
    queryFn: async () => {
      const { data } = await supabase.from("upazilas").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!upazilaId) throw new Error("উপজেলা/থানা নির্বাচন করুন");
      const upazila = upazilas.find((u: any) => u.id === upazilaId);
      const updates: Promise<any>[] = [];
      for (const id of selectedClientIds) {
        updates.push(
          supabase.from("clients").update({ remarks: `Upazila: ${upazila?.name}` }).eq("id", id)
        );
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success(`${selectedClientIds.length} জন ক্লায়েন্টের উপজেলা আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>উপজেলা/থানা পরিবর্তন ({selectedClientIds.length} জন)</DialogTitle>
        </DialogHeader>
        <div>
          <Label>উপজেলা/থানা *</Label>
          <Select value={upazilaId} onValueChange={setUpazilaId}>
            <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
            <SelectContent>
              {upazilas.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
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
