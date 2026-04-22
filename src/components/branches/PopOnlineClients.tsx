import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Wifi, WifiOff, Users } from "lucide-react";

interface Props {
  branchId?: string | null;
}

export default function PopOnlineClients({ branchId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["pop-online-clients", branchId],
    enabled: !!branchId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, client_id, username, name, contact, remote_address, server_name, is_online, mikrotik_status, billing_status, isp_packages(name)")
        .eq("branch_id", branchId!)
        .eq("owner_scope", "pop")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = data?.length ?? 0;
    const online = (data ?? []).filter((c: any) => c.is_online).length;
    return { total, online, offline: total - online };
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c: any) => {
      if (statusFilter === "online" && !c.is_online) return false;
      if (statusFilter === "offline" && c.is_online) return false;
      if (!q) return true;
      return [c.name, c.username, c.contact, c.remote_address, c.client_id]
        .some((v: any) => (v || "").toString().toLowerCase().includes(q));
    });
  }, [data, search, statusFilter]);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total" value={stats.total} />
        <StatCard icon={<Wifi className="h-4 w-4 text-emerald-600" />} label="Online" value={stats.online} tone="text-emerald-600" />
        <StatCard icon={<WifiOff className="h-4 w-4 text-muted-foreground" />} label="Offline" value={stats.offline} tone="text-muted-foreground" />
        <StatCard icon={<RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />} label="Last Sync" value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "-"} small />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="খুঁজুন (নাম / username / IP)" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <button onClick={() => refetch()} className="text-xs text-primary hover:underline ml-1">Refresh</button>
        <span className="text-xs text-muted-foreground ml-auto">দেখানো: {filtered.length}</span>
      </div>

      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Private IP</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.username || c.client_id || "-"}</TableCell>
                <TableCell>{c.name || "-"}</TableCell>
                <TableCell>{c.contact || "-"}</TableCell>
                <TableCell>{c.isp_packages?.name || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{c.remote_address || "-"}</TableCell>
                <TableCell>{c.server_name || "-"}</TableCell>
                <TableCell>
                  {c.is_online ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600/90"><Wifi className="h-3 w-3" /> Online</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground"><WifiOff className="h-3 w-3" /> Offline</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">কোনো client নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone, small }: { icon?: React.ReactNode; label: string; value: any; tone?: string; small?: boolean }) {
  return (
    <div className="rounded-md border p-3 bg-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 ${small ? "text-sm" : "text-xl"} font-bold ${tone || ""}`}>{value}</div>
    </div>
  );
}
