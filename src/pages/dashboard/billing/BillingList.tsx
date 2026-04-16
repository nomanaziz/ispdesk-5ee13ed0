import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Users, Banknote, AlertTriangle, ChevronLeft, ChevronRight,
  UserCheck, Clock, TrendingUp, Receipt
} from "lucide-react";
import ClientActionButtons from "@/components/client-actions/ClientActionButtons";
import BillingFilterPanel, { BillingFilters, defaultFilters } from "@/components/billing/BillingFilterPanel";
import BulkActionButtons from "@/components/billing/BulkActionButtons";
import ServerMigrationDialog from "@/components/billing/ServerMigrationDialog";
import BulkStatusChangeDialog from "@/components/billing/BulkStatusChangeDialog";
import BulkZoneChangeDialog from "@/components/billing/BulkZoneChangeDialog";
import BulkProfileChangeDialog from "@/components/billing/BulkProfileChangeDialog";
import BillReceiveDialog from "@/components/billing/BillReceiveDialog";
import { toast } from "sonner";

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function BillingList() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BillingFilters>({ ...defaultFilters, month: currentMonth() });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [zoneChangeOpen, setZoneChangeOpen] = useState(false);
  const [profileChangeOpen, setProfileChangeOpen] = useState(false);
  const [payClient, setPayClient] = useState<any>(null);
  const [payBilling, setPayBilling] = useState<any>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["billing-list", filters.month],
    queryFn: async () => {
      const [clientsResult, sessionsResult] = await Promise.allSettled([
        supabase
          .from("clients")
          .select(`
            id, client_id, name, contact, username, remote_address, status,
            client_type, connection_type, monthly_bill, expire_date, speed,
            server_name, mac_address, protocol_type, profile, password,
            mikrotik_id, mikrotik_status, is_vip, billing_date, is_online,
            zone_id, sub_zone_id, box_id, package_id,
            zone:zones(name),
            package:isp_packages(name),
            billing!billing_client_id_fkey(id, month, amount, paid, due, discount, advance, vat, status, pay_date)
          `)
          .order("client_id", { ascending: true }),
        supabase.functions.invoke("fetch-mikrotik-ppp", {
          body: { action: "active-sessions", device_id: "all" },
        }),
      ]);

      if (clientsResult.status === "rejected") throw clientsResult.reason;

      const { data, error } = clientsResult.value;
      if (error) throw error;

      const hasLiveSessionData =
        sessionsResult.status === "fulfilled" &&
        !sessionsResult.value.error &&
        Array.isArray(sessionsResult.value.data?.sessions);

      const onlineUsernames = new Set<string>();
      if (hasLiveSessionData) {
        for (const session of sessionsResult.value.data.sessions as Array<{ name?: string }>) {
          if (session.name) onlineUsernames.add(session.name.toLowerCase());
        }
      }

      return (data || []).map((c: any) => {
        const bill = (c.billing || []).find((b: any) => b.month === filters.month);
        return {
          ...c,
          currentBill: bill || null,
          isOnlineLive: hasLiveSessionData
            ? Boolean(c.username && onlineUsernames.has(c.username.toLowerCase()))
            : Boolean(c.is_online),
        };
      });
    },
  });

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      const f = filters;
      if (f.search) {
        const s = f.search.toLowerCase();
        if (!c.client_id?.toLowerCase().includes(s) && !c.name?.toLowerCase().includes(s) && !c.contact?.toLowerCase().includes(s)) return false;
      }
      if (f.server !== "all" && c.mikrotik_id !== f.server) return false;
      if (f.protocolType !== "all" && c.protocol_type !== f.protocolType) return false;
      if (f.profile !== "all" && c.profile !== f.profile) return false;
      if (f.zone !== "all" && c.zone?.name !== f.zone) return false;
      if (f.subZone !== "all" && c.sub_zone_id !== f.subZone) return false;
      if (f.box !== "all" && c.box_id !== f.box) return false;
      if (f.packageFilter !== "all" && c.package?.name !== f.packageFilter) return false;
      if (f.connectionType !== "all" && c.connection_type !== f.connectionType) return false;
      if (f.clientType !== "all" && c.client_type !== f.clientType) return false;
      if (f.mikrotikStatus !== "all" && c.mikrotik_status !== f.mikrotikStatus) return false;
      if (f.customStatus !== "all" && c.status !== f.customStatus) return false;
      if (f.paymentStatus !== "all") {
        const b = c.currentBill;
        const bs = b?.status?.toLowerCase() || "unpaid";
        const now = new Date();
        const expDate = c.expire_date ? new Date(c.expire_date) : null;
        if (f.paymentStatus === "overdue") {
          if (!expDate || expDate >= now || bs === "paid") return false;
        } else if (f.paymentStatus !== bs) return false;
      }
      if (f.billingStatus !== "all" && c.billing_status !== f.billingStatus) return false;
      if (f.fromExpireDate && c.expire_date && c.expire_date < f.fromExpireDate) return false;
      if (f.toExpireDate && c.expire_date && c.expire_date > f.toExpireDate) return false;
      return true;
    });
  }, [clients, filters]);

  const summary = useMemo(() => {
    let total = clients.length, active = 0, paid = 0, unpaid = 0, overdue = 0;
    let received = 0, due = 0, monthlyBill = 0;
    const now = new Date();
    clients.forEach((c: any) => {
      if (c.status === "active") active++;
      const b = c.currentBill;
      monthlyBill += Number(c.monthly_bill || 0);
      if (b) {
        received += Number(b.paid || 0);
        due += Number(b.due || 0);
        if (b.status?.toLowerCase() === "paid") paid++;
        else unpaid++;
      } else unpaid++;
      const expDate = c.expire_date ? new Date(c.expire_date) : null;
      if (expDate && expDate < now && (!b || b.status !== "paid")) overdue++;
    });
    return { total, active, paid, unpaid, overdue, received, due, monthlyBill };
  }, [clients]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((c: any) => c.id)));
  }, [paginated, selectedIds.size]);

  const selectedClients = useMemo(() =>
    clients.filter((c: any) => selectedIds.has(c.id)),
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
    queryClient.invalidateQueries({ queryKey: ["billing-list"] });
  };

  const handleBulkVip = async (isVip: boolean) => {
    await supabase.from("clients").update({ is_vip: isVip }).in("id", [...selectedIds]);
    toast.success(`${selectedIds.size} জন ক্লায়েন্ট ${isVip ? "VIP" : "non-VIP"} করা হয়েছে`);
    queryClient.invalidateQueries({ queryKey: ["billing-list"] });
  };

  const notImplemented = () => toast.info("শীঘ্রই আসছে — এই ফিচার এখনো তৈরি হচ্ছে");

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-bold text-foreground">বিলিং তালিকা (Billing List)</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <SummaryCard icon={Users} label="মোট ক্লায়েন্ট" value={summary.total} color="text-blue-500" bg="bg-blue-500/10" />
        <SummaryCard icon={UserCheck} label="অ্যাক্টিভ" value={summary.active} color="text-emerald-500" bg="bg-emerald-500/10" />
        <SummaryCard icon={Receipt} label="পেইড" value={summary.paid} color="text-emerald-400" bg="bg-emerald-500/10" />
        <SummaryCard icon={AlertTriangle} label="ডিউ" value={summary.unpaid} color="text-orange-400" bg="bg-orange-500/10" />
        <SummaryCard icon={TrendingUp} label="ওভারডিউ" value={summary.overdue} color="text-red-400" bg="bg-red-500/10" />
        <SummaryCard icon={Banknote} label="রিসিভড" value={`৳${summary.received.toLocaleString()}`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <SummaryCard icon={Clock} label="মাসিক বিল" value={`৳${summary.monthlyBill.toLocaleString()}`} color="text-teal-400" bg="bg-teal-500/10" />
      </div>

      {/* Filters */}
      <BillingFilterPanel
        filters={filters}
        onChange={(f) => { setFilters(f); setPage(1); }}
        onReset={() => { setFilters({ ...defaultFilters, month: currentMonth() }); setPage(1); }}
      />

      {/* Bulk Actions */}
      <BulkActionButtons
        selectedCount={selectedIds.size}
        onGenerateExcel={notImplemented}
        onGeneratePdf={notImplemented}
        onSyncClients={notImplemented}
        onDisableSelected={() => handleDisableEnable("disable")}
        onEnableSelected={() => handleDisableEnable("enable")}
        onBulkStatusChange={() => setStatusChangeOpen(true)}
        onBulkZoneChange={() => setZoneChangeOpen(true)}
        onBulkDistrictChange={notImplemented}
        onBulkThanaChange={notImplemented}
        onDownloadInvoice={notImplemented}
        onSmsSelected={notImplemented}
        onEmailSelected={notImplemented}
        onBulkDateExtend={notImplemented}
        onMigrateServer={() => setMigrateOpen(true)}
        onBulkVip={() => handleBulkVip(true)}
        onBulkRemoveVip={() => handleBulkVip(false)}
        onBulkProfileChange={() => setProfileChangeOpen(true)}
      />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginated.length > 0 && selectedIds.size === paginated.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>C.Code</TableHead>
                  <TableHead>ID/IP</TableHead>
                  <TableHead>কাস্টমার নাম</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>জোন</TableHead>
                  <TableHead>প্যাকেজ</TableHead>
                  <TableHead>স্পিড</TableHead>
                  <TableHead>মেয়াদ</TableHead>
                  <TableHead>C.Status</TableHead>
                  <TableHead className="text-right">M.Bill</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>B.Status</TableHead>
                  <TableHead>M.Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={19} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={19} className="text-center py-8 text-muted-foreground">কোনো ডাটা পাওয়া যায়নি</TableCell></TableRow>
                ) : paginated.map((c: any, i: number) => {
                  const b = c.currentBill;
                  const bs = b?.status || "unpaid";
                  const isDue = bs !== "paid";
                  return (
                    <TableRow key={c.id} data-state={selectedIds.has(c.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                      </TableCell>
                      <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${c.isOnlineLive ? "bg-green-500" : "bg-gray-400"}`} />
                          {c.client_id}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{c.username || c.remote_address || "-"}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.contact || "-"}</TableCell>
                      <TableCell>{c.zone?.name || "-"}</TableCell>
                      <TableCell>{c.package?.name || "-"}</TableCell>
                      <TableCell>{c.speed || "-"}</TableCell>
                      <TableCell className="text-xs">{c.expire_date || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : c.status === "left" ? "destructive" : "secondary"} className="text-xs capitalize">
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(c.monthly_bill || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(b?.paid || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(b?.due || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(b?.advance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{b?.pay_date || "-"}</TableCell>
                      <TableCell>
                        {isDue ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="destructive" className="text-[10px] h-6 flex items-center">Due</Badge>
                            <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setPayClient(c); setPayBilling(b); }}>
                              Pay
                            </Button>
                          </div>
                        ) : (
                          <Badge className="text-[10px] h-6 flex items-center bg-emerald-500/20 text-emerald-600 border-emerald-500/30" variant="outline">Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <MikrotikToggle client={c} queryClient={queryClient} />
                      </TableCell>
                      <TableCell>
                        <ClientActionButtons client={c} mode="billing" invalidateKey="billing-list" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>প্রতি পৃষ্ঠায়:</span>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span>মোট: {filtered.length} জন</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{page} / {totalPages || 1}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <ServerMigrationDialog open={migrateOpen} onOpenChange={setMigrateOpen} selectedClients={selectedClients} />
      <BulkStatusChangeDialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen} selectedClientIds={[...selectedIds]} />
      <BulkZoneChangeDialog open={zoneChangeOpen} onOpenChange={setZoneChangeOpen} selectedClientIds={[...selectedIds]} />
      <BulkProfileChangeDialog open={profileChangeOpen} onOpenChange={setProfileChangeOpen} selectedClients={selectedClients} />
      <BillReceiveDialog
        open={!!payClient}
        onOpenChange={(v) => { if (!v) { setPayClient(null); setPayBilling(null); } }}
        client={payClient}
        billing={payBilling}
        invalidateKey="billing-list"
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-3 flex items-center gap-2">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="text-sm font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MikrotikToggle({ client, queryClient }: { client: any; queryClient: any }) {
  const [loading, setLoading] = useState(false);
  const isEnabled = client.mikrotik_status !== "disabled";

  const handleToggle = async (checked: boolean) => {
    if (!client.mikrotik_id || !client.username) {
      toast.error("MikroTik সার্ভার বা ইউজারনেম নেই");
      return;
    }
    setLoading(true);
    try {
      const action = checked ? "enable" : "disable";
      const { data, error } = await supabase.functions.invoke("manage-mikrotik-ppp", {
        body: {
          mikrotik_id: client.mikrotik_id,
          username: client.username,
          client_id: client.id,
          action,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || `${client.username} ${action}d`);
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
    } catch (err: any) {
      toast.error(err.message || "MikroTik অপারেশন ব্যর্থ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      checked={isEnabled}
      onCheckedChange={handleToggle}
      disabled={loading || !client.mikrotik_id}
      className={`scale-75 ${loading ? "opacity-50" : ""}`}
      aria-label={isEnabled ? "Enabled" : "Disabled"}
    />
  );
}
