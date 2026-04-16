import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileSpreadsheet, FileText, Users, UserPlus, RefreshCw, Gift, Eye, EyeOff, CalendarClock, Crown, ChevronUp, ChevronDown, Wifi } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import ClientActionButtons from "@/components/client-actions/ClientActionButtons";

export default function ClientList() {
  const [search, setSearch] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Filter states
  const [filterServer, setFilterServer] = useState("");
  const [filterProtocol, setFilterProtocol] = useState("");
  const [filterProfile, setFilterProfile] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [filterSubZone, setFilterSubZone] = useState("");
  const [filterBox, setFilterBox] = useState("");
  const [filterPackage, setFilterPackage] = useState("");
  const [filterClientType, setFilterClientType] = useState("");
  const [filterConnType, setFilterConnType] = useState("");
  const [filterBStatus, setFilterBStatus] = useState("");
  const [filterMStatus, setFilterMStatus] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Load filter options
  const { data: servers } = useQuery({
    queryKey: ["filter-servers"],
    queryFn: async () => {
      const { data } = await supabase.from("mikrotik_devices").select("id, name").eq("enabled", true);
      return data || [];
    },
  });

  const { data: protocolTypes } = useQuery({
    queryKey: ["filter-protocol-types"],
    queryFn: async () => {
      const { data } = await supabase.from("protocol_types").select("id, name");
      return data || [];
    },
  });

  const { data: zones } = useQuery({
    queryKey: ["filter-zones"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name");
      return data || [];
    },
  });

  const { data: subZones } = useQuery({
    queryKey: ["filter-subzones", filterZone],
    queryFn: async () => {
      let q = supabase.from("sub_zones").select("id, name");
      if (filterZone) q = q.eq("zone_id", filterZone);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: boxes } = useQuery({
    queryKey: ["filter-boxes"],
    queryFn: async () => {
      const { data } = await supabase.from("boxes").select("id, name");
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["filter-packages"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name");
      return data || [];
    },
  });

  const { data: clientTypes } = useQuery({
    queryKey: ["filter-client-types"],
    queryFn: async () => {
      const { data } = await supabase.from("client_types").select("id, name");
      return data || [];
    },
  });

  const { data: connTypes } = useQuery({
    queryKey: ["filter-conn-types"],
    queryFn: async () => {
      const { data } = await supabase.from("connection_types_config").select("id, name");
      return data || [];
    },
  });

  const { data: billingStatuses } = useQuery({
    queryKey: ["filter-billing-statuses"],
    queryFn: async () => {
      const { data } = await supabase.from("billing_statuses").select("id, name");
      return data || [];
    },
  });

  const updateExpireMutation = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const { error } = await supabase.from("clients").update({ expire_date: date }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      toast.success("মেয়াদ আপডেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSyncOnline = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { action: "sync-online" },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      toast.success(`সিঙ্ক সম্পন্ন — Online: ${data?.online || 0}, Offline: ${data?.offline || 0}`);
    } catch (e: any) {
      toast.error(`সিঙ্ক ব্যর্থ: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Unique profiles from clients
  const uniqueProfiles = useMemo(() => {
    const profiles = new Set<string>();
    (clients || []).forEach((c: any) => { if (c.profile) profiles.add(c.profile); });
    return Array.from(profiles).sort();
  }, [clients]);

  const stats = useMemo(() => {
    const all = clients || [];
    const running = all.filter((c: any) => c.status === "active" && c.billing_status !== "Left").length;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newClients = all.filter((c: any) => c.created_at?.startsWith(thisMonth)).length;
    const waiver = all.filter((c: any) => c.billing_status === "Free" || c.monthly_bill === 0).length;
    return { running, newClients, renewed: 0, waiver };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) =>
        c.name?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.contact?.includes(s) || c.username?.toLowerCase().includes(s)
      );
    }
    if (filterServer) list = list.filter((c: any) => c.mikrotik_id === filterServer);
    if (filterProtocol) list = list.filter((c: any) => c.protocol_type === filterProtocol);
    if (filterProfile) list = list.filter((c: any) => c.profile === filterProfile);
    if (filterZone) list = list.filter((c: any) => c.zone_id === filterZone);
    if (filterSubZone) list = list.filter((c: any) => c.sub_zone_id === filterSubZone);
    if (filterBox) list = list.filter((c: any) => c.box_id === filterBox);
    if (filterPackage) list = list.filter((c: any) => c.package_id === filterPackage);
    if (filterClientType) list = list.filter((c: any) => c.client_type === filterClientType);
    if (filterConnType) list = list.filter((c: any) => c.connection_type === filterConnType);
    if (filterBStatus) list = list.filter((c: any) => c.billing_status === filterBStatus);
    if (filterMStatus) list = list.filter((c: any) => c.mikrotik_status === filterMStatus);
    if (filterStatus) list = list.filter((c: any) => c.status === filterStatus);
    if (filterFromDate) list = list.filter((c: any) => c.created_at >= filterFromDate);
    if (filterToDate) list = list.filter((c: any) => c.created_at <= filterToDate + "T23:59:59");
    return list;
  }, [clients, search, filterServer, filterProtocol, filterProfile, filterZone, filterSubZone, filterBox, filterPackage, filterClientType, filterConnType, filterBStatus, filterMStatus, filterStatus, filterFromDate, filterToDate]);

  const paginated = useMemo(() => {
    return filtered.slice(currentPage * perPage, (currentPage + 1) * perPage);
  }, [filtered, currentPage, perPage]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const togglePassword = (id: string) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === paginated.length) setSelectedIds([]);
    else setSelectedIds(paginated.map((c: any) => c.id));
  };

  const getExpireBadge = (expireDate: string | null, isVip: boolean) => {
    if (isVip) return { color: "bg-purple-500/10 text-purple-600 border-purple-500/30", label: "VIP" };
    if (!expireDate) return { color: "bg-muted text-muted-foreground", label: "N/A" };
    const now = new Date();
    const expire = parseISO(expireDate);
    const daysLeft = differenceInDays(expire, now);
    if (daysLeft < 0) return { color: "bg-red-500/10 text-red-600 border-red-500/30", label: format(expire, "dd/MM") };
    if (daysLeft <= 7) return { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: format(expire, "dd/MM") };
    return { color: "bg-green-500/10 text-green-600 border-green-500/30", label: format(expire, "dd/MM") };
  };

  const clearFilters = () => {
    setFilterServer(""); setFilterProtocol(""); setFilterProfile(""); setFilterZone("");
    setFilterSubZone(""); setFilterBox(""); setFilterPackage(""); setFilterClientType("");
    setFilterConnType(""); setFilterBStatus(""); setFilterMStatus(""); setFilterStatus("");
    setFilterFromDate(""); setFilterToDate("");
  };

  const summaryCards = [
    { label: "Running Clients", count: stats.running, desc: "Number of clients without LeftOut status", icon: Users, color: "bg-blue-600" },
    { label: "New Clients", count: stats.newClients, desc: "Monthly number of clients those are new", icon: UserPlus, color: "bg-green-600" },
    { label: "Renewed Clients", count: stats.renewed, desc: "Monthly number of newly renewed clients", icon: RefreshCw, color: "bg-purple-600" },
    { label: "Waiver Clients", count: stats.waiver, desc: "Number of clients those are free/personal", icon: Gift, color: "bg-orange-600" },
  ];

  const FilterSelect = ({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[] }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">সকল</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v === "__all__" ? "" : v);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client List <span className="text-sm font-normal text-muted-foreground">View All Client</span></h1>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-center p-3 border rounded-lg bg-card">
        <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1" /> Generate Excel</Button>
        <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate Pdf</Button>
        <Button variant="outline" size="sm">Bulk Profile Change</Button>
        <Button variant="outline" size="sm">Bulk Package Change</Button>
        <Button variant="outline" size="sm">Bulk Status Change</Button>
        <Button variant="default" size="sm" onClick={handleSyncOnline} disabled={syncing}>
          <Wifi className="h-4 w-4 mr-1" />
          {syncing ? "সিঙ্ক হচ্ছে..." : "Sync Clients & Server"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`${card.color} text-white border-0`}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className="h-10 w-10 opacity-80" />
              <div>
                <div className="font-bold text-lg">{card.label}</div>
                <div className="text-2xl font-bold">{card.count}</div>
                <div className="text-xs opacity-80">{card.desc}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Toggle */}
      <div className="border rounded-lg bg-card">
        <button
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span>ফিল্টার অপশন</span>
          {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showFilters && (
          <div className="p-3 pt-0 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Server</label>
                <FilterSelect value={filterServer} onChange={handleFilterChange(setFilterServer)} placeholder="Server" options={(servers || []).map((s: any) => ({ value: s.id, label: s.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Protocol Type</label>
                <FilterSelect value={filterProtocol} onChange={handleFilterChange(setFilterProtocol)} placeholder="Protocol" options={(protocolTypes || []).map((p: any) => ({ value: p.name, label: p.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Profile</label>
                <FilterSelect value={filterProfile} onChange={handleFilterChange(setFilterProfile)} placeholder="Profile" options={uniqueProfiles.map(p => ({ value: p, label: p }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Zone</label>
                <FilterSelect value={filterZone} onChange={handleFilterChange(setFilterZone)} placeholder="Zone" options={(zones || []).map((z: any) => ({ value: z.id, label: z.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Sub Zone</label>
                <FilterSelect value={filterSubZone} onChange={handleFilterChange(setFilterSubZone)} placeholder="Sub Zone" options={(subZones || []).map((s: any) => ({ value: s.id, label: s.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Box</label>
                <FilterSelect value={filterBox} onChange={handleFilterChange(setFilterBox)} placeholder="Box" options={(boxes || []).map((b: any) => ({ value: b.id, label: b.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Package</label>
                <FilterSelect value={filterPackage} onChange={handleFilterChange(setFilterPackage)} placeholder="Package" options={(packages || []).map((p: any) => ({ value: p.id, label: p.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Client Type</label>
                <FilterSelect value={filterClientType} onChange={handleFilterChange(setFilterClientType)} placeholder="Client Type" options={(clientTypes || []).map((t: any) => ({ value: t.name, label: t.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Connection Type</label>
                <FilterSelect value={filterConnType} onChange={handleFilterChange(setFilterConnType)} placeholder="Conn. Type" options={(connTypes || []).map((t: any) => ({ value: t.name, label: t.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">B.Status</label>
                <FilterSelect value={filterBStatus} onChange={handleFilterChange(setFilterBStatus)} placeholder="B.Status" options={(billingStatuses || []).map((b: any) => ({ value: b.name, label: b.name }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">M.Status</label>
                <FilterSelect value={filterMStatus} onChange={handleFilterChange(setFilterMStatus)} placeholder="M.Status" options={[
                  { value: "enabled", label: "Enabled" },
                  { value: "disabled", label: "Disabled" },
                  { value: "unknown", label: "Unknown" },
                ]} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Status</label>
                <FilterSelect value={filterStatus} onChange={handleFilterChange(setFilterStatus)} placeholder="Status" options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">From Date</label>
                <Input type="date" className="h-8 text-xs" value={filterFromDate} onChange={e => { setFilterFromDate(e.target.value); setCurrentPage(0); }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">To Date</label>
                <Input type="date" className="h-8 text-xs" value={filterToDate} onChange={e => { setFilterToDate(e.target.value); setCurrentPage(0); }} />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">ফিল্টার রিসেট</Button>
            </div>
          </div>
        )}
      </div>

      {/* Search + Entries */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">মোট: {filtered.length} ক্লায়েন্ট</div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">SHOW</span>
            <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setCurrentPage(0); }}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200, 500].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">ENTRIES</span>
          </div>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0); }} />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="w-8"><Checkbox checked={selectedIds.length === paginated.length && paginated.length > 0} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs">C.Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Password</TableHead>
              <TableHead className="text-xs">Cus. Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Package/Speed</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">Expire</TableHead>
              <TableHead className="text-xs">Conn. Type</TableHead>
              <TableHead className="text-xs">Cus. Type</TableHead>
              <TableHead className="text-xs">R.Address</TableHead>
              <TableHead className="text-xs">MAC Addrs</TableHead>
              <TableHead className="text-xs">Server</TableHead>
              <TableHead className="text-xs">B.Status</TableHead>
              <TableHead className="text-xs">M.Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={18} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={18} className="text-center py-8">কোনো ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              paginated.map((c: any) => {
                const expireBadge = getExpireBadge(c.expire_date, c.is_vip);
                return (
                  <TableRow key={c.id}>
                    <TableCell><Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", c.is_online ? "bg-green-500" : "bg-gray-400")} title={c.is_online ? "Online" : "Offline"} />
                        <span>{c.username || c.user_id || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <span>{showPasswords[c.id] ? (c.password || "****") : "••••"}</span>
                        <button onClick={() => togglePassword(c.id)} className="text-muted-foreground hover:text-foreground">
                          {showPasswords[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1">
                        {c.is_vip && <Crown className="h-3 w-3 text-purple-500" />}
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.contact}</TableCell>
                    <TableCell className="text-xs">{c.zones?.name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {c.isp_packages ? `${c.isp_packages.name}/${c.isp_packages.bandwidth_down}Mb` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">{c.monthly_bill || 0}</TableCell>
                    <TableCell className="text-xs">
                      {c.is_vip ? (
                        <Badge variant="outline" className={`text-[10px] cursor-default ${expireBadge.color}`}>
                          <Crown className="h-2.5 w-2.5 mr-0.5" /> VIP
                        </Badge>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button>
                              <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${expireBadge.color}`}>
                                <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                {expireBadge.label}
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={c.expire_date ? parseISO(c.expire_date) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  updateExpireMutation.mutate({ id: c.id, date: format(date, "yyyy-MM-dd") });
                                }
                              }}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.connection_type || "-"}</TableCell>
                    <TableCell className="text-xs">{c.client_type || "-"}</TableCell>
                    <TableCell className="text-xs">{c.remote_address || "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-[10px]">{c.mac_address || "-"}</TableCell>
                    <TableCell className="text-xs">{c.server_name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={c.billing_status === "Active" ? "default" : "secondary"} className="text-[10px]">
                        {c.billing_status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          c.mikrotik_status === "enabled"
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : c.mikrotik_status === "disabled"
                            ? "bg-red-500/10 text-red-600 border-red-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.mikrotik_status === "enabled" ? "Enabled" : c.mikrotik_status === "disabled" ? "Disabled" : "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <ClientActionButtons client={c} mode="client" invalidateKey="clients-list" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            পেজ {currentPage + 1} / {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>আগে</Button>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>পরে</Button>
          </div>
        </div>
      )}
    </div>
  );
}
