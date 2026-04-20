import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any | null;
}

export default function RecoveryInfoDialog({ open, onOpenChange, client }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cable, setCable] = useState(false);
  const [device, setDevice] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (client) {
      setCable(!!client.cable_recovered);
      setDevice(!!client.device_recovered);
      setStatus(client.recovery_status || "pending");
      setRemarks(client.recovery_remarks || "");
    }
  }, [client, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!client) return;
      const { error } = await supabase.from("clients").update({
        cable_recovered: cable,
        device_recovered: device,
        recovery_status: status,
        recovery_remarks: remarks || null,
        recovered_by: user?.id || null,
        recovered_at: new Date().toISOString(),
      }).eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিকভারি তথ্য সংরক্ষিত হয়েছে");
      qc.invalidateQueries({ queryKey: ["left-clients"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>রিকভারি ইনফরমেশন — {client?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Checkbox id="cable" checked={cable} onCheckedChange={(v) => setCable(!!v)} />
            <Label htmlFor="cable" className="cursor-pointer">কেবল রিকভার হয়েছে</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="device" checked={device} onCheckedChange={(v) => setDevice(!!v)} />
            <Label htmlFor="device" className="cursor-pointer">ডিভাইস (ONU/Router) রিকভার হয়েছে</Label>
          </div>
          <div>
            <Label className="text-xs uppercase">রিকভারি স্ট্যাটাস</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">পেন্ডিং</SelectItem>
                <SelectItem value="recovered">সম্পূর্ণ রিকভার</SelectItem>
                <SelectItem value="partial">আংশিক রিকভার</SelectItem>
                <SelectItem value="not_applicable">প্রযোজ্য নয়</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">মন্তব্য / নোট</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} placeholder="বিস্তারিত লিখুন..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
