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
  selectedClients: any[];
}

/**
 * Package-only change. Updates `clients.package_id` and `monthly_bill` (= package price).
 * Does NOT touch `profile` or MikroTik PPP — speed remains unchanged.
 */
export default function BulkPackageChangeDialog({ open, onOpenChange, selectedClients }: Props) {
  const [packageId, setPackageId] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-for-bulk-package-only"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price").eq("status", "active").order("name");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!packageId) return;
    setLoading(true);
    const pkg = packages.find((p: any) => p.id === packageId);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          package_id: packageId,
          monthly_bill: Number(pkg?.price || 0),
        })
        .in("id", selectedClients.map((c) => c.id));
      if (error) throw error;

      toast({ title: `${selectedClients.length} জন ক্লায়েন্টের প্যাকেজ পরিবর্তন হয়েছে` });
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>শুধু প্যাকেজ (Price) পরিবর্তন</DialogTitle>
          <DialogDescription>
            {selectedClients.length} জন ক্লায়েন্টের package ও মাসিক বিল পরিবর্তন হবে। প্রোফাইল/স্পিড অপরিবর্তিত থাকবে।
          </DialogDescription>
        </DialogHeader>
        <Select value={packageId} onValueChange={setPackageId}>
          <SelectTrigger><SelectValue placeholder="Package সিলেক্ট করুন" /></SelectTrigger>
          <SelectContent>
            {packages.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={loading || !packageId}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            পরিবর্তন করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
