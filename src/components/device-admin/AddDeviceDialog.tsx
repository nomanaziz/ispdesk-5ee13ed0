import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ---------- Catalogs (future-extensible) ----------
const CATEGORIES = [
  { value: "router", label: "Router" },
  { value: "olt", label: "OLT" },
  { value: "switch", label: "Switch" },
  { value: "access_point", label: "Access Point" },
  { value: "server", label: "Server" },
  { value: "pppoe", label: "PPPoE Server" },
];

const VENDORS_BY_CATEGORY: Record<string, string[]> = {
  router: ["mikrotik", "cisco", "juniper", "huawei", "other"],
  olt: ["vsol", "bdcom", "huawei", "c-data", "hsgq", "phyhome", "tbs", "hbdpon", "ecom", "lightx", "syrotech", "solitine", "corelink", "dbc", "other"],
  switch: ["mikrotik", "cisco", "huawei", "tp-link", "ubiquiti", "other"],
  access_point: ["mikrotik", "ubiquiti", "tp-link", "cambium", "other"],
  server: ["dell", "hp", "lenovo", "supermicro", "generic", "other"],
  pppoe: ["mikrotik", "accel-ppp", "other"],
};

const PROTOCOLS_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  router: [
    { value: "api", label: "MikroTik API" },
    { value: "ssh", label: "SSH" },
    { value: "telnet", label: "Telnet" },
    { value: "snmp", label: "SNMP" },
  ],
  olt: [
    { value: "snmp", label: "Type 1 — SNMP only" },
    { value: "ssh", label: "Type 2 — SSH only" },
    { value: "telnet", label: "Type 2 — Telnet only" },
    { value: "snmp_ssh", label: "Type 3 — SNMP + SSH fallback" },
    { value: "snmp_telnet", label: "Type 3 — SNMP + Telnet fallback" },
  ],
  switch: [{ value: "snmp", label: "SNMP (monitoring)" }],
  access_point: [{ value: "snmp", label: "SNMP" }],
  server: [
    { value: "snmp", label: "SNMP" },
    { value: "ssh", label: "SSH" },
  ],
  pppoe: [
    { value: "api", label: "MikroTik API" },
    { value: "ssh", label: "SSH" },
    { value: "radius", label: "RADIUS" },
  ],
};

const VENDOR_TO_PROFILE: Record<string, string> = {
  vsol: "vsol_olt", bdcom: "bdcom_olt", dbc: "dbc_olt", syrotech: "syrotech_olt",
  solitine: "solitine_olt", corelink: "corelink_olt", "c-data": "cdata_olt",
  ecom: "ecom_olt", lightx: "lightx_olt", hsgq: "hsgq_olt", phyhome: "phyhome_olt",
  tbs: "tbs_olt", huawei: "huawei_olt", hbdpon: "hbdpon_olt", mikrotik: "mikrotik_router",
};

const DEFAULT_PORT: Record<string, string> = { api: "80", ssh: "22", telnet: "23", snmp: "161", radius: "1812" };

export function AddDeviceDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "router",
    vendor: "mikrotik",
    protocol: "api",
    ip_address: "",
    port: "",
    username: "admin",
    password: "",
    enable_password: "",
    location: "",
    // SNMP
    snmp_ip: "",
    snmp_port: 161,
    snmp_community: "public",
    snmp_version: "v2c",
    oid_profile_id: "" as string,
    // Agent
    agent_enabled: false,
    data_source_priority: "snmp_first",
    agent_stale_seconds: 180,
    // Server-specific
    os_type: "linux",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // Reset vendor + protocol when category changes
  useEffect(() => {
    const vendors = VENDORS_BY_CATEGORY[form.category] || [];
    const protos = PROTOCOLS_BY_CATEGORY[form.category] || [];
    setForm((f) => ({
      ...f,
      vendor: vendors.includes(f.vendor) ? f.vendor : vendors[0] || "other",
      protocol: protos.find((p) => p.value === f.protocol) ? f.protocol : protos[0]?.value || "snmp",
      oid_profile_id: "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // Auto port default
  useEffect(() => {
    if (!form.port) set("port", DEFAULT_PORT[form.protocol] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.protocol]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["device_vendor_profiles_picker"],
    queryFn: async () => {
      const { data } = await supabase.from("device_vendor_profiles").select("id,vendor_key,display_name").order("display_name");
      return data || [];
    },
  });

  // Filter OID profiles by vendor when relevant
  const filteredProfiles = useMemo(() => {
    const vk = VENDOR_TO_PROFILE[form.vendor];
    if (!vk) return profiles;
    const matching = (profiles as any[]).filter((p) => p.vendor_key?.startsWith(form.vendor) || p.vendor_key === vk);
    return matching.length ? matching : profiles;
  }, [profiles, form.vendor]);

  // Auto-suggest OID profile
  useEffect(() => {
    const key = VENDOR_TO_PROFILE[form.vendor];
    if (key && !form.oid_profile_id) {
      const p = (profiles as any[]).find((x) => x.vendor_key === key);
      if (p) setForm((f) => ({ ...f, oid_profile_id: p.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.vendor, profiles]);

  const usesSnmp = ["snmp", "snmp_ssh", "snmp_telnet"].includes(form.protocol);
  const usesCli = ["ssh", "telnet", "snmp_ssh", "snmp_telnet"].includes(form.protocol);
  const usesApi = form.protocol === "api";
  const fallback = form.protocol === "snmp_ssh" ? "ssh" : form.protocol === "snmp_telnet" ? "telnet" : null;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.ip_address) throw new Error("নাম ও IP লাগবে");

      // Duplicate IP check across all device tables
      const ip = form.ip_address.trim();
      const [mk, mg, olt, pop] = await Promise.all([
        supabase.from("mikrotik_devices").select("name").eq("ip_address", ip).limit(1),
        supabase.from("device_admin_managed_devices").select("name").eq("ip_address", ip).limit(1),
        supabase.from("olt_devices").select("name").eq("ip_address", ip).limit(1),
        supabase.from("pop_devices").select("name").eq("ip_address", ip).limit(1),
      ]);
      const existing = mk.data?.[0] || mg.data?.[0] || olt.data?.[0] || pop.data?.[0];
      if (existing) throw new Error(`এই IP ইতিমধ্যে আছে: ${(existing as any).name}`);



      if (form.category === "router" && form.vendor === "mikrotik" && usesApi) {
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
          username: usesCli || usesApi ? form.username || null : null,
          password_encrypted: usesCli || usesApi ? form.password || null : null,
          enable_password: usesCli ? form.enable_password || null : null,
          location: form.location || null,
          backup_schedule: "manual",
          created_by: u.user?.id,
          snmp_enabled: usesSnmp,
          snmp_ip: usesSnmp ? form.snmp_ip || null : null,
          snmp_port: usesSnmp ? form.snmp_port : null,
          snmp_community: usesSnmp ? form.snmp_community : null,
          snmp_version: usesSnmp ? form.snmp_version : null,
          oid_profile_id: usesSnmp || form.category === "olt" ? form.oid_profile_id || null : null,
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
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vendors = VENDORS_BY_CATEGORY[form.category] || [];
  const protocols = PROTOCOLS_BY_CATEGORY[form.category] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>নতুন ডিভাইস যোগ করুন</DialogTitle></DialogHeader>

        {/* === Basic === */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5 col-span-2">
            <Label>ডিভাইস নাম *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Core-Router-1" />
          </div>
          <div className="space-y-1.5">
            <Label>ক্যাটেগরি *</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>IP অ্যাড্রেস *</Label>
            <Input value={form.ip_address} onChange={(e) => set("ip_address", e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>লোকেশন</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
        </div>

        {/* === Vendor + Protocol === */}
        {vendors.length > 0 && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1.5">
                <Label>{form.category === "olt" ? "OLT Vendor" : "Vendor"}</Label>
                <Select value={form.vendor} onValueChange={(v) => { set("vendor", v); set("oid_profile_id", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {vendors.map((v) => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.category === "server" ? (
                <div className="space-y-1.5">
                  <Label>OS Type</Label>
                  <Select value={form.os_type} onValueChange={(v) => set("os_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="other">অন্যান্য</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>{form.category === "olt" ? "Communication Type" : "Connection Protocol"}</Label>
                  <Select value={form.protocol} onValueChange={(v) => { set("protocol", v); set("port", DEFAULT_PORT[v] || ""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {protocols.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </>
        )}

        {/* === CLI / API credentials === */}
        {(usesCli || usesApi) && (
          <>
            <Separator />
            <div className="space-y-3 py-2">
              <h3 className="text-sm font-semibold">{usesApi ? "API" : "CLI"} অ্যাক্সেস</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>পোর্ট</Label>
                  <Input value={form.port} onChange={(e) => set("port", e.target.value)} placeholder={DEFAULT_PORT[form.protocol]} />
                </div>
                <div className="space-y-1.5">
                  <Label>ইউজারনেম</Label>
                  <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>পাসওয়ার্ড</Label>
                  <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
                {usesCli && (form.vendor === "cisco" || form.vendor === "huawei") && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>Enable পাসওয়ার্ড</Label>
                    <Input type="password" value={form.enable_password} onChange={(e) => set("enable_password", e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* === SNMP === */}
        {usesSnmp && (
          <>
            <Separator />
            <div className="space-y-3 py-2">
              <h3 className="text-sm font-semibold">SNMP কনফিগ</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SNMP IP (ফাঁকা = main)</Label>
                  <Input value={form.snmp_ip} onChange={(e) => set("snmp_ip", e.target.value)} placeholder={form.ip_address || "192.168.1.1"} />
                </div>
                <div className="space-y-1.5">
                  <Label>SNMP Port</Label>
                  <Input type="number" value={form.snmp_port} onChange={(e) => set("snmp_port", parseInt(e.target.value) || 161)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Community</Label>
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
                {(form.category === "olt" || form.category === "switch") && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>OID Profile</Label>
                    <Select value={form.oid_profile_id} onValueChange={(v) => set("oid_profile_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Profile সিলেক্ট করুন" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {filteredProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* === Advanced (Agent) === */}
        <Separator />
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold py-2 hover:text-primary">
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "" : "-rotate-90"}`} />
            Advanced — Polling Agent
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <Label>Agent enabled</Label>
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
                  <Label>Agent stale (sec)</Label>
                  <Input type="number" min={30} value={form.agent_stale_seconds} onChange={(e) => set("agent_stale_seconds", parseInt(e.target.value) || 180)} />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Local network agent (Windows/Linux) install করলে private IP device-এ access পাওয়া যাবে।
            </p>
          </CollapsibleContent>
        </Collapsible>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>যোগ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
