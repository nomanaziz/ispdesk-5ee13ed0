import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Server, Cpu, AlertTriangle, WifiOff, Network, Activity } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const OltOverview = () => {
  const [switchPage, setSwitchPage] = useState(0);
  const perPage = 10;

  const { data: oltDevices = [] } = useQuery({
    queryKey: ["olt-devices-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices").select("*");
      return data || [];
    },
  });

  const { data: onuList = [] } = useQuery({
    queryKey: ["onu-list-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("onu_list").select("*");
      return data || [];
    },
  });

  const { data: switches = [] } = useQuery({
    queryKey: ["switches-overview"],
    queryFn: async () => {
      const { data } = await supabase.from("switches").select("*");
      return data || [];
    },
  });

  const totalOlts = oltDevices.length;
  const totalPorts = oltDevices.reduce((sum, d) => sum + (d.total_onus || 0), 0);
  const offlineOnus = onuList.filter((o) => o.status === "offline").length;
  const onlineOnus = onuList.filter((o) => o.status === "online").length;
  const totalOnus = onuList.length;

  // dB buckets
  const dbBuckets = [
    { label: "0 ~ -18 dB", range: [-18, 0], color: "bg-emerald-500" },
    { label: "-18 ~ -21 dB", range: [-21, -18], color: "bg-green-500" },
    { label: "-21 ~ -24 dB", range: [-24, -21], color: "bg-yellow-500" },
    { label: "-24 ~ -27 dB", range: [-27, -24], color: "bg-orange-500" },
    { label: "-27 ~ -29 dB", range: [-29, -27], color: "bg-red-400" },
    { label: "-29 ~ -31 dB", range: [-31, -29], color: "bg-red-600" },
    { label: "-31+ dB", range: [-100, -31], color: "bg-red-900" },
  ];

  const getDbCount = (min: number, max: number) =>
    onuList.filter((o) => {
      const rx = o.rx_power;
      if (rx == null) return false;
      return rx >= min && rx < max;
    }).length;

  const highDbCount = onuList.filter((o) => o.rx_power != null && o.rx_power < -24).length;

  const pagedSwitches = switches.slice(switchPage * perPage, (switchPage + 1) * perPage);
  const totalSwitchPages = Math.ceil(switches.length / perPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">OLT / ONU Overview</h1>
        <p className="text-muted-foreground text-sm">রিয়েল-টাইম OLT ও ONU স্ট্যাটাস ওভারভিউ</p>
      </div>

      {/* Row 1: Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Server className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total OLT</p>
              <p className="text-2xl font-bold text-foreground">{totalOlts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Cpu className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total ONU</p>
              <p className="text-2xl font-bold text-foreground">{totalOnus}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                  Online: {onlineOnus}
                </Badge>
                <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                  Offline: {offlineOnus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High dB (24+)</p>
              <p className="text-2xl font-bold text-foreground">{highDbCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offline ONU</p>
              <p className="text-2xl font-bold text-foreground">{offlineOnus}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: dB List Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            dB Signal Strength Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {dbBuckets.map((bucket) => {
              const count = getDbCount(bucket.range[0], bucket.range[1]);
              return (
                <div
                  key={bucket.label}
                  className="rounded-lg border p-3 text-center hover:shadow-md transition-shadow"
                >
                  <div className={`h-3 w-full rounded-full ${bucket.color} mb-2`} />
                  <p className="text-xs text-muted-foreground font-medium">{bucket.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Switch List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Switch List
            <Badge variant="secondary" className="ml-auto">{switches.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {switches.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">কোনো সুইচ যোগ করা হয়নি</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedSwitches.map((sw, idx) => (
                    <TableRow key={sw.id}>
                      <TableCell>{switchPage * perPage + idx + 1}</TableCell>
                      <TableCell className="font-medium">{sw.name}</TableCell>
                      <TableCell className="font-mono text-sm">{sw.ip_address}</TableCell>
                      <TableCell>{sw.port || 0}</TableCell>
                      <TableCell>
                        <Badge variant={sw.status === "online" ? "default" : "destructive"}>
                          {sw.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalSwitchPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={switchPage === 0}
                    onClick={() => setSwitchPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {switchPage + 1} of {totalSwitchPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={switchPage >= totalSwitchPages - 1}
                    onClick={() => setSwitchPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OltOverview;
