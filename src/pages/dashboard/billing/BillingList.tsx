import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Users, Banknote, AlertTriangle, ChevronLeft, ChevronRight,
  UserCheck, Clock, TrendingUp, Receipt, Crown
} from "lucide-react";
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
import BillReceiveDialog from "@/components/billing/BillReceiveDialog";
import BillingDatePopover from "@/components/billing/BillingDatePopover";
import RemainingDaysCell from "@/components/billing/RemainingDaysCell";
import BulkClientRechargeDialog from "@/components/reseller/BulkClientRechargeDialog";
import { exportClientsExcel, exportClientsPdf, exportInvoicesPdf, clientsToRows } from "@/lib/exportClients";
import { toast } from "sonner";
import { usePopScope } from "@/hooks/usePopScope";
import { callPortal } from "@/lib/portalApi";
import { getBillStatus } from "@/lib/billingStatus";
import { DataTableCard } from "@/components/common/DataTableCard";
import { useColumnVisibility, type ColumnDef } from "@/hooks/useColumnVisibility";

const BILLING_LIST_COLUMNS: ColumnDef[] = [
  { key: "select", label: "Select", required: true },
  { key: "sl", label: "ক্রম" },
  { key: "client_id", label: "ক্লায়েন্ট কোড", required: true },
  { key: "username", label: "ID / IP" },
  { key: "name", label: "কাস্টমার নাম", required: true },
  { key: "contact", label: "মোবাইল" },
  { key: "zone", label: "জোন" },
  { key: "package", label: "প্যাকেজ" },
  { key: "speed", label: "স্পিড", defaultVisible: false },
  { key: "expire_date", label: "Exp Date" },
  { key: "remaining_days", label: "R.Days (POP)" },
  { key: "status", label: "স্ট্যাটাস" },
  { key: "monthly_bill", label: "মাসিক বিল", required: true },
  { key: "paid", label: "পরিশোধিত" },
  { key: "due", label: "বকেয়া", required: true },
  { key: "advance", label: "অগ্রিম", defaultVisible: false },
  { key: "pay_date", label: "পরিশোধের তারিখ", defaultVisible: false },
  { key: "bill_status", label: "বিল স্ট্যাটাস" },
  { key: "mikrotik_status", label: "MikroTik" },
  { key: "auto_recharge", label: "Auto Recharge (POP)" },
  { key: "actions", label: "অ্যাকশন", required: true },
];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function BillingList() {
  const queryClient = useQueryClient();
  const { isPopMode, branchId } = usePopScope();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<BillingFilters>(() => {
    const f: BillingFilters = { ...defaultFilters, month: searchParams.get("month") || currentMonth() };
    const ps = searchParams.get("paymentStatus");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (ps) f.paymentStatus = ps;
    if (search) f.search = search;
    if (from) f.fromDate = from;
    if (to) f.toDate = to;
    return f;
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isVisible, toggle, reset: resetCols } = useColumnVisibility(
    "billing-list",
    BILLING_LIST_COLUMNS,
  );

  // R.Days column shows for any reseller (POP) mode
  const isPrepaidPop = isPopMode;

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
  const [payClient, setPayClient] = useState<any>(null);
  const [payBilling, setPayBilling] = useState<any>(null);
  const [bulkRechargeOpen, setBulkRechargeOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["billing-list", filters.month, branchId || "all", isPopMode ? "pop" : "admin"],
    queryFn: async () => {
      let data: any[] | null = null;
      if (isPopMode) {
        const res = await callPortal<{ clients: any[] }>("list_pop_billing_clients", { month: filters.month });
        data = res.clients || [];
      } else {
        const { data: rows, error } = await supabase
          .from("clients")
          .select(`
            id, client_id, name, contact, username, remote_address, status,
            client_type, connection_type, monthly_bill, expire_date, speed,
            server_name, mac_address, protocol_type, profile, password,
            mikrotik_id, mikrotik_status, is_vip, billing_date, is_online,
            zone_id, sub_zone_id, box_id, package_id, email, billing_status,
            zone:zones(name),
            package:isp_packages(name),
            mikrotik_device:mikrotik_devices!clients_mikrotik_id_fkey(name),
            billing!billing_client_id_fkey(id, bill_id, month, amount, paid, due, discount, advance, vat, status, pay_date)
          `)
          .eq("status", "active")
          .ilike("billing_status", "active")
          .gt("monthly_bill", 0)
          .eq("owner_scope", "admin")
          .order("client_id", { ascending: true });
        if (error) throw error;
        data = rows;
      }

      const monthKey = filters.month; // YYYY-MM
      return (data || []).map((c: any) => {
        const allBills = c.billing || [];
        const bill = allBills.find((b: any) => {
          if (!b?.month) return false;
          const m = String(b.month).slice(0, 7);
          return m === monthKey;
        });
        const totalDue = allBills.reduce((s: number, b: any) => s + Number(b.due || 0), 0);
        const totalPaid = allBills.reduce((s: number, b: any) => s + Number(b.paid || 0), 0);
        const unpaidMonths = allBills.filter((b: any) => Number(b.due || 0) > 0).length;
        const monthly = Number(c.monthly_bill || 0);
        const overdueMonths = monthly > 0 ? Math.floor(totalDue / monthly) : 0;
        const isOverdue = totalDue >= 1 && totalDue > monthly;
        return {
          ...c,
          currentBill: bill || null,
          totalDue,
          totalPaid,
          unpaidMonths,
          overdueMonths,
          isOverdue,
          isOnlineLive: Boolean(c.is_online),
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
        const derived = getBillStatus(b);
        if (f.paymentStatus === "overdue" || f.paymentStatus === "overdue_1") {
          if (!c.isOverdue) return false;
        } else if (f.paymentStatus === "overdue_2") {
          if ((c.overdueMonths || 0) < 2) return false;
        } else if (f.paymentStatus === "overdue_3") {
          if ((c.overdueMonths || 0) < 3) return false;
        } else if (f.paymentStatus === "overdue_3plus") {
          if ((c.overdueMonths || 0) <= 3) return false;
        } else if (f.paymentStatus !== derived) return false;
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
      const derived = getBillStatus(b);
      monthlyBill += Number(c.monthly_bill || 0);
      received += Number(c.totalPaid || 0);
      due += Number(c.totalDue || 0);
      if (b) {
        if (derived === "paid") paid++;
        else unpaid++;
      } else unpaid++;
      if (c.isOverdue) overdue++;
    });
    return { total, active, paid, unpaid, overdue, received, due, monthlyBill };
  }, [clients]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const pageTotals = useMemo(() => {
    let monthly = 0, paid = 0, due = 0, advance = 0;
    paginated.forEach((c: any) => {
      monthly += Number(c.monthly_bill || 0);
      paid += Number(c.totalPaid || 0);
      due += Number(c.totalDue || 0);
      advance += Number(c.currentBill?.advance || 0);
    });
    return { monthly, paid, due, advance };
  }, [paginated]);

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

  const handleBulkAutoRecharge = async (enabled: boolean) => {
    if (selectedIds.size === 0) { toast.error("কোনো ক্লায়েন্ট সিলেক্ট করা হয়নি"); return; }
    try {
      if (isPopMode) {
        await callPortal("set_client_auto_recharge", { client_ids: [...selectedIds], enabled });
      } else {
        await supabase.from("clients").update({ auto_recharge_enabled: enabled }).in("id", [...selectedIds]);
      }
      toast.success(`${selectedIds.size} জন ক্লায়েন্টের Auto Recharge ${enabled ? "ON" : "OFF"} হয়েছে`);
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      queryClient.invalidateQueries({ queryKey: ["pop-billing-clients"] });
    } catch (e: any) {
      toast.error(e.message || "Auto Recharge পরিবর্তন ব্যর্থ");
    }
  };

  const requireSelection = () => {
    if (selectedClients.length === 0) {
      toast.error("কোনো ক্লায়েন্ট সিলেক্ট করা হয়নি");
      return false;
    }
    return true;
  };

  const handleExcel = () => {
    if (!requireSelection()) return;
    exportClientsExcel(clientsToRows(selectedClients), "billing");
    toast.success("Excel ডাউনলোড হয়েছে");
  };
  const handlePdf = () => {
    if (!requireSelection()) return;
    exportClientsPdf(clientsToRows(selectedClients), "billing", "Billing List");
    toast.success("PDF ডাউনলোড হয়েছে");
  };
  const handleInvoiceDownload = async () => {
    if (!requireSelection()) return;
    await exportInvoicesPdf(selectedClients, "invoices");
    toast.success("ইনভয়েস ডাউনলোড হয়েছে");
  };

  const regenerateMut = useMutation({
    mutationFn: async () => {
      const month = `${filters.month}-01`;
      const monthKey = filters.month;
      let created = 0;
      let skipped = 0;
      for (const c of selectedClients) {
        const existing = (c.billing || []).find((b: any) => b.month === month);
        if (existing) { skipped++; continue; }
        const billId = `BILL-${c.client_id}-${monthKey}`;
        const amount = Number(c.monthly_bill || 0);
        const { error } = await supabase.from("billing").insert({
          bill_id: billId,
          client_id: c.id,
          month,
          amount,
          due: amount,
          paid: 0,
          status: "unpaid",
          generated: true,
        });
        if (!error) created++;
      }
      return { created, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      toast.success(`তৈরি হয়েছে: ${created}, ইতিমধ্যে আছে: ${skipped}`);
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [syncing, setSyncing] = useState(false);
  const handleSyncClients = async () => {
    setSyncing(true);
    toast.info("ক্লায়েন্ট ও বিলিং সিঙ্ক হচ্ছে...");
    try {
      // 1) MikroTik online/offline + status sync (admin only — POP mode skips RPC call)
      if (!isPopMode) {
        const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
          body: { action: "sync-online", device_id: "all" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(`সিঙ্ক সম্পন্ন — Online: ${data?.online || 0}, Offline: ${data?.offline || 0}${data?.status_synced ? `, Status synced: ${data.status_synced}` : ""}`);
      } else {
        toast.success("বিলিং তথ্য রিফ্রেশ হয়েছে");
      }
      // 2) Refresh full billing + client table from DB (covers paid bills, dues, etc.)
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      queryClient.invalidateQueries({ queryKey: ["bill-collections"] });
      queryClient.invalidateQueries({ queryKey: ["clients-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-v3"] });
    } catch (err: any) {
      toast.error(err.message || "সিঙ্ক ব্যর্থ হয়েছে");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-foreground">বিলিং তালিকা (Billing List)</h1>
        <div className="flex items-center gap-2">
          {isPopMode && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (selectedIds.size === 0) { toast.error("কোনো ক্লায়েন্ট সিলেক্ট করা হয়নি"); return; }
                setBulkRechargeOpen(true);
              }}
            >
              <Banknote className="h-4 w-4 mr-1" /> Bulk Client Recharge ({selectedIds.size})
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("generate-monthly-billing", { body: {} });
                if (error) throw error;
                toast.success(data?.message || "বিল তৈরি সম্পন্ন");
                queryClient.invalidateQueries({ queryKey: ["billing-list"] });
              } catch (e: any) {
                toast.error(e.message || "বিল তৈরি ব্যর্থ");
              }
            }}
          >
            <Receipt className="h-4 w-4 mr-1" /> এই মাসের বিল তৈরি করুন
          </Button>
        </div>
      </div>

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
        onGenerateExcel={handleExcel}
        onGeneratePdf={handlePdf}
        onSyncClients={handleSyncClients}
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
        onRegenerateInvoice={() => regenerateMut.mutate()}
        showMigrate={!isPopMode}
        showAutoRecharge={isPopMode}
        onBulkAutoRechargeOn={() => handleBulkAutoRecharge(true)}
        onBulkAutoRechargeOff={() => handleBulkAutoRecharge(false)}
      />

      <BulkSmsDialog open={smsOpen} onOpenChange={setSmsOpen} selectedClients={selectedClients} />
      <BulkEmailDialog open={emailOpen} onOpenChange={setEmailOpen} selectedClients={selectedClients} />
      <BulkDateExtendDialog open={dateExtendOpen} onOpenChange={setDateExtendOpen} selectedClients={selectedClients} invalidateKey="billing-list" />
      <BulkDistrictChangeDialog open={districtOpen} onOpenChange={setDistrictOpen} selectedClientIds={[...selectedIds]} invalidateKey="billing-list" />
      <BulkThanaChangeDialog open={thanaOpen} onOpenChange={setThanaOpen} selectedClientIds={[...selectedIds]} invalidateKey="billing-list" />

      {/* Table */}
      <DataTableCard
        title="বিলিং তালিকা"
        count={filtered.length}
        columns={BILLING_LIST_COLUMNS}
        isVisible={isVisible}
        toggle={toggle}
        reset={resetCols}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={paginated.length > 0 && selectedIds.size === paginated.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {isVisible("sl") && <TableHead className="w-10">ক্রম</TableHead>}
              <TableHead>ক্লায়েন্ট কোড</TableHead>
              {isVisible("username") && <TableHead>ID/IP</TableHead>}
              <TableHead>কাস্টমার নাম</TableHead>
              {isVisible("contact") && <TableHead>মোবাইল</TableHead>}
              {isVisible("zone") && <TableHead>জোন</TableHead>}
              {isVisible("package") && <TableHead>প্যাকেজ</TableHead>}
              {isVisible("speed") && <TableHead>স্পিড</TableHead>}
              {isVisible("expire_date") && <TableHead>Exp Date</TableHead>}
              {isPrepaidPop && isVisible("remaining_days") && <TableHead className="text-center">R.Days</TableHead>}
              {isVisible("status") && <TableHead>স্ট্যাটাস</TableHead>}
              <TableHead className="text-right">মাসিক বিল</TableHead>
              {isVisible("paid") && <TableHead className="text-right">পরিশোধিত</TableHead>}
              <TableHead className="text-right">বকেয়া</TableHead>
              {isVisible("advance") && <TableHead className="text-right">অগ্রিম</TableHead>}
              {isVisible("pay_date") && <TableHead>পরিশোধের তারিখ</TableHead>}
              {isVisible("bill_status") && <TableHead>বিল স্ট্যাটাস</TableHead>}
              {isVisible("mikrotik_status") && <TableHead>MikroTik</TableHead>}
              {isPopMode && isVisible("auto_recharge") && <TableHead className="text-center">Auto Recharge</TableHead>}
              <TableHead>অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={22} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={22} className="text-center py-8 text-muted-foreground">কোনো ডাটা পাওয়া যায়নি</TableCell></TableRow>
            ) : paginated.map((c: any, i: number) => {
              const b = c.currentBill;
              const paidAmt = Number(c.totalPaid || 0);
              const dueAmt = Number(c.totalDue || 0);
              const derived = getBillStatus(b);
              const isPaid = derived === "paid";
              const isPartial = derived === "partial";
              return (
                <TableRow key={c.id} data-state={selectedIds.has(c.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                  </TableCell>
                  {isVisible("sl") && <TableCell>{(page - 1) * perPage + i + 1}</TableCell>}
                  <TableCell className="font-mono text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${c.isOnlineLive ? "bg-green-500" : "bg-gray-400"}`} />
                      {c.client_id}
                    </span>
                  </TableCell>
                  {isVisible("username") && <TableCell className="text-xs">{c.username || c.remote_address || "-"}</TableCell>}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {c.is_vip && <Crown className="h-3 w-3 text-purple-500" />}
                      <span>{c.name}</span>
                      {c.is_vip && (
                        <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                          VIP
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {isVisible("contact") && <TableCell>{c.contact || "-"}</TableCell>}
                  {isVisible("zone") && <TableCell>{c.zone?.name || "-"}</TableCell>}
                  {isVisible("package") && <TableCell>{c.package?.name || "-"}</TableCell>}
                  {isVisible("speed") && <TableCell>{c.speed || "-"}</TableCell>}
                  {isVisible("expire_date") && (
                    <TableCell>
                      <BillingDatePopover client={c} />
                    </TableCell>
                  )}
                  {isPrepaidPop && isVisible("remaining_days") && (
                    <TableCell className="text-center">
                      <RemainingDaysCell client={c} />
                    </TableCell>
                  )}
                  {isVisible("status") && (
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : c.status === "left" ? "destructive" : "secondary"} className="text-xs capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">{Number(c.monthly_bill || 0).toLocaleString()}</TableCell>
                  {isVisible("paid") && <TableCell className="text-right">{paidAmt.toLocaleString()}</TableCell>}
                  <TableCell className="text-right">
                    <div className="font-semibold">{dueAmt.toLocaleString()}</div>
                    {c.overdueMonths >= 2 && (
                      <Badge variant="destructive" className="text-[9px] h-4 px-1 mt-0.5">{c.overdueMonths} মাস</Badge>
                    )}
                  </TableCell>
                  {isVisible("advance") && <TableCell className="text-right">{Number(b?.advance || 0).toLocaleString()}</TableCell>}
                  {isVisible("pay_date") && <TableCell className="text-xs">{b?.pay_date || "-"}</TableCell>}
                  {isVisible("bill_status") && (
                    <TableCell>
                      {isPaid ? (
                        <Badge className="text-[10px] h-6 flex items-center bg-emerald-500/20 text-emerald-600 border-emerald-500/30" variant="outline">পরিশোধিত</Badge>
                      ) : isPartial ? (
                        <div className="flex items-center gap-1">
                          <Badge className="text-[10px] h-6 flex items-center bg-amber-500/20 text-amber-600 border-amber-500/30" variant="outline">আংশিক</Badge>
                          <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setPayClient(c); setPayBilling(b); }}>
                            পরিশোধ
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Badge variant="destructive" className="text-[10px] h-6 flex items-center">বকেয়া</Badge>
                          <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setPayClient(c); setPayBilling(b); }}>
                            পরিশোধ
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                  {isVisible("mikrotik_status") && (
                    <TableCell>
                      <MikrotikToggle client={c} queryClient={queryClient} />
                    </TableCell>
                  )}
                  {isPopMode && isVisible("auto_recharge") && (
                    <TableCell className="text-center">
                      <AutoRechargeToggle client={c} queryClient={queryClient} />
                    </TableCell>
                  )}
                  <TableCell>
                    <ClientActionButtons client={c} mode="billing" invalidateKey="billing-list" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>প্রতি পৃষ্ঠায়:</span>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 250, 500, 1000].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
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
      {isPopMode && (
        <BulkClientRechargeDialog
          open={bulkRechargeOpen}
          onOpenChange={setBulkRechargeOpen}
          clients={selectedClients.map((c: any) => ({ id: c.id, name: c.name, monthly_bill: Number(c.monthly_bill || 0) }))}
        />
      )}
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

function AutoRechargeToggle({ client, queryClient }: { client: any; queryClient: any }) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(!!client.auto_recharge_enabled);
  const handle = async (next: boolean) => {
    setLoading(true);
    const prev = enabled;
    setEnabled(next);
    try {
      await callPortal("set_client_auto_recharge", { client_id: client.id, enabled: next });
      toast.success(next ? "Auto Recharge চালু" : "Auto Recharge বন্ধ");
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
    } catch (e: any) {
      setEnabled(prev);
      toast.error(e?.message || "আপডেট ব্যর্থ");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Switch checked={enabled} onCheckedChange={handle} disabled={loading} className="scale-75" aria-label="Auto Recharge" />
  );
}
