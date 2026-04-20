import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, FileSpreadsheet, FileText, MoreVertical, Wrench, ChevronLeft, ChevronRight } from "lucide-react";
import RecoveryInfoDialog from "@/components/clients/RecoveryInfoDialog";

const PER_PAGE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000];

export default function LeftClients() {
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState("all");
  const [filterConnType, setFilterConnType] = useState("all");
  const [filterClientType, setFilterClientType] = useState("all");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterRecovery, setFilterRecovery] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(0);
  const [recoveryClient, setRecoveryClient] = useState<any | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["left-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, zones:zone_id(name), isp_packages:package_id(name, bandwidth_down)")
        .or("status.eq.left,billing_status.eq.Left")
        .order("left_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: zones } = useQuery({ queryKey: ["zones-active"], queryFn: async () => { const { data } = await supabase.from("zones").select("id, name").eq("status", "active"); return data || []; } });
  const { data: connectionTypes } = useQuery({ queryKey: ["connection-types-active"], queryFn: async () => { const { data } = await supabase.from("connection_types_config").select("id, name").eq("status", "active"); return data || []; } });
  const { data: clientTypes } = useQuery({ queryKey: ["client-types-active"], queryFn: async () => { const { data } = await supabase.from("client_types").select("id, name").eq("status", "active"); return data || []; } });
  const { data: packages } = useQuery({ queryKey: ["isp-packages-active"], queryFn: async () => { const { data } = await supabase.from("isp_packages").select("id, name").eq("status", "active"); return data || []; } });

  const filtered = useMemo(() => {
    let list = clients || [];
    if (filterZone !== "all") list = list.filter((c: any) => c.zone_id === filterZone);
    if (filterConnType !== "all") list = list.filter((c: any) => c.connection_type === filterConnType);
    if (filterClientType !== "all") list = list.filter((c: any) => c.client_type === filterClientType);
    if (filterPackage !== "all") list = list.filter((c: any) => c.package_id === filterPackage);
    if (filterRecovery !== "all") list = list.filter((c: any) => (c.recovery_status || "pending") === filterRecovery);
    if (filterFromDate) list = list.filter((c: any) => c.left_date && c.left_date >= filterFromDate);
    if (filterToDate) list = list.filter((c: any) => c.left_date && c.left_date <= filterToDate);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((c: any) => c.name?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.contact?.includes(s));
    }
    return list;
  }, [clients, search, filterZone, filterConnType, filterClientType, filterPackage, filterRecovery, filterFromDate, filterToDate]);

  const totalDue = useMemo(() => filtered.reduce((s: number, c: any) => s + Number(c.monthly_bill || 0), 0), [filtered]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => filtered.slice(page * perPage, (page + 1) * perPage), [filtered, page, perPage]);

  const recoveryBadge = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      recovered: { label: "Recovered", cls: "bg-green-500/10 text-green-700 border-green-500/30" },
      partial: { label: "Partial", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
      not_applicable: { label: "N/A", cls: "bg-muted text-muted-foreground" },
      pending: { label: "Pending", cls: "bg-red-500/10 text-red-700 border-red-500/30" },
    };
    const m = map[s] || map.pending;
    return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Left Clients <span className="text-sm font-normal text-muted-foreground">View All Left Client</span></h1>
      </div>

      {/* Filters */}
      <div className="p-4 border rounded-lg bg-card space-y-3">
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm"><FileSpreadsheet className="h-4 w-4 mr-1" /> Generate Excel</Button>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate Pdf</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs uppercase">Zone</Label>
            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {zones?.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Connection Type</Label>
            <Select value={filterConnType} onValueChange={setFilterConnType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {connectionTypes?.map(ct => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Client Type</Label>
            <Select value={filterClientType} onValueChange={setFilterClientType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {clientTypes?.map((ct: any) => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Package</Label>
            <Select value={filterPackage} onValueChange={setFilterPackage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                {packages?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">Recovery Status</Label>
            <Select value={filterRecovery} onValueChange={setFilterRecovery}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                <SelectItem value="pending">পেন্ডিং</SelectItem>
                <SelectItem value="recovered">রিকভার্ড</SelectItem>
                <SelectItem value="partial">আংশিক</SelectItem>
                <SelectItem value="not_applicable">প্রযোজ্য নয়</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase">From Left Date</Label>
            <Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">To Left Date</Label>
            <Input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Per-page + total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>মোট: {filtered.length} জন</span>
          <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
            <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">C.Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Client Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Conn. Type</TableHead>
              <TableHead className="text-xs">Client Type</TableHead>
              <TableHead className="text-xs">R.Address</TableHead>
              <TableHead className="text-xs">Package/Speed</TableHead>
              <TableHead className="text-xs">M.Bill</TableHead>
              <TableHead className="text-xs">Server</TableHead>
              <TableHead className="text-xs">B.Status</TableHead>
              <TableHead className="text-xs">Left Date</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={15} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={15} className="text-center py-8">কোনো বন্ধ ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              paginated.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium">{c.client_id}</TableCell>
                  <TableCell className="text-xs">{c.username || c.user_id || "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs">{c.contact}</TableCell>
                  <TableCell className="text-xs">{c.zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span>{c.connection_type || "-"}</span>
                      {recoveryBadge(c.recovery_status || "pending")}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{c.client_type || "-"}</TableCell>
                  <TableCell className="text-xs">{c.remote_address || "-"}</TableCell>
                  <TableCell className="text-xs">{c.isp_packages ? `${c.isp_packages.name}/${c.isp_packages.bandwidth_down}Mb` : "-"}</TableCell>
                  <TableCell className="text-xs">{c.monthly_bill || 0}</TableCell>
                  <TableCell className="text-xs">{c.mikrotik_device?.name || c.server_name || "-"}</TableCell>
                  <TableCell className="text-xs"><Badge variant="destructive" className="text-[10px]">Left</Badge></TableCell>
                  <TableCell className="text-xs">{c.left_date || "-"}</TableCell>
                  <TableCell className="text-xs">{c.left_reason || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRecoveryClient(c)}>
                          <Wrench className="h-4 w-4 mr-2" /> রিকভারি ইনফরমেশন
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-primary/10 font-semibold">
              <TableCell colSpan={9} className="text-xs">মোট: {filtered.length} জন</TableCell>
              <TableCell className="text-xs">৳ {totalDue.toLocaleString()}</TableCell>
              <TableCell colSpan={5}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">পেজ {page + 1} / {totalPages}</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <RecoveryInfoDialog open={!!recoveryClient} onOpenChange={(v) => !v && setRecoveryClient(null)} client={recoveryClient} />
    </div>
  );
}
