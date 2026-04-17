import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nodeId: string;
  initial: { latitude?: number | null; longitude?: number | null; address?: string | null };
  onSaved: () => void;
}

export function GeoLocationDialog({ open, onOpenChange, nodeId, initial, onSaved }: Props) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [addr, setAddr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLat(initial.latitude?.toString() ?? "");
      setLng(initial.longitude?.toString() ?? "");
      setAddr(initial.address ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("network_nodes").update({
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        address: addr || null,
      }).eq("id", nodeId);
      if (error) throw error;
      toast.success("Location saved");
      onSaved();
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const useBrowser = () => {
    if (!navigator.geolocation) { toast.error("Geolocation unsupported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toString()); setLng(pos.coords.longitude.toString()); },
      () => toast.error("Location access denied"),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Geo Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="23.8103" />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="90.4125" />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={useBrowser} type="button">Use My Current Location</Button>
          <div>
            <Label>Address</Label>
            <Textarea value={addr} onChange={(e) => setAddr(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
