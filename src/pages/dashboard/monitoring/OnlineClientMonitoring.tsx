import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Users, Wifi, WifiOff, Search, Filter, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

interface ActiveSession {
  name: string;
  address: string;
  uptime: string;
  caller_id: string;
  service: string;
  encoding: string;
  server_name: string;
  device_id: string;
  // joined from DB
  client_id?: string;
  client_code?: string;
  client_name?: string;
  contact?: string;
  zone_name?: string;
  sub_zone_name?: string;
  box_name?: string;
  connection_type?: string;
  profile?: string;
  status?: string;
}

interface MismatchRecord {
  username: string;
  client_code: string;
  client_name: string;
  contact: string;
  zone_name: string;
  sub_zone_name: string;
  box_name: string;
  server_name: string;
  db_profile: string;
  mk_profile: string;
  db_status: string;
  mk_disabled: boolean;
}

export default function OnlineClientMonitoring() {
  const [activeTab, setActiveTab] = useState("online");
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [mismatchData, setMismatchData] = useState<{ disabledInSystem: MismatchRecord[]; enabledInSystem: MismatchRecord[]; profileMismatch: MismatchRecord[] }>({ disabledInSystem: [], enabledInSystem: [], profileMismatch: [] });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);

  // Filters
  const [filterServer, setFilterServer] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [filterConnectionType, setFilterConnectionType] = useState("all");

  // Filter options
  const [servers, setServers] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<{ id: string; name: string }[]>([]);

  const loadFilterOptions = useCallback(async () => {
    const [devRes, zoneRes, connRes] = await Promise.all([
      supabase.from("mikrotik_devices").select("id, name").eq("enabled", true),
      supabase.from("zones").select("id, name").eq("status", "active"),
      supabase.from("connection_types_config").select("id, name").eq("status", "active"),
    ]);
    if (devRes.data) setServers(devRes.data);
    if (zoneRes.data) setZones(zoneRes.data);
    if (connRes.data) setConnectionTypes(connRes.data);
  }, []);

  const loadActiveSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { action: "active-sessions", device_id: filterServer !== "all" ? filterServer : "all" },
      });
      if (error) throw error;
      if (data?.sessions) {
        setSessions(data.sessions);
        setOnlineCount(data.online_count || data.sessions.length);
        setOfflineCount(data.offline_count || 0);
        setTotalClients(data.total_clients || 0);
      }
      if (data?.mismatch) {
        setMismatchData(data.mismatch);
      }
    } catch (err: any) {
      toast.error("সেশন লোড ব্যর্থ: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [filterServer]);

  const handleSyncOnline = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { action: "sync-online" },
      });
      if (error) throw error;
      toast.success(`সিঙ্ক সম্পন্ন — Online: ${data?.online || 0}, Offline: ${data?.offline || 0}`);
      loadActiveSessions();
    } catch (err: any) {
      toast.error("সিঙ্ক ব্যর্থ: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
    loadActiveSessions();
  }, [loadFilterOptions, loadActiveSessions]);

  // Auto refresh every 60s
  useEffect(() => {
    const interval = setInterval(loadActiveSessions, 60000);
    return () => clearInterval(interval);
  }, [loadActiveSessions]);

  const filteredSessions = sessions.filter((s) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !s.name?.toLowerCase().includes(term) &&
        !s.client_name?.toLowerCase().includes(term) &&
        !s.client_code?.toLowerCase().includes(term) &&
        !s.contact?.toLowerCase().includes(term) &&
        !s.address?.toLowerCase().includes(term)
      ) return false;
    }
    if (filterZone !== "all" && s.zone_name !== filterZone) return false;
    if (filterConnectionType !== "all" && s.connection_type !== filterConnectionType) return false;
    return true;
  });

  const renderSessionTable = (data: ActiveSession[]) => (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>C.Code</TableHead>
            <TableHead>ID / Username</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Subzone</TableHead>
            <TableHead>Box</TableHead>
            <TableHead>Conn. Type</TableHead>
            <TableHead>Server</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                কোনো ডেটা পাওয়া যায়নি
              </TableCell>
            </TableRow>
          ) : (
            data.map((s, i) => (
              <TableRow key={`${s.name}-${s.server_name}-${i}`}>
                <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{s.client_code || "—"}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.client_name || "—"}</TableCell>
                <TableCell>{s.contact || "—"}</TableCell>
                <TableCell>{s.zone_name || "—"}</TableCell>
                <TableCell>{s.sub_zone_name || "—"}</TableCell>
                <TableCell>{s.box_name || "—"}</TableCell>
                <TableCell>{s.connection_type || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{s.server_name}</Badge>
                </TableCell>
                <TableCell>{s.profile || "—"}</TableCell>
                <TableCell>{s.service || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{s.address || "—"}</TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Online</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{s.uptime || "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderMismatchTable = (data: MismatchRecord[], type: "disabled-in-system" | "enabled-in-system" | "profile-mismatch") => (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>C.Code</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Subzone</TableHead>
            <TableHead>Server</TableHead>
            {type === "profile-mismatch" && (
              <>
                <TableHead>DB Profile</TableHead>
                <TableHead>MK Profile</TableHead>
              </>
            )}
            {type !== "profile-mismatch" && (
              <>
                <TableHead>DB Status</TableHead>
                <TableHead>MK Status</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                কোনো mismatch পাওয়া যায়নি
              </TableCell>
            </TableRow>
          ) : (
            data.map((r, i) => (
              <TableRow key={`${r.username}-${i}`}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{r.client_code || "—"}</TableCell>
                <TableCell className="font-medium">{r.username}</TableCell>
                <TableCell>{r.client_name || "—"}</TableCell>
                <TableCell>{r.contact || "—"}</TableCell>
                <TableCell>{r.zone_name || "—"}</TableCell>
                <TableCell>{r.sub_zone_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{r.server_name}</Badge>
                </TableCell>
                {type === "profile-mismatch" ? (
                  <>
                    <TableCell>
                      <Badge variant="secondary">{r.db_profile || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{r.mk_profile || "—"}</Badge>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Badge variant={r.db_status === "active" ? "default" : "secondary"}>{r.db_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.mk_disabled ? "destructive" : "default"}>{r.mk_disabled ? "Disabled" : "Enabled"}</Badge>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">Online Client Monitoring</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadActiveSessions} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSyncOnline} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            Sync Clients & Servers
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{totalClients}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Wifi className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Online Users</p>
              <p className="text-2xl font-bold text-emerald-500">{onlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <WifiOff className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offline Users</p>
              <p className="text-2xl font-bold text-destructive">{offlineCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-1" />
              {showFilters ? "Hide Filters" : "Show Filters"}
              {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
            <div className="flex-1">
              <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t">
              <Select value={filterServer} onValueChange={(v) => { setFilterServer(v); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Servers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((z) => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterConnectionType} onValueChange={setFilterConnectionType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Connection Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {connectionTypes.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="online" className="flex items-center gap-1">
            <Wifi className="h-3.5 w-3.5" />
            Online Monitoring
            <Badge variant="secondary" className="ml-1 text-xs">{filteredSessions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="disabled-system" className="flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            Disabled in System
            <Badge variant="secondary" className="ml-1 text-xs">{mismatchData.disabledInSystem.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="enabled-system" className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Enabled in System
            <Badge variant="secondary" className="ml-1 text-xs">{mismatchData.enabledInSystem.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="profile-mismatch" className="flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Profile Mismatch
            <Badge variant="secondary" className="ml-1 text-xs">{mismatchData.profileMismatch.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online" className="mt-3">
          {renderSessionTable(filteredSessions)}
        </TabsContent>
        <TabsContent value="disabled-system" className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">সিস্টেমে Disabled কিন্তু MikroTik-এ Enabled আছে এমন ক্লায়েন্ট</p>
          {renderMismatchTable(mismatchData.disabledInSystem, "disabled-in-system")}
        </TabsContent>
        <TabsContent value="enabled-system" className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">সিস্টেমে Active কিন্তু MikroTik-এ Disabled আছে এমন ক্লায়েন্ট</p>
          {renderMismatchTable(mismatchData.enabledInSystem, "enabled-in-system")}
        </TabsContent>
        <TabsContent value="profile-mismatch" className="mt-3">
          <p className="text-sm text-muted-foreground mb-2">DB Profile ও MikroTik Profile ভিন্ন এমন ক্লায়েন্ট</p>
          {renderMismatchTable(mismatchData.profileMismatch, "profile-mismatch")}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-right">Auto-refresh: প্রতি ৬০ সেকেন্ডে</p>
    </div>
  );
}
