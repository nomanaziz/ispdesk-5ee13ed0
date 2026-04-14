import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, FileSpreadsheet, TicketCheck, Globe, Monitor, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d:${h}h:${m}m:${sec}s`;
}

export default function History() {
  const [tab, setTab] = useState("clients");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support_history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, support_categories(name), clients(name, client_id, contact, username), zones(name), profiles!support_tickets_solved_by_fkey(full_name)")
        .eq("status", "solved")
        .order("solved_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ["history_assignees"],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_assignees").select("*, employees(name)");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["support_categories_list"],
    queryFn: async () => {
      const { data } = await supabase.from("support_categories").select("id, name");
      return data || [];
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones_list"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name");
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const fromPortal = tickets.filter((t: any) => t.source === "client_portal").length;
    const fromAdmin = tickets.filter((t: any) => t.source === "admin").length;
    const high = tickets.filter((t: any) => t.priority === "high").length;
    const medium = tickets.filter((t: any) => t.priority === "medium").length;
    const low = tickets.filter((t: any) => t.priority === "low").length;
    return { total: tickets.length, fromPortal, fromAdmin, high, medium, low };
  }, [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t: any) => {
      if (search && !t.ticket_no?.toLowerCase().includes(search.toLowerCase()) && !(t.clients as any)?.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false;
      if (zoneFilter !== "all" && t.zone_id !== zoneFilter) return false;
      if (fromDate && new Date(t.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(t.created_at) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [tickets, search, categoryFilter, zoneFilter, fromDate, toDate]);

  const exportCSV = () => {
    const headers = ["SL,Date,TicketNo,ClientCode,Username,Mobile,Zone,Category,SolveTime,SolvedBy,Duration"];
    const rows = filtered.map((t: any, i: number) => {
      const ta = assignees.filter((a: any) => a.ticket_id === t.id).map((a: any) => (a.employees as any)?.name).join("; ");
      return `${i + 1},${format(new Date(t.created_at), "dd/MM/yyyy")},${t.ticket_no},${(t.clients as any)?.client_id || ""},${(t.clients as any)?.username || ""},${(t.clients as any)?.contact || ""},${(t.zones as any)?.name || ""},${(t.support_categories as any)?.name || ""},${t.solved_at ? format(new Date(t.solved_at), "dd/MM/yyyy HH:mm") : ""},${ta},${formatDuration(t.created_at, t.solved_at)}`;
    });
    const blob = new Blob([headers.concat(rows).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "support_history.csv";
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">সাপোর্ট হিস্ট্রি</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><FileSpreadsheet className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TicketCheck className="h-8 w-8 text-primary" />
          <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">মোট সমাধান</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Globe className="h-8 w-8 text-blue-500" />
          <div><p className="text-2xl font-bold">{stats.fromPortal}</p><p className="text-xs text-muted-foreground">ক্লায়েন্ট পোর্টাল</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Monitor className="h-8 w-8 text-green-500" />
          <div><p className="text-2xl font-bold">{stats.fromAdmin}</p><p className="text-xs text-muted-foreground">অ্যাডমিন পোর্টাল</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div><p className="text-sm font-bold">H:{stats.high} M:{stats.medium} L:{stats.low}</p><p className="text-xs text-muted-foreground">প্রায়োরিটি</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="clients">Client's</TabsTrigger>
          <TabsTrigger value="pops">POP's</TabsTrigger>
          <TabsTrigger value="bw_pops">Bandwidth POP's</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">From Date</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-36" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To Date</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-36" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">ক্যাটাগরি</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              {categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">জোন</label>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              {zones.map((z: any) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>টিকেট নং</TableHead>
                  <TableHead>ক্লায়েন্ট কোড</TableHead>
                  <TableHead>ইউজারনেম</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>জোন</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>সমাধান সময়</TableHead>
                  <TableHead>সমাধানকারী</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">কোনো রেকর্ড পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((t: any, i: number) => {
                  const ta = assignees.filter((a: any) => a.ticket_id === t.id).map((a: any) => (a.employees as any)?.name).join(", ");
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-mono text-xs">{t.ticket_no}</TableCell>
                      <TableCell>{(t.clients as any)?.client_id || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.username || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.contact || "—"}</TableCell>
                      <TableCell>{(t.zones as any)?.name || "—"}</TableCell>
                      <TableCell>{(t.support_categories as any)?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{t.solved_at ? format(new Date(t.solved_at), "dd/MM/yy HH:mm") : "—"}</TableCell>
                      <TableCell className="text-xs">{ta || (t.profiles as any)?.full_name || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{formatDuration(t.created_at, t.solved_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
