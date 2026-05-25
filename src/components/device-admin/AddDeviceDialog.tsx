import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const VENDORS = [
  "vsol", "bdcom", "dbc", "syrotech", "solitine", "corelink", "c-data",
  "ecom", "lightx", "hsgq", "phyhome", "tbs", "huawei", "hbdpon",
  "mikrotik", "zte", "cisco", "juniper", "generic",
];

const VENDOR_TO_PROFILE: Record<string, string> = {
  vsol: "vsol_olt", bdcom: "bdcom_olt", dbc: "dbc_olt", syrotech: "syrotech_olt",
  solitine: "solitine_olt", corelink: "corelink_olt", "c-data": "cdata_olt",
  ecom: "ecom_olt", lightx: "lightx_olt", hsgq: "hsgq_olt", phyhome: "phyhome_olt",
  tbs: "tbs_olt", huawei: "huawei_olt", hbdpon: "hbdpon_olt", mikrotik: "mikrotik_router",
};

export function AddDeviceDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    category: "mikrotik",
    vendor: "mikrotik",
    protocol: "snmp", // snmp | ssh | telnet | snmp_ssh | snmp_telnet
    ip_address: "",
    port: "",
    username: "admin",
    password: "",
    enable_password: "",
    location: "",
    backup_schedule: "manual",
    // SNMP
    snmp_enabled: true,
    snmp_ip: "",
    snmp_port: 161,
    snmp_community: "public",
    snmp_version: "v2c",
    oid_profile_id: "" as string,
    // Agent
    agent_enabled: false,
    data_source_priority: "snmp_first",
    agent_stale_seconds: 180,
    // Fallback
    fallback_protocol: "" as string,
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const { data: profiles = [] } = useQuery({
    queryKey: ["device_vendor_profiles_picker"],
    queryFn: async () => {
      const { data } = await supabase.from("device_vendor_profiles").select("id,vendor_key,display_name").order("display_name");
      return data || [];
    },
  });

  // Auto-suggest OID profile when vendor changes
  useEffect(() => {
    const key = VENDOR_TO_PROFILE[form.vendor];
    if (key) {
      const p = profiles.find((x: any) => x.vendor_key === key);
      if (p && !form.oid_profile_id) setForm((f) => ({ ...f, oid_profile_id: p.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vendor, profiles]);

  const usesSnmp = ["snmp", "snmp_ssh", "snmp_telnet"].includes(form.protocol);
  const fallback = form.protocol === "snmp_ssh" ? "ssh" : form.protocol === "snmp_telnet" ? "telnet" : null;
  const usesCli = ["ssh", "telnet"].includes(form.protocol) || fallback;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.ip_address) throw new Error("নাম ও IP লাগবে");

      if (form.category === "mikrotik" && form.protocol === "api") {
        const { error } = await supabase.from("mikrotik_devices").insert({
          name: form.name,
          ip_address: form.ip_address,
          api_port: form.port ? parseInt(form.port) : 80,
          username: form.username || "admin",
          password_encrypted: form.password || "",
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
          snmp_enabled: usesSnmp,
          snmp_ip: form.snmp_ip || null,
          snmp_port: form.snmp_port,
          snmp_community: form.snmp_community,
          snmp_version: form.snmp_version,
          oid_profile_id: form.oid_profile_id || null,
          agent_enabled: form.agent_enabled,
          data_source_priority: form.data_source_priority,
          agent_stale_seconds: form.agent_stale_seconds,
          fallback_protocol: fallback,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>নতুন ডিভাইস যোগ করুন</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>নাম *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Core-Router-1" />
          </div>
          <div className="space-y-1.5">
            <Label>ক্যাটেগরি *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
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
            <Label>Management পোর্ট</Label>
            <Input value={form.port} onChange={(e) => set("port", e.target.value)} placeholder="22" />
          </div>

          <div className="space-y-1.5">
            <Label>ভেন্ডর</Label>
            <Select value={form.vendor} onValueChange={(v) => { set("vendor", v); set("oid_profile_id", ""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {VENDORS.map((v) => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>কানেকশন প্রোটোকল</Label>
            <Select value={form.protocol} onValueChange={(v) => set("protocol", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="snmp">SNMP only</SelectItem>
                <SelectItem value="snmp_ssh">SNMP + SSH fallback</SelectItem>
                <SelectItem value="snmp_telnet">SNMP + Telnet fallback</SelectItem>
                <SelectItem value="ssh">SSH only</SelectItem>
                <SelectItem value="telnet">Telnet only</SelectItem>
                {form.category === "mikrotik" && <SelectItem value="api">MikroTik API</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ইউজারনেম {usesCli ? "" : "(optional)"}</Label>
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>পাসওয়ার্ড</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>

          {usesCli && (form.vendor === "cisco" || form.vendor === "huawei") && (
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

        {usesSnmp && (
          <>
            <Separator />
            <div className="space-y-3 py-2">
              <h3 className="text-sm font-semibold">SNMP কনফিগ</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SNMP IP (ফাঁকা = main IP)</Label>
                  <Input value={form.snmp_ip} onChange={(e) => set("snmp_ip", e.target.value)} placeholder={form.ip_address || "192.168.1.1"} />
                </div>
                <div className="space-y-1.5">
                  <Label>SNMP Port</Label>
                  <Input type="number" value={form.snmp_port} onChange={(e) => set("snmp_port", parseInt(e.target.value) || 161)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Community string</Label>
                  <Input value={form.snmp_community} onChange={(e) => set("snmp_community", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>SNMP version</Label>
                  <Select value={form.snmp_version} onValueChange={(v) => set("snmp_version", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">v1</SelectItem>
                      <SelectItem value="v2c">v2c</SelectItem>
                      <SelectItem value="v3">v3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>OID Profile</Label>
                  <Select value={form.oid_profile_id} onValueChange={(v) => set("oid_profile_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Profile সিলেক্ট করুন" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">OID Library থেকে আসছে — vendor অনুযায়ী auto-suggested।</p>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Polling Agent (optional)</h3>
            <Switch checked={form.agent_enabled} onCheckedChange={(v) => set("agent_enabled", v)} />
          </div>
          {form.agent_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data source priority</Label>
                <Select value={form.data_source_priority} onValueChange={(v) => set("data_source_priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snmp_first">SNMP first</SelectItem>
                    <SelectItem value="agent_first">Agent first</SelectItem>
                    <SelectItem value="snmp_only">SNMP only</SelectItem>
                    <SelectItem value="agent_only">Agent only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agent stale (seconds)</Label>
                <Input type="number" min={30} value={form.agent_stale_seconds} onChange={(e) => set("agent_stale_seconds", parseInt(e.target.value) || 180)} />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Local network-এ Windows/Linux PC-তে agent install করলে private IP MikroTik / OLT-এ access পাওয়া যাবে।
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>যোগ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
