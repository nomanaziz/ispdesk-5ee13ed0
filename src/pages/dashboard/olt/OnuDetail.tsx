import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Activity, Cpu, Signal } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

const DAYS = ["All", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function OnuDetail() {
  const { id } = useParams();
  const [day, setDay] = useState("All");

  const { data: onu } = useQuery({
    queryKey: ["onu-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("onu_list")
        .select("*, olt_devices(name, vendor, ip_address)")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["onu-history-full", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("onu_history")
        .select("rx_power, tx_power, status, recorded_at")
        .eq("onu_id", id!)
        .order("recorded_at", { ascending: true })
        .limit(500);
      return data || [];
    },
  });

  const filtered = history.filter((h) => {
    if (day === "All") return true;
    const d = new Date(h.recorded_at).toLocaleDateString("en-US", { weekday: "short" });
    return d === day;
  });

  const chartData = filtered.map((h) => ({
    time: new Date(h.recorded_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    rx: h.rx_power,
    tx: h.tx_power,
  }));

  const previous = history.length >= 2 ? history[history.length - 2] : null;

  const InfoCell = ({ label, value, hint }: { label: string; value: any; hint?: string }) => (
    <div className="border rounded-md p-3 bg-card">
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-base font-bold mt-1 break-all">{value ?? "—"}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );

  return (
    <PermissionGate permission="olt.onu.view" showDenied>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/olt/onu">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">ONU Details</h1>
            <p className="text-xs text-muted-foreground font-mono">{onu?.mac ?? "—"}</p>
          </div>
          {onu && (
            <Badge variant={onu.status === "online" ? "default" : "destructive"} className="ml-auto">
              {onu.status}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <InfoCell label="OLT Name" value={(onu as any)?.olt_devices?.name} />
          <InfoCell label="Vendor" value={(onu as any)?.olt_devices?.vendor} />
          <InfoCell label="Interface / Port" value={onu?.interface} />
          <InfoCell label="Serial" value={onu?.serial_number} />
          <InfoCell label="MAC" value={onu?.mac} />
          <InfoCell label="RX dBm" value={onu?.rx_power} hint="Receive power" />
          <InfoCell label="TX dBm" value={onu?.tx_power} hint="Transmit power" />
          <InfoCell label="Distance" value={onu?.distance ? `${onu.distance} m` : "—"} />
          <InfoCell label="Description" value={onu?.description} />
          <InfoCell
            label="Previous RX"
            value={previous?.rx_power ?? "—"}
            hint={previous ? new Date(previous.recorded_at).toLocaleString("bn-BD") : ""}
          />
          <InfoCell
            label="Last Seen"
            value={onu?.last_seen ? new Date(onu.last_seen).toLocaleString("bn-BD") : "—"}
          />
          <InfoCell label="Offline Reason" value={onu?.offline_reason} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <Signal className="h-5 w-5" /> RX/TX Power History
              </CardTitle>
              <Tabs value={day} onValueChange={setDay}>
                <TabsList>
                  {DAYS.map((d) => (
                    <TabsTrigger key={d} value={d} className="text-xs px-2">
                      {d}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <ReferenceLine y={-24} stroke="hsl(var(--warning, 30 90% 50%))" strokeDasharray="3 3" label="Warn" />
                  <ReferenceLine y={-27} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Crit" />
                  <Line type="monotone" dataKey="rx" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tx" stroke="hsl(var(--accent-foreground))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {chartData.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4 flex items-center justify-center gap-2">
                <Activity className="h-4 w-4" /> এই দিনের ইতিহাস নেই
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" /> Recent Snapshots
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">RX</th>
                  <th className="text-left p-2">TX</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .slice(-30)
                  .reverse()
                  .map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-xs">{new Date(h.recorded_at).toLocaleString("bn-BD")}</td>
                      <td className="p-2">
                        <Badge variant={h.status === "online" ? "default" : "destructive"}>{h.status}</Badge>
                      </td>
                      <td className="p-2 font-mono">{h.rx_power ?? "—"}</td>
                      <td className="p-2 font-mono">{h.tx_power ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
