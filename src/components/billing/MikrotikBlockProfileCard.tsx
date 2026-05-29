import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldOff, Loader2, Download, Save, Server } from "lucide-react";

type Mode = "disable" | "block_profile";

type DeviceRow = {
  id: string;
  name: string;
  block_profile_name: string | null;
  profiles?: string[];
  loading?: boolean;
};

export default function MikrotikBlockProfileCard() {
  const [mode, setMode] = useState<Mode>("disable");
  const [savingMode, setSavingMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadMode() {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "auto_suspension")
      .maybeSingle();
    const m = (data?.setting_value as any)?.mode;
    setMode(m === "block_profile" ? "block_profile" : "disable");
  }

  useEffect(() => { loadMode(); }, []);

  async function saveMode(next: Mode) {
    setSavingMode(true);
    setMode(next);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "auto_suspension")
        .maybeSingle();
      const current = (data?.setting_value as any) ?? {};
      const merged = { ...current, mode: next };
      const { error } = await supabase
        .from("system_settings")
        .upsert({ setting_key: "auto_suspension", setting_value: merged }, { onConflict: "setting_key" });
      if (error) throw error;
      toast.success(next === "block_profile" ? "Block Profile mode চালু" : "Disable mode চালু");
    } catch (e: any) {
      toast.error(e.message ?? "সংরক্ষণে সমস্যা");
    } finally {
      setSavingMode(false);
    }
  }

  async function openModal() {
    setOpen(true);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mikrotik_devices")
        .select("id, name, block_profile_name")
        .order("name");
      if (error) throw error;
      setDevices(((data as any[]) ?? []).map((d) => ({ ...d, profiles: [], loading: false })));
    } catch (e: any) {
      toast.error(e.message ?? "Server লোড ব্যর্থ");
    } finally {
      setLoading(false);
    }
  }

  function updateDevice(id: string, patch: Partial<DeviceRow>) {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function fetchProfiles(d: DeviceRow) {
    updateDevice(d.id, { loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: d.id, action: "list-profiles" },
      });
      if (error) throw error;
      const names = (data?.profiles ?? []).map((p: any) => p?.name).filter(Boolean);
      updateDevice(d.id, { profiles: names, loading: false });
      toast.success(`${d.name}: ${names.length} টি profile`);
    } catch (e: any) {
      updateDevice(d.id, { loading: false });
      toast.error(`${d.name}: ${e.message ?? "fetch ব্যর্থ"}`);
    }
  }

  async function submitAll() {
    setSubmitting(true);
    try {
      const updates = devices.map((d) =>
        supabase
          .from("mikrotik_devices")
          .update({ block_profile_name: d.block_profile_name || null })
          .eq("id", d.id)
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r) => r.error).length;
      if (failed) toast.error(`${failed} টি server save হয়নি`);
      else toast.success("সব server-এর block profile সংরক্ষিত");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "সংরক্ষণে সমস্যা");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <ShieldOff className="h-4 w-4" /> Mikrotik "Block Profile"
        </div>
        <div className="p-5 space-y-4 bg-card">
          <p className="text-xs text-muted-foreground">
            যাদের বিল overdue, তাদের MikroTik user disable না করে একটা restricted "block profile"-এ পাঠাবে।
            প্রতিটা MikroTik server-এ আলাদাভাবে block profile সেট করতে হবে।
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">Block Profile চালু করুন</Label>
              <div className="flex gap-4 items-center pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === "block_profile"}
                    onChange={() => saveMode("block_profile")}
                    disabled={savingMode}
                  /> Enable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === "disable"}
                    onChange={() => saveMode("disable")}
                    disabled={savingMode}
                  /> Disable (MikroTik user disable হবে)
                </label>
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={openModal} variant="secondary" className="gap-2">
                <Server className="h-4 w-4" /> Set Server-wise Block Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Server Wise PPPoE Block Profiles</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">কোনো MikroTik server নেই।</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SERVER</TableHead>
                  <TableHead>PROFILE</TableHead>
                  <TableHead className="w-[110px] text-right">Fetch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      {d.profiles && d.profiles.length > 0 ? (
                        <Select
                          value={d.block_profile_name || ""}
                          onValueChange={(v) => updateDevice(d.id, { block_profile_name: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {d.profiles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={d.block_profile_name || ""}
                          placeholder="Select / type profile name"
                          onChange={(e) => updateDevice(d.id, { block_profile_name: e.target.value })}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => fetchProfiles(d)} disabled={d.loading}>
                        {d.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={submitAll} disabled={submitting || devices.length === 0} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
