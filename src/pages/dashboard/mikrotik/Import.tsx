import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Eye, EyeOff, ExternalLink, XCircle, RefreshCw, ArrowRightLeft, UserPlus, Layers, Power, PowerOff, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { TransferToPopDialog } from "@/components/mikrotik/TransferToPopDialog";
import { BulkProfileChangeDialog } from "@/components/mikrotik/BulkProfileChangeDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Import() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState<string>("all");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [transferStatus, setTransferStatus] = useState<"pending" | "transferred">("pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [bulkExportOpen, setBulkExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [bulkProfileOpen, setBulkProfileOpen] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["mikrotik_devices_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mikrotik_devices").select("id, name").neq("status", "offline").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingUsernames = [] } = useQuery({
    queryKey: ["existing_client_usernames"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("username");
      return (data || []).map((c: any) => c.username?.toLowerCase()).filter(Boolean);
    },
  });

  // Cross-server username map: lowercase username -> Set of distinct mikrotik_id
  const { data: crossServerMap = new Map<string, Set<string>>() } = useQuery({
    queryKey: ["mikrotik_username_server_map"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_clients").select("name, mikrotik_id");
      const m = new Map<string, Set<string>>();
      (data || []).forEach((r: any) => {
        const key = r.name?.toLowerCase();
        if (!key || !r.mikrotik_id) return;
        if (!m.has(key)) m.set(key, new Set());
        m.get(key)!.add(r.mikrotik_id);
      });
      return m;
    },
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["mikrotik_clients", selectedServer, protocolFilter, profileFilter, transferStatus],
    queryFn: async () => {
      let q = supabase
        .from("mikrotik_clients")
        .select("*, mikrotik_devices:mikrotik_devices!mikrotik_clients_mikrotik_id_fkey(name), transferred_pop:branch_managers!mikrotik_clients_transferred_to_pop_id_fkey(name, pop_code), transferred_mt:mikrotik_devices!mikrotik_clients_transferred_to_mikrotik_id_fkey(name)")
        .order("created_at", { ascending: false });
      if (transferStatus === "pending") {
        q = q.is("transferred_to_pop_id", null).is("linked_client_id", null).or("exported.is.null,exported.eq.false");
      } else {
        q = q.not("transferred_to_pop_id", "is", null);
      }
      if (selectedServer !== "all") q = q.eq("mikrotik_id", selectedServer);
      if (protocolFilter !== "all") q = q.eq("service", protocolFilter);
      if (profileFilter !== "all") q = q.eq("profile", profileFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const profiles = [...new Set(clients.map((c: any) => c.profile).filter(Boolean))];

  const syncFromMikroTik = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { device_id: selectedServer !== "all" ? selectedServer : "all" },
      });
      if (error) throw error;
      if (data?.errors?.length) {
        toast.warning(`${data.synced} জন সিঙ্ক হয়েছে, ${data.errors.length} টি ত্রুটি`);
      } else {
        toast.success(`${data?.synced || 0} জন PPP ইউজার সিঙ্ক হয়েছে`);
      }
      queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
    } catch (e: any) {
      toast.error("সিঙ্ক ব্যর্থ: " + (e.message || "অজানা ত্রুটি"));
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToClientList = (client: any) => {
    navigate("/dashboard/clients/add", {
      state: {
        prefill: {
          username: client.name,
          password: client.password,
          server_name: client.server_name,
          mac_address: client.caller_id,
          profile: client.profile,
          mikrotik_id: client.mikrotik_id,
        },
      },
    });
  };

  // Transfer handled by TransferToPopDialog

  const bulkExportToClientList = async () => {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    try {
      const rows = clients.filter((c: any) => selectedIds.has(c.id));
      const payload = rows.map((c: any) => ({
        name: c.name,
        username: c.name,
        password: c.password,
        mac_address: c.caller_id || null,
        profile: c.profile || null,
        server_name: c.server_name || null,
        mikrotik_id: c.mikrotik_id || null,
        remote_address: c.remote_address || null,
        protocol_type: c.service || null,
        status: "unverified",
        client_id: "TMP-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        documents: {},
      }));
      const { data: inserted, error } = await supabase.from("clients").insert(payload).select("id, username");
      if (error) throw error;
      const idMap = new Map<string, string>();
      (inserted || []).forEach((row: any) => idMap.set(row.username?.toLowerCase(), row.id));
      await Promise.all(
        rows.map((c: any) => {
          const cid = idMap.get(c.name?.toLowerCase());
          return supabase
            .from("mikrotik_clients")
            .update({ exported: true, exported_to: "client_list", linked_client_id: cid })
            .eq("id", c.id);
        }),
      );
      toast.success(`${rows.length} জন ক্লায়েন্ট লিস্টে এক্সপোর্ট হয়েছে (unverified)`);
      setSelectedIds(new Set());
      setBulkExportOpen(false);
      queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
      queryClient.invalidateQueries({ queryKey: ["existing_client_usernames"] });
    } catch (e: any) {
      toast.error("এক্সপোর্ট ব্যর্থ: " + (e.message || "অজানা ত্রুটি"));
    } finally {
      setIsExporting(false);
    }
  };

  const generateExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      clients.map((c: any) => ({
        "নাম": c.name,
        "পাসওয়ার্ড": c.password,
        "সার্ভিস": c.service,
        "প্রোফাইল": c.profile,
        "Caller ID": c.caller_id,
        "সার্ভার": c.mikrotik_devices?.name || "",
        "রিমোট অ্যাড্রেস": c.remote_address,
        "স্ট্যাটাস": c.user_status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MikroTik Clients");
    XLSX.writeFile(wb, "mikrotik_clients.xlsx");
    toast.success("Excel ডাউনলোড হয়েছে");
  };

  const clearFilters = () => {
    setSelectedServer("all");
    setProtocolFilter("all");
    setProfileFilter("all");
    setUserTypeFilter("all");
    setSearch("");
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c: any) => c.id)));
    }
  };

  const existingSet = new Set(existingUsernames);
  const getServerCount = (name?: string) => {
    if (!name) return 0;
    return crossServerMap.get(name.toLowerCase())?.size || 0;
  };
  const filtered = clients
    .filter((c: any) => transferStatus === "transferred" || !existingSet.has(c.name?.toLowerCase()))
    .filter((c: any) => {
      if (userTypeFilter === "all") return true;
      const count = getServerCount(c.name);
      if (userTypeFilter === "unique") return count === 1;
      if (userTypeFilter === "duplicate") return count >= 2;
      if (userTypeFilter === "unlisted") {
        return !existingSet.has(c.name?.toLowerCase()) && !c.transferred_to_pop_id && !c.linked_client_id;
      }
      return true;
    })
    .filter((c: any) =>
      [c.name, c.caller_id, c.server_name].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
    );

  const statusColor: Record<string, string> = {
    unique: "bg-green-100 text-green-800",
    duplicate: "bg-yellow-100 text-yellow-800",
    disabled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="h-6 w-6" /> ইমপোর্ট ফ্রম মাইক্রোটিক</h1>
        <Button onClick={syncFromMikroTik} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "সিঙ্ক হচ্ছে..." : "মাইক্রোটিক থেকে সিঙ্ক করুন"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="সার্ভার" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল সার্ভার</SelectItem>
                {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={protocolFilter} onValueChange={setProtocolFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="প্রোটোকল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল</SelectItem>
                <SelectItem value="pppoe">PPPoE</SelectItem>
                <SelectItem value="dhcp">DHCP</SelectItem>
                <SelectItem value="hotspot">Hotspot</SelectItem>
              </SelectContent>
            </Select>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="প্রোফাইল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল প্রোফাইল</SelectItem>
                {profiles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="ইউজার টাইপ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল ইউজার</SelectItem>
                <SelectItem value="unique">Unique (1 server)</SelectItem>
                <SelectItem value="duplicate">Duplicate (multi-server)</SelectItem>
                <SelectItem value="unlisted">Unlisted (no POP/Client)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters}><XCircle className="h-4 w-4 mr-1" /> ক্লিয়ার</Button>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={transferStatus} onValueChange={(v: any) => { setTransferStatus(v); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Transfer</SelectItem>
                <SelectItem value="transferred">Transferred to POP</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={generateExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel জেনারেট</Button>
            {transferStatus === "pending" && (
              <>
                <Button variant="default" size="sm" onClick={() => setTransferOpen(true)} disabled={selectedIds.size === 0}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" /> Export to POP/Reseller ({selectedIds.size})
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setBulkExportOpen(true)} disabled={selectedIds.size === 0}>
                  <UserPlus className="h-4 w-4 mr-1" /> Client লিস্টে এক্সপোর্ট ({selectedIds.size})
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkProfileOpen(true)} disabled={selectedIds.size === 0}>
                  <Layers className="h-4 w-4 mr-1" /> Bulk Profile Change ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>পাসওয়ার্ড</TableHead>
                  <TableHead>সার্ভিস</TableHead>
                  <TableHead>প্রোফাইল</TableHead>
                  <TableHead>Caller ID</TableHead>
                  <TableHead>সার্ভার</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  {transferStatus === "transferred" && (
                    <TableHead>ট্রান্সফার গন্তব্য</TableHead>
                  )}
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    কোনো MikroTik-only ইউজার পাওয়া যায়নি। উপরের <b>"মাইক্রোটিক থেকে সিঙ্ক করুন"</b> বাটন চাপুন — তারপর pending ইউজার এখানে আসবে এবং POP-এ ট্রান্সফার করা যাবে।
                  </TableCell></TableRow>
                ) : filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          checked ? next.add(c.id) : next.delete(c.id);
                          setSelectedIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {getServerCount(c.name) >= 2 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {getServerCount(c.name)} servers
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{showPasswords[c.id] ? c.password : "••••"}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPasswords((p) => ({ ...p, [c.id]: !p[c.id] }))}>
                          {showPasswords[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{c.service}</TableCell>
                    <TableCell>{c.profile}</TableCell>
                    <TableCell className="font-mono text-xs">{c.caller_id}</TableCell>
                    <TableCell>{c.mikrotik_devices?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{c.logout_time ? new Date(c.logout_time).toLocaleString("bn-BD") : "—"}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded ${statusColor[c.user_status] || "bg-muted"}`}>{c.user_status}</span></TableCell>
                    {transferStatus === "transferred" && (
                      <TableCell className="text-xs">
                        {c.transferred_pop?.name ? (
                          <div>
                            <div className="font-medium">{c.transferred_pop.name}</div>
                            <div className="text-muted-foreground">{c.transferred_mt?.name || "—"}</div>
                          </div>
                        ) : "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="ক্লায়েন্ট লিস্টে এক্সপোর্ট" onClick={() => exportToClientList(c)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">মোট: {filtered.length} জন ক্লায়েন্ট</div>
        </CardContent>
      </Card>

      <TransferToPopDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        selectedIds={Array.from(selectedIds)}
        onTransferred={() => setSelectedIds(new Set())}
      />

      <BulkProfileChangeDialog
        open={bulkProfileOpen}
        onOpenChange={setBulkProfileOpen}
        selectedClients={clients.filter((c: any) => selectedIds.has(c.id))}
        onSuccess={() => {
          setSelectedIds(new Set());
          queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
        }}
      />

      <Dialog open={bulkExportOpen} onOpenChange={setBulkExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client লিস্টে এক্সপোর্ট</DialogTitle>
            <DialogDescription>
              নির্বাচিত <b>{selectedIds.size}</b> জন MikroTik ইউজার Admin Client লিস্টে যুক্ত হবে।
              স্ট্যাটাস <b>"unverified"</b> থাকবে — পরে edit করে full billing client বানানো যাবে।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkExportOpen(false)} disabled={isExporting}>বাতিল</Button>
            <Button onClick={bulkExportToClientList} disabled={isExporting}>
              {isExporting ? "এক্সপোর্ট হচ্ছে..." : `${selectedIds.size} জন এক্সপোর্ট করুন`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
