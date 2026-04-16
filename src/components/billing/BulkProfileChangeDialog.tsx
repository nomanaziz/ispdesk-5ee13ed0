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

export default function BulkProfileChangeDialog({ open, onOpenChange, selectedClients }: Props) {
  const [packageId, setPackageId] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-for-bulk"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, bandwidth_down, price").eq("status", "active");
      return data || [];
    },
  });

  const handleSubmit = async () => {
    if (!packageId) return;
    setLoading(true);
    const selectedPkg = packages.find((p: any) => p.id === packageId);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          package_id: packageId,
          profile: selectedPkg?.name || "",
          speed: selectedPkg?.bandwidth_down || "",
          monthly_bill: selectedPkg?.price || 0,
        })
        .in("id", selectedClients.map((c) => c.id));
      if (error) throw error;

      // Update MikroTik profile for each client
      for (const client of selectedClients) {
        if (client.mikrotik_id && client.username) {
          try {
            await supabase.functions.invoke("manage-mikrotik-ppp", {
              body: {
                mikrotik_id: client.mikrotik_id,
                username: client.username,
                client_id: client.id,
                action: "update",
                profile: selectedPkg?.name || "",
              },
            });
          } catch {
            // continue with others
          }
        }
      }

      toast({ title: `${selectedClients.length} জন ক্লায়েন্টের profile পরিবর্তন হয়েছে` });
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
          <DialogTitle>Bulk Profile Change</DialogTitle>
          <DialogDescription>{selectedClients.length} জন ক্লায়েন্টের package/profile পরিবর্তন করুন</DialogDescription>
        </DialogHeader>
        <Select value={packageId} onValueChange={setPackageId}>
          <SelectTrigger><SelectValue placeholder="Package সিলেক্ট করুন" /></SelectTrigger>
          <SelectContent>
            {packages.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name} — {p.bandwidth_down} — ৳{p.price}</SelectItem>
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
