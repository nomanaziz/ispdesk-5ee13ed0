import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClients: any[];
}

/**
 * Profile-only change. Updates `clients.profile` and pushes the new profile to
 * each client's MikroTik PPP. Does NOT touch package_id / monthly_bill / speed.
 */
export default function BulkProfileChangeDialog({ open, onOpenChange, selectedClients }: Props) {
  const [deviceId, setDeviceId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const distinctDeviceIds = useMemo(
    () => Array.from(new Set(selectedClients.map((c) => c.mikrotik_id).filter(Boolean))),
    [selectedClients]
  );

  const { data: devices = [] } = useQuery({
    queryKey: ["mikrotik_devices_for_bulk_profile"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name").order("name");
      return data || [];
    },
    enabled: open,
  });

  // Default to the first selected client's mikrotik device
  useEffect(() => {
    if (open && !deviceId && distinctDeviceIds[0]) setDeviceId(distinctDeviceIds[0]);
  }, [open, distinctDeviceIds, deviceId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setProfileName("");
      setProfiles([]);
      setDeviceId("");
    }
  }, [open]);

  // Load profiles for chosen device
  useEffect(() => {
    if (!deviceId) { setProfiles([]); return; }
    setLoadingProfiles(true);
    setProfileName("");
    supabase.functions.invoke("fetch-mikrotik-profiles", { body: { device_id: deviceId } })
      .then(({ data }) => {
        const list = (data?.profiles || []).map((p: any) => (typeof p === "string" ? p : p.name)).filter(Boolean);
        setProfiles(list);
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoadingProfiles(false));
  }, [deviceId]);

  const handleSubmit = async () => {
    if (!profileName) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ profile: profileName })
        .in("id", selectedClients.map((c) => c.id));
      if (error) throw error;

      // Push to MikroTik for each client (best-effort)
      let mtFailed = 0;
      for (const client of selectedClients) {
        if (!client.mikrotik_id || !client.username) continue;
        try {
          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              mikrotik_id: client.mikrotik_id,
              username: client.username,
              client_id: client.id,
              action: "update",
              profile: profileName,
            },
          });
        } catch {
          mtFailed++;
        }
      }

      toast({
        title: `${selectedClients.length} জন ক্লায়েন্টের প্রোফাইল পরিবর্তন হয়েছে`,
        description: mtFailed > 0 ? `${mtFailed} টি MikroTik update ব্যর্থ` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const mixedDevices = distinctDeviceIds.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>শুধু প্রোফাইল (Speed) পরিবর্তন</DialogTitle>
          <DialogDescription>
            {selectedClients.length} জন ক্লায়েন্টের MikroTik প্রোফাইল পরিবর্তন হবে। Package, মাসিক বিল অপরিবর্তিত থাকবে।
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {mixedDevices && (
            <div className="flex items-start gap-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>সিলেক্টেড ক্লায়েন্টরা একাধিক MikroTik সার্ভারে আছে। নিশ্চিত হোন এই profile name সবগুলোতে exists।</span>
            </div>
          )}

          <div>
            <Label className="text-xs">MikroTik সার্ভার (profile source)</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger><SelectValue placeholder="সার্ভার বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {devices.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">প্রোফাইল</Label>
            <Select value={profileName} onValueChange={setProfileName} disabled={!deviceId || loadingProfiles}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProfiles ? "লোড হচ্ছে..." : (profiles.length === 0 ? "কোনো profile পাওয়া যায়নি" : "প্রোফাইল সিলেক্ট করুন")} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={loading || !profileName}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            পরিবর্তন করুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
