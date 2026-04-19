import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  MessageSquare, Send, ArrowUpFromLine, ArrowDownToLine, History,
  ArrowUp, ArrowDown, ArrowUpDown, Server,
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
  session_upload_bytes?: number;
  session_download_bytes?: number;
}

interface MismatchRecord {
  client_id?: string;
  mikrotik_id?: string;
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

interface TrafficLog {
  id: string;
  upload_bytes: number;
  download_bytes: number;
  recorded_at: string;
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
  const [offlineClients, setOfflineClients] = useState<ActiveSession[]>([]);
  const [mismatchData, setMismatchData] = useState<{ disabledInSystem: MismatchRecord[]; enabledInSystem: MismatchRecord[]; profileMismatch: MismatchRecord[] }>({ disabledInSystem: [], enabledInSystem: [], profileMismatch: [] });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [totalClients, setTotalClients] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const handleSort = (col: string) => {
    if (sortBy !== col) { setSortBy(col); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortBy(null); setSortDir("asc");
  };

  // Filters — filterServer is the *active* MikroTik device (mandatory; never "all")
  const [filterServer, setFilterServer] = useState<string>("");
  const [filterZone, setFilterZone] = useState("all");
  const [filterConnectionType, setFilterConnectionType] = useState("all");

  // Filter options
  const [servers, setServers] = useState<{ id: string; name: string; order_no: number | null }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<{ id: string; name: string }[]>([]);

  // Selection for bulk SMS
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action dialogs
  const [trafficDialog, setTrafficDialog] = useState<{ open: boolean; loading: boolean; data: any; username: string; session: ActiveSession | null; trafficHistory: TrafficLog[] }>({ open: false, loading: false, data: null, username: "", session: null, trafficHistory: [] });
  const [pingDialog, setPingDialog] = useState<{ open: boolean; loading: boolean; data: any; username: string }>({ open: false, loading: false, data: null, username: "" });
  const [smsDialog, setSmsDialog] = useState<{ open: boolean; contact: string; username: string }>({ open: false, contact: "", username: "" });
  const [smsMessage, setSmsMessage] = useState("");
  const [bulkSmsDialog, setBulkSmsDialog] = useState(false);
  const [bulkSmsMessage, setBulkSmsMessage] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const livePollRef = useRef<number | null>(null);
  const liveClientIdRef = useRef<string | null>(null);

  // Bulk mismatch action state
  const [mismatchSelection, setMismatchSelection] = useState<Record<string, Set<string>>>({
    "disabled-in-system": new Set(),
    "enabled-in-system": new Set(),
    "profile-mismatch": new Set(),
  });
  const [bulkMismatchRunning, setBulkMismatchRunning] = useState(false);

  const toggleMismatchRow = (tab: string, key: string) => {
    setMismatchSelection((prev) => {
      const next = new Set(prev[tab]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [tab]: next };
    });
  };

  const toggleMismatchAll = (tab: string, records: MismatchRecord[]) => {
    setMismatchSelection((prev) => {
      const allKeys = records.map((r) => `${r.username}::${r.mikrotik_id || ""}`);
      const current = prev[tab];
      const allSelected = allKeys.length > 0 && allKeys.every((k) => current.has(k));
      return { ...prev, [tab]: new Set(allSelected ? [] : allKeys) };
    });
  };

  const loadFilterOptions = useCallback(async () => {
    const [devRes, zoneRes, connRes] = await Promise.all([
      supabase
        .from("mikrotik_devices")
        .select("id, name, order_no")
        .eq("enabled", true)
        .order("order_no", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase.from("zones").select("id, name").eq("status", "active"),
      supabase.from("connection_types_config").select("id, name").eq("status", "active"),
    ]);
    if (devRes.data) {
      setServers(devRes.data as any);
      // Auto-select first device on mount if none selected
      if (!filterServer && devRes.data.length > 0) {
        setFilterServer((devRes.data[0] as any).id);
      }
    }
    if (zoneRes.data) setZones(zoneRes.data);
    if (connRes.data) setConnectionTypes(connRes.data);
  }, [filterServer]);

  const loadActiveSessions = useCallback(async () => {
    // Require an active device — never load all servers at once.
    if (!filterServer) {
      setSessions([]);
      setOfflineClients([]);
      setOnlineCount(0);
      setOfflineCount(0);
      setTotalClients(0);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { action: "active-sessions", device_id: filterServer },
      });
      if (error) throw error;
      if (data?.sessions) {
        setSessions(data.sessions);
        setOnlineCount(data.online_count || data.sessions.length);
        setOfflineCount(data.offline_count || 0);
        setTotalClients(data.total_clients || 0);

        const onlineUsernames = new Set((data.sessions as ActiveSession[]).map(s => s.name));
        // Scope offline list to the same device, exclude left clients,
        // and only include clients whose MikroTik PPPoE is enabled.
        const { data: allClients } = await supabase
          .from("clients")
          .select("id, client_id, name, contact, username, remote_address, zone:zones(name), sub_zone:sub_zones(name), box:boxes(name), connection_type, profile, status, mikrotik_id, server_name, total_upload, total_download, mac_address, mikrotik_status, mikrotik_device:mikrotik_devices(name)")
          .neq("status", "left")
          .eq("mikrotik_id", filterServer)
          .eq("mikrotik_status", "enabled");

        if (allClients) {
          const offline = allClients
            .filter((c: any) => c.username && !onlineUsernames.has(c.username))
            .map((c: any): ActiveSession => ({
              name: c.username || "",
              address: c.remote_address || "",
              uptime: "—",
              caller_id: c.mac_address || "",
              service: "pppoe",
              encoding: "",
              server_name: c.mikrotik_device?.name || c.server_name || "",
              device_id: c.mikrotik_id || "",
              client_id: c.id,
              client_code: c.client_id,
              client_name: c.name,
              contact: c.contact,
              zone_name: c.zone?.name || "",
              sub_zone_name: c.sub_zone?.name || "",
              box_name: c.box?.name || "",
              connection_type: c.connection_type,
              profile: c.profile,
              status: "offline",
              mikrotik_id: c.mikrotik_id,
              total_upload: c.total_upload || 0,
              total_download: c.total_download || 0,
            }));
          setOfflineClients(offline);
          setOfflineCount(offline.length);
          setTotalClients((data.sessions?.length || 0) + offline.length);
        }
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

  const runBulkMismatchAction = async (
    tab: "disabled-in-system" | "enabled-in-system" | "profile-mismatch",
    records: MismatchRecord[],
    mode: "sync-mk-to-db" | "use-db-profile" | "use-mk-profile",
  ) => {
    const selected = records.filter((r) => mismatchSelection[tab].has(`${r.username}::${r.mikrotik_id || ""}`));
    if (selected.length === 0) {
      toast.error("কোনো client সিলেক্ট করা হয়নি");
      return;
    }

    setBulkMismatchRunning(true);
    let success = 0;
    let failed = 0;

    for (const r of selected) {
      if (!r.mikrotik_id) { failed++; continue; }
      try {
        if (tab === "disabled-in-system") {
          // System=disabled, MK=enabled → disable in MK to match system
          const { error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: { mikrotik_id: r.mikrotik_id, client_id: r.client_id, username: r.username, action: "disable" },
          });
          if (error) throw error;
        } else if (tab === "enabled-in-system") {
          // System=active, MK=disabled → enable in MK to match system
          const { error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: { mikrotik_id: r.mikrotik_id, client_id: r.client_id, username: r.username, action: "enable" },
          });
          if (error) throw error;
        } else if (mode === "use-db-profile") {
          // Push DB profile → MikroTik (default/preferred)
          const { error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: { mikrotik_id: r.mikrotik_id, client_id: r.client_id, username: r.username, action: "update", profile: r.db_profile },
          });
          if (error) throw error;
        } else if (mode === "use-mk-profile") {
          // Pull MK profile → DB
          if (r.client_id) {
            const { error } = await supabase.from("clients").update({ profile: r.mk_profile }).eq("id", r.client_id);
            if (error) throw error;
          }
        }
        success++;
      } catch {
        failed++;
      }
    }

    setBulkMismatchRunning(false);
    setMismatchSelection((prev) => ({ ...prev, [tab]: new Set() }));
    toast.success(`সম্পন্ন: ${success} সফল${failed > 0 ? `, ${failed} ব্যর্থ` : ""}`);
    loadActiveSessions();
  };


  const handleLiveTraffic = async (session: ActiveSession) => {
    setTrafficDialog({ open: true, loading: true, data: null, username: session.name, session, trafficHistory: [] });

    try {
      // Resolve client_id from username (the snapshot fn requires client_id)
      const { data: cli } = await supabase
        .from("clients")
        .select("id, total_upload, total_download")
        .ilike("username", session.name)
        .maybeSingle();

      if (!cli) {
        toast.error(`Client "${session.name}" DB-তে নেই`);
        setTrafficDialog((p) => ({ ...p, loading: false, data: { has_active_session: false } }));
        return;
      }

      // Parallel: live snapshot + monthly history
      const [snapRes, monthlyRes, recentRes] = await Promise.all([
        supabase.functions.invoke("live-traffic-snapshot", { body: { client_id: cli.id } }),
        supabase
          .from("client_traffic_monthly")
          .select("month, total_upload, total_download")
          .eq("client_id", cli.id)
          .order("month", { ascending: false })
          .limit(12),
        supabase
          .from("client_traffic_logs")
          .select("id, upload_bytes, download_bytes, recorded_at")
          .eq("client_id", cli.id)
          .order("recorded_at", { ascending: false })
          .limit(20),
      ]);

      const snap = snapRes.error ? null : snapRes.data;
      const monthly = (monthlyRes.data || []) as Array<{ month: string; total_upload: number; total_download: number }>;
      const history = (recentRes.data || []) as TrafficLog[];

      // Adapt snapshot → expected dialog data shape
      const adapted = snap
        ? {
            has_active_session: !!snap.online,
            current_id: snap.address,
            session: snap.online
              ? {
                  uptime: snap.uptime,
                  caller_id: snap.address,
                  upload_bytes: String(snap.session_upload_bytes || 0),
                  download_bytes: String(snap.session_download_bytes || 0),
                }
              : null,
            live_traffic: snap.online
              ? { rx_bps: snap.download_bps || 0, tx_bps: snap.upload_bps || 0 }
              : null,
            monthly,
          }
        : { has_active_session: false, monthly };

      // Override session row with the freshest cumulative totals from DB
      const sessionWithTotals = {
        ...session,
        total_upload: cli.total_upload || session.total_upload || 0,
        total_download: cli.total_download || session.total_download || 0,
      };

      setTrafficDialog((prev) => ({
        ...prev,
        loading: false,
        data: adapted,
        session: sessionWithTotals,
        trafficHistory: history,
      }));

      // Start continuous polling (every 2s) for live snapshot only
      liveClientIdRef.current = cli.id;
      if (livePollRef.current) window.clearInterval(livePollRef.current);
      livePollRef.current = window.setInterval(async () => {
        const cid = liveClientIdRef.current;
        if (!cid) return;
        try {
          const { data: snap2, error: e2 } = await supabase.functions.invoke(
            "live-traffic-snapshot",
            { body: { client_id: cid } }
          );
          if (e2 || !snap2) return;
          setTrafficDialog((prev) => {
            if (!prev.open) return prev;
            return {
              ...prev,
              data: {
                ...(prev.data || {}),
                has_active_session: !!snap2.online,
                current_id: snap2.address,
                session: snap2.online
                  ? {
                      uptime: snap2.uptime,
                      caller_id: snap2.address,
                      upload_bytes: String(snap2.session_upload_bytes || 0),
                      download_bytes: String(snap2.session_download_bytes || 0),
                    }
                  : null,
                live_traffic: snap2.online
                  ? { rx_bps: snap2.download_bps || 0, tx_bps: snap2.upload_bps || 0 }
                  : null,
              },
            };
          });
        } catch (_) {
          /* ignore */
        }
      }, 2000);
    } catch (err: any) {
      toast.error("Live traffic ব্যর্থ: " + err.message);
      setTrafficDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const stopLivePolling = useCallback(() => {
    if (livePollRef.current) {
      window.clearInterval(livePollRef.current);
      livePollRef.current = null;
    }
    liveClientIdRef.current = null;
  }, []);

  useEffect(() => () => stopLivePolling(), [stopLivePolling]);

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

  const combinedSessions = statusFilter === "online" ? sessions : statusFilter === "offline" ? offlineClients : [...sessions, ...offlineClients];

  const filteredSessionsBase = combinedSessions.filter((s) => {
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

  const parseUptime = (u?: string): number => {
    if (!u || u === "—") return 0;
    let total = 0;
    const re = /(\d+)\s*([wdhms])/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(u))) {
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      total += n * (unit === "w" ? 604800 : unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1);
    }
    return total;
  };
  const parseIp = (ip?: string): number => {
    if (!ip) return 0;
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return 0;
    return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3];
  };
  const getSortValue = (s: ActiveSession, col: string): string | number => {
    switch (col) {
      case "client_code": return s.client_code || "";
      case "name": return s.name || "";
      case "client_name": return s.client_name || "";
      case "contact": return s.contact || "";
      case "zone_name": return s.zone_name || "";
      case "sub_zone_name": return s.sub_zone_name || "";
      case "box_name": return s.box_name || "";
      case "connection_type": return s.connection_type || "";
      case "server_name": return s.server_name || "";
      case "profile": return s.profile || "";
      case "service": return s.service || "";
      case "address": return parseIp(s.address);
      case "status": return s.status === "offline" ? 1 : 0;
      case "uptime": return parseUptime(s.uptime);
      case "upload": return s.session_upload_bytes || 0;
      case "download": return s.session_download_bytes || 0;
      default: return "";
    }
  };
  const filteredSessions = useMemo(() => {
    if (!sortBy) return filteredSessionsBase;
    const arr = [...filteredSessionsBase];
    arr.sort((a, b) => {
      const av = getSortValue(a, sortBy);
      const bv = getSortValue(b, sortBy);
      const aEmpty = av === "" || av === 0 || av === null || av === undefined;
      const bEmpty = bv === "" || bv === 0 || bv === null || bv === undefined;
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredSessionsBase, sortBy, sortDir]);

  const SortableHead = ({ col, children, className }: { col: string; children: React.ReactNode; className?: string }) => {
    const active = sortBy === col;
    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => handleSort(col)}
          className={`inline-flex items-center gap-1 select-none hover:text-foreground transition-colors ${active ? "text-primary font-semibold" : ""}`}
        >
          {children}
          <Icon className={`h-3 w-3 ${active ? "opacity-100" : "opacity-50"}`} />
        </button>
      </TableHead>
    );
  };

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
            <SortableHead col="client_code">C.Code</SortableHead>
            <SortableHead col="name">ID / Username</SortableHead>
            <SortableHead col="client_name">Name</SortableHead>
            <SortableHead col="contact">Mobile</SortableHead>
            <SortableHead col="zone_name">Zone</SortableHead>
            <SortableHead col="sub_zone_name">Subzone</SortableHead>
            <SortableHead col="box_name">Box</SortableHead>
            <SortableHead col="connection_type">Conn. Type</SortableHead>
            <SortableHead col="server_name">Server</SortableHead>
            <SortableHead col="profile">Profile</SortableHead>
            <SortableHead col="service">Service</SortableHead>
            <SortableHead col="address">IP Address</SortableHead>
            <SortableHead col="uptime">Session Time</SortableHead>
            <SortableHead col="upload">Traffic</SortableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
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
                  {s.status === "offline" ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive">
                        <span className="inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] leading-none font-bold">×</span>
                        Offline
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">—</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                        Online
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{s.uptime || "—"}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5 font-mono text-[10px]">
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <ArrowUpFromLine className="h-2.5 w-2.5" />
                      {formatBytes(s.session_upload_bytes || 0)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <ArrowDownToLine className="h-2.5 w-2.5" />
                      {formatBytes(s.session_download_bytes || 0)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid grid-cols-2 gap-0.5 w-fit">
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Live Traffic" onClick={() => handleLiveTraffic(s)}>
                      <Activity className="h-3 w-3 text-emerald-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Ping" onClick={() => handlePing(s)}>
                      <Radio className="h-3 w-3 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Re-check" onClick={() => handleRecheck(s)}>
                      <RotateCcw className="h-3 w-3 text-orange-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="SMS" onClick={() => setSmsDialog({ open: true, contact: s.contact || "", username: s.name })}>
                      <MessageSquare className="h-3 w-3 text-purple-500" />
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

  const renderMismatchTable = (data: MismatchRecord[], type: "disabled-in-system" | "enabled-in-system" | "profile-mismatch") => {
    const selection = mismatchSelection[type];
    const selectedCount = selection.size;
    const allKeys = data.map((r) => `${r.username}::${r.mikrotik_id || ""}`);
    const allSelected = allKeys.length > 0 && allKeys.every((k) => selection.has(k));
    const someSelected = selectedCount > 0 && !allSelected;

    return (
      <div className="space-y-2">
        {/* Bulk action bar */}
        {data.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-2 py-2 rounded-md border bg-muted/30">
            <span className="text-xs text-muted-foreground mr-auto">
              {selectedCount > 0 ? `${selectedCount} সিলেক্টেড` : `${data.length} টি mismatch`}
            </span>
            {type === "disabled-in-system" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedCount === 0 || bulkMismatchRunning}
                onClick={() => runBulkMismatchAction(type, data, "sync-mk-to-db")}
              >
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                Bulk Disable in MikroTik
              </Button>
            )}
            {type === "enabled-in-system" && (
              <Button
                size="sm"
                disabled={selectedCount === 0 || bulkMismatchRunning}
                onClick={() => runBulkMismatchAction(type, data, "sync-mk-to-db")}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Bulk Enable in MikroTik
              </Button>
            )}
            {type === "profile-mismatch" && (
              <>
                <Button
                  size="sm"
                  disabled={selectedCount === 0 || bulkMismatchRunning}
                  onClick={() => runBulkMismatchAction(type, data, "use-db-profile")}
                  title="Software-এর Profile MikroTik-এ apply করো (default/preferred)"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Apply DB Profile → MikroTik
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedCount === 0 || bulkMismatchRunning}
                  onClick={() => runBulkMismatchAction(type, data, "use-mk-profile")}
                  title="MikroTik-এর Profile DB-তে save করো"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Use MK Profile → DB
                </Button>
              </>
            )}
          </div>
        )}

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={() => toggleMismatchAll(type, data)}
                    disabled={data.length === 0}
                  />
                </TableHead>
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
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    কোনো mismatch পাওয়া যায়নি
                  </TableCell>
                </TableRow>
              ) : (
                data.map((r, i) => {
                  const key = `${r.username}::${r.mikrotik_id || ""}`;
                  return (
                    <TableRow key={`${r.username}-${i}`} data-state={selection.has(key) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selection.has(key)}
                          onCheckedChange={() => toggleMismatchRow(type, key)}
                        />
                      </TableCell>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

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

      {/* MikroTik Device Switcher — only one device's clients are loaded at a time */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">MikroTik Server (একটি করে লোড হবে)</p>
          </div>
          {servers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">কোনো enabled MikroTik সার্ভার পাওয়া যায়নি</p>
          ) : (
            <div className="flex flex-wrap gap-2 overflow-x-auto">
              {servers.map((s) => {
                const active = filterServer === s.id;
                return (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => { setFilterServer(s.id); setSelectedIds(new Set()); }}
                    className="h-8"
                    disabled={loading && active}
                  >
                    <Badge variant="secondary" className="mr-1.5 h-5 min-w-5 px-1 font-mono text-[10px]">
                      {s.order_no ?? "?"}
                    </Badge>
                    {s.name}
                    {active && loading && <RefreshCw className="h-3 w-3 ml-1.5 animate-spin" />}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards (scoped to active device) */}
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
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "online" | "offline")}>
                <SelectTrigger className="h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({onlineCount + offlineCount})</SelectItem>
                  <SelectItem value="online">Online ({onlineCount})</SelectItem>
                  <SelectItem value="offline">Offline ({offlineCount})</SelectItem>
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

      {/* Enhanced Live Traffic Dialog */}
      <Dialog open={trafficDialog.open} onOpenChange={(o) => { if (!o) { stopLivePolling(); setTrafficDialog({ open: false, loading: false, data: null, username: "", session: null, trafficHistory: [] }); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Traffic Monitor — {trafficDialog.username}
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                LIVE • Updates every 2s
              </span>
            </DialogTitle>
          </DialogHeader>
          {trafficDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trafficDialog.data ? (
            <div className="space-y-4">
              {/* Status + IP */}
              {(() => {
                const isOnline = trafficDialog.session?.status !== "offline" || trafficDialog.data.has_active_session;
                const sessionData = trafficDialog.data.session;
                const sessionUploadBytes = sessionData ? parseInt(sessionData.upload_bytes || "0", 10) : 0;
                const sessionDownloadBytes = sessionData ? parseInt(sessionData.download_bytes || "0", 10) : 0;
                const cumulativeUpload = (trafficDialog.session?.total_upload || 0) + sessionUploadBytes;
                const cumulativeDownload = (trafficDialog.session?.total_download || 0) + sessionDownloadBytes;

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge className={isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-destructive/20 text-destructive"}>
                            {isOnline ? "Online" : "Offline"}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-xs text-muted-foreground">IP</p>
                          <p className="font-mono text-sm">{trafficDialog.data.current_id || trafficDialog.session?.address || "—"}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Session info (online only) */}
                    {isOnline && sessionData && (
                      <div className="grid grid-cols-2 gap-3">
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Uptime</p>
                            <p className="font-mono text-sm">{sessionData.uptime || "—"}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Caller ID</p>
                            <p className="font-mono text-xs">{sessionData.caller_id || "—"}</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Live speed (online only) */}
                    {isOnline && trafficDialog.data.live_traffic && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">⚡ Live Speed</p>
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
                      </div>
                    )}

                    {/* Current Session Bytes (online only) */}
                    {isOnline && sessionData && (sessionUploadBytes > 0 || sessionDownloadBytes > 0) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">📡 Current Session Usage</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="border-blue-500/20">
                            <CardContent className="p-3 text-center">
                              <ArrowUpFromLine className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                              <p className="text-xs text-muted-foreground">Session Upload</p>
                              <p className="font-bold text-blue-500">{formatBytes(sessionUploadBytes)}</p>
                            </CardContent>
                          </Card>
                          <Card className="border-emerald-500/20">
                            <CardContent className="p-3 text-center">
                              <ArrowDownToLine className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                              <p className="text-xs text-muted-foreground">Session Download</p>
                              <p className="font-bold text-emerald-500">{formatBytes(sessionDownloadBytes)}</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}

                    {/* Cumulative Traffic (always visible) */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">📊 Cumulative Traffic (Total)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="border-blue-500/20 bg-blue-500/5">
                          <CardContent className="p-3 text-center">
                            <ArrowUpFromLine className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                            <p className="text-xs text-muted-foreground">Total Upload</p>
                            <p className="font-bold text-blue-500 text-lg">{formatBytes(cumulativeUpload)}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-emerald-500/20 bg-emerald-500/5">
                          <CardContent className="p-3 text-center">
                            <ArrowDownToLine className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                            <p className="text-xs text-muted-foreground">Total Download</p>
                            <p className="font-bold text-emerald-500 text-lg">{formatBytes(cumulativeDownload)}</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Recent Traffic History */}
              {trafficDialog.trafficHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <History className="h-3.5 w-3.5" /> Recent Traffic Snapshots (Last 20)
                  </p>
                  <div className="rounded-md border max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs py-1.5">Time</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Upload</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Download</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trafficDialog.trafficHistory.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs py-1.5 font-mono">
                              {new Date(log.recorded_at).toLocaleString("bn-BD", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right text-blue-500">{formatBytes(log.upload_bytes)}</TableCell>
                            <TableCell className="text-xs py-1.5 text-right text-emerald-500">{formatBytes(log.download_bytes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Monthly History */}
              {Array.isArray(trafficDialog.data?.monthly) && trafficDialog.data.monthly.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <History className="h-3.5 w-3.5" /> Monthly Traffic History
                  </p>
                  <div className="rounded-md border max-h-40 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs py-1.5">Month</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Upload</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Download</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trafficDialog.data.monthly.map((m: any) => (
                          <TableRow key={m.month}>
                            <TableCell className="text-xs py-1.5 font-mono">
                              {new Date(m.month).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right text-blue-500">{formatBytes(Number(m.total_upload || 0))}</TableCell>
                            <TableCell className="text-xs py-1.5 text-right text-emerald-500">{formatBytes(Number(m.total_download || 0))}</TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-semibold">{formatBytes(Number(m.total_upload || 0) + Number(m.total_download || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                        <TableCell>{r.seq}</TableCell>
                        <TableCell className="font-mono text-xs">{r.host}</TableCell>
                        <TableCell>{r.time || "—"}</TableCell>
                        <TableCell>{r.ttl || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "timeout" ? "destructive" : "default"}>
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
            <p className="text-center text-muted-foreground py-4">পিং ডেটা পাওয়া যায়নি</p>
          )}
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialog.open} onOpenChange={(o) => !o && setSmsDialog({ open: false, contact: "", username: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMS পাঠান — {smsDialog.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>মোবাইল নম্বর</Label>
              <Input value={smsDialog.contact} readOnly />
            </div>
            <div>
              <Label>মেসেজ</Label>
              <Textarea value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSendSingleSms} disabled={sendingSms || !smsMessage}>
              {sendingSms ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk SMS Dialog */}
      <Dialog open={bulkSmsDialog} onOpenChange={setBulkSmsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk SMS — {selectedIds.size} জন</DialogTitle>
          </DialogHeader>
          <div>
            <Label>মেসেজ</Label>
            <Textarea value={bulkSmsMessage} onChange={(e) => setBulkSmsMessage(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button onClick={handleSendBulkSms} disabled={sendingSms || !bulkSmsMessage}>
              {sendingSms ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              সবাইকে পাঠান
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
