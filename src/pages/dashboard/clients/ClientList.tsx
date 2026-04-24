import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, UserPlus, RefreshCw, Gift, Eye, EyeOff, CalendarClock, Crown, Wifi, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import ClientActionButtons from "@/components/client-actions/ClientActionButtons";
import BillingFilterPanel, { BillingFilters, defaultFilters } from "@/components/billing/BillingFilterPanel";
import BulkActionButtons from "@/components/billing/BulkActionButtons";
import ServerMigrationDialog from "@/components/billing/ServerMigrationDialog";
import BulkStatusChangeDialog from "@/components/billing/BulkStatusChangeDialog";
import BulkZoneChangeDialog from "@/components/billing/BulkZoneChangeDialog";
import BulkProfileChangeDialog from "@/components/billing/BulkProfileChangeDialog";
import BulkSmsDialog from "@/components/billing/BulkSmsDialog";
import BulkEmailDialog from "@/components/billing/BulkEmailDialog";
import BulkDateExtendDialog from "@/components/billing/BulkDateExtendDialog";
import BulkDistrictChangeDialog from "@/components/billing/BulkDistrictChangeDialog";
import BulkThanaChangeDialog from "@/components/billing/BulkThanaChangeDialog";
import { exportClientsExcel, exportClientsPdf, exportInvoicesPdf, clientsToRows } from "@/lib/exportClients";
import { PageHeader } from "@/components/common/PageHeader";
import { usePopScope } from "@/hooks/usePopScope";
import { callPortal } from "@/lib/portalApi";

interface ClientListProps {
  /** When set, locks the client_type filter to this value and hides the dropdown.
   *  Also customizes the page title and "Add" button destination. */
  lockedClientType?: "Home" | "Corporate";
  pageTitle?: string;
  pageDescription?: string;
}

export default function ClientList({ lockedClientType, pageTitle, pageDescription }: ClientListProps = {}) {
  const { isPopMode, branchId } = usePopScope();
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [perPage, setPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BillingFilters>(defaultFilters);
  const queryClient = useQueryClient();

  // Dialogs
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [zoneChangeOpen, setZoneChangeOpen] = useState(false);
  const [profileChangeOpen, setProfileChangeOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [dateExtendOpen, setDateExtendOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [thanaOpen, setThanaOpen] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list", branchId || "all", isPopMode ? "pop" : "admin"],
    queryFn: async () => {
      if (isPopMode) {
        const res = await callPortal<{ clients: any[] }>("list_pop_clients");
        return res.clients || [];
      }
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down, price), mikrotik_device:mikrotik_devices!clients_mikrotik_id_fkey(name)")
        .neq("status", "left")
        .neq("billing_status", "Left")
        .eq("owner_scope", "admin")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  const handleToggleMikrotik = async (client: any) => {
    if (!client.mikrotik_id || !client.username) {
      toast.error("MikroTik তথ্য নেই");
      return;
    }
    const action = client.mikrotik_status === "enabled" ? "disable" : "enable";
    setTogglingId(client.id);
    try {
      await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: { mikrotik_id: client.mikrotik_id, username: client.username, client_id: client.id, action },
      });
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      toast.success(`${client.name} ${action === "disable" ? "Disabled" : "Enabled"} হয়েছে`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTogglingId(null);
    }
  };

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
    // Hard lock by lockedClientType if provided
    if (lockedClientType) {
      list = list.filter((c: any) => (c.client_type || "") === lockedClientType);
    }
    const f = filters;
    if (f.search) {
      const s = f.search.toLowerCase();
      list = list.filter((c: any) =>
        c.name?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.contact?.includes(s) || c.username?.toLowerCase().includes(s)
      );
    }
    if (f.server !== "all") list = list.filter((c: any) => c.mikrotik_id === f.server);
    if (f.protocolType !== "all") list = list.filter((c: any) => c.protocol_type === f.protocolType);
    if (f.profile !== "all") list = list.filter((c: any) => c.profile === f.profile);
    if (f.zone !== "all") list = list.filter((c: any) => c.zones?.name === f.zone);
    if (f.subZone !== "all") list = list.filter((c: any) => c.sub_zone_id === f.subZone);
    if (f.box !== "all") list = list.filter((c: any) => c.box_id === f.box);
    if (f.packageFilter !== "all") list = list.filter((c: any) => c.isp_packages?.name === f.packageFilter);
    if (!lockedClientType && f.clientType !== "all") list = list.filter((c: any) => c.client_type === f.clientType);
    if (f.connectionType !== "all") list = list.filter((c: any) => c.connection_type === f.connectionType);
    if (f.billingStatus !== "all") list = list.filter((c: any) => c.billing_status === f.billingStatus);
    if (f.mikrotikStatus !== "all") list = list.filter((c: any) => c.mikrotik_status === f.mikrotikStatus);
    if (f.customStatus !== "all") list = list.filter((c: any) => c.status === f.customStatus);
    if (f.fromExpireDate) list = list.filter((c: any) => c.expire_date && c.expire_date >= f.fromExpireDate);
    if (f.toExpireDate) list = list.filter((c: any) => c.expire_date && c.expire_date <= f.toExpireDate);
    if (f.fromDate) list = list.filter((c: any) => c.created_at >= f.fromDate);
    if (f.toDate) list = list.filter((c: any) => c.created_at <= f.toDate + "T23:59:59");
    return list;
  }, [clients, filters, lockedClientType]);

  const paginated = useMemo(() => {
    return filtered.slice(currentPage * perPage, (currentPage + 1) * perPage);
  }, [filtered, currentPage, perPage]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const togglePassword = (id: string) => setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((c: any) => c.id)));
  }, [paginated, selectedIds.size]);

  const selectedClients = useMemo(() =>
    (clients || []).filter((c: any) => selectedIds.has(c.id)),
    [clients, selectedIds]
  );

  const handleDisableEnable = async (action: "disable" | "enable") => {
    for (const client of selectedClients) {
      if (client.mikrotik_id && client.username) {
        try {
          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: { mikrotik_id: client.mikrotik_id, username: client.username, client_id: client.id, action },
          });
        } catch { /* continue */ }
      }
    }
    toast.success(`${selectedClients.length} জন ক্লায়েন্ট ${action === "disable" ? "disabled" : "enabled"} হয়েছে`);
    queryClient.invalidateQueries({ queryKey: ["clients-list"] });
  };

  const handleBulkVip = async (isVip: boolean) => {
    await supabase.from("clients").update({ is_vip: isVip }).in("id", [...selectedIds]);
    toast.success(`${selectedIds.size} জন ক্লায়েন্ট ${isVip ? "VIP" : "non-VIP"} করা হয়েছে`);
    queryClient.invalidateQueries({ queryKey: ["clients-list"] });
  };

  const requireSel = () => { if (selectedClients.length === 0) { toast.error("কোনো ক্লায়েন্ট সিলেক্ট করা হয়নি"); return false; } return true; };
  const handleExcel = () => { if (!requireSel()) return; exportClientsExcel(clientsToRows(selectedClients), "clients"); toast.success("Excel ডাউনলোড হয়েছে"); };
  const handlePdf = () => { if (!requireSel()) return; exportClientsPdf(clientsToRows(selectedClients), "clients", "Client List"); toast.success("PDF ডাউনলোড হয়েছে"); };
  const handleInvoiceDownload = async () => { if (!requireSel()) return; await exportInvoicesPdf(selectedClients, "invoices"); toast.success("ইনভয়েস ডাউনলোড হয়েছে"); };

  const getExpireBadge = (expireDate: string | null, isVip: boolean) => {
    if (isVip) return { color: "bg-purple-500/10 text-purple-600 border-purple-500/30", label: "VIP" };
    if (!expireDate) return { color: "bg-muted text-muted-foreground", label: "N/A" };
    const now = new Date();
    const expire = parseISO(expireDate);
    const daysLeft = differenceInDays(expire, now);
    const dayLabel = `${expire.getDate()} তারিখ`;
    if (daysLeft < 0) return { color: "bg-red-500/10 text-red-600 border-red-500/30", label: dayLabel };
    if (daysLeft <= 7) return { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", label: dayLabel };
    return { color: "bg-green-500/10 text-green-600 border-green-500/30", label: dayLabel };
  };

  // Build full ISO date from chosen day-of-month (current month or next if past)
  const buildExpireDateFromDay = (day: number): string => {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth();
    if (now.getDate() > day) {
      m += 1;
      if (m > 11) { m = 0; y += 1; }
    }
    const lastDay = new Date(y, m + 1, 0).getDate();
    const safe = Math.min(day, lastDay);
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(safe).padStart(2, "0")}`;
  };

  const summaryCards = [
    { label: "চলমান ক্লায়েন্ট", count: stats.running, icon: Users, color: "bg-blue-600" },
    { label: "নতুন ক্লায়েন্ট", count: stats.newClients, icon: UserPlus, color: "bg-green-600" },
    { label: "নবায়নকৃত ক্লায়েন্ট", count: stats.renewed, icon: RefreshCw, color: "bg-purple-600" },
    { label: "ফ্রি/ছাড় ক্লায়েন্ট", count: stats.waiver, icon: Gift, color: "bg-orange-600" },
  ];

  return (
    <div className="space-y-3 p-4">
      <PageHeader
        title={pageTitle || "ক্লায়েন্ট তালিকা"}
        description={pageDescription || "সকল ক্লায়েন্ট দেখুন ও পরিচালনা করুন"}
        action={
          <Button asChild size="sm">
            <Link
              to={
                (isPopMode ? "/pop-admin/clients/add" : "/dashboard/clients/add") +
                (lockedClientType ? `?client_type=${lockedClientType}` : "")
              }
            >
              <Plus className="h-4 w-4 mr-1" /> নতুন {lockedClientType === "Corporate" ? "কর্পোরেট" : lockedClientType === "Home" ? "হোম" : ""} ক্লায়েন্ট
            </Link>
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`${card.color} text-white border-0`}>
            <CardContent className="p-3 flex items-center gap-2">
              <card.icon className="h-8 w-8 opacity-80" />
              <div>
                <div className="font-semibold text-sm">{card.label}</div>
                <div className="text-xl font-bold">{card.count}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unified Filter */}
      <BillingFilterPanel
        filters={filters}
        onChange={(f) => { setFilters(f); setCurrentPage(0); }}
        onReset={() => { setFilters(defaultFilters); setCurrentPage(0); }}
      />

      {/* Bulk Actions */}
      <BulkActionButtons
        selectedCount={selectedIds.size}
        onGenerateExcel={handleExcel}
        onGeneratePdf={handlePdf}
        onSyncClients={handleSyncOnline}
        onDisableSelected={() => handleDisableEnable("disable")}
        onEnableSelected={() => handleDisableEnable("enable")}
        onBulkStatusChange={() => setStatusChangeOpen(true)}
        onBulkZoneChange={() => setZoneChangeOpen(true)}
        onBulkDistrictChange={() => setDistrictOpen(true)}
        onBulkThanaChange={() => setThanaOpen(true)}
        onDownloadInvoice={handleInvoiceDownload}
        onSmsSelected={() => setSmsOpen(true)}
        onEmailSelected={() => setEmailOpen(true)}
        onBulkDateExtend={() => setDateExtendOpen(true)}
        onMigrateServer={() => setMigrateOpen(true)}
        onBulkVip={() => handleBulkVip(true)}
        onBulkRemoveVip={() => handleBulkVip(false)}
        onBulkProfileChange={() => setProfileChangeOpen(true)}
        showMigrate={!isPopMode}
      />

      {/* Entries + Total */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>মোট: {filtered.length} ক্লায়েন্ট</span>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setCurrentPage(0); }}>
            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 250, 500, 1000].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="w-8"><Checkbox checked={paginated.length > 0 && selectedIds.size === paginated.length} onCheckedChange={toggleAll} /></TableHead>
              <TableHead className="text-xs">ক্লা. কোড</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">পাসওয়ার্ড</TableHead>
              <TableHead className="text-xs">কাস্টমার নাম</TableHead>
              <TableHead className="text-xs">মোবাইল</TableHead>
              <TableHead className="text-xs">জোন</TableHead>
              <TableHead className="text-xs">প্যাকেজ/স্পিড</TableHead>
              <TableHead className="text-xs">মাসিক বিল</TableHead>
              <TableHead className="text-xs">মেয়াদ</TableHead>
              <TableHead className="text-xs">কানেকশন টাইপ</TableHead>
              <TableHead className="text-xs">কাস্টমার টাইপ</TableHead>
              <TableHead className="text-xs">রিমোট অ্যাড্রেস</TableHead>
              <TableHead className="text-xs">MAC অ্যাড্রেস</TableHead>
              <TableHead className="text-xs">সার্ভার</TableHead>
              <TableHead className="text-xs">বিল স্ট্যাটাস</TableHead>
              <TableHead className="text-xs">MikroTik স্ট্যাটাস</TableHead>
              <TableHead className="text-xs">অ্যাকশন</TableHead>
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
                  <TableRow key={c.id} data-state={selectedIds.has(c.id) ? "selected" : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", c.is_online ? "bg-green-500" : "bg-gray-400")} />
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
                              <Badge variant="outline" className={`text-[10px] cursor-pointer hover:opacity-80 ${expireBadge.color}`}>
                                <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                {expireBadge.label}
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" align="start">
                            <div className="text-xs font-medium mb-2 text-muted-foreground">মাসের কোন দিন</div>
                            <Select
                              value={c.expire_date ? String(parseISO(c.expire_date).getDate()) : ""}
                              onValueChange={(v) => updateExpireMutation.mutate({ id: c.id, date: buildExpireDateFromDay(Number(v)) })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="দিন (1-31)" /></SelectTrigger>
                              <SelectContent className="max-h-72">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                  <SelectItem key={d} value={String(d)} className="text-xs">প্রতি মাসের {d} তারিখ</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.connection_type || "-"}</TableCell>
                    <TableCell className="text-xs">{c.client_type || "-"}</TableCell>
                    <TableCell className="text-xs">{c.remote_address || "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-[10px]">{c.mac_address || "-"}</TableCell>
                    <TableCell className="text-xs">{c.mikrotik_device?.name || c.server_name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={c.billing_status === "Active" ? "default" : "secondary"} className="text-[10px]">
                        {c.billing_status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Switch
                        checked={c.mikrotik_status === "enabled"}
                        disabled={togglingId === c.id || !c.mikrotik_id}
                        onCheckedChange={() => handleToggleMikrotik(c)}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      <ClientActionButtons client={c} mode="client" invalidateKey="clients-list" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-primary/10 font-semibold">
              <TableCell colSpan={8} className="text-xs">মোট: {filtered.length} জন</TableCell>
              <TableCell className="text-xs">৳ {filtered.reduce((s: number, c: any) => s + Number(c.monthly_bill || 0), 0).toLocaleString()}</TableCell>
              <TableCell colSpan={9}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">পেজ {currentPage + 1} / {totalPages || 1}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage <= 0} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ServerMigrationDialog open={migrateOpen} onOpenChange={setMigrateOpen} selectedClients={selectedClients} />
      <BulkStatusChangeDialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen} selectedClientIds={[...selectedIds]} />
      <BulkZoneChangeDialog open={zoneChangeOpen} onOpenChange={setZoneChangeOpen} selectedClientIds={[...selectedIds]} />
      <BulkProfileChangeDialog open={profileChangeOpen} onOpenChange={setProfileChangeOpen} selectedClients={selectedClients} />
      <BulkSmsDialog open={smsOpen} onOpenChange={setSmsOpen} selectedClients={selectedClients} />
      <BulkEmailDialog open={emailOpen} onOpenChange={setEmailOpen} selectedClients={selectedClients} />
      <BulkDateExtendDialog open={dateExtendOpen} onOpenChange={setDateExtendOpen} selectedClients={selectedClients} invalidateKey="clients-list" />
      <BulkDistrictChangeDialog open={districtOpen} onOpenChange={setDistrictOpen} selectedClientIds={[...selectedIds]} invalidateKey="clients-list" />
      <BulkThanaChangeDialog open={thanaOpen} onOpenChange={setThanaOpen} selectedClientIds={[...selectedIds]} invalidateKey="clients-list" />
    </div>
  );
}
