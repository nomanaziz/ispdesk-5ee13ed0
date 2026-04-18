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

export default function BulkDistrictChangeDialog({ open, onOpenChange, selectedClientIds, invalidateKey = "clients-list" }: Props) {
  const qc = useQueryClient();
  const [districtId, setDistrictId] = useState("");

  const { data: districts = [] } = useQuery({
    queryKey: ["districts-active"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!districtId) throw new Error("জেলা নির্বাচন করুন");
      const district = districts.find((d: any) => d.id === districtId);
      const updates: Promise<any>[] = [];
      for (const id of selectedClientIds) {
        updates.push(
          supabase.from("clients").update({ remarks: `District: ${district?.name}` }).eq("id", id)
        );
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success(`${selectedClientIds.length} জন ক্লায়েন্টের জেলা আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: [invalidateKey] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>জেলা পরিবর্তন ({selectedClientIds.length} জন)</DialogTitle>
        </DialogHeader>
        <div>
          <Label>জেলা *</Label>
          <Select value={districtId} onValueChange={setDistrictId}>
            <SelectTrigger><SelectValue placeholder="জেলা নির্বাচন" /></SelectTrigger>
            <SelectContent>
              {districts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
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
