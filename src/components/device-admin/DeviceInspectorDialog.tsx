import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  device: { id: string; name: string; type: string } | null;
}

function ResourceTable({ deviceId, deviceType, resource, columns, extraBody }: {
  deviceId: string; deviceType: string; resource: string;
  columns: { key: string; label: string }[];
  extraBody?: Record<string, any>;
}) {
  const { data: payload, isLoading, error } = useQuery({
    queryKey: ["inspect", deviceId, resource, extraBody],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("inspect-device", {
        body: { device_id: deviceId, device_type: deviceType, resource, ...(extraBody || {}) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed");
      return data as { data: any[]; note?: string };
    },
    enabled: !!deviceId,
    retry: false,
  });

  const data = payload?.data;
  const note = payload?.note;

  if (isLoading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> ফেচ করা হচ্ছে...</div>;
  if (error) {
    const msg = (error as any).message || "Unknown";
    return (
      <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="text-sm"><div className="font-medium">ফেচ ব্যর্থ</div><div className="text-xs opacity-80 mt-1">{msg}</div></div>
      </div>
    );
  }
  if (!data || data.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">{note || "কোনো ডেটা পাওয়া যায়নি"}</div>
  );

  return (
    <>
      {note && <div className="text-xs text-muted-foreground mb-2">ℹ️ {note}</div>}
      <ScrollArea className="h-[420px]">
        <Table>
          <TableHeader>
            <TableRow>{columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c.key} className="text-sm font-mono">{String(row[c.key] ?? "—")}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}

function OltOverview({ deviceId }: { deviceId: string }) {
  const { data: payload, isLoading } = useQuery({
    queryKey: ["inspect", deviceId, "system"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("inspect-device", {
        body: { device_id: deviceId, device_type: "olt", resource: "system" },
      });
      if (error) throw error;
      return data as { data: any[] };
    },
    refetchInterval: 20000,
  });

  if (isLoading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> লোড হচ্ছে...</div>;
  const s = payload?.data?.[0];
  if (!s) return <div className="text-center py-8 text-muted-foreground text-sm">কোনো ডেটা নেই</div>;

  const Chip = ({ label, value, tone = "default" }: { label: string; value: any; tone?: string }) => (
    <div className={`rounded-lg border p-3 ${tone === "ok" ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200" : tone === "warn" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200" : "bg-muted/30"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value ?? "—"}</div>
    </div>
  );

  const ponLabel = String(s.pon_type || "").toUpperCase() === "EPON" ? "EPON" : "GPON";
  return (
    <ScrollArea className="h-[420px] pr-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Chip label="Total Interface" value={s.total_interfaces} />
          <Chip label="Up / Down" value={`${s.ports_up} / ${s.ports_down}`} tone={s.ports_down > 0 ? "warn" : "ok"} />
          <Chip label="Total ONU" value={s.total_onus} />
          <Chip label="Online ONU" value={s.online_onus} tone="ok" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Chip label={ponLabel} value={s.pon_count} />
          <Chip label="Ether-SFP" value={s.ether_sfp_count} />
          <Chip label="Ether-RJ45" value={s.ether_rj45_count} />
        </div>
        <div className="rounded-lg border p-3 space-y-1 text-sm">
          <div className="font-semibold mb-2">সিস্টেম ইনফো</div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4">
            <div><span className="text-muted-foreground">Brand/Model:</span> <span className="font-mono">{s.brand_model}</span></div>
            <div><span className="text-muted-foreground">PON Type:</span> <span className="font-mono">{s.pon_type}</span></div>
            <div><span className="text-muted-foreground">Hardware:</span> <span className="font-mono">{s.hardware_version}</span></div>
            <div><span className="text-muted-foreground">Firmware:</span> <span className="font-mono">{s.firmware_version}</span></div>
            <div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{s.serial_number}</span></div>
            <div><span className="text-muted-foreground">MAC:</span> <span className="font-mono">{s.mac_address}</span></div>
            <div><span className="text-muted-foreground">Uptime:</span> <span className="font-mono">{s.uptime}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant={s.status === "online" ? "default" : "secondary"}>{s.status}</Badge></div>
            <div><span className="text-muted-foreground">Last Source:</span> <span className="font-mono">{s.last_data_source}</span></div>
            <div><span className="text-muted-foreground">Agent Last Seen:</span> <span className="font-mono text-xs">{s.agent_last_seen ? new Date(s.agent_last_seen).toLocaleString() : "—"}</span></div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function DeviceInspectorDialog({ open, onOpenChange, device }: Props) {
  const isOlt = device?.type === "olt";
  const [tab, setTab] = useState(isOlt ? "overview" : "users");
  const [userMode, setUserMode] = useState<"olt-only" | "with-user">("olt-only");
  const [polling, setPolling] = useState(false);

  const { data: oltSummary } = useQuery({
    queryKey: ["olt-summary", device?.id],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices")
        .select("total_onus, online_onus, brand_model, status")
        .eq("id", device!.id).maybeSingle();
      return data;
    },
    enabled: !!device && isOlt && open,
    refetchInterval: 15000,
  });

  if (!device) return null;

  const pollNow = async () => {
    setPolling(true);
    try {
      const { error } = await supabase.functions.invoke("snmp-poll-device", { body: { device_id: device.id } });
      if (error) throw error;
      toast.success("Poll trigger পাঠানো হয়েছে — agent next cycle-এ data আনবে");
    } catch (e: any) {
      toast.error("Poll fail: " + (e.message || "unknown"));
    } finally {
      setPolling(false);
    }
  };

  const usersCols = isOlt
    ? [
        { key: "name", label: userMode === "with-user" ? "ইউজার / Desc" : "Description / MAC" },
        { key: "mac", label: "MAC / SN" },
        { key: "pon", label: "PON পোর্ট" },
        { key: "status", label: "Status" },
        { key: "rx_power", label: "Rx (dBm)" },
        ...(userMode === "with-user" ? [{ key: "mapping", label: "ম্যাপিং" }] : []),
      ]
    : [
        { key: "name", label: "নাম" },
        { key: "group", label: "গ্রুপ/পারমিশন" },
        { key: "address", label: "Allowed Address" },
        { key: "last-logged-in", label: "শেষ লগইন" },
      ];

  const ifaceCols = isOlt
    ? [
        { key: "name", label: "পোর্ট" },
        { key: "type", label: "টাইপ" },
        { key: "oper_status", label: "Oper" },
        { key: "admin_status", label: "Admin" },
        { key: "total_onus", label: "মোট ONU" },
        { key: "online_onus", label: "Online" },
        { key: "description", label: "Description" },
      ]
    : [
        { key: "name", label: "নাম" },
        { key: "type", label: "টাইপ" },
        { key: "mac-address", label: "MAC" },
        { key: "running", label: "Running" },
        { key: "mtu", label: "MTU" },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            🔍 ডিভাইস ইন্সপেক্টর
            <Badge variant="outline">{device.type}</Badge>
            <span className="text-base font-normal text-muted-foreground">— {device.name}</span>
            {isOlt && oltSummary && (
              <>
                <Badge variant="secondary" className="ml-2">
                  ONU: {oltSummary.online_onus ?? 0}/{oltSummary.total_onus ?? 0} online
                </Badge>
                <Button size="sm" variant="outline" onClick={pollNow} disabled={polling} className="ml-auto">
                  <RefreshCw className={`h-3 w-3 mr-1 ${polling ? "animate-spin" : ""}`} />
                  এখনই Poll
                </Button>
              </>
            )}
          </DialogTitle>
          {isOlt && oltSummary?.brand_model && (
            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{oltSummary.brand_model}</div>
          )}
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {isOlt && <TabsTrigger value="overview">📊 Overview</TabsTrigger>}
            <TabsTrigger value="users">{isOlt ? "ONU (ইউজার)" : "ইউজার"}</TabsTrigger>
            <TabsTrigger value="interfaces">{isOlt ? "PON পোর্ট" : "ইন্টারফেস"}</TabsTrigger>
            <TabsTrigger value="vlans">VLAN</TabsTrigger>
            <TabsTrigger value="vlan_ips">VLAN IP</TabsTrigger>
          </TabsList>

          {isOlt && (
            <TabsContent value="overview">
              <OltOverview deviceId={device.id} />
            </TabsContent>
          )}

          <TabsContent value="users">
            {isOlt && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className="text-muted-foreground">View mode:</span>
                <Button size="sm" variant={userMode === "olt-only" ? "default" : "outline"} onClick={() => setUserMode("olt-only")}>
                  শুধু OLT
                </Button>
                <Button size="sm" variant={userMode === "with-user" ? "default" : "outline"} onClick={() => setUserMode("with-user")}>
                  + ইউজার (MikroTik)
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {userMode === "olt-only" ? "OLT-এর native ONU description ও MAC" : "MikroTik PPPoE caller-MAC দিয়ে customer match"}
                </span>
              </div>
            )}
            <ResourceTable deviceId={device.id} deviceType={device.type} resource="users" columns={usersCols}
              extraBody={isOlt ? { mode: userMode } : undefined} />
          </TabsContent>
          <TabsContent value="interfaces">
            <ResourceTable deviceId={device.id} deviceType={device.type} resource="interfaces" columns={ifaceCols} />
          </TabsContent>
          <TabsContent value="vlans">
            <ResourceTable deviceId={device.id} deviceType={device.type} resource="vlans"
              columns={[{ key: "name", label: "নাম" }, { key: "vlan-id", label: "VLAN ID" }, { key: "interface", label: "Parent" }, { key: "disabled", label: "Disabled" }]} />
          </TabsContent>
          <TabsContent value="vlan_ips">
            <ResourceTable deviceId={device.id} deviceType={device.type} resource="vlan_ips"
              columns={[{ key: "address", label: "IP/Subnet" }, { key: "interface", label: "VLAN ইন্টারফেস" }, { key: "network", label: "Network" }, { key: "disabled", label: "Disabled" }]} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
