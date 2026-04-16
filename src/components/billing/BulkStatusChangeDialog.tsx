import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

export default function BulkStatusChangeDialog({ open, onOpenChange, selectedClientIds }: Props) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!status) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ status })
        .in("id", selectedClientIds);
      if (error) throw error;
      toast({ title: `${selectedClientIds.length} জন ক্লায়েন্টের status পরিবর্তন হয়েছে` });
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
          <DialogTitle>Bulk Status Change</DialogTitle>
          <DialogDescription>{selectedClientIds.length} জন ক্লায়েন্টের status পরিবর্তন করুন</DialogDescription>
        </DialogHeader>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status সিলেক্ট করুন" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="left">Left</SelectItem>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={loading || !status}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            পরিবর্তন করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
