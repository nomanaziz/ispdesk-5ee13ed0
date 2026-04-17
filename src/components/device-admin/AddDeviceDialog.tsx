import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AddDeviceDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    category: "mikrotik",
    vendor: "mikrotik",
    protocol: "api",
    ip_address: "",
    port: "",
    username: "admin",
    password: "",
    enable_password: "",
    location: "",
    backup_schedule: "manual",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.ip_address) throw new Error("নাম ও IP লাগবে");

      if (form.category === "mikrotik") {
        const { error } = await supabase.from("mikrotik_devices").insert({
          name: form.name,
          ip_address: form.ip_address,
          api_port: form.port ? parseInt(form.port) : 80,
          username: form.username || "admin",
          password: form.password || "",
          location: form.location || null,
          status: "unknown",
        });
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("device_admin_managed_devices").insert({
          name: form.name,
          category: form.category,
          vendor: form.vendor,
          protocol: form.protocol,
          ip_address: form.ip_address,
          port: form.port ? parseInt(form.port) : null,
          username: form.username || null,
          password_encrypted: form.password || null,
          enable_password: form.enable_password || null,
          location: form.location || null,
          backup_schedule: form.backup_schedule,
          created_by: u.user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_inventory"] });
      toast.success("ডিভাইস যোগ হয়েছে");
      onOpenChange(false);
      setForm({ ...form, name: "", ip_address: "", password: "", enable_password: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isMk = form.category === "mikrotik";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>নতুন ডিভাইস যোগ করুন</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>নাম *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Core-Router-1" />
          </div>
          <div className="space-y-1.5">
            <Label>ক্যাটেগরি *</Label>
            <Select value={form.category} onValueChange={(v) => { set("category", v); if (v === "mikrotik") { set("vendor", "mikrotik"); set("protocol", "api"); } }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mikrotik">MikroTik</SelectItem>
                <SelectItem value="olt">OLT</SelectItem>
                <SelectItem value="switch">Switch / POP</SelectItem>
                <SelectItem value="zkteco">ZKTeco</SelectItem>
                <SelectItem value="other">অন্যান্য</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>IP অ্যাড্রেস *</Label>
            <Input value={form.ip_address} onChange={(e) => set("ip_address", e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="space-y-1.5">
            <Label>পোর্ট</Label>
            <Input value={form.port} onChange={(e) => set("port", e.target.value)} placeholder={isMk ? "80" : "22"} />
          </div>

          {!isMk && (
            <>
              <div className="space-y-1.5">
                <Label>ভেন্ডর</Label>
                <Select value={form.vendor} onValueChange={(v) => set("vendor", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cisco">Cisco</SelectItem>
                    <SelectItem value="juniper">Juniper</SelectItem>
                    <SelectItem value="huawei">Huawei</SelectItem>
                    <SelectItem value="bdcom">BDCOM</SelectItem>
                    <SelectItem value="cdata">C-Data</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>কানেকশন প্রোটোকল</Label>
                <RadioGroup value={form.protocol} onValueChange={(v) => set("protocol", v)} className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="ssh" id="ssh" /><Label htmlFor="ssh" className="font-normal">SSH</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="telnet" id="telnet" /><Label htmlFor="telnet" className="font-normal">Telnet</Label></div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>ইউজারনেম</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>পাসওয়ার্ড</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>

          {!isMk && (form.vendor === "cisco" || form.vendor === "huawei") && (
            <div className="space-y-1.5 col-span-2">
              <Label>Enable পাসওয়ার্ড (privileged mode)</Label>
              <Input type="password" value={form.enable_password} onChange={(e) => set("enable_password", e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>লোকেশন</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>ব্যাকআপ শিডিউল</Label>
            <Select value={form.backup_schedule} onValueChange={(v) => set("backup_schedule", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>যোগ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
