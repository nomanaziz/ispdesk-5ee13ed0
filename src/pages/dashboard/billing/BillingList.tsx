import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, UserX, Banknote, AlertTriangle, FileSpreadsheet, FileText,
  RefreshCw, Download, Eye, Edit, Receipt, Search, ChevronLeft, ChevronRight,
  UserCheck, UserMinus, Clock, TrendingUp
} from "lucide-react";

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function BillingList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["billing-list", monthFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id, client_id, name, contact, username, remote_address, status,
          client_type, connection_type, monthly_bill, expire_date, speed,
          server_name, mac_address, protocol_type,
          zone:zones(name),
          package:isp_packages(name),
          billing!billing_client_id_fkey(id, month, amount, paid, due, discount, advance, vat, status, pay_date)
        `)
        .order("client_id", { ascending: true });
      if (error) throw error;
      return (data || []).map((c: any) => {
        const bill = (c.billing || []).find((b: any) => b.month === monthFilter);
        return { ...c, currentBill: bill || null };
      });
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones-list"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return clients.filter((c: any) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !c.client_id?.toLowerCase().includes(s) &&
          !c.name?.toLowerCase().includes(s) &&
          !c.contact?.toLowerCase().includes(s)
        ) return false;
      }
      if (zoneFilter !== "all" && c.zone?.name !== zoneFilter) return false;
      if (clientStatusFilter !== "all" && c.status !== clientStatusFilter) return false;
      if (statusFilter !== "all") {
        const b = c.currentBill;
        const bs = b?.status?.toLowerCase() || "unpaid";
        const now = new Date();
        const expDate = c.expire_date ? new Date(c.expire_date) : null;
        if (statusFilter === "overdue") {
          if (!expDate || expDate >= now || bs === "paid") return false;
        } else if (statusFilter !== bs) return false;
      }
      return true;
    });
  }, [clients, search, zoneFilter, clientStatusFilter, statusFilter]);

  const summary = useMemo(() => {
    let total = clients.length, active = 0, free = 0, left = 0;
    let paid = 0, unpaid = 0, partial = 0, overdue = 0;
    let received = 0, due = 0, advance = 0, monthlyBill = 0;
    const now = new Date();

    clients.forEach((c: any) => {
      if (c.status === "active") active++;
      else if (c.status === "free" || c.status === "personal") free++;
      else if (c.status === "left") left++;

      const b = c.currentBill;
      monthlyBill += Number(c.monthly_bill || 0);
      if (b) {
        received += Number(b.paid || 0);
        due += Number(b.due || 0);
        advance += Number(b.advance || 0);
        const bs = b.status?.toLowerCase();
        if (bs === "paid") paid++;
        else if (bs === "partial") partial++;
        else unpaid++;
      } else {
        unpaid++;
      }
      const expDate = c.expire_date ? new Date(c.expire_date) : null;
      if (expDate && expDate < now && (!b || b.status !== "paid")) overdue++;
    });
    return { total, active, free, left, paid, unpaid, partial, overdue, received, due, advance, monthlyBill };
  }, [clients]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-foreground">বিলিং তালিকা (Billing List)</h1>

      {/* Row 1: Client Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Users} label="মোট ক্লায়েন্ট" value={summary.total} color="text-blue-500" bg="bg-blue-500/10" />
        <SummaryCard icon={UserCheck} label="অ্যাক্টিভ" value={summary.active} color="text-emerald-500" bg="bg-emerald-500/10" />
        <SummaryCard icon={UserMinus} label="ফ্রি/পার্সোনাল" value={summary.free} color="text-cyan-500" bg="bg-cyan-500/10" />
        <SummaryCard icon={UserX} label="লেফট" value={summary.left} color="text-red-500" bg="bg-red-500/10" />
      </div>
      {/* Row 2: Billing Status Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Receipt} label="পেইড ক্লায়েন্ট" value={summary.paid} color="text-emerald-400" bg="bg-emerald-500/10" />
        <SummaryCard icon={AlertTriangle} label="ডিউ ক্লায়েন্ট" value={summary.unpaid} color="text-orange-400" bg="bg-orange-500/10" />
        <SummaryCard icon={Clock} label="পার্শিয়াল ডিউ" value={summary.partial} color="text-yellow-400" bg="bg-yellow-500/10" />
        <SummaryCard icon={TrendingUp} label="ওভারডিউ" value={summary.overdue} color="text-red-400" bg="bg-red-500/10" />
      </div>
      {/* Row 3: Financial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={Banknote} label="রিসিভড" value={`৳${summary.received.toLocaleString()}`} color="text-emerald-400" bg="bg-emerald-500/10" />
        <SummaryCard icon={AlertTriangle} label="বকেয়া" value={`৳${summary.due.toLocaleString()}`} color="text-purple-400" bg="bg-purple-500/10" />
        <SummaryCard icon={Banknote} label="অগ্রিম" value={`৳${summary.advance.toLocaleString()}`} color="text-yellow-400" bg="bg-yellow-500/10" />
        <SummaryCard icon={Banknote} label="মাসিক বিল" value={`৳${summary.monthlyBill.toLocaleString()}`} color="text-teal-400" bg="bg-teal-500/10" />
      </div>

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
        <Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
        <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-1" /> স্ট্যাটাস পরিবর্তন</Button>
        <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> ইনভয়েস</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="সার্চ (ID/নাম/মোবাইল)" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={zoneFilter} onValueChange={v => { setZoneFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="জোন" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল জোন</SelectItem>
            {zones.map((z: any) => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={clientStatusFilter} onValueChange={v => { setClientStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="ক্লায়েন্ট টাইপ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="left">Left</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="বিলিং স্ট্যাটাস" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid/Due</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-44" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow><TableCell colSpan={17} className="text-center py-8 text-muted-foreground">কোনো ডাটা পাওয়া যায়নি</TableCell></TableRow>
                ) : paginated.map((c: any, i: number) => {
                  const b = c.currentBill;
                  const bs = b?.status || "unpaid";
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{c.client_id}</TableCell>
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
                        <Badge variant={bs === "paid" ? "default" : bs === "partial" ? "secondary" : "destructive"} className="text-xs">
                          {bs === "paid" ? "Paid" : bs === "partial" ? "Partial" : "Due"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/dashboard/billing/client/${c.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><Receipt className="h-3.5 w-3.5" /></Button>
                        </div>
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
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
