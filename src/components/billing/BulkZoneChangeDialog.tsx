import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClientIds: string[];
}

export default function BulkZoneChangeDialog({ open, onOpenChange, selectedClientIds }: Props) {
  const [zoneId, setZoneId] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery({
    queryKey: ["zones-for-bulk"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!zoneId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ zone_id: zoneId })
        .in("id", selectedClientIds);
      if (error) throw error;
      toast({ title: `${selectedClientIds.length} জন ক্লায়েন্টের zone পরিবর্তন হয়েছে` });
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bulk Zone Change</DialogTitle>
          <DialogDescription>{selectedClientIds.length} জন ক্লায়েন্টের zone পরিবর্তন করুন</DialogDescription>
        </DialogHeader>
        <Select value={zoneId} onValueChange={setZoneId}>
          <SelectTrigger><SelectValue placeholder="Zone সিলেক্ট করুন" /></SelectTrigger>
          <SelectContent>
            {zones.map((z: any) => (
              <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={loading || !zoneId}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            পরিবর্তন করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
