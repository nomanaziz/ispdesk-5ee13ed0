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

function ResourceTable({ deviceId, deviceType, resource, columns }: {
  deviceId: string; deviceType: string; resource: string; columns: { key: string; label: string }[];
}) {
  const { data: payload, isLoading, error } = useQuery({
    queryKey: ["inspect", deviceId, resource],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("inspect-device", {
        body: { device_id: deviceId, device_type: deviceType, resource },
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
    let hint = "";
    if (/timeout/i.test(msg)) hint = "ডিভাইস unreachable — IP/port চেক করুন";
    else if (/auth|login/i.test(msg)) hint = "Username/password ভুল";
    else if (/closed|refused/i.test(msg)) hint = "API port বন্ধ — RouterOS এ API service enable করুন";
    return (
      <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium">ফেচ ব্যর্থ</div>
          <div className="text-xs opacity-80 mt-1">{msg}</div>
          {hint && <div className="text-xs mt-1 opacity-70">💡 {hint}</div>}
        </div>
      </div>
    );
  }
  if (!data || data.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      {note || "কোনো ডেটা পাওয়া যায়নি"}
    </div>
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
                  <TableCell key={c.key} className="text-sm font-mono">
                    {String(row[c.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </>
  );
}


export function DeviceInspectorDialog({ open, onOpenChange, device }: Props) {
  const [tab, setTab] = useState("users");
  const [polling, setPolling] = useState(false);
  const isOlt = device?.type === "olt";

  const { data: oltSummary } = useQuery({
    queryKey: ["olt-summary", device?.id],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices")
        .select("total_onus, online_onus, brand_model, snmp_last_seen, agent_last_seen, status")
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
      const { data, error } = await supabase.functions.invoke("snmp-poll-device", {
        body: { device_id: device.id },
      });
      if (error) throw error;
      toast.success("Poll trigger পাঠানো হয়েছে — agent next cycle-এ data আনবে");
    } catch (e: any) {
      toast.error("Poll fail: " + (e.message || "unknown"));
    } finally {
      setPolling(false);
    }
  };

  // OLT-specific column sets
  const usersCols = isOlt
    ? [
        { key: "name", label: "ইউজার / Desc" },
        { key: "mac", label: "MAC" },
        { key: "pon", label: "PON পোর্ট" },
        { key: "status", label: "Status" },
        { key: "rx_power", label: "Rx (dBm)" },
        { key: "mapping", label: "ম্যাপিং" },
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
        { key: "total_onus", label: "মোট ONU" },
        { key: "online_onus", label: "Online" },
        { key: "running", label: "Running" },
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
            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
              {oltSummary.brand_model}
            </div>
          )}
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="users">{isOlt ? "ONU (ইউজার)" : "ইউজার"}</TabsTrigger>
            <TabsTrigger value="interfaces">{isOlt ? "PON পোর্ট" : "ইন্টারফেস"}</TabsTrigger>
            <TabsTrigger value="vlans">VLAN</TabsTrigger>
            <TabsTrigger value="vlan_ips">VLAN IP</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <ResourceTable deviceId={device.id} deviceType={device.type} resource="users" columns={usersCols} />
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
