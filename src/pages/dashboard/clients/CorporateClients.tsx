import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, Building2, Network, Gauge, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import ClientActionButtons from "@/components/client-actions/ClientActionButtons";
import { usePopScope } from "@/hooks/usePopScope";
import { callPortal } from "@/lib/portalApi";

/**
 * Corporate-only client list. Different columns from Home view:
 * Code | Company | Contact Person | Mobile | Static IP | Bandwidth | Routing | SLA | Bill | Due | Status
 */
export default function CorporateClients() {
  const { isPopMode, branchId } = usePopScope();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [routingFilter, setRoutingFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(0);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["corporate-clients", branchId || "all", isPopMode ? "pop" : "admin"],
    queryFn: async () => {
      if (isPopMode) {
        const res = await callPortal<{ clients: any[] }>("list_pop_clients");
        return (res.clients || []).filter((c: any) => (c.client_type || "") === "Corporate");
      }
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down, price)")
        .eq("client_type", "Corporate")
        .neq("status", "left")
        .neq("billing_status", "Left")
        .eq("owner_scope", "admin")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const all = clients || [];
    const active = all.filter((c: any) => c.status === "active").length;
    const totalCir = all.reduce((s: number, c: any) => s + (Number(c.bandwidth_committed_mbps) || 0), 0);
    const totalBill = all.reduce((s: number, c: any) => s + (Number(c.monthly_bill) || 0), 0);
    return { total: all.length, active, totalCir, totalBill };
  }, [clients]);

  const filtered = useMemo(() => {
    let list = clients || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c: any) =>
          c.name?.toLowerCase().includes(s) ||
          c.company_name?.toLowerCase().includes(s) ||
          c.client_id?.toLowerCase().includes(s) ||
          c.contact?.includes(s) ||
          c.static_ip?.toLowerCase().includes(s),
      );
    }
    if (statusFilter !== "all") list = list.filter((c: any) => c.status === statusFilter);
    if (routingFilter !== "all") list = list.filter((c: any) => (c.routing_protocol || "") === routingFilter);
    return list;
  }, [clients, search, statusFilter, routingFilter]);

  const paginated = useMemo(
    () => filtered.slice(page * perPage, (page + 1) * perPage),
    [filtered, page, perPage],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  const summaryCards = [
    { label: "মোট কর্পোরেট", value: stats.total, icon: Building2, color: "bg-violet-600" },
    { label: "সচল কর্পোরেট", value: stats.active, icon: ShieldCheck, color: "bg-emerald-600" },
    { label: "মোট CIR (Mbps)", value: stats.totalCir, icon: Gauge, color: "bg-cyan-600" },
    { label: "মাসিক বিল (৳)", value: stats.totalBill.toLocaleString(), icon: Network, color: "bg-amber-600" },
  ];

  return (
    <div className="space-y-3 p-4">
      <PageHeader
        title="কর্পোরেট ক্লায়েন্ট"
        description="শুধু কর্পোরেট (Corporate) ক্লায়েন্টদের তালিকা — সাধারণত Static IP / BGP রাউটিং"
        action={
          <Button asChild size="sm">
            <Link
              to={
                (isPopMode ? "/pop-admin/clients/add" : "/dashboard/clients/add") +
                "?client_type=Corporate"
              }
            >
              <Plus className="h-4 w-4 mr-1" /> নতুন কর্পোরেট ক্লায়েন্ট
            </Link>
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`${card.color} text-white border-0`}>
            <CardContent className="p-3 flex items-center gap-2">
              <card.icon className="h-8 w-8 opacity-80" />
              <div>
                <div className="font-semibold text-sm">{card.label}</div>
                <div className="text-xl font-bold">{card.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="নাম / কোম্পানি / কোড / মোবাইল / IP দিয়ে খুঁজুন..."
          className="h-9 max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
            <SelectItem value="active">সচল</SelectItem>
            <SelectItem value="inactive">নিষ্ক্রিয়</SelectItem>
            <SelectItem value="expired">এক্সপায়ার্ড</SelectItem>
            <SelectItem value="suspended">সাসপেন্ডেড</SelectItem>
            <SelectItem value="pending">পেন্ডিং</SelectItem>
          </SelectContent>
        </Select>
        <Select value={routingFilter} onValueChange={(v) => { setRoutingFilter(v); setPage(0); }}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="রাউটিং" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব রাউটিং</SelectItem>
            <SelectItem value="Static">Static</SelectItem>
            <SelectItem value="BGP">BGP</SelectItem>
            <SelectItem value="OSPF">OSPF</SelectItem>
            <SelectItem value="None">None</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
          <span>মোট: {filtered.length}</span>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-8 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 250].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">কোড</TableHead>
              <TableHead className="text-xs">কোম্পানি</TableHead>
              <TableHead className="text-xs">যোগাযোগের ব্যক্তি</TableHead>
              <TableHead className="text-xs">মোবাইল</TableHead>
              <TableHead className="text-xs">Static IP</TableHead>
              <TableHead className="text-xs">CIR / Burst (Mbps)</TableHead>
              <TableHead className="text-xs">রাউটিং</TableHead>
              <TableHead className="text-xs">SLA %</TableHead>
              <TableHead className="text-xs">মাসিক বিল</TableHead>
              <TableHead className="text-xs">স্ট্যাটাস</TableHead>
              <TableHead className="text-xs">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">লোড হচ্ছে...</TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  কোনো কর্পোরেট ক্লায়েন্ট পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c: any) => {
                const cir = Number(c.bandwidth_committed_mbps) || 0;
                const burst = Number(c.bandwidth_burst_mbps) || 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-violet-500 shrink-0" />
                        {c.company_name || c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{c.contact_person || c.name || "-"}</TableCell>
                    <TableCell className="text-xs">{c.contact || "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-[11px]">{c.static_ip || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {cir > 0 || burst > 0 ? (
                        <span className="font-mono text-[11px]">
                          {cir || "-"} / {burst || "-"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.routing_protocol ? (
                        <Badge variant="outline" className="text-[10px]">
                          {c.routing_protocol}
                          {c.routing_protocol === "BGP" && c.bgp_as_number ? ` AS${c.bgp_as_number}` : ""}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.sla_uptime_percent ? `${c.sla_uptime_percent}%` : "-"}
                    </TableCell>
                    <TableCell className="text-xs">৳ {Number(c.monthly_bill || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {c.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <ClientActionButtons client={c} mode="client" invalidateKey="corporate-clients" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-primary/10 font-semibold">
              <TableCell colSpan={5} className="text-xs">মোট: {filtered.length} জন</TableCell>
              <TableCell className="text-xs">
                {filtered.reduce((s: number, c: any) => s + (Number(c.bandwidth_committed_mbps) || 0), 0)} /{" "}
                {filtered.reduce((s: number, c: any) => s + (Number(c.bandwidth_burst_mbps) || 0), 0)}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
              <TableCell className="text-xs">
                ৳ {filtered.reduce((s: number, c: any) => s + Number(c.monthly_bill || 0), 0).toLocaleString()}
              </TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">পেজ {page + 1} / {totalPages}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
