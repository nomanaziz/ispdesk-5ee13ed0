import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  popId: string;
  branchId?: string | null;
}

export default function PopExportedClients({ popId, branchId }: Props) {
  const [search, setSearch] = useState("");
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["pop-exported-mt", popId, branchId],
    enabled: !!popId,
    queryFn: async () => {
      // mikrotik_clients in this POP scope, that have been linked to a clients row
      let q = supabase
        .from("mikrotik_clients" as any)
        .select("id, name, password, profile, server_name, remote_address, status, linked_client_id, branch_id, transferred_to_pop_id");
      if (branchId) {
        q = q.or(`branch_id.eq.${branchId},transferred_to_pop_id.eq.${popId}`);
      } else {
        q = q.eq("transferred_to_pop_id", popId);
      }
      const { data: mtRows, error: e1 } = await q.not("linked_client_id", "is", null);
      if (e1) throw e1;

      const linkedIds = (mtRows ?? []).map((r: any) => r.linked_client_id).filter(Boolean);
      let clientsById: Record<string, any> = {};
      if (linkedIds.length) {
        const { data: cRows } = await supabase
          .from("clients")
          .select("id, client_id, name, contact, mac_address, remote_address, server_name, billing_status, mikrotik_status, is_online, monthly_bill, package_id, zone_id, client_type, isp_packages(name), zones(name)")
          .in("id", linkedIds);
        clientsById = Object.fromEntries((cRows ?? []).map((c: any) => [c.id, c]));
      }
      return (mtRows ?? []).map((m: any) => ({ ...m, client: clientsById[m.linked_client_id] }));
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r: any) =>
      [r.name, r.client?.name, r.client?.contact, r.client?.client_id, r.remote_address]
        .some((v: any) => (v || "").toString().toLowerCase().includes(q))
    );
  }, [data, search]);

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (error) return <div className="text-sm text-destructive p-3 border border-destructive/30 rounded-md">লোড করতে সমস্যা হয়েছে: {(error as any).message}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="খুঁজুন (নাম / মোবাইল / IP)" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <span className="text-xs text-muted-foreground">মোট: {filtered.length}</span>
      </div>
      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Customer Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Private IP</TableHead>
              <TableHead>MAC</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>B.Status</TableHead>
              <TableHead>M.Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.client?.client_id || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{r.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs">{showPwd[r.id] ? (r.password || "-") : "••••••"}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowPwd((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                      {showPwd[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{r.client?.name || "-"}</TableCell>
                <TableCell>{r.client?.contact || "-"}</TableCell>
                <TableCell>{r.client?.zones?.name || "-"}</TableCell>
                <TableCell>{r.client?.isp_packages?.name || r.profile || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{r.client?.remote_address || r.remote_address || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{r.client?.mac_address || "-"}</TableCell>
                <TableCell>{r.client?.server_name || r.server_name || "-"}</TableCell>
                <TableCell><Badge variant="secondary">{r.client?.billing_status || "-"}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.client?.is_online ? "default" : "outline"}>
                    {r.client?.is_online ? "Online" : (r.client?.mikrotik_status || r.status || "-")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">কোনো exported client নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
