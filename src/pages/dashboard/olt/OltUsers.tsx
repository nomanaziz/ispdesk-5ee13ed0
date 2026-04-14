import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX, Search } from "lucide-react";

const getRxColor = (rx: number | null) => {
  if (rx == null) return "text-muted-foreground";
  if (rx >= -18) return "text-emerald-600 font-bold";
  if (rx >= -24) return "text-yellow-600 font-bold";
  if (rx >= -27) return "text-orange-600 font-bold";
  return "text-red-600 font-bold";
};

export default function OltUsers() {
  const [oltFilter, setOltFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 20;

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => { const { data } = await supabase.from("olt_devices").select("id, name"); return data || []; },
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones-select"],
    queryFn: async () => { const { data } = await supabase.from("zones").select("id, name"); return data || []; },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["olt-users-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients")
        .select("id, client_id, username, name, contact, status, zone_id, zones(name), onu_id, onu_list(id, mac, interface, rx_power, status, olt_id, olt_devices(name))")
        .not("onu_id", "is", null);
      return data || [];
    },
  });

  const filtered = clients.filter((c: any) => {
    if (oltFilter !== "all" && c.onu_list?.olt_id !== oltFilter) return false;
    if (statusFilter === "online" && c.onu_list?.status !== "online") return false;
    if (statusFilter === "offline" && c.onu_list?.status !== "offline") return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(c.name?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s) || c.client_id?.toLowerCase().includes(s) || c.onu_list?.mac?.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totalMapped = clients.length;
  const onlineMapped = clients.filter((c: any) => c.onu_list?.status === "online").length;
  const offlineMapped = clients.filter((c: any) => c.onu_list?.status === "offline").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">OLT ইউজার ম্যাপিং</h1>
        <p className="text-muted-foreground text-sm">ক্লায়েন্ট ও ONU ডিভাইসের সংযোগ তালিকা</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "মোট ম্যাপড ইউজার", value: totalMapped, icon: Users, color: "blue" },
          { label: "অনলাইন ইউজার", value: onlineMapped, icon: UserCheck, color: "emerald" },
          { label: "অফলাইন ইউজার", value: offlineMapped, icon: UserX, color: "red" },
        ].map(c => (
          <Card key={c.label} className={`border-l-4 border-l-${c.color}-500`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg bg-${c.color}-500/10 flex items-center justify-center`}>
                <c.icon className={`h-6 w-6 text-${c.color}-500`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={oltFilter} onValueChange={v => { setOltFilter(v); setPage(0); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="OLT" /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল OLT</SelectItem>{olts.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">সকল স্ট্যাটাস</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="নাম/Username/MAC..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>জোন</TableHead>
                  <TableHead>ONU MAC</TableHead>
                  <TableHead>Interface</TableHead>
                  <TableHead>RX Power</TableHead>
                  <TableHead>ONU স্ট্যাটাস</TableHead>
                  <TableHead>OLT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">কোনো ম্যাপড ইউজার পাওয়া যায়নি</TableCell></TableRow>
                ) : paged.map((c: any, i) => (
                  <TableRow key={c.id}>
                    <TableCell>{page * perPage + i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{c.client_id}</TableCell>
                    <TableCell>{c.username || "—"}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.contact || "—"}</TableCell>
                    <TableCell>{c.zones?.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.onu_list?.mac || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.onu_list?.interface || "—"}</TableCell>
                    <TableCell className={getRxColor(c.onu_list?.rx_power)}>{c.onu_list?.rx_power != null ? `${c.onu_list.rx_power} dBm` : "—"}</TableCell>
                    <TableCell><Badge variant={c.onu_list?.status === "online" ? "default" : "destructive"}>{c.onu_list?.status || "—"}</Badge></TableCell>
                    <TableCell>{c.onu_list?.olt_devices?.name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>পূর্ববর্তী</Button>
              <span className="text-sm text-muted-foreground">পৃষ্ঠা {page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>পরবর্তী</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
