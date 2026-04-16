import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  RefreshCw, Users, Wifi, WifiOff, Search, Filter, ChevronDown, ChevronUp,
  AlertTriangle, ShieldAlert, ShieldCheck, Activity, Radio, RotateCcw,
  MessageSquare, Send, ArrowUpFromLine, ArrowDownToLine,
} from "lucide-react";

interface ActiveSession {
  name: string;
  address: string;
  uptime: string;
  caller_id: string;
  service: string;
  encoding: string;
  server_name: string;
  device_id: string;
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
  mikrotik_id?: string;
  total_upload?: number;
  total_download?: number;
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

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatBps(bps: string | null): string {
  if (!bps) return "0 bps";
  const n = parseInt(bps, 10);
  if (n < 1000) return `${n} bps`;
  if (n < 1000000) return `${(n / 1000).toFixed(1)} Kbps`;
  return `${(n / 1000000).toFixed(1)} Mbps`;
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

  // Selection for bulk SMS
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action dialogs
  const [trafficDialog, setTrafficDialog] = useState<{ open: boolean; loading: boolean; data: any; username: string }>({ open: false, loading: false, data: null, username: "" });
  const [pingDialog, setPingDialog] = useState<{ open: boolean; loading: boolean; data: any; username: string }>({ open: false, loading: false, data: null, username: "" });
  const [smsDialog, setSmsDialog] = useState<{ open: boolean; contact: string; username: string }>({ open: false, contact: "", username: "" });
  const [smsMessage, setSmsMessage] = useState("");
  const [bulkSmsDialog, setBulkSmsDialog] = useState(false);
  const [bulkSmsMessage, setBulkSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);

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

  // Action: Live Traffic
  const handleLiveTraffic = async (session: ActiveSession) => {
    setTrafficDialog({ open: true, loading: true, data: null, username: session.name });
    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: {
          mikrotik_id: session.device_id || session.mikrotik_id,
          username: session.name,
          action: "status",
        },
      });
      if (error) throw error;
      setTrafficDialog((prev) => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      toast.error("Live traffic ব্যর্থ: " + err.message);
      setTrafficDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Action: Ping
  const handlePing = async (session: ActiveSession) => {
    setPingDialog({ open: true, loading: true, data: null, username: session.name });
    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: {
          mikrotik_id: session.device_id || session.mikrotik_id,
          username: session.name,
          action: "ping",
          target_ip: session.address,
        },
      });
      if (error) throw error;
      setPingDialog((prev) => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      toast.error("Ping ব্যর্থ: " + err.message);
      setPingDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Action: Re-check (single client refresh)
  const handleRecheck = async (session: ActiveSession) => {
    toast.info(`${session.name} re-checking...`);
    try {
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: {
          mikrotik_id: session.device_id || session.mikrotik_id,
          username: session.name,
          action: "status",
        },
      });
      if (error) throw error;
      const status = data?.has_active_session ? "Online" : "Offline";
      toast.success(`${session.name}: ${status}`);
    } catch (err: any) {
      toast.error("Re-check ব্যর্থ: " + err.message);
    }
  };

  // SMS: single
  const handleSendSingleSms = async () => {
    if (!smsMessage || !smsDialog.contact) return;
    setSendingSms(true);
    try {
      await supabase.from("sms_log").insert({
        recipient: smsDialog.contact,
        message: smsMessage,
        sms_type: "individual",
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: 1,
      });
      toast.success("SMS পাঠানো হয়েছে");
      setSmsDialog({ open: false, contact: "", username: "" });
      setSmsMessage("");
    } catch (err: any) {
      toast.error("SMS ব্যর্থ: " + err.message);
    } finally {
      setSendingSms(false);
    }
  };

  // SMS: bulk
  const handleSendBulkSms = async () => {
    if (!bulkSmsMessage || selectedIds.size === 0) return;
    setSendingSms(true);
    try {
      const selectedSessions = sessions.filter((s) => selectedIds.has(s.name));
      const contacts = selectedSessions.map((s) => s.contact).filter(Boolean);
      if (contacts.length === 0) {
        toast.error("কোনো মোবাইল নম্বর পাওয়া যায়নি");
        return;
      }
      await supabase.from("sms_log").insert({
        recipient: contacts.join(","),
        message: bulkSmsMessage,
        sms_type: "online_bulk",
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_count: contacts.length,
      });
      toast.success(`${contacts.length} জনকে SMS পাঠানো হয়েছে`);
      setBulkSmsDialog(false);
      setBulkSmsMessage("");
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error("Bulk SMS ব্যর্থ: " + err.message);
    } finally {
      setSendingSms(false);
    }
  };

  // Selection handlers
  const toggleSelect = (name: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = (data: ActiveSession[]) => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((s) => s.name)));
    }
  };

  useEffect(() => {
    loadFilterOptions();
    loadActiveSessions();
  }, [loadFilterOptions, loadActiveSessions]);

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
      {selectedIds.size > 0 && (
        <div className="p-2 bg-muted/50 border-b flex items-center gap-2">
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
          <Button size="sm" variant="outline" onClick={() => setBulkSmsDialog(true)}>
            <Send className="h-3.5 w-3.5 mr-1" />
            SMS Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={data.length > 0 && selectedIds.size === data.length}
                onCheckedChange={() => toggleSelectAll(data)}
              />
            </TableHead>
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
            <TableHead>
              <ArrowUpFromLine className="h-3.5 w-3.5 inline mr-1" />Upload
            </TableHead>
            <TableHead>
              <ArrowDownToLine className="h-3.5 w-3.5 inline mr-1" />Download
            </TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">
                কোনো ডেটা পাওয়া যায়নি
              </TableCell>
            </TableRow>
          ) : (
            data.map((s, i) => (
              <TableRow key={`${s.name}-${s.server_name}-${i}`}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(s.name)}
                    onCheckedChange={() => toggleSelect(s.name)}
                  />
                </TableCell>
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
                <TableCell className="font-mono text-xs">{formatBytes(s.total_upload || 0)}</TableCell>
                <TableCell className="font-mono text-xs">{formatBytes(s.total_download || 0)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Live Traffic" onClick={() => handleLiveTraffic(s)}>
                      <Activity className="h-3.5 w-3.5 text-emerald-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Ping" onClick={() => handlePing(s)}>
                      <Radio className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Re-check" onClick={() => handleRecheck(s)}>
                      <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="SMS" onClick={() => setSmsDialog({ open: true, contact: s.contact || "", username: s.name })}>
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                    </Button>
                  </div>
                </TableCell>
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
            {type === "profile-mismatch" ? (
              <>
                <TableHead>DB Profile</TableHead>
                <TableHead>MK Profile</TableHead>
              </>
            ) : (
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
                    <TableCell><Badge variant="secondary">{r.db_profile || "—"}</Badge></TableCell>
                    <TableCell><Badge variant="destructive">{r.mk_profile || "—"}</Badge></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell><Badge variant={r.db_status === "active" ? "default" : "secondary"}>{r.db_status}</Badge></TableCell>
                    <TableCell><Badge variant={r.mk_disabled ? "destructive" : "default"}>{r.mk_disabled ? "Disabled" : "Enabled"}</Badge></TableCell>
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
              <Select value={filterServer} onValueChange={setFilterServer}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Servers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Zones" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((z) => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterConnectionType} onValueChange={setFilterConnectionType}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Connection Types" /></SelectTrigger>
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

      <p className="text-xs text-muted-foreground text-right">Auto-refresh: প্রতি ৬০ সেকেন্ডে | Traffic data: প্রতি ১৫ মিনিটে</p>

      {/* Live Traffic Dialog */}
      <Dialog open={trafficDialog.open} onOpenChange={(o) => !o && setTrafficDialog({ open: false, loading: false, data: null, username: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Live Traffic — {trafficDialog.username}
            </DialogTitle>
          </DialogHeader>
          {trafficDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trafficDialog.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={trafficDialog.data.has_active_session ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"}>
                      {trafficDialog.data.has_active_session ? "Online" : "Offline"}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">IP</p>
                    <p className="font-mono text-sm">{trafficDialog.data.current_id || "—"}</p>
                  </CardContent>
                </Card>
              </div>
              {trafficDialog.data.session && (
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Uptime</p>
                      <p className="font-mono text-sm">{trafficDialog.data.session.uptime || "—"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Caller ID</p>
                      <p className="font-mono text-xs">{trafficDialog.data.session.caller_id || "—"}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
              {trafficDialog.data.live_traffic && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-emerald-500/30">
                    <CardContent className="p-3 text-center">
                      <ArrowDownToLine className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                      <p className="text-xs text-muted-foreground">Download</p>
                      <p className="font-bold text-emerald-500">{formatBps(trafficDialog.data.live_traffic.rx_bps)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/30">
                    <CardContent className="p-3 text-center">
                      <ArrowUpFromLine className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                      <p className="text-xs text-muted-foreground">Upload</p>
                      <p className="font-bold text-blue-500">{formatBps(trafficDialog.data.live_traffic.tx_bps)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">ডেটা পাওয়া যায়নি</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Ping Dialog */}
      <Dialog open={pingDialog.open} onOpenChange={(o) => !o && setPingDialog({ open: false, loading: false, data: null, username: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-blue-500" />
              Ping — {pingDialog.username}
            </DialogTitle>
          </DialogHeader>
          {pingDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pingDialog.data ? (
            <div className="space-y-3">
              {pingDialog.data.summary && (
                <div className="grid grid-cols-3 gap-2">
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Sent</p><p className="font-bold">{pingDialog.data.summary.sent}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Received</p><p className="font-bold text-emerald-500">{pingDialog.data.summary.received}</p></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Loss</p><p className="font-bold text-destructive">{pingDialog.data.summary.packet_loss}</p></CardContent></Card>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pingDialog.data.ping_results || []).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.seq || i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{r.host}</TableCell>
                        <TableCell className="font-mono">{r.time || "—"}</TableCell>
                        <TableCell>{r.ttl || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-xs">
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">ডেটা পাওয়া যায়নি</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Single SMS Dialog */}
      <Dialog open={smsDialog.open} onOpenChange={(o) => !o && setSmsDialog({ open: false, contact: "", username: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS — {smsDialog.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>মোবাইল নম্বর</Label>
              <Input value={smsDialog.contact} readOnly className="mt-1" />
            </div>
            <div>
              <Label>মেসেজ</Label>
              <Textarea rows={3} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} placeholder="মেসেজ লিখুন..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendSingleSms} disabled={!smsMessage || sendingSms}>
              <Send className="h-4 w-4 mr-1" />{sendingSms ? "পাঠানো হচ্ছে..." : "SMS পাঠান"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS Dialog */}
      <Dialog open={bulkSmsDialog} onOpenChange={setBulkSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk SMS — {selectedIds.size} জন নির্বাচিত</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} জন online client-কে SMS পাঠানো হবে
            </p>
            <div>
              <Label>মেসেজ</Label>
              <Textarea rows={4} value={bulkSmsMessage} onChange={(e) => setBulkSmsMessage(e.target.value)} placeholder="বাল্ক মেসেজ লিখুন..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendBulkSms} disabled={!bulkSmsMessage || sendingSms}>
              <Send className="h-4 w-4 mr-1" />{sendingSms ? "পাঠানো হচ্ছে..." : `${selectedIds.size} জনকে SMS পাঠান`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
